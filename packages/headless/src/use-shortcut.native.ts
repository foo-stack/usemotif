import { Platform } from 'react-native';
import { formatShortcut } from './_shortcut.js';
import type { UseShortcutOptions } from './use-shortcut.js';

export type { UseShortcutOptions };

/**
 * Native: touch devices have no global hardware keyboard to listen to, so
 * the shortcut never fires. It still returns the label, in the Apple form on
 * iOS, so shared code can show it.
 */
export function useShortcut(
  combo: string,
  _handler: (event: KeyboardEvent) => void,
  _options?: UseShortcutOptions,
): string {
  return formatShortcut(combo, Platform.OS === 'ios' || Platform.OS === 'macos');
}
