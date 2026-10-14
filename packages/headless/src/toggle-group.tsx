'use client';

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useControllableState } from './use-controllable-state.js';

/**
 * Toggle - a button that stays pressed, and ToggleGroup - a row of them
 * holding one or several pressed values with roving focus.
 *
 * ```tsx
 * <Toggle pressed={bold} onPressedChange={setBold} aria-label="Bold">B</Toggle>
 *
 * <ToggleGroup type="multiple" value={marks} onValueChange={setMarks} aria-label="Text style">
 *   <ToggleGroupItem value="bold" aria-label="Bold">B</ToggleGroupItem>
 *   <ToggleGroupItem value="italic" aria-label="Italic">I</ToggleGroupItem>
 * </ToggleGroup>
 * ```
 */

export interface ToggleProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'value' | 'defaultValue'
> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

/** A button that stays pressed: `aria-pressed` and `data-state="on" | "off"`. */
export function Toggle({
  pressed: controlled,
  defaultPressed = false,
  onPressedChange,
  onClick,
  ...rest
}: ToggleProps): ReactElement {
  const [pressed, setPressed] = useControllableState({
    value: controlled,
    defaultValue: defaultPressed,
    onChange: onPressedChange,
  });
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-state={pressed ? 'on' : 'off'}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        if (!e.defaultPrevented) setPressed(!pressed);
      }}
      {...rest}
    />
  );
}

interface ToggleGroupContextValue {
  readonly value: ReadonlyArray<string>;
  readonly toggle: (item: string) => void;
  readonly disabled: boolean;
  /** The item that holds the group's single tab stop, if any. */
  readonly tabStop: string | undefined;
  readonly setFocused: (item: string) => void;
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

const NO_VALUES: ReadonlyArray<string> = [];
const ITEM_SELECTOR = '[data-motif-toggle-item]:not(:disabled)';

export interface ToggleGroupProps {
  /** One pressed item at a time, or any number. Defaults to `'single'`. */
  type?: 'single' | 'multiple';
  /** The pressed values; in single mode, at most one. */
  value?: ReadonlyArray<string>;
  defaultValue?: ReadonlyArray<string>;
  onValueChange?: (value: ReadonlyArray<string>) => void;
  /** Which arrow keys move focus. Defaults to `'horizontal'`. */
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** A row of toggles holding one or several pressed values, with roving focus. */
export function ToggleGroup({
  type = 'single',
  value: controlled,
  defaultValue = NO_VALUES,
  onValueChange,
  orientation = 'horizontal',
  disabled = false,
  style,
  children,
  ...aria
}: ToggleGroupProps): ReactElement {
  const [value, setValue] = useControllableState({
    value: controlled,
    defaultValue,
    onChange: onValueChange,
  });
  const current = value ?? NO_VALUES;
  const [focused, setFocused] = useState<string | undefined>(undefined);
  const tabStop = focused ?? current[0];
  const groupRef = useRef<HTMLDivElement | null>(null);

  const ctx = useMemo<ToggleGroupContextValue>(
    () => ({
      value: current,
      disabled,
      tabStop,
      setFocused,
      toggle: (item) => {
        const on = current.includes(item);
        if (type === 'single') setValue(on ? NO_VALUES : [item]);
        else setValue(on ? current.filter((v) => v !== item) : [...current, item]);
      },
    }),
    [current, disabled, tabStop, type, setValue],
  );

  function items(): HTMLElement[] {
    return Array.from(groupRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    const next = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
    const prev = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
    if (![next, prev, 'Home', 'End'].includes(e.key)) return;
    const list = items();
    if (list.length === 0) return;
    e.preventDefault();
    const at = list.indexOf(document.activeElement as HTMLElement);
    const target =
      e.key === 'Home'
        ? list[0]
        : e.key === 'End'
          ? list[list.length - 1]
          : e.key === next
            ? list[(at + 1) % list.length]
            : list[(at - 1 + list.length) % list.length];
    target?.focus();
  }

  // With no item holding the tab stop yet, the group itself takes it and hands
  // focus to its first enabled item.
  const groupTakesTab = tabStop === undefined && !disabled;
  return (
    <ToggleGroupContext.Provider value={ctx}>
      <div
        ref={groupRef}
        role="group"
        data-orientation={orientation}
        data-disabled={disabled || undefined}
        tabIndex={groupTakesTab ? 0 : undefined}
        onFocus={(e: FocusEvent<HTMLDivElement>) => {
          if (e.target === e.currentTarget) items()[0]?.focus();
        }}
        onKeyDown={onKeyDown}
        style={style}
        {...aria}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

export interface ToggleGroupItemProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'value'
> {
  value: string;
}

/** One toggle in a `ToggleGroup`. */
export function ToggleGroupItem({
  value,
  disabled,
  onClick,
  onFocus,
  ...rest
}: ToggleGroupItemProps): ReactElement {
  const group = useContext(ToggleGroupContext);
  if (group === null) throw new Error('ToggleGroupItem must be inside ToggleGroup.');
  const pressed = group.value.includes(value);
  const off = disabled === true || group.disabled;
  return (
    <button
      type="button"
      data-motif-toggle-item=""
      aria-pressed={pressed}
      data-state={pressed ? 'on' : 'off'}
      disabled={off}
      tabIndex={group.tabStop === value ? 0 : -1}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        if (!e.defaultPrevented && !off) group.toggle(value);
      }}
      onFocus={(e: FocusEvent<HTMLButtonElement>) => {
        onFocus?.(e);
        group.setFocused(value);
      }}
      {...rest}
    />
  );
}
