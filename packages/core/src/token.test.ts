import { describe, expect, it } from 'vitest';
import { isTokenRef, resolveToken, resolveValue } from './token.js';
import type { Theme } from './types.js';

const theme: Theme = {
  name: 'test',
  tokens: {
    colors: {
      blue: { 50: '#eff6ff', 500: '#3b82f6', 900: '#1e3a8a' },
      gray: { 50: '#f9fafb', 900: '#111827' },
      // Semantic - value is a $ref to a primitive
      surface: { base: '$colors.gray.50', raised: '$colors.gray.900' },
      action: { primary: { bg: '$colors.blue.500', fg: '#ffffff' } },
    },
    // Half-steps mirror the default `space` scale, whose keys contain dots.
    space: { 0: 0, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 4: 16 },
    radii: { sm: 4, md: 8, lg: 12 },
    // Cycle to test cycle protection
    cycle: { a: '$cycle.b', b: '$cycle.a' },
  },
};

describe('isTokenRef', () => {
  it('recognizes $-prefixed strings', () => {
    expect(isTokenRef('$primary')).toBe(true);
    expect(isTokenRef('$colors.blue.500')).toBe(true);
  });

  it('rejects non-references', () => {
    expect(isTokenRef('primary')).toBe(false);
    expect(isTokenRef('')).toBe(false);
    expect(isTokenRef('$')).toBe(false);
    expect(isTokenRef(16)).toBe(false);
    expect(isTokenRef(null)).toBe(false);
    expect(isTokenRef(undefined)).toBe(false);
  });
});

describe('resolveToken - explicit scale paths', () => {
  it('resolves a primitive scalar', () => {
    expect(resolveToken('$colors.blue.500', theme)).toBe('#3b82f6');
  });

  it('resolves numeric scales', () => {
    expect(resolveToken('$space.4', theme)).toBe(16);
    expect(resolveToken('$radii.md', theme)).toBe(8);
  });

  it('returns undefined for unknown paths', () => {
    expect(resolveToken('$colors.purple.500', theme)).toBeUndefined();
    expect(resolveToken('$space.99', theme)).toBeUndefined();
  });

  it('returns undefined when path stops at an interior node', () => {
    expect(resolveToken('$colors.blue', theme)).toBeUndefined();
  });
});

describe('resolveToken - semantic indirection', () => {
  it('follows a single level of $ref indirection', () => {
    expect(resolveToken('$colors.surface.base', theme)).toBe('#f9fafb');
    expect(resolveToken('$colors.surface.raised', theme)).toBe('#111827');
  });

  it('follows nested semantic structures', () => {
    expect(resolveToken('$colors.action.primary.bg', theme)).toBe('#3b82f6');
    expect(resolveToken('$colors.action.primary.fg', theme)).toBe('#ffffff');
  });

  it('short-circuits on cycles', () => {
    expect(resolveToken('$cycle.a', theme)).toBeUndefined();
  });
});

describe('resolveToken - defaultScale fallback', () => {
  it('uses defaultScale when the head segment is unknown', () => {
    expect(resolveToken('$blue.500', theme, { defaultScale: 'colors' })).toBe('#3b82f6');
    expect(resolveToken('$4', theme, { defaultScale: 'space' })).toBe(16);
  });

  it('prefers explicit scale over defaultScale', () => {
    // $colors.blue.500 has 'colors' as known scale - defaultScale ignored.
    expect(resolveToken('$colors.blue.500', theme, { defaultScale: 'space' })).toBe('#3b82f6');
  });

  it('returns undefined when neither path resolves', () => {
    expect(resolveToken('$nope', theme, { defaultScale: 'colors' })).toBeUndefined();
  });
});

describe('resolveValue', () => {
  it('passes literal values through unchanged', () => {
    expect(resolveValue(16, theme)).toBe(16);
    expect(resolveValue('20px', theme)).toBe('20px');
  });

  it('resolves token refs via the theme', () => {
    expect(resolveValue('$space.4', theme)).toBe(16);
    expect(resolveValue('$colors.blue.500', theme)).toBe('#3b82f6');
  });

  it('returns undefined for refs without a theme', () => {
    expect(resolveValue('$space.4', undefined)).toBeUndefined();
  });

  it('returns undefined for unresolved refs', () => {
    expect(resolveValue('$nope', theme)).toBeUndefined();
  });

  it('passes undefined through', () => {
    expect(resolveValue(undefined, theme)).toBeUndefined();
  });
});

describe('resolveToken - prototype-chain safety (#271)', () => {
  it('does not resolve inherited Object.prototype members as token values', () => {
    expect(resolveToken('$colors.valueOf', theme)).toBeUndefined();
    expect(resolveToken('$colors.constructor', theme)).toBeUndefined();
    expect(resolveToken('$colors.hasOwnProperty', theme)).toBeUndefined();
    expect(resolveToken('$colors.toString', theme)).toBeUndefined();
    // eslint-disable-next-line no-proto
    expect(resolveToken('$colors.__proto__', theme)).toBeUndefined();
  });
});

describe('resolveToken - token keys containing dots', () => {
  it('resolves the half-step keys the default space scale ships', () => {
    expect(resolveToken('$space.0.5', theme)).toBe(2);
    expect(resolveToken('$space.1.5', theme)).toBe(6);
    expect(resolveToken('$space.2.5', theme)).toBe(10);
  });

  it('still resolves the neighbouring whole steps', () => {
    expect(resolveToken('$space.1', theme)).toBe(4);
    expect(resolveToken('$space.2', theme)).toBe(8);
  });

  it('resolves a dotted key through defaultScale', () => {
    expect(resolveToken('$1.5', theme, { defaultScale: 'space' })).toBe(6);
  });

  it('leaves nested non-numeric paths alone', () => {
    expect(resolveToken('$colors.blue.500', theme)).toBe('#3b82f6');
    expect(resolveToken('$colors.action.primary.bg', theme)).toBe('#3b82f6');
  });

  it('falls back to the naive split for a genuinely nested numeric path', () => {
    const nested: Theme = {
      name: 'nested',
      tokens: { space: { 1: { 5: 99 } } } as unknown as Theme['tokens'],
    };
    expect(resolveToken('$space.1.5', nested)).toBe(99);
  });

  it('prefers a nested path over a literal dotted key when both exist', () => {
    // The plain segment walk runs first, so nothing that resolved before this
    // change resolves differently after it. The dotted key is the fallback.
    const both: Theme = {
      name: 'both',
      tokens: { space: { 1: { 5: 99 }, '1.5': 6 } } as unknown as Theme['tokens'],
    };
    expect(resolveToken('$space.1.5', both)).toBe(99);
  });

  it('returns undefined for a dotted key the theme does not define', () => {
    expect(resolveToken('$space.9.5', theme)).toBeUndefined();
  });
});

describe('resolveToken - fallback chains', () => {
  const withComponents: Theme = {
    ...theme,
    tokens: { ...theme.tokens, components: { button: { bg: '$colors.blue.500' } } },
  };

  it('resolves the first alternative the theme defines', () => {
    expect(resolveToken('$components.button.bg ?? $colors.nope', withComponents)).toBe('#3b82f6');
    expect(resolveToken('$components.button.bg ?? $colors.action.primary.bg', theme)).toBe(
      '#3b82f6',
    );
    expect(resolveToken('$components.card.bg ?? $colors.nope ?? $space.4', theme)).toBe(16);
  });

  it('takes a trailing literal as the default, and is undefined when nothing resolves', () => {
    expect(resolveToken('$components.button.bg ?? 4px', theme)).toBe('4px');
    expect(resolveToken('$components.button.bg ?? $colors.nope', theme)).toBeUndefined();
  });
});
