import { describe, expect, it } from 'vitest';
import {
  themeToCssBlock,
  themeToCssVars,
  themesToCssBlock,
  tokenPathToCssVarName,
  tokenRefToCssVar,
} from './css-vars.js';
import type { Theme } from './types.js';

describe('tokenPathToCssVarName', () => {
  it('builds a flat hyphenated name from scale + path', () => {
    expect(tokenPathToCssVarName('colors', ['blue', '500'])).toBe('--colors-blue-500');
    expect(tokenPathToCssVarName('space', ['4'])).toBe('--space-4');
  });

  it('encodes dots in segments to underscores so the result is valid CSS', () => {
    expect(tokenPathToCssVarName('space', ['0.5'])).toBe('--space-0_5');
    expect(tokenPathToCssVarName('space', ['2.5'])).toBe('--space-2_5');
  });

  it('handles deeply nested paths', () => {
    expect(tokenPathToCssVarName('colors', ['action', 'primary', 'bg'])).toBe(
      '--colors-action-primary-bg',
    );
  });
});

describe('tokenRefToCssVar', () => {
  it('rewrites explicit-scale refs to var()', () => {
    expect(tokenRefToCssVar('$colors.blue.500')).toBe('var(--colors-blue-500)');
    expect(tokenRefToCssVar('$space.4')).toBe('var(--space-4)');
  });

  it('uses defaultScale for bare refs', () => {
    expect(tokenRefToCssVar('$primary', 'colors')).toBe('var(--colors-primary)');
    expect(tokenRefToCssVar('$4', 'space')).toBe('var(--space-4)');
  });

  it('returns undefined for bare refs with no defaultScale', () => {
    expect(tokenRefToCssVar('$primary')).toBeUndefined();
  });
});

const lightLike: Theme = {
  name: 'light',
  tokens: {
    colors: {
      white: '#ffffff',
      gray: { 50: '#fafafa', 900: '#18181b' },
      surface: { base: '$colors.white', muted: '$colors.gray.50' },
    },
    space: { 0: 0, 4: 16, '0.5': 2 },
    radii: { md: 8 },
    opacities: { 50: 0.5 },
  },
};

describe('themeToCssVars', () => {
  it('flattens the token tree into name → value entries', () => {
    const map = themeToCssVars(lightLike);
    expect(map.get('--colors-white')).toBe('#ffffff');
    expect(map.get('--colors-gray-50')).toBe('#fafafa');
    expect(map.get('--space-4')).toBe('16px');
    expect(map.get('--space-0_5')).toBe('2px');
    expect(map.get('--radii-md')).toBe('8px');
  });

  it('non-length scales emit bare numbers (no px)', () => {
    const map = themeToCssVars(lightLike);
    expect(map.get('--opacities-50')).toBe('0.5');
  });

  it('semantic refs become var() chains', () => {
    const map = themeToCssVars(lightLike);
    expect(map.get('--colors-surface-base')).toBe('var(--colors-white)');
    expect(map.get('--colors-surface-muted')).toBe('var(--colors-gray-50)');
  });
});

describe('themeToCssBlock', () => {
  it('produces a valid CSS rule scoped to the theme name', () => {
    const block = themeToCssBlock(lightLike);
    expect(block).toContain('[data-theme="light"] {');
    expect(block).toContain('--colors-white: #ffffff;');
    expect(block).toContain('--space-4: 16px;');
    expect(block).toContain('--colors-surface-base: var(--colors-white);');
    expect(block.trim().endsWith('}')).toBe(true);
  });

  // Regression: an unescaped theme name could break out of the attribute
  // selector and inject arbitrary CSS into the emitted stylesheet. After
  // the fix every `"` from the name is escaped to `\"`, so the injected
  // `{ ... }` text stays inside the (harmless, never-matching) quoted
  // attribute value instead of becoming a top-level rule.
  it('escapes a malicious theme name so it cannot break out of the selector', () => {
    const evil: Theme = {
      name: '"] { } body { display: none } [x="',
      tokens: { colors: { white: '#fff' } },
    };
    const block = themeToCssBlock(evil);
    const firstLine = block.split('\n')[0]!;
    // The selector line: both the name's `"` and our delimiters present,
    // but every name-quote is backslash-escaped so the attribute value is
    // never closed early. Exact match proves there is no breakout.
    expect(firstLine).toBe('[data-theme="\\"] { } body { display: none } [x=\\""] {');
    // The variable declaration is still inside this single block.
    expect(block).toContain('--colors-white: #fff;');
  });

  it('escapes newlines in the theme name', () => {
    const block = themeToCssBlock({ name: 'a\nb', tokens: {} });
    const firstLine = block.split('\n')[0]!;
    expect(firstLine).toBe('[data-theme="a\\a b"] {');
  });

  // Regression: token values frequently come from imported/third-party
  // design-token JSON. A value containing `}` (or `;` plus a selector) must
  // not be able to close the rule block and inject a top-level rule.
  it('escapes a malicious token value so it cannot break out of the rule block', () => {
    const evil: Theme = {
      name: 'light',
      tokens: { colors: { evil: 'red; } body { display: none } a { x:' } },
    };
    const block = themeToCssBlock(evil);
    // No raw `}` survived in the declaration value (the only literal `}` is
    // the block terminator on its own line).
    const declLine = block.split('\n').find((l) => l.includes('--colors-evil'))!;
    expect(declLine).not.toMatch(/[};]\s*body/);
    expect(declLine).not.toContain('}');
    expect(declLine).toContain('\\7d '); // `}` is hex-escaped
    expect(declLine).toContain('\\3b '); // `;` is hex-escaped
    // Exactly one closing brace in the whole block - the real terminator.
    expect(block.match(/}/g)?.length ?? 0).toBe(1);
  });

  it('leaves legitimate token values byte-identical', () => {
    const block = themeToCssBlock(lightLike);
    expect(block).toContain('--colors-white: #ffffff;');
    expect(block).toContain('--colors-surface-base: var(--colors-white);');
  });

  // Regression: token *keys* (not just values) come from the same untrusted
  // design-token JSON. A key containing `}` was previously emitted verbatim
  // into the custom-property name, closing the rule block and injecting a
  // top-level rule. After the fix the structural characters in the name are
  // hex-escaped, so nothing breaks out.
  it('escapes a malicious token key so it cannot break out of the rule block', () => {
    const evil: Theme = {
      name: 'light',
      tokens: { colors: { 'x;} body{display:none} .y{color': 'red' } },
    };
    const block = themeToCssBlock(evil);
    expect(block).not.toContain('body{display:none}');
    expect(block).not.toMatch(/}\s*body/);
    // Exactly one closing brace in the whole block - the real terminator.
    expect(block.match(/}/g)?.length ?? 0).toBe(1);
  });

  it('leaves legitimate token keys byte-identical (dots become underscores)', () => {
    const block = themeToCssBlock({
      name: 'light',
      tokens: { space: { '0.5': 2, '2': 8 } },
    });
    expect(block).toContain('--space-0_5: 2px;');
    expect(block).toContain('--space-2: 8px;');
  });
});

describe('themesToCssBlock', () => {
  it('concatenates blocks with double-newline separators', () => {
    const dark: Theme = { name: 'dark', tokens: { colors: { white: '#000000' } } };
    const block = themesToCssBlock([lightLike, dark]);
    expect(block).toContain('[data-theme="light"]');
    expect(block).toContain('[data-theme="dark"]');
    // Each theme has its own block.
    const lightIdx = block.indexOf('[data-theme="light"]');
    const darkIdx = block.indexOf('[data-theme="dark"]');
    expect(lightIdx).toBeLessThan(darkIdx);
  });
});

describe('tokenRefToCssVar - dotted token keys', () => {
  it('segments a dotted key the same way resolveToken does', () => {
    // The theme block emits `--space-1_5`; a mismatch here would produce a
    // var() reference to a property that was never defined.
    expect(tokenRefToCssVar('$space.1.5')).toBe('var(--space-1_5)');
    expect(tokenRefToCssVar('$space.0.5')).toBe('var(--space-0_5)');
  });

  it('agrees with tokenPathToCssVarName for the same key', () => {
    expect(tokenRefToCssVar('$space.2.5')).toBe(`var(${tokenPathToCssVarName('space', ['2.5'])})`);
  });

  it('resolves a dotted key through defaultScale', () => {
    expect(tokenRefToCssVar('$1.5', 'space')).toBe('var(--space-1_5)');
  });

  it('leaves nested non-numeric paths unchanged', () => {
    expect(tokenRefToCssVar('$colors.blue.500')).toBe('var(--colors-blue-500)');
  });
});

describe('themeToCssBlock - colorScheme', () => {
  it('emits color-scheme in the theme block when the theme sets one', () => {
    const css = themeToCssBlock({ name: 'd', tokens: {}, colorScheme: 'dark' });
    expect(css).toContain('[data-theme="d"] {');
    expect(css).toContain('  color-scheme: dark;');
    expect(themeToCssBlock({ name: 'n', tokens: {} })).not.toContain('color-scheme');
  });
});
