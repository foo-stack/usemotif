import { describe, expect, it } from 'vitest';
import { formatShortcut, matchesShortcut, parseShortcut } from './_shortcut.js';

const key = (
  k: string,
  mods: Partial<Record<'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey', boolean>> = {},
) => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe('matchesShortcut', () => {
  it('reads mod as Command on Apple platforms and Ctrl elsewhere', () => {
    const s = parseShortcut('mod+k');
    expect(matchesShortcut(s, key('k', { metaKey: true }), true)).toBe(true);
    expect(matchesShortcut(s, key('k', { ctrlKey: true }), true)).toBe(false);
    expect(matchesShortcut(s, key('K', { ctrlKey: true }), false)).toBe(true);
    expect(matchesShortcut(s, key('j', { ctrlKey: true }), false)).toBe(false);
  });

  it('requires every listed modifier', () => {
    const s = parseShortcut('shift+alt+p');
    expect(matchesShortcut(s, key('p', { shiftKey: true, altKey: true }), false)).toBe(true);
    expect(matchesShortcut(s, key('p', { shiftKey: true }), false)).toBe(false);
  });
});

describe('formatShortcut', () => {
  it('uses glyphs on Apple platforms and names elsewhere, in platform order', () => {
    expect(formatShortcut('mod+shift+k', true)).toBe('⇧⌘K');
    expect(formatShortcut('mod+shift+k', false)).toBe('Ctrl+Shift+K');
    expect(formatShortcut('alt+enter', false)).toBe('Alt+Enter');
    expect(formatShortcut('/', true)).toBe('/');
  });
});
