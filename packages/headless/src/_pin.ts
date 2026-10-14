/** The characters a PinInput accepts. */
export type PinType = 'numeric' | 'alphanumeric';

const ALLOWED: Record<PinType, RegExp> = {
  numeric: /[0-9]/,
  alphanumeric: /[0-9a-zA-Z]/,
};

/** The characters of `text` a pin of this type accepts, in order. */
export function pinChars(text: string, type: PinType): string[] {
  return [...text].filter((c) => ALLOWED[type].test(c));
}

/** A pin edit: the new value, and the box to focus next. */
export interface PinEdit {
  readonly value: string;
  readonly focus: number;
}

/**
 * Typing or pasting `text` into box `index`: its accepted characters overwrite
 * from that box onward, capped at `length`, and focus moves past the last one
 * written. Nothing accepted leaves the value and focus where they were.
 */
export function pinInput(
  value: string,
  index: number,
  text: string,
  length: number,
  type: PinType,
): PinEdit {
  const chars = pinChars(text, type);
  if (chars.length === 0) return { value, focus: index };
  // A box past the end of the value starts writing where the value ends, so
  // the code stays one contiguous string.
  const start = Math.min(index, value.length);
  const next = [...value];
  chars.slice(0, length - start).forEach((c, i) => {
    next[start + i] = c;
  });
  const written = Math.min(chars.length, length - start);
  return { value: next.join('').slice(0, length), focus: Math.min(start + written, length - 1) };
}

/** Backspace in box `index`: clears it, or the box before when it is already empty. */
export function pinBackspace(value: string, index: number): PinEdit {
  if (index < value.length) {
    return { value: value.slice(0, index) + value.slice(index + 1), focus: Math.max(index - 1, 0) };
  }
  if (index === 0 || value.length === 0) return { value, focus: 0 };
  const target = Math.min(index - 1, value.length - 1);
  return { value: value.slice(0, target) + value.slice(target + 1), focus: target };
}
