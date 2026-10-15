/**
 * Shortcut strings such as `'mod+k'` or `'shift+/'`: `+`-separated modifiers
 * (`mod`, `ctrl`, `cmd`, `shift`, `alt`) then one key. `mod` is Command on
 * Apple platforms and Ctrl elsewhere.
 */
export interface ParsedShortcut {
  readonly key: string;
  readonly mods: ReadonlySet<string>;
}

export function parseShortcut(combo: string): ParsedShortcut {
  const parts = combo
    .toLowerCase()
    .split('+')
    .map((s) => s.trim());
  return { key: parts[parts.length - 1] ?? '', mods: new Set(parts.slice(0, -1)) };
}

interface KeyLike {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

/** Whether a key event matches the shortcut. Unlisted modifiers are not checked. */
export function matchesShortcut(shortcut: ParsedShortcut, e: KeyLike, isMac: boolean): boolean {
  if (e.key.toLowerCase() !== shortcut.key) return false;
  const { mods } = shortcut;
  if (mods.has('mod') && !(isMac ? e.metaKey : e.ctrlKey)) return false;
  if (mods.has('ctrl') && !e.ctrlKey) return false;
  if (mods.has('cmd') && !e.metaKey) return false;
  if (mods.has('shift') && !e.shiftKey) return false;
  if (mods.has('alt') && !e.altKey) return false;
  return true;
}

const MAC_GLYPH: Record<string, string> = { mod: '⌘', cmd: '⌘', ctrl: '⌃', alt: '⌥', shift: '⇧' };
const OTHER_NAME: Record<string, string> = {
  mod: 'Ctrl',
  cmd: 'Meta',
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
};
// Apple lists Control, Option, Shift, Command; Windows and Linux lead with Ctrl.
const MAC_ORDER = ['ctrl', 'alt', 'shift', 'mod', 'cmd'];
const OTHER_ORDER = ['mod', 'ctrl', 'alt', 'shift', 'cmd'];

/**
 * The shortcut as a user reads it: `⌘⇧K` on Apple platforms, `Ctrl+Shift+K`
 * elsewhere, in each platform's usual modifier order.
 */
export function formatShortcut(combo: string, isMac: boolean): string {
  const { key, mods } = parseShortcut(combo);
  const keyLabel =
    key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
  const order = isMac ? MAC_ORDER : OTHER_ORDER;
  // `mod` and `ctrl` both read Ctrl off Apple platforms, so drop repeats.
  const names = [
    ...new Set(order.filter((m) => mods.has(m)).map((m) => (isMac ? MAC_GLYPH : OTHER_NAME)[m])),
  ];
  return isMac ? names.join('') + keyLabel : [...names, keyLabel].join('+');
}

/** Whether the event came from somewhere the user types: an input, textarea, select, or editable element. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (target === null || typeof (target as Element).tagName !== 'string') return false;
  const el = target as HTMLElement;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  );
}
