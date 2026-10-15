'use client';

import { useMessages } from './messages.js';
import type { MotifComponent } from '@usemotif/core';

import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from 'react';
import { useIsomorphicLayoutEffect } from './_use-isomorphic-layout-effect.js';
import { Box, type BoxProps } from './Box.js';
import { Pressable } from './Pressable.js';
import { Text, type TextProps } from './Text.js';

/**
 * Field context - links Label / Input / FieldHelp / FieldError so
 * screen readers announce them together. `<Field>` generates a
 * stable id and an `aria-describedby` token list; child primitives
 * subscribe via `useFieldContext()`.
 */
interface FieldContextValue {
  readonly fieldId: string;
  readonly helpId: string;
  readonly errorId: string;
  readonly invalid: boolean;
  readonly disabled: boolean;
  readonly required: boolean;
  /** Whether a FieldHelp is rendered, so the input's aria-describedby only
   * references the help id when it actually exists (a dangling IDREF is an
   * ARIA smell that trips automated a11y checks). The error id is gated on
   * `invalid` instead, since FieldError is shown for the invalid state. */
  readonly hasHelp: boolean;
  /** The message a surrounding `Form` holds for this field, shown by an empty `FieldError`. */
  readonly error: string | undefined;
}
const FieldContext = createContext<FieldContextValue | null>(null);

/** What a `Form` shares with its fields: current errors by control id, and field registration. */
interface FormContextValue {
  readonly errors: Readonly<Record<string, string>>;
  register(fieldId: string): () => void;
}
const FormContext = createContext<FormContextValue | null>(null);
function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}

export interface FieldProps extends BoxProps {
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  children?: ReactNode;
}

export const Field: MotifComponent<FieldProps, ReactElement | null> = function ({
  invalid = false,
  disabled = false,
  required = false,
  id,
  children,
  ...rest
}: FieldProps): ReactElement {
  const reactId = useId();
  const fieldId = id ?? reactId;
  const form = useContext(FormContext);
  const error = form?.errors[fieldId];
  const register = form?.register;
  useIsomorphicLayoutEffect(() => register?.(fieldId), [register, fieldId]);

  // Detect a FieldHelp among the children at render time (SSR-safe - no
  // effect needed) so aria-describedby only references the help id when a
  // help node is actually present.
  let hasHelp = false;
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === FieldHelp) hasHelp = true;
  });

  return (
    <FieldContext.Provider
      value={{
        fieldId,
        helpId: `${fieldId}-help`,
        errorId: `${fieldId}-error`,
        invalid: invalid || error !== undefined,
        disabled,
        required,
        hasHelp,
        error,
      }}
    >
      <Box display="flex" flexDirection="column" gap="$1.5" {...rest}>
        {children}
      </Box>
    </FieldContext.Provider>
  );
};

export interface LabelProps extends TextProps {
  htmlFor?: string;
}
export const Label: MotifComponent<LabelProps, ReactElement | null> = function ({
  htmlFor,
  children,
  ...rest
}: LabelProps): ReactElement {
  const ctx = useFieldContext();
  const target = htmlFor ?? ctx?.fieldId;
  return (
    <Text
      as="label"
      fontSize="$sm"
      fontWeight="$semibold"
      color="$colors.text.default"
      {...(target !== undefined ? ({ htmlFor: target } as Record<string, string>) : {})}
      {...rest}
    >
      {children}
      {ctx?.required === true ? (
        <Text as="span" color="$colors.action.danger.bg" aria-hidden="true">
          {' *'}
        </Text>
      ) : null}
    </Text>
  );
};

export interface FieldHelpProps extends TextProps {}
export const FieldHelp: MotifComponent<FieldHelpProps, ReactElement | null> = function ({
  children,
  ...rest
}: FieldHelpProps): ReactElement {
  const ctx = useFieldContext();
  return (
    <Text
      fontSize="$sm"
      color="$colors.text.muted"
      {...(ctx !== null ? ({ id: ctx.helpId } as Record<string, string>) : {})}
      {...rest}
    >
      {children}
    </Text>
  );
};

export interface FieldErrorProps extends TextProps {}
/**
 * The field's error message, announced as an alert. Given children it shows them; left empty
 * inside a `Form`, it shows the message the form holds for its field, and renders nothing while
 * the field is valid.
 */
export const FieldError: MotifComponent<FieldErrorProps, ReactElement | null> = function ({
  children,
  ...rest
}: FieldErrorProps): ReactElement | null {
  const ctx = useFieldContext();
  if (children === undefined && ctx?.error === undefined && ctx !== null) return null;
  return (
    <Text
      role="alert"
      fontSize="$sm"
      color="$colors.action.danger.bg"
      {...(ctx !== null ? ({ id: ctx.errorId } as Record<string, string>) : {})}
      {...rest}
    >
      {children ?? ctx?.error}
    </Text>
  );
};

/** What a `Form` action may return: messages keyed by control `name`. */
export interface FormActionResult {
  readonly errors?: Readonly<Record<string, string>>;
}

export interface FormProps extends Omit<BoxProps, 'as' | 'action' | 'onSubmit'> {
  /**
   * Runs with the form's data once every control passes its constraints, as a React 19 form
   * action, so `useFormStatus` reports it pending. Return `{ errors }` keyed by control `name`
   * to show server-side messages on those fields.
   */
  action?: (formData: FormData) => FormActionResult | void | Promise<FormActionResult | void>;
  /** Called on a submit that passed validation. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  /** Messages keyed by control `name` from elsewhere, such as `useActionState`. */
  errors?: Readonly<Record<string, string>>;
  children?: ReactNode;
}

/** Errors keyed by control `name`, rekeyed by the id each field's control carries. */
function byControlId(
  form: HTMLFormElement | null,
  errors: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (form === null || errors === undefined) return out;
  for (const [name, message] of Object.entries(errors)) {
    const item = form.elements.namedItem(name);
    const control = item instanceof RadioNodeList ? item[0] : item;
    if (control instanceof HTMLElement && control.id !== '') out[control.id] = message;
  }
  return out;
}

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const isControl = (el: Element | EventTarget | null): el is Control =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLSelectElement ||
  el instanceof HTMLTextAreaElement;

/**
 * A form that checks the browser's native constraints (`required`, `type="email"`, `pattern`,
 * `min`, `setCustomValidity` and the rest) before it submits, and shows each failure through
 * the field's `FieldError` instead of the browser's bubble. A submit that fails focuses the first
 * invalid control; after that, a field rechecks as it's edited. A valid submit runs `action` as
 * a React 19 form action, and the errors it returns land on their fields too.
 *
 * A control outside any `Field` has no `FieldError` to show its message, so the browser reports
 * it instead.
 *
 * @example
 * ```tsx
 * <Form action={async (data) => (await signUp(data)) ?? undefined}>
 *   <Field>
 *     <Label>Email</Label>
 *     <Input name="email" type="email" required />
 *     <FieldError />
 *   </Field>
 *   <Button type="submit">Sign up</Button>
 * </Form>
 * ```
 */
export const Form: MotifComponent<FormProps, ReactElement | null> = function ({
  action,
  onSubmit,
  errors: externalErrors,
  children,
  ...rest
}: FormProps): ReactElement {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [actionErrors, setActionErrors] = useState<Readonly<Record<string, string>>>();
  const fields = useRef(new Set<string>());

  const register = useCallback((fieldId: string) => {
    fields.current.add(fieldId);
    return () => {
      fields.current.delete(fieldId);
    };
  }, []);

  // Name-keyed errors need the form's controls to find their ids, so the first render (before
  // the ref attaches) can't place them; one more render once mounted does.
  const [mounted, setMounted] = useState(false);
  useIsomorphicLayoutEffect(() => setMounted(true), []);
  const form = mounted ? formRef.current : null;
  const merged = useMemo(
    () => ({
      ...byControlId(form, externalErrors),
      ...byControlId(form, actionErrors),
      ...errors,
    }),
    [form, externalErrors, actionErrors, errors],
  );
  const context = useMemo(() => ({ errors: merged, register }), [merged, register]);
  const userRef = (rest as { ref?: Ref<HTMLElement | null> }).ref;
  const setRef = useCallback(
    (node: HTMLFormElement | null) => {
      formRef.current = node;
      if (typeof userRef === 'function') userRef(node);
      else if (userRef !== null && userRef !== undefined) {
        (userRef as { current: HTMLElement | null }).current = node;
      }
    },
    [userRef],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    const next: Record<string, string> = {};
    let first: Control | null = null;
    let unshown: Control | null = null;
    for (const el of event.currentTarget.elements) {
      if (!isControl(el) || el.validity.valid) continue;
      first ??= el;
      if (fields.current.has(el.id)) next[el.id] = el.validationMessage;
      else unshown ??= el;
    }
    setErrors(next);
    setActionErrors(undefined);
    if (first !== null) {
      event.preventDefault();
      if (unshown !== null) unshown.reportValidity();
      else first.focus();
      return;
    }
    onSubmit?.(event);
  };

  // After a failed check, a field's message follows its control as it's edited. Any message the
  // action or `errors` gave it is the user's to correct, so it clears on the first edit.
  const handleInput = (event: FormEvent<HTMLFormElement>): void => {
    const el = event.target;
    if (!isControl(el) || merged[el.id] === undefined) return;
    setErrors((prev) => {
      const { [el.id]: _gone, ...others } = prev;
      return el.validity.valid ? others : { ...others, [el.id]: el.validationMessage };
    });
    setActionErrors((prev) => {
      if (prev === undefined || !(el.name in prev)) return prev;
      const { [el.name]: _gone, ...others } = prev;
      return others;
    });
  };

  const formAction =
    action === undefined
      ? undefined
      : async (formData: FormData): Promise<void> => {
          const result = await action(formData);
          setActionErrors(result?.errors);
        };

  return (
    <FormContext.Provider value={context}>
      <Box
        as="form"
        {...rest}
        {...({
          noValidate: true,
          ...(formAction !== undefined ? { action: formAction } : {}),
          onSubmit: handleSubmit,
          onInput: handleInput,
        } as Record<string, unknown>)}
        ref={setRef as Ref<HTMLElement | null>}
      >
        {children}
      </Box>
    </FormContext.Provider>
  );
};

export interface FieldsetProps extends Omit<BoxProps, 'as'> {
  legend?: ReactNode;
  children?: ReactNode;
}
export const Fieldset: MotifComponent<FieldsetProps, ReactElement | null> = function ({
  legend,
  children,
  ...rest
}: FieldsetProps): ReactElement {
  return (
    <Box
      as="fieldset"
      borderWidth={1}
      borderStyle="solid"
      borderColor="$colors.border.default"
      borderRadius="$md"
      p="$4"
      {...rest}
    >
      {legend !== undefined && legend !== null ? (
        <Text as="legend" fontSize="$sm" fontWeight="$semibold" px="$1">
          {legend}
        </Text>
      ) : null}
      {children}
    </Box>
  );
};

/** Inline style for the bordered surface - kept simple so it
 * doesn't fight the schema. Token-driven theming through
 * `var(--colors-...)` references stays at the parent's level. */
function inputStyle(invalid: boolean, disabled: boolean): CSSProperties {
  return {
    width: '100%',
    paddingInline: 12,
    paddingBlock: 8,
    fontSize: 16,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: invalid ? 'var(--colors-action-danger-bg)' : 'var(--colors-border-default)',
    borderRadius: 8,
    backgroundColor: 'var(--colors-surface-base)',
    color: 'var(--colors-text-default)',
    ...(disabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
  };
}

function pickAriaProps(ctx: FieldContextValue | null): Record<string, string | undefined> {
  if (ctx === null) return {};
  const out: Record<string, string | undefined> = { id: ctx.fieldId };
  // Only describe the input by ids that actually resolve - the help id when
  // a FieldHelp is present, the error id when the field is invalid (which is
  // when a FieldError is shown). Avoids dangling IDREFs.
  const describedBy = [ctx.hasHelp ? ctx.helpId : null, ctx.invalid ? ctx.errorId : null]
    .filter(Boolean)
    .join(' ');
  if (describedBy.length > 0) out['aria-describedby'] = describedBy;
  if (ctx.invalid) out['aria-invalid'] = 'true';
  if (ctx.required) out['aria-required'] = 'true';
  return out;
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  invalid?: boolean;
  /** Shown inside the field before the text: an icon, a prefix, a button. */
  startElement?: ReactNode;
  /** Shown inside the field after the text. */
  endElement?: ReactNode;
}

// With an adornment, the field is a flex row: the wrapper carries the
// surface, so the adornments take the width they need with no measuring, and
// shows the focus ring the borderless input inside it gives up.
const ADORNED_INPUT: CSSProperties = {
  flex: 1,
  minWidth: 0,
  paddingBlock: 8,
  paddingInline: 0,
  fontSize: 16,
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  outline: 'none',
};
const ADORNMENT: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  flexShrink: 0,
  color: 'var(--colors-text-muted)',
};
const FOCUS_RING = { outlineStyle: 'auto' } as const;

/**
 * A themed text input. `startElement` and `endElement` sit inside the field,
 * before and after the text.
 *
 * @example
 * ```tsx
 * <Input placeholder="Search" startElement={<Icon icon={Search} />} />
 * ```
 */
export const Input = /* @__PURE__ */ forwardRef(function Input(
  { invalid, disabled, type = 'text', style, startElement, endElement, ...rest }: InputProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  const ctx = useFieldContext();
  const isInvalid = invalid ?? ctx?.invalid ?? false;
  const isDisabled = disabled ?? ctx?.disabled ?? false;
  const adorned = startElement !== undefined || endElement !== undefined;
  const { paddingBlock: _block, fontSize: _size, ...surface } = inputStyle(isInvalid, isDisabled);
  const input = (
    <input
      ref={ref}
      type={type}
      style={
        adorned
          ? { ...ADORNED_INPUT, ...style }
          : { ...inputStyle(isInvalid, isDisabled), ...style }
      }
      {...pickAriaProps(ctx)}
      {...(isDisabled ? { disabled: true } : {})}
      {...rest}
    />
  );
  if (!adorned) return input;
  return (
    <Box
      display="flex"
      alignItems="center"
      gap={8}
      _focusWithin={FOCUS_RING}
      style={{ boxSizing: 'border-box', ...surface }}
    >
      {startElement !== undefined && <span style={ADORNMENT}>{startElement}</span>}
      {input}
      {endElement !== undefined && <span style={ADORNMENT}>{endElement}</span>}
    </Box>
  );
});

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  invalid?: boolean;
  /** Visible lines; with `autoResize`, the height it starts at. Defaults to 3. */
  rows?: number;
  /** Grow and shrink with the content, from `rows` lines up to `maxRows`. */
  autoResize?: boolean;
  /** With `autoResize`, the most lines shown before the text scrolls. */
  maxRows?: number;
}

/** Vertical padding plus borders of the themed field, in px. */
const FIELD_CHROME = 18;

let fieldSizing: boolean | undefined;
function supportsFieldSizing(): boolean {
  fieldSizing ??= typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content');
  return fieldSizing;
}

/** Without `field-sizing`, size the box to its content by hand. */
function fitToContent(el: HTMLTextAreaElement): void {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
}

/**
 * A themed multi-line input. `autoResize` grows it with its content between
 * `rows` and `maxRows` lines, through `field-sizing: content` where the
 * browser has it and a measured height where it does not.
 *
 * @example
 * ```tsx
 * <TextArea autoResize rows={2} maxRows={8} placeholder="Write a reply" />
 * ```
 */
export const TextArea = /* @__PURE__ */ forwardRef(function TextArea(
  {
    invalid,
    disabled,
    rows = 3,
    autoResize = false,
    maxRows,
    style,
    onInput,
    ...rest
  }: TextAreaProps,
  ref: Ref<HTMLTextAreaElement>,
): ReactElement {
  const ctx = useFieldContext();
  const isInvalid = invalid ?? ctx?.invalid ?? false;
  const isDisabled = disabled ?? ctx?.disabled ?? false;
  const own = useRef<HTMLTextAreaElement | null>(null);
  const measured = autoResize && typeof window !== 'undefined' && !supportsFieldSizing();
  useIsomorphicLayoutEffect(() => {
    if (measured && own.current !== null) fitToContent(own.current);
  }, [measured, rest.value]);
  const sizing: CSSProperties = autoResize
    ? ({
        fieldSizing: 'content',
        resize: 'none',
        boxSizing: 'border-box',
        minHeight: `calc(${rows}lh + ${FIELD_CHROME}px)`,
        ...(maxRows !== undefined ? { maxHeight: `calc(${maxRows}lh + ${FIELD_CHROME}px)` } : {}),
      } as CSSProperties)
    : { resize: 'vertical' };
  return (
    <textarea
      ref={(node) => {
        own.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref !== null) (ref as { current: HTMLTextAreaElement | null }).current = node;
      }}
      rows={rows}
      style={{ ...inputStyle(isInvalid, isDisabled), ...sizing, ...style }}
      onInput={(e) => {
        if (measured) fitToContent(e.currentTarget);
        onInput?.(e);
      }}
      {...pickAriaProps(ctx)}
      {...(isDisabled ? { disabled: true } : {})}
      {...rest}
    />
  );
});

export interface NumberInputProps extends Omit<InputProps, 'type'> {}
export const NumberInput = /* @__PURE__ */ forwardRef(function NumberInput(
  props: NumberInputProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  return <Input ref={ref} type="number" inputMode="numeric" {...props} />;
});

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  /** Show the eye-toggle to switch between obscured and plain text.
   * Defaults to true. */
  togglable?: boolean;
}
export const PasswordInput = /* @__PURE__ */ forwardRef(function PasswordInput(
  { togglable = true, ...rest }: PasswordInputProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  const messages = useMessages();
  const [visible, setVisible] = useState(false);
  if (!togglable) {
    return <Input ref={ref} type="password" {...rest} />;
  }
  return (
    <Box display="inline-flex" alignItems="center" position="relative" w="$full">
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        style={{ paddingRight: 40 }}
        {...rest}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        aria-label={visible ? messages.hidePassword : messages.showPassword}
        position="absolute"
        right={0}
        top={0}
        bottom={0}
        px="$3"
        bg="transparent"
        borderWidth={0}
        cursor="pointer"
        color="$colors.text.muted"
        {...({ type: 'button' } as Record<string, string>)}
      >
        {visible ? '🙈' : '👁'}
      </Pressable>
    </Box>
  );
});
