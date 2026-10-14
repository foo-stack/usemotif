import { describe, expect, it } from 'vitest';
import { resolveResponsiveStylesToVars, resolveStyles, resolveStylesToVars } from './style.js';
import type { Theme } from './types.js';

const theme: Theme = {
  name: 'test',
  tokens: {
    colors: {
      blue: { 500: '#3b82f6' },
      surface: { base: '$colors.blue.500' },
    },
    space: { 0: 0, 1: 4, 4: 16 },
    radii: { md: 8 },
    sizes: { full: '100%' },
  },
};

describe('resolveStyles - basic mapping', () => {
  it('maps a known style prop to its CSS property', () => {
    const { style, rest } = resolveStyles({ p: 16 }, theme);
    expect(style).toEqual({ padding: 16 });
    expect(rest).toEqual({});
  });

  it('passes literal values through unchanged', () => {
    const { style } = resolveStyles({ width: 200, color: '#ff0000' }, theme);
    expect(style).toEqual({ width: 200, color: '#ff0000' });
  });

  it('separates non-style props into rest', () => {
    const { style, rest } = resolveStyles(
      { p: 16, onClick: () => {}, id: 'demo', children: 'hello' },
      theme,
    );
    expect(style).toEqual({ padding: 16 });
    expect(Object.keys(rest)).toEqual(['onClick', 'id', 'children']);
  });
});

describe('resolveStyles - token resolution', () => {
  it('resolves bare token refs using the prop scale', () => {
    const { style } = resolveStyles({ p: '$4', bg: '$blue.500' }, theme);
    expect(style).toEqual({ padding: 16, backgroundColor: '#3b82f6' });
  });

  it('resolves explicit-scale refs', () => {
    const { style } = resolveStyles({ p: '$space.4' }, theme);
    expect(style).toEqual({ padding: 16 });
  });

  it('resolves semantic refs', () => {
    const { style } = resolveStyles({ bg: '$colors.surface.base' }, theme);
    expect(style).toEqual({ backgroundColor: '#3b82f6' });
  });
});

describe('resolveStyles - shorthand expansion', () => {
  it('maps px to the logical paddingInline', () => {
    const { style } = resolveStyles({ px: '$4' }, theme);
    expect(style).toEqual({ paddingInline: 16 });
  });

  it('maps the logical inset shorthands (ps/pe/ms/me/start/end)', () => {
    const { style } = resolveStyles(
      { ps: '$1', pe: '$4', ms: '$1', me: '$4', start: '$1', end: '$4' },
      theme,
    );
    expect(style).toEqual({
      paddingInlineStart: 4,
      paddingInlineEnd: 16,
      marginInlineStart: 4,
      marginInlineEnd: 16,
      insetInlineStart: 4,
      insetInlineEnd: 16,
    });
  });

  it('expands my to marginTop + marginBottom', () => {
    const { style } = resolveStyles({ my: 8 }, theme);
    expect(style).toEqual({ marginTop: 8, marginBottom: 8 });
  });
});

describe('resolveStyles - bailouts', () => {
  it('drops null and undefined style props', () => {
    const { style } = resolveStyles({ p: undefined, m: null, bg: '#fff' }, theme);
    expect(style).toEqual({ backgroundColor: '#fff' });
  });

  it('drops unresolved token refs', () => {
    const { style } = resolveStyles({ p: '$nope', bg: '#fff' }, theme);
    expect(style).toEqual({ backgroundColor: '#fff' });
  });

  it('passes refs through as undefined when no theme is provided', () => {
    const { style } = resolveStyles({ p: '$4' }, undefined);
    // No theme → ref doesn't resolve → drop.
    expect(style).toEqual({});
  });
});

describe('resolveStyles - typography & layout', () => {
  it('handles non-tokenised props', () => {
    const { style } = resolveStyles(
      { display: 'flex', flexDirection: 'row', alignItems: 'center' },
      theme,
    );
    expect(style).toEqual({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    });
  });

  it('handles a kitchen-sink prop bag (literal mode)', () => {
    const { style, rest } = resolveStyles(
      {
        p: '$4',
        bg: '$blue.500',
        color: '#ffffff',
        borderRadius: '$md',
        w: '$full',
        display: 'flex',
        flexDirection: 'column',
        gap: '$1',
        children: 'hi',
        onClick: () => {},
      },
      theme,
    );
    expect(style).toEqual({
      padding: 16,
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      borderRadius: 8,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    });
    expect(Object.keys(rest)).toEqual(['children', 'onClick']);
  });
});

describe('background-* family (image, positioning, sizing, blending)', () => {
  it('passes a gradient backgroundImage through (the load-bearing case)', () => {
    const { style } = resolveStyles(
      {
        backgroundImage: 'linear-gradient(180deg,#FFD800 0%,#FDAB32 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      },
      theme,
    );
    expect(style).toEqual({
      backgroundImage: 'linear-gradient(180deg,#FFD800 0%,#FDAB32 100%)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    });
  });

  it('passes the rest of the family unchanged', () => {
    const { style } = resolveStyles(
      {
        background: 'red url(/x.png)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box',
        backgroundAttachment: 'fixed',
        backgroundBlendMode: 'multiply',
      },
      theme,
    );
    expect(style).toEqual({
      background: 'red url(/x.png)',
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box',
      backgroundAttachment: 'fixed',
      backgroundBlendMode: 'multiply',
    });
  });

  it('the gradient case survives the CSS-variable path', () => {
    const { style } = resolveStylesToVars({
      backgroundImage: 'linear-gradient(180deg,#FFD800 0%,#FDAB32 100%)',
      backgroundSize: 'cover',
    });
    expect(style).toEqual({
      backgroundImage: 'linear-gradient(180deg,#FFD800 0%,#FDAB32 100%)',
      backgroundSize: 'cover',
    });
  });
});

describe('text-flow props (whiteSpace, wordBreak, overflowWrap, hyphens, textOverflow)', () => {
  it('passes the canonical single-line ellipsis triplet through', () => {
    const { style } = resolveStyles(
      { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
      theme,
    );
    expect(style).toEqual({
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
  });

  it('passes wordBreak / overflowWrap / hyphens through unchanged', () => {
    const { style } = resolveStyles(
      { wordBreak: 'break-word', overflowWrap: 'anywhere', hyphens: 'auto' },
      theme,
    );
    expect(style).toEqual({
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
      hyphens: 'auto',
    });
  });

  it('the same triplet survives the CSS-variable path', () => {
    const { style } = resolveStylesToVars({
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
    expect(style).toEqual({
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
  });
});

describe('resolveStylesToVars - CSS variable mode', () => {
  it('emits var() refs for token refs (explicit and bare)', () => {
    const { style } = resolveStylesToVars({ p: '$4', bg: '$blue.500' });
    expect(style).toEqual({
      padding: 'var(--space-4)',
      backgroundColor: 'var(--colors-blue-500)',
    });
  });

  it('passes literal values through unchanged', () => {
    const { style } = resolveStylesToVars({ p: 16, bg: '#ff0000', display: 'flex' });
    expect(style).toEqual({ padding: 16, backgroundColor: '#ff0000', display: 'flex' });
  });

  it('expands shorthand to multiple CSS properties', () => {
    const { style } = resolveStylesToVars({ px: '$4', my: '$2' });
    expect(style).toEqual({
      paddingInline: 'var(--space-4)',
      marginTop: 'var(--space-2)',
      marginBottom: 'var(--space-2)',
    });
  });

  it('separates non-style props into rest', () => {
    const { style, rest } = resolveStylesToVars({
      p: '$4',
      onClick: () => {},
      children: 'hi',
    });
    expect(style).toEqual({ padding: 'var(--space-4)' });
    expect(Object.keys(rest)).toEqual(['onClick', 'children']);
  });

  it('drops null and undefined style props', () => {
    const { style } = resolveStylesToVars({ p: undefined, m: null, bg: '$blue.500' });
    expect(style).toEqual({ backgroundColor: 'var(--colors-blue-500)' });
  });

  it('drops refs that cannot be encoded (no scale info)', () => {
    // `display` has no scale, and a bare ref has no defaultScale either.
    const { style } = resolveStylesToVars({ display: '$something', p: '$4' });
    expect(style).toEqual({ padding: 'var(--space-4)' });
  });
});

describe('resolveResponsiveStylesToVars - media queries', () => {
  it('handles non-responsive props identically to resolveStylesToVars', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({ p: '$4', bg: '#fff' });
    expect(baseStyle).toEqual({ padding: 'var(--space-4)', backgroundColor: '#fff' });
    expect(atRules).toEqual([]);
  });

  it('routes `base` to the class block when a responsive prop has overrides', () => {
    // `base` lives in atRules with empty atRule (1.6) so it sits at the
    // same specificity as the breakpoint overrides; cascade order picks
    // the winner.
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: { base: '$2', md: '$4', lg: '$6' },
    });
    expect(baseStyle).toEqual({});
    expect(atRules).toEqual([
      { atRule: '', style: { padding: 'var(--space-2)' } },
      { atRule: '@media (min-width: 768px)', style: { padding: 'var(--space-4)' } },
      { atRule: '@media (min-width: 1024px)', style: { padding: 'var(--space-6)' } },
    ]);
  });

  it('keeps `base` in baseStyle when a responsive prop has no overrides', () => {
    // No siblings means no cascade fight - the inline path is fine and
    // saves a class-rule byte.
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: { base: '$2' },
    });
    expect(baseStyle).toEqual({ padding: 'var(--space-2)' });
    expect(atRules).toEqual([]);
  });

  it('emits breakpoints in mobile-first order regardless of object key order', () => {
    const { atRules } = resolveResponsiveStylesToVars({
      p: { lg: '$8', sm: '$2', md: '$4' },
    });
    expect(atRules.map((r) => r.atRule)).toEqual([
      '@media (min-width: 640px)',
      '@media (min-width: 768px)',
      '@media (min-width: 1024px)',
    ]);
  });

  it('expands shorthand inside responsive values', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      px: { base: '$2', md: '$4' },
    });
    expect(baseStyle).toEqual({});
    expect(atRules[0]).toEqual({
      atRule: '',
      style: { paddingInline: 'var(--space-2)' },
    });
    expect(atRules[1]?.style).toEqual({
      paddingInline: 'var(--space-4)',
    });
  });

  it('mixes responsive and non-responsive props in one bag', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: { base: '$2', md: '$4' },
      bg: '$colors.surface.base',
      display: 'flex',
    });
    // Non-responsive props stay inline; the responsive base hops to the
    // class block alongside its breakpoint overrides.
    expect(baseStyle).toEqual({
      backgroundColor: 'var(--colors-surface-base)',
      display: 'flex',
    });
    expect(atRules).toEqual([
      { atRule: '', style: { padding: 'var(--space-2)' } },
      { atRule: '@media (min-width: 768px)', style: { padding: 'var(--space-4)' } },
    ]);
  });

  it('drops unknown breakpoint keys silently', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: { base: '$2', xxl: '$8' },
    });
    expect(baseStyle).toEqual({ padding: 'var(--space-2)' });
    expect(atRules).toEqual([]);
  });

  it('separates non-style props into rest', () => {
    const { rest } = resolveResponsiveStylesToVars({
      p: { base: '$2', md: '$4' },
      onClick: () => {},
      id: 'demo',
    });
    expect(Object.keys(rest)).toEqual(['onClick', 'id']);
  });
});

describe('resolveResponsiveStylesToVars - container queries', () => {
  it('emits @container rules for `@<bp>` keys (anonymous, nearest container)', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: { base: '$2', '@md': '$4' },
    });
    expect(baseStyle).toEqual({});
    expect(atRules).toEqual([
      { atRule: '', style: { padding: 'var(--space-2)' } },
      { atRule: '@container (min-width: 768px)', style: { padding: 'var(--space-4)' } },
    ]);
  });

  it('emits @container <name> rules for `@<name>.<bp>` keys', () => {
    const { atRules } = resolveResponsiveStylesToVars({
      p: { '@card.lg': '$8' },
    });
    expect(atRules).toEqual([
      { atRule: '@container card (min-width: 1024px)', style: { padding: 'var(--space-8)' } },
    ]);
  });

  it('orders rules: media → anonymous container → named container (alphabetical)', () => {
    const { atRules } = resolveResponsiveStylesToVars({
      p: {
        md: '$4',
        '@md': '$5',
        '@card.md': '$6',
        '@aside.md': '$7',
      },
    });
    expect(atRules.map((r) => r.atRule)).toEqual([
      '@media (min-width: 768px)',
      '@container (min-width: 768px)',
      '@container aside (min-width: 768px)',
      '@container card (min-width: 768px)',
    ]);
  });

  it('orders multiple breakpoints mobile-first within each at-rule group', () => {
    const { atRules } = resolveResponsiveStylesToVars({
      p: { '@lg': '$8', '@sm': '$2' },
    });
    expect(atRules.map((r) => r.atRule)).toEqual([
      '@container (min-width: 640px)',
      '@container (min-width: 1024px)',
    ]);
  });

  it('mixes media + container rules from the same prop', () => {
    const { atRules } = resolveResponsiveStylesToVars({
      p: { base: '$1', md: '$4', '@card.md': '$8' },
    });
    expect(atRules).toEqual([
      { atRule: '', style: { padding: 'var(--space-1)' } },
      { atRule: '@media (min-width: 768px)', style: { padding: 'var(--space-4)' } },
      {
        atRule: '@container card (min-width: 768px)',
        style: { padding: 'var(--space-8)' },
      },
    ]);
  });

  it('drops malformed @-keys silently (empty name, unknown breakpoint)', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: { base: '$2', '@.md': '$4', '@foo': '$4', '@card.xxl': '$8' },
    });
    expect(baseStyle).toEqual({ padding: 'var(--space-2)' });
    expect(atRules).toEqual([]);
  });

  it('treats responsive object with only @-keys as a responsive object', () => {
    // A bag with no `base` and no plain bp keys, only `@card.md`, must still
    // be detected by isResponsiveObject and routed through the at-rule path.
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: { '@card.md': '$4' },
    });
    expect(baseStyle).toEqual({});
    expect(atRules).toHaveLength(1);
  });
});

describe('resolveResponsiveStylesToVars - array syntax', () => {
  it('treats arrays as positional [base, sm, md, lg, xl, 2xl]', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: ['$2', '$4', '$6'],
    });
    expect(baseStyle).toEqual({});
    expect(atRules).toEqual([
      { atRule: '', style: { padding: 'var(--space-2)' } },
      { atRule: '@media (min-width: 640px)', style: { padding: 'var(--space-4)' } },
      { atRule: '@media (min-width: 768px)', style: { padding: 'var(--space-6)' } },
    ]);
  });

  it('handles a full-length array', () => {
    const { atRules } = resolveResponsiveStylesToVars({
      p: ['$1', '$2', '$3', '$4', '$5', '$6'],
    });
    expect(atRules.map((r) => r.atRule)).toEqual([
      '',
      '@media (min-width: 640px)',
      '@media (min-width: 768px)',
      '@media (min-width: 1024px)',
      '@media (min-width: 1280px)',
      '@media (min-width: 1536px)',
    ]);
  });

  // eslint-disable-next-line no-sparse-arrays
  it('skips undefined slots so sparse arrays only emit defined breakpoints', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      // eslint-disable-next-line no-sparse-arrays
      p: ['$1', undefined, '$4'],
    });
    expect(baseStyle).toEqual({});
    expect(atRules).toEqual([
      { atRule: '', style: { padding: 'var(--space-1)' } },
      { atRule: '@media (min-width: 768px)', style: { padding: 'var(--space-4)' } },
    ]);
  });

  it('ignores extra trailing slots beyond 2xl', () => {
    const { atRules } = resolveResponsiveStylesToVars({
      p: ['$1', '$2', '$3', '$4', '$5', '$6', '$7'],
    });
    // 1 base block + 5 breakpoint blocks = 6; the 7th array slot is dropped.
    expect(atRules).toHaveLength(6);
  });

  it('mixes array, object, and literal values across props', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: ['$2', '$4'],
      m: { base: '$1', md: '$3' },
      bg: '#fff',
    });
    expect(baseStyle).toEqual({ backgroundColor: '#fff' });
    expect(atRules).toEqual([
      {
        atRule: '',
        style: { padding: 'var(--space-2)', margin: 'var(--space-1)' },
      },
      { atRule: '@media (min-width: 640px)', style: { padding: 'var(--space-4)' } },
      { atRule: '@media (min-width: 768px)', style: { margin: 'var(--space-3)' } },
    ]);
  });

  it('accepts an empty array as a no-op', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({ p: [] });
    expect(baseStyle).toEqual({});
    expect(atRules).toEqual([]);
  });
});

describe('resolveResponsiveStylesToVars - string DSL', () => {
  it('parses `<bp>:<value>` pairs as responsive', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: 'base:$2 md:$4 lg:$8',
    });
    expect(baseStyle).toEqual({});
    expect(atRules).toEqual([
      { atRule: '', style: { padding: 'var(--space-2)' } },
      { atRule: '@media (min-width: 768px)', style: { padding: 'var(--space-4)' } },
      { atRule: '@media (min-width: 1024px)', style: { padding: 'var(--space-8)' } },
    ]);
  });

  it('coerces numeric DSL values to numbers (auto-pixelation by React)', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: 'sm:4 md:8',
    });
    expect(baseStyle).toEqual({});
    expect(atRules[0]?.style).toEqual({ padding: 4 });
    expect(atRules[1]?.style).toEqual({ padding: 8 });
  });

  it('parses container-query keys in DSL', () => {
    const { atRules } = resolveResponsiveStylesToVars({
      p: '@card.md:$4 @lg:$8',
    });
    expect(atRules.map((r) => r.atRule)).toEqual([
      '@container (min-width: 1024px)',
      '@container card (min-width: 768px)',
    ]);
  });

  it('falls through to literal when string is not valid DSL', () => {
    // Non-DSL strings stay as literal style values.
    const cases = [
      { input: '#ff0000', expected: '#ff0000' },
      { input: '$colors.surface.base', expected: 'var(--colors-surface-base)' },
      { input: 'rgb(0, 0, 0)', expected: 'rgb(0, 0, 0)' },
    ];
    for (const { input, expected } of cases) {
      const { baseStyle, atRules } = resolveResponsiveStylesToVars({ bg: input });
      expect(baseStyle).toEqual({ backgroundColor: expected });
      expect(atRules).toEqual([]);
    }
  });

  it('mixes DSL with object/array/literal values across props', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: 'sm:4 md:8',
      m: { base: '$1', md: '$3' },
      bg: '#fff',
    });
    // `m` has overrides, so its base hops to the class block; `p` has no
    // base in its DSL so nothing seeds the base block from it; `bg` is
    // non-responsive and stays inline.
    expect(baseStyle).toEqual({ backgroundColor: '#fff' });
    expect(atRules).toEqual([
      { atRule: '', style: { margin: 'var(--space-1)' } },
      { atRule: '@media (min-width: 640px)', style: { padding: 4 } },
      { atRule: '@media (min-width: 768px)', style: { padding: 8, margin: 'var(--space-3)' } },
    ]);
  });
});

describe('display props (1.4) - fontVariationSettings', () => {
  it('passes a string value through unchanged (literal mode)', () => {
    const { style } = resolveStyles({ fontVariationSettings: "'opsz' 36" }, theme);
    expect(style).toEqual({ fontVariationSettings: "'opsz' 36" });
  });

  it('passes a string value through unchanged (var mode)', () => {
    const { style } = resolveStylesToVars({ fontVariationSettings: "'opsz' 36" });
    expect(style).toEqual({ fontVariationSettings: "'opsz' 36" });
  });

  it('serializes a typed object form to the CSS shorthand (literal mode)', () => {
    const { style } = resolveStyles({ fontVariationSettings: { opsz: 36, wght: 600 } }, theme);
    expect(style).toEqual({ fontVariationSettings: "'opsz' 36, 'wght' 600" });
  });

  it('serializes a typed object form to the CSS shorthand (var mode)', () => {
    const { style } = resolveStylesToVars({
      fontVariationSettings: { opsz: 36, wght: 600, SOFT: 50 },
    });
    expect(style).toEqual({ fontVariationSettings: "'opsz' 36, 'wght' 600, 'SOFT' 50" });
  });

  it('handles a per-breakpoint typed object across responsive slots', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      fontVariationSettings: { base: { opsz: 24 }, md: { opsz: 36, wght: 600 } },
    });
    expect(baseStyle).toEqual({});
    expect(atRules).toEqual([
      { atRule: '', style: { fontVariationSettings: "'opsz' 24" } },
      {
        atRule: '@media (min-width: 768px)',
        style: { fontVariationSettings: "'opsz' 36, 'wght' 600" },
      },
    ]);
  });

  it('treats a non-responsive object as the typed form (no responsive keys)', () => {
    // `wght` is not a breakpoint - fall through to the serializer.
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      fontVariationSettings: { wght: 700, opsz: 18 },
    });
    expect(baseStyle).toEqual({ fontVariationSettings: "'wght' 700, 'opsz' 18" });
    expect(atRules).toEqual([]);
  });
});

describe('display props (1.4) - maskImage / clipPath', () => {
  it('recognises maskImage as a literal style prop', () => {
    const { style } = resolveStylesToVars({ maskImage: 'url(/grain.png) center/contain' });
    expect(style).toEqual({ maskImage: 'url(/grain.png) center/contain' });
  });

  it('recognises WebkitMaskImage as a literal style prop (Safari coverage)', () => {
    const { style } = resolveStylesToVars({
      WebkitMaskImage: 'linear-gradient(black, transparent)',
    });
    expect(style).toEqual({ WebkitMaskImage: 'linear-gradient(black, transparent)' });
  });

  it('recognises clipPath as a literal style prop', () => {
    const { style } = resolveStylesToVars({ clipPath: 'inset(0 round 12px)' });
    expect(style).toEqual({ clipPath: 'inset(0 round 12px)' });
  });

  it('drops unsupported object values (no serializer registered)', () => {
    const { style } = resolveStylesToVars({ clipPath: { foo: 'bar' } as unknown as string });
    expect(style).toEqual({});
  });
});

describe('base class block (1.6) - responsive specificity', () => {
  it('emits the base class block first so cascade order picks the override', () => {
    // Cascade: same specificity (0,0,1,0) means later source order wins.
    // Base lives at index 0, then media in mobile-first order, then
    // anonymous containers, then named containers - so a matching
    // override always overrides the base.
    const { atRules } = resolveResponsiveStylesToVars({
      p: { base: '$1', sm: '$2', md: '$4', '@md': '$6', '@card.md': '$8' },
    });
    expect(atRules.map((r) => r.atRule)).toEqual([
      '',
      '@media (min-width: 640px)',
      '@media (min-width: 768px)',
      '@container (min-width: 768px)',
      '@container card (min-width: 768px)',
    ]);
  });

  it('coalesces multiple responsive props into a single base block', () => {
    // The base block should hold every responsive prop's base slot
    // together, not one block per prop. Saves bytes and keeps emission
    // shapes deterministic.
    const { atRules } = resolveResponsiveStylesToVars({
      p: { base: '$2', md: '$4' },
      m: { base: '$1', md: '$3' },
    });
    expect(atRules[0]).toEqual({
      atRule: '',
      style: { padding: 'var(--space-2)', margin: 'var(--space-1)' },
    });
  });

  it('emits no base block when no responsive prop has overrides', () => {
    // All-non-responsive bag: base block must not appear (would waste a
    // hash slot and a CSS rule).
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: '$2',
      bg: '#fff',
    });
    expect(baseStyle).toEqual({ padding: 'var(--space-2)', backgroundColor: '#fff' });
    expect(atRules).toEqual([]);
  });

  it('decides base routing per-prop, not per-bag', () => {
    // Mixing a responsive-with-overrides prop and a responsive-no-overrides
    // prop in the same bag - only the former hops its base to the class
    // block. The latter's base stays inline (no cascade fight).
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: { base: '$2', md: '$4' },
      m: { base: '$1' },
    });
    expect(baseStyle).toEqual({ margin: 'var(--space-1)' });
    expect(atRules).toEqual([
      { atRule: '', style: { padding: 'var(--space-2)' } },
      { atRule: '@media (min-width: 768px)', style: { padding: 'var(--space-4)' } },
    ]);
  });
});

describe('container props (1.5) - containerType / containerName', () => {
  it('passes containerType through (literal mode)', () => {
    const { style } = resolveStyles({ containerType: 'inline-size' }, theme);
    expect(style).toEqual({ containerType: 'inline-size' });
  });

  it('passes containerType through (var mode)', () => {
    const { style } = resolveStylesToVars({ containerType: 'inline-size' });
    expect(style).toEqual({ containerType: 'inline-size' });
  });

  it('accepts every containerType value', () => {
    for (const v of ['inline-size', 'size', 'normal'] as const) {
      const { style } = resolveStylesToVars({ containerType: v });
      expect(style).toEqual({ containerType: v });
    }
  });

  it('passes containerName through', () => {
    const { style } = resolveStylesToVars({ containerName: 'card' });
    expect(style).toEqual({ containerName: 'card' });
  });

  it('responsive at-rules still emit @container queries against named containers', () => {
    // Targets a container named "card" - query syntax `@card.md`. The
    // declaring element below would carry containerType + containerName
    // to opt into being the queried context.
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      p: { base: '$2', '@card.md': '$4' },
    });
    expect(baseStyle).toEqual({});
    expect(atRules).toEqual([
      { atRule: '', style: { padding: 'var(--space-2)' } },
      { atRule: '@container card (min-width: 768px)', style: { padding: 'var(--space-4)' } },
    ]);
  });
});

describe('grid layout props (1.7)', () => {
  it('passes literal grid-template-columns through unchanged', () => {
    const { style } = resolveStylesToVars({
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    });
    expect(style).toEqual({ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' });
  });

  it('passes grid-column-span through unchanged', () => {
    const { style } = resolveStylesToVars({ gridColumn: 'span 3', gridRow: 'span 2' });
    expect(style).toEqual({ gridColumn: 'span 3', gridRow: 'span 2' });
  });

  it('handles a responsive grid-template-columns', () => {
    // The classic docs case: 1-col base, 2-col at md, n-col at lg.
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      gridTemplateColumns: {
        base: 'minmax(0, 1fr)',
        md: 'repeat(2, 1fr)',
        lg: 'repeat(4, 1fr)',
      },
    });
    expect(baseStyle).toEqual({});
    expect(atRules).toEqual([
      { atRule: '', style: { gridTemplateColumns: 'minmax(0, 1fr)' } },
      {
        atRule: '@media (min-width: 768px)',
        style: { gridTemplateColumns: 'repeat(2, 1fr)' },
      },
      {
        atRule: '@media (min-width: 1024px)',
        style: { gridTemplateColumns: 'repeat(4, 1fr)' },
      },
    ]);
  });

  it('passes place-* shorthand props through unchanged', () => {
    const { style } = resolveStylesToVars({ placeItems: 'center', placeContent: 'space-between' });
    expect(style).toEqual({ placeItems: 'center', placeContent: 'space-between' });
  });
});

describe('transform props (1.7)', () => {
  it('passes a literal transform value through unchanged', () => {
    const { style } = resolveStylesToVars({ transform: 'translateY(-1px)' });
    expect(style).toEqual({ transform: 'translateY(-1px)' });
  });

  it('passes composed transform chains through unchanged', () => {
    const { style } = resolveStylesToVars({ transform: 'scale(0.985) rotate(2deg)' });
    expect(style).toEqual({ transform: 'scale(0.985) rotate(2deg)' });
  });

  it('handles a responsive transform value', () => {
    const { atRules } = resolveResponsiveStylesToVars({
      transform: { base: 'none', md: 'translateY(-2px)' },
    });
    expect(atRules).toEqual([
      { atRule: '', style: { transform: 'none' } },
      { atRule: '@media (min-width: 768px)', style: { transform: 'translateY(-2px)' } },
    ]);
  });

  it('passes transform-origin through unchanged', () => {
    const { style } = resolveStylesToVars({ transformOrigin: 'top left' });
    expect(style).toEqual({ transformOrigin: 'top left' });
  });
});

describe('transform shorthand props', () => {
  it('composes shorthand axes into a single CSS transform string on the vars path', () => {
    const { style } = resolveStylesToVars({ x: 10, y: 20, rotate: 45, scale: 0.9 });
    expect(style).toEqual({
      transform: 'translateX(10px) translateY(20px) rotate(45deg) scale(0.9)',
    });
  });

  it('composes shorthand axes into the RN array form on the native path', () => {
    const { style } = resolveStyles({ x: 10, rotate: 45, scale: 0.9 }, theme);
    expect(style.transform).toEqual([{ translateX: 10 }, { rotate: '45deg' }, { scale: 0.9 }]);
  });

  it('resolves token refs on translate axes via the space scale (web)', () => {
    const { style } = resolveStylesToVars({ x: '$space.4' });
    expect(style.transform).toBe('translateX(var(--space-4))');
  });

  it('resolves token refs on translate axes via the space scale (native)', () => {
    const { style } = resolveStyles({ x: '$space.4' }, theme);
    // theme.space[4] = 16 in this test's fixture.
    expect(style.transform).toEqual([{ translateX: 16 }]);
  });

  it('literal transform="..." wins; shorthand axes are dropped on that slot', () => {
    const { style } = resolveStylesToVars({ transform: 'scale(1.05)', x: 10, rotate: 45 });
    expect(style.transform).toBe('scale(1.05)');
  });

  it('a responsive shorthand prop composes per-breakpoint', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      x: { base: 0, md: 10 },
    });
    // The base slot may sit in either inline base or the class block
    // depending on whether overrides exist for this prop. With one
    // override the base lands in the class block.
    const baseAtRule = atRules.find((r) => r.atRule === '');
    const mdAtRule = atRules.find((r) => r.atRule.includes('768px'));
    expect(baseStyle).toEqual({});
    expect(baseAtRule?.style).toEqual({ transform: 'translateX(0px)' });
    expect(mdAtRule?.style).toEqual({ transform: 'translateX(10px)' });
  });

  it('multiple shorthand props in one responsive slot compose together', () => {
    const { atRules } = resolveResponsiveStylesToVars({
      x: { base: 0, md: 10 },
      rotate: { base: 0, md: 45 },
    });
    const mdAtRule = atRules.find((r) => r.atRule.includes('768px'));
    expect(mdAtRule?.style).toEqual({ transform: 'translateX(10px) rotate(45deg)' });
  });
});

describe('responsive-vs-serialize disambiguation (#272, #274)', () => {
  it('serializes a fontVariationSettings axis bag with a breakpoint-like key (vars path)', () => {
    const { style } = resolveStylesToVars({ fontVariationSettings: { md: 400 } });
    expect(style.fontVariationSettings).toBe("'md' 400");
  });

  it('does not emit a media query for a fontVariationSettings axis bag (responsive path)', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({
      fontVariationSettings: { md: 400 },
    });
    expect(baseStyle.fontVariationSettings).toBe("'md' 400");
    // Nothing routed into a media/container at-rule.
    expect(atRules.every((r) => r.atRule === '')).toBe(true);
  });

  it('drops a responsive object passed to the native resolver instead of emitting it as a value', () => {
    const { style } = resolveStyles({ p: { base: 2, md: 4 } }, theme);
    expect(style.padding).toBeUndefined();
  });
});

describe('resolveResponsiveStylesToVars - baseAsClass', () => {
  it('keeps base props inline by default', () => {
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({ p: 4, bg: 'red' });

    expect(baseStyle).not.toEqual({});
    expect(atRules).toEqual([]);
  });

  it('routes base props into a base class block when set', () => {
    // Inline styles cannot belong to a cascade layer, so a layered app has to
    // emit them as a class or the host stylesheet can never win.
    const { baseStyle, atRules } = resolveResponsiveStylesToVars(
      { p: 4, bg: 'red' },
      { baseAsClass: true },
    );

    expect(baseStyle).toEqual({});
    expect(atRules).toHaveLength(1);
    expect(atRules[0]!.atRule).toBe('');
    expect(atRules[0]!.style).not.toEqual({});
  });

  it('carries the same declarations either way', () => {
    const inline = resolveResponsiveStylesToVars({ p: 4, bg: 'red' });
    const classed = resolveResponsiveStylesToVars({ p: 4, bg: 'red' }, { baseAsClass: true });

    expect(classed.atRules[0]!.style).toEqual(inline.baseStyle);
  });

  it('emits the base block before responsive overrides so they still win', () => {
    const { atRules } = resolveResponsiveStylesToVars(
      { p: { base: 4, md: 8 } },
      { baseAsClass: true },
    );

    expect(atRules[0]!.atRule).toBe('');
    expect(atRules[1]!.atRule).toContain('@media');
  });

  it('passes non-style props through untouched', () => {
    const { rest } = resolveResponsiveStylesToVars({ p: 4, id: 'x' }, { baseAsClass: true });

    expect(rest).toEqual({ id: 'x' });
  });
});

describe('gradients scale', () => {
  const gradientTheme: Theme = {
    name: 'g',
    tokens: {
      gradients: { hero: 'linear-gradient(90deg, #2563eb, #7c3aed)' },
    },
  };

  it('resolves backgroundImage through the gradients scale, full or bare', () => {
    expect(resolveStyles({ backgroundImage: '$gradients.hero' }, gradientTheme).style).toEqual({
      backgroundImage: 'linear-gradient(90deg, #2563eb, #7c3aed)',
    });
    expect(resolveStyles({ backgroundImage: '$hero' }, gradientTheme).style).toEqual({
      backgroundImage: 'linear-gradient(90deg, #2563eb, #7c3aed)',
    });
  });

  it('emits a CSS variable on web, and passes raw values through', () => {
    expect(resolveStylesToVars({ backgroundImage: '$gradients.hero' }).style).toEqual({
      backgroundImage: 'var(--gradients-hero)',
    });
    expect(resolveStylesToVars({ backgroundImage: 'url(a.png)' }).style).toEqual({
      backgroundImage: 'url(a.png)',
    });
  });
});
