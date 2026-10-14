'use client';

import type { MotifComponent } from '@usemotif/core';

import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useId,
  useRef,
  useState,
  type CSSProperties,
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
}
const FieldContext = createContext<FieldContextValue | null>(null);
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
        invalid,
        disabled,
        required,
        hasHelp,
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
export const FieldError: MotifComponent<FieldErrorProps, ReactElement | null> = function ({
  children,
  ...rest
}: FieldErrorProps): ReactElement {
  const ctx = useFieldContext();
  return (
    <Text
      role="alert"
      fontSize="$sm"
      color="$colors.action.danger.bg"
      {...(ctx !== null ? ({ id: ctx.errorId } as Record<string, string>) : {})}
      {...rest}
    >
      {children}
    </Text>
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
        aria-label={visible ? 'Hide password' : 'Show password'}
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
