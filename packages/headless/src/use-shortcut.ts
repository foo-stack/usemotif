'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { formatShortcut, isTypingTarget, matchesShortcut, parseShortcut } from './_shortcut.js';

export interface UseShortcutOptions {
  /** Listen on this element only. Defaults to the whole window. */
  readonly target?: RefObject<HTMLElement | null>;
  /** Turn the shortcut off without unmounting. Defaults to `true`. */
  readonly enabled?: boolean;
  /**
   * Also fire while the user is typing in an input, textarea, select, or
   * editable element. Off by default, so a plain-key shortcut such as `'/'`
   * doesn't steal keystrokes.
   */
  readonly allowInInputs?: boolean;
  /** Call `preventDefault()` on a matching keydown. Defaults to `true`. */
  readonly preventDefault?: boolean;
}

function detectMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

/**
 * Calls `handler` when `combo` is pressed, such as `'mod+k'` or `'shift+/'`
 * (`mod` is Command on Apple platforms and Ctrl elsewhere), and returns the
 * shortcut's label for display, such as `⌘K` or `Ctrl+K`.
 *
 * The label starts in the non-Apple form and switches after mount, so server
 * and client render the same markup.
 *
 * @example
 * ```tsx
 * const label = useShortcut('mod+s', save);
 * <Button>Save <Kbd>{label}</Kbd></Button>
 * ```
 */
export function useShortcut(
  combo: string,
  handler: (event: KeyboardEvent) => void,
  { target, enabled = true, allowInInputs = false, preventDefault = true }: UseShortcutOptions = {},
): string {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => setIsMac(detectMac()), []);

  // Read through a ref so an inline handler doesn't re-subscribe every render.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    const shortcut = parseShortcut(combo);
    const mac = detectMac();
    const node: HTMLElement | Window = target?.current ?? window;
    function onKeyDown(event: Event): void {
      const e = event as KeyboardEvent;
      if (!allowInInputs && isTypingTarget(e.target)) return;
      if (!matchesShortcut(shortcut, e, mac)) return;
      if (preventDefault) e.preventDefault();
      handlerRef.current(e);
    }
    node.addEventListener('keydown', onKeyDown);
    return () => node.removeEventListener('keydown', onKeyDown);
  }, [combo, target, enabled, allowInInputs, preventDefault]);

  return formatShortcut(combo, isMac);
}
