'use client';

import { useCallback, useState } from 'react';

export interface UseControllableStateOptions<T> {
  /** The controlled value. Leave `undefined` to let the hook hold the state. */
  value: T | undefined;
  /** The starting value while uncontrolled. */
  defaultValue?: T | undefined;
  /** Called with every new value, controlled or not. */
  onChange?: ((next: T) => void) | undefined;
  /**
   * Overrides how controlled-ness is decided, which is `value !== undefined` by
   * default. Pass `'value' in props` when `value={undefined}` must stay
   * controlled-and-empty.
   */
  controlled?: boolean;
}

/**
 * State that a parent can own through a value and change callback, or leave to
 * the component. While uncontrolled the hook keeps the value itself; either way
 * the setter reports every change through `onChange`. The value is typed `T`
 * only when a `defaultValue` is given and `controlled` is not, the one case
 * where it can never be `undefined`.
 *
 * @example
 * ```tsx
 * function Toggle({ pressed, defaultPressed = false, onPressedChange }: ToggleProps) {
 *   const [on, setOn] = useControllableState({
 *     value: pressed,
 *     defaultValue: defaultPressed,
 *     onChange: onPressedChange,
 *   });
 *   return <button aria-pressed={on} onClick={() => setOn(!on)} />;
 * }
 * ```
 */
export function useControllableState<T>(
  options: UseControllableStateOptions<T> & { defaultValue: T; controlled?: undefined },
): [T, (next: T) => void];
export function useControllableState<T>(
  options: UseControllableStateOptions<T>,
): [T | undefined, (next: T) => void];
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
  controlled = value !== undefined,
}: UseControllableStateOptions<T>): [T | undefined, (next: T) => void] {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const set = useCallback(
    (next: T) => {
      if (!controlled) setUncontrolled(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [controlled ? value : uncontrolled, set];
}
