'use client';

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { renderMenuItem, useMenuItemRegistration, useMenuLevel } from './_menu-level.js';
import { useControllableState } from './use-controllable-state.js';

/**
 * Checkbox, radio and label items, shared by Menu and ContextMenu at any depth.
 *
 * ```tsx
 * <Menu.CheckboxItem checked={wrap} onCheckedChange={setWrap}>Word wrap</Menu.CheckboxItem>
 * <Menu.Label>Sort by</Menu.Label>
 * <Menu.RadioGroup value={sort} onValueChange={setSort}>
 *   <Menu.RadioItem value="name">Name</Menu.RadioItem>
 *   <Menu.RadioItem value="date">Date</Menu.RadioItem>
 * </Menu.RadioGroup>
 * ```
 */

interface ToggleItemProps {
  disabled?: boolean;
  /** Close the menu after toggling. Defaults to `true`, as `Menu.Item` does. */
  closeOnSelect?: boolean;
  children?: ReactNode;
  /** Inline style passed straight through. */
  style?: CSSProperties;
  /** Project the item semantics onto a provided element instead of a `<div>`. */
  asChild?: boolean;
}

/** One checkable menu item, rendered for both the checkbox and the radio kind. */
function useToggleItem(
  role: 'menuitemcheckbox' | 'menuitemradio',
  checked: boolean,
  toggle: () => void,
  { disabled = false, closeOnSelect = true, children, style, asChild = false }: ToggleItemProps,
): ReactElement {
  const level = useMenuLevel(role === 'menuitemcheckbox' ? 'Menu.CheckboxItem' : 'Menu.RadioItem');
  const ref = useRef<HTMLElement | null>(null);
  useMenuItemRegistration(level, ref);

  function activate(): void {
    if (disabled) return;
    toggle();
    if (closeOnSelect) level.closeTree();
  }

  const itemProps = {
    role,
    tabIndex: -1,
    'aria-checked': checked,
    'aria-disabled': disabled || undefined,
    'data-state': checked ? 'checked' : 'unchecked',
    onClick: (e: MouseEvent<HTMLElement>) => {
      e.preventDefault();
      activate();
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    },
    onMouseEnter: () => level.setOpenSub(null),
  };
  const base: CSSProperties = { cursor: disabled ? 'not-allowed' : 'pointer', outline: 'none' };
  return renderMenuItem(ref, itemProps, base, style, children, asChild);
}

export interface MenuCheckboxItemProps extends ToggleItemProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

function CheckboxItem({
  checked: controlled,
  defaultChecked = false,
  onCheckedChange,
  ...rest
}: MenuCheckboxItemProps): ReactElement {
  const [checked, setChecked] = useControllableState({
    value: controlled,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
  });
  return useToggleItem('menuitemcheckbox', checked, () => setChecked(!checked), rest);
}

interface RadioGroupContextValue {
  readonly value: string | undefined;
  readonly setValue: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface MenuRadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Names the group for assistive technology. */
  label?: string;
  children?: ReactNode;
}

function RadioGroup({
  value: controlled,
  defaultValue,
  onValueChange,
  label,
  children,
}: MenuRadioGroupProps): ReactElement {
  const [value, setValue] = useControllableState<string | undefined>({
    value: controlled,
    defaultValue,
    onChange: onValueChange as ((next: string | undefined) => void) | undefined,
  });
  const ctx = useMemo(
    () => ({ value, setValue: (next: string) => setValue(next) }),
    [value, setValue],
  );
  return (
    <RadioGroupContext.Provider value={ctx}>
      <div role="group" aria-label={label}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface MenuRadioItemProps extends ToggleItemProps {
  value: string;
}

function RadioItem({ value, ...rest }: MenuRadioItemProps): ReactElement {
  const group = useContext(RadioGroupContext);
  if (group === null) throw new Error('Menu.RadioItem must be inside Menu.RadioGroup.');
  return useToggleItem('menuitemradio', group.value === value, () => group.setValue(value), rest);
}

export interface MenuLabelProps {
  children?: ReactNode;
  style?: CSSProperties;
}

/** A heading inside a menu. It is not an item, so the arrow keys pass over it. */
function Label({ children, style }: MenuLabelProps): ReactElement {
  return (
    <div role="presentation" style={style}>
      {children}
    </div>
  );
}

/**
 * Parts exported flat so `src/index.ts` can assemble the Menu and ContextMenu
 * namespaces in the server graph. Internal: the barrel does not list these.
 */
export {
  CheckboxItem as MenuCheckboxItem,
  RadioGroup as MenuRadioGroup,
  RadioItem as MenuRadioItem,
  Label as MenuLabel,
};
