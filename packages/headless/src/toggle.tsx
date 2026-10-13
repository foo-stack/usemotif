'use client';

import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { useControllableState } from './use-controllable-state.js';

/**
 * Toggle family - Switch / Checkbox / Radio / RadioGroup.
 *
 * Headless inputs that wire ARIA state without imposing a visual
 * style. Each renders an underlying `<input>` so it integrates
 * with native form submission, browser auto-fill, and reset
 * handling automatically. Visual styling: pass `style` /
 * `className` and motif primitives compose around them naturally.
 *
 * Switch is `<input type="checkbox" role="switch">` - same form
 * semantics, but assistive tech reads "switch" / "on/off" rather
 * than "checkbox" / "checked/unchecked", which matches the
 * mental model for binary on/off settings.
 */

interface ToggleBaseProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  invalid?: boolean;
}

export interface SwitchProps extends ToggleBaseProps {}
export const Switch = forwardRef(function Switch(
  { invalid, ...rest }: SwitchProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  return (
    <input
      ref={ref}
      type="checkbox"
      role="switch"
      {...(invalid ? { 'aria-invalid': true } : {})}
      {...rest}
    />
  );
});

export interface CheckboxProps extends ToggleBaseProps {
  /** Indeterminate state - set on the DOM input via ref. The
   * caller manages the indeterminate flag explicitly via the input
   * ref (browsers don't expose it as an attribute). When `true`,
   * checkbox renders with `aria-checked="mixed"`. */
  indeterminate?: boolean;
}
export const Checkbox = forwardRef(function Checkbox(
  { invalid, indeterminate, ...rest }: CheckboxProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  return (
    <input
      ref={(el) => {
        if (el !== null && indeterminate !== undefined) el.indeterminate = indeterminate;
        if (typeof ref === 'function') ref(el);
        else if (ref !== null && ref !== undefined)
          (ref as React.RefObject<HTMLInputElement | null>).current = el;
      }}
      type="checkbox"
      {...(indeterminate ? { 'aria-checked': 'mixed' as const } : {})}
      {...(invalid ? { 'aria-invalid': true } : {})}
      {...rest}
    />
  );
});

/**
 * Radio context - RadioGroup synchronises a name + a current
 * value across all child Radio inputs. Uncontrolled by default;
 * pass `value` + `onValueChange` to control externally.
 */
interface RadioContextValue {
  readonly name: string;
  readonly value: string | undefined;
  readonly setValue: (next: string) => void;
}
const RadioContext = createContext<RadioContextValue | null>(null);

export interface RadioGroupProps {
  /** Form `name` shared by every Radio inside. Generated when omitted. */
  name?: string;
  /** Controlled selected value. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (next: string) => void;
  /** Required for the group to announce as one composite control. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Inline style for the group container. */
  style?: CSSProperties;
  children?: ReactNode;
}
export function RadioGroup(props: RadioGroupProps): ReactElement {
  const { name, value, defaultValue, onValueChange, children, style, ...aria } = props;
  // Prop-presence detection so `value={undefined}` stays controlled-and-empty.
  const [current, setValue] = useControllableState({
    value: value,
    defaultValue,
    onChange: onValueChange,
    controlled: 'value' in props,
  });
  const reactId = useId();
  const groupName = name ?? `${reactId}-radio`;

  return (
    <RadioContext.Provider value={{ name: groupName, value: current, setValue }}>
      <div role="radiogroup" {...aria} style={style}>
        {children}
      </div>
    </RadioContext.Provider>
  );
}

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  value: string;
}
export const Radio = forwardRef(function Radio(
  { value, onChange, ...rest }: RadioProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  const ctx = useContext(RadioContext);
  if (ctx === null) throw new Error('Radio must be inside <RadioGroup>.');
  return (
    <input
      ref={ref}
      type="radio"
      name={ctx.name}
      value={value}
      checked={ctx.value === value}
      onChange={(e) => {
        onChange?.(e);
        if (!e.defaultPrevented) ctx.setValue(value);
      }}
      {...rest}
    />
  );
});
