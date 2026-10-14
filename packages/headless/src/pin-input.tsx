'use client';

import {
  useEffect,
  useRef,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { pinBackspace, pinInput, type PinType } from './_pin.js';
import { useControllableState } from './use-controllable-state.js';

export type { PinType } from './_pin.js';

export interface PinInputProps {
  /** How many characters the code has. Defaults to 6. */
  length?: number;
  /** Which characters are accepted. Defaults to `'numeric'`. */
  type?: PinType;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the code once every box is filled. */
  onComplete?: (value: string) => void;
  /** Hide the characters, as in a password field. */
  mask?: boolean;
  disabled?: boolean;
  /** Names the group of boxes. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Inline style for the group. */
  style?: CSSProperties;
  /** Inline style for each box. */
  inputStyle?: CSSProperties;
}

/**
 * What a change to a box added. One character typed beside the one the box
 * held is that character; anything else (an emptied box, a paste, an
 * autofilled code) is taken whole.
 */
function addedText(typed: string, held: string): string {
  if (held !== '' && typed.length === held.length + 1) {
    if (typed.startsWith(held)) return typed.slice(held.length);
    if (typed.endsWith(held)) return typed.slice(0, 1);
  }
  return typed;
}

/**
 * A one-time-code input: a box per character that advances as you type,
 * fills from a pasted or autofilled code, and steps back on Backspace.
 *
 * ```tsx
 * <PinInput length={6} onComplete={verify} aria-label="Verification code" />
 * ```
 */
export function PinInput({
  length = 6,
  type = 'numeric',
  value: controlled,
  defaultValue = '',
  onValueChange,
  onComplete,
  mask = false,
  disabled = false,
  style,
  inputStyle,
  ...aria
}: PinInputProps): ReactElement {
  const [value, setValue] = useControllableState({
    value: controlled,
    defaultValue,
    onChange: onValueChange,
  });
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const focus = (index: number): void => inputs.current[index]?.focus();

  // Fire once per completed code, not on every render while it stays full.
  const completedRef = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  useEffect(() => {
    if (value.length === length && completedRef.current !== value) {
      completedRef.current = value;
      onCompleteRef.current?.(value);
    } else if (value.length < length) {
      completedRef.current = null;
    }
  }, [value, length]);

  const write = (index: number, text: string): void => {
    const edit = pinInput(value, index, text, length, type);
    if (edit.value !== value) setValue(edit.value);
    focus(edit.focus);
  };

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const edit = pinBackspace(value, index);
      if (edit.value !== value) setValue(edit.value);
      focus(edit.focus);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focus(Math.max(index - 1, 0));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focus(Math.min(index + 1, length - 1, value.length));
    }
  }

  return (
    <div role="group" style={{ display: 'flex', gap: 8, ...style }} {...aria}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          type={mask ? 'password' : 'text'}
          inputMode={type === 'numeric' ? 'numeric' : 'text'}
          // Only the first box offers the autofill, so a code the browser or OS
          // supplies lands whole and is spread across the boxes.
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Character ${index + 1} of ${length}`}
          value={value[index] ?? ''}
          disabled={disabled}
          onChange={(e) => write(index, addedText(e.target.value, value[index] ?? ''))}
          onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
            e.preventDefault();
            write(index, e.clipboardData.getData('text'));
          }}
          onKeyDown={(e) => onKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          style={{ width: '2.5em', textAlign: 'center', ...inputStyle }}
        />
      ))}
    </div>
  );
}
