import { describe, expect, it } from 'vitest';
import { designTokensToTheme, printThemeModule } from './design-tokens.js';

const FILE = {
  color: {
    $type: 'color',
    blue: { 500: { $value: '#3b82f6' } },
    gray: { 900: { $value: { colorSpace: 'srgb', components: [0.1, 0.1, 0.1], hex: '#1a1a1a' } } },
  },
  spacing: { $type: 'dimension', 2: { $value: '8px' }, 4: { $value: { value: 1, unit: 'rem' } } },
  radius: { md: { $type: 'dimension', $value: { value: 6, unit: 'px' } } },
  font: {
    body: { $type: 'fontFamily', $value: ['Inter Variable', 'sans-serif'] },
    bold: { $type: 'fontWeight', $value: 'semi-bold' },
  },
  motion: {
    fast: { $type: 'duration', $value: { value: 150, unit: 'ms' } },
    standard: { $type: 'cubicBezier', $value: [0.4, 0, 0.2, 1] },
  },
  semantic: {
    color: {
      accent: { $value: '{color.blue.500}' },
      text: { $type: 'color', $value: '{color.gray.900}' },
    },
    card: {
      shadow: {
        $type: 'shadow',
        $value: {
          color: '{color.gray.900}',
          offsetX: '0px',
          offsetY: '2px',
          blur: '8px',
          spread: 0,
        },
      },
    },
  },
  type: { heading: { $type: 'typography', $value: { fontSize: '24px' } } },
};

describe('designTokensToTheme', () => {
  const { tokens, warnings } = designTokensToTheme(FILE);

  it('places each token in the scale its type and group name', () => {
    expect(tokens.colors).toMatchObject({ blue: { 500: '#3b82f6' }, gray: { 900: '#1a1a1a' } });
    expect(tokens.space).toEqual({ 2: 8, 4: '1rem' });
    expect(tokens.radii).toEqual({ md: 6 });
    expect(tokens.fontFamilies).toEqual({ body: "'Inter Variable', sans-serif" });
    // `font` names fontFamilies, not fontWeights, so it stays in the weight's path.
    expect(tokens.fontWeights).toEqual({ font: { bold: 600 } });
    expect(tokens.durations).toEqual({ motion: { fast: '150ms' } });
    expect(tokens.easings).toEqual({ motion: { standard: 'cubic-bezier(0.4, 0, 0.2, 1)' } });
  });

  it('keeps aliases as references, typed through what they alias', () => {
    expect(tokens.colors!.semantic).toEqual({
      accent: '$colors.blue.500',
      text: '$colors.gray.900',
    });
  });

  it('resolves aliases inside a shadow to their value', () => {
    expect(tokens.shadows).toEqual({ semantic: { card: { shadow: '0 2px 8px 0 #1a1a1a' } } });
  });

  it('warns about what it skips', () => {
    expect(warnings).toEqual(['type.heading: no motif scale for a typography token; skipped']);
  });

  it('skips an alias to a token it did not convert, and a taken path', () => {
    const result = designTokensToTheme({
      a: { $type: 'typography', $value: {} },
      color: { x: { $type: 'color', $value: '{a}' } },
      colors: { x: { $type: 'color', $value: '#fff' } },
    });
    expect(result.warnings).toEqual([
      'a: no motif scale for a typography token; skipped',
      'color.x: aliases a, which was not converted; skipped',
    ]);
    expect(result.tokens.colors).toEqual({ x: '#fff' });
  });

  it('reports the second token that lands on a taken path', () => {
    const result = designTokensToTheme({
      color: { x: { $type: 'color', $value: '#000' } },
      colors: { x: { $type: 'color', $value: '#fff' } },
    });
    expect(result.warnings).toEqual([
      'colors.x: colors.x is already taken by another token; skipped',
    ]);
  });
});

describe('printThemeModule', () => {
  it('prints an as-const createTheme module', () => {
    expect(printThemeModule('brand-dark', { colors: { blue: { 500: '#3b82f6' } } }, 'tokens.json'))
      .toBe(`// Generated from tokens.json by usemotif-migrate import-tokens.
import { createTheme } from 'usemotif';

export const brandDarkTheme = createTheme({
  name: 'brand-dark',
  tokens: {
    colors: {
      blue: {
        '500': '#3b82f6',
      },
    },
  },
} as const);
`);
  });
});
