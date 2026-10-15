import { extendTheme, type Theme, type TokenMap } from '@usemotif/core';
import { darkTheme, lightTheme } from '@usemotif/tokens';

/** The colours a builder sets for one colour scheme. */
export interface SchemeColors {
  readonly primary: string;
  readonly primaryText: string;
  readonly surface: string;
  readonly text: string;
  readonly muted: string;
}

export interface BuilderInput {
  readonly name: string;
  readonly radius: number;
  readonly light: SchemeColors;
  readonly dark: SchemeColors;
}

export const DEFAULT_INPUT: BuilderInput = {
  name: 'brand',
  radius: 8,
  light: {
    primary: '#2563eb',
    primaryText: '#ffffff',
    surface: '#ffffff',
    text: '#111827',
    muted: '#4b5563',
  },
  dark: {
    primary: '#3b82f6',
    primaryText: '#ffffff',
    surface: '#030712',
    text: '#f9fafb',
    muted: '#9ca3af',
  },
};

/** A hex colour moved toward black (negative) or white (positive) by `amount`, 0 to 1. */
export function shade(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (rgb === null) return hex;
  const target = amount < 0 ? 0 : 255;
  const mix = rgb.map((c) => Math.round(c + (target - c) * Math.abs(amount)));
  return `#${mix.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** The token overrides one scheme's colours make on the preset. */
export function overrides(colors: SchemeColors, radius: number, scheme: 'light' | 'dark') {
  return {
    colors: {
      surface: { base: colors.surface },
      text: { default: colors.text, muted: colors.muted },
      action: {
        primary: {
          bg: colors.primary,
          fg: colors.primaryText,
          hover: shade(colors.primary, scheme === 'light' ? -0.12 : 0.12),
        },
      },
    },
    radii: { md: radius },
  };
}

export function buildThemes(input: BuilderInput): { light: Theme; dark: Theme } {
  return {
    light: extendTheme(lightTheme, {
      name: `${input.name}-light`,
      tokens: overrides(input.light, input.radius, 'light'),
    }) as Theme,
    dark: extendTheme(darkTheme, {
      name: `${input.name}-dark`,
      tokens: overrides(input.dark, input.radius, 'dark'),
    }) as Theme,
  };
}

/** A token's literal value, following `$` references. */
export function resolveToken(tokens: TokenMap, path: string): string | number | undefined {
  let value: unknown = path;
  for (let hops = 0; hops < 16 && typeof value === 'string' && value.startsWith('$'); hops++) {
    value = value
      .slice(1)
      .split('.')
      .reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], tokens);
  }
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (m === null) return null;
  const h = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join('') : m[1]!;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2 contrast ratio between two hex colours, or `null` when either isn't hex. */
export function contrast(a: string, b: string): number | null {
  const ra = parseHex(a);
  const rb = parseHex(b);
  if (ra === null || rb === null) return null;
  const [hi, lo] = [luminance(ra), luminance(rb)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** The pairs a theme's text is read on, with the WCAG AA minimum for body text. */
export const CONTRAST_PAIRS = [
  { label: 'Text on surface', fg: '$colors.text.default', bg: '$colors.surface.base' },
  { label: 'Muted text on surface', fg: '$colors.text.muted', bg: '$colors.surface.base' },
  {
    label: 'Primary button text',
    fg: '$colors.action.primary.fg',
    bg: '$colors.action.primary.bg',
  },
] as const;

export const AA_MINIMUM = 4.5;

export interface ContrastCheck {
  readonly label: string;
  readonly ratio: number | null;
  readonly passes: boolean;
}

export function contrastChecks(theme: Theme): ContrastCheck[] {
  return CONTRAST_PAIRS.map(({ label, fg, bg }) => {
    const f = resolveToken(theme.tokens, fg);
    const b = resolveToken(theme.tokens, bg);
    const ratio = typeof f === 'string' && typeof b === 'string' ? contrast(f, b) : null;
    return { label, ratio, passes: ratio !== null && ratio >= AA_MINIMUM };
  });
}

/** A `theme.ts` module that rebuilds the themes on the default presets. */
export function themeModule(input: BuilderInput): string {
  const json = (value: unknown): string =>
    JSON.stringify(value, null, 2)
      .replace(/"([A-Za-z_$][\w$]*)":/g, '$1:')
      .replace(/"/g, "'")
      .replace(/\n/g, '\n  ');
  const camel = input.name.replace(/[^\w]+(\w)?/g, (_, c: string | undefined) =>
    (c ?? '').toUpperCase(),
  );
  return `import { extendTheme } from 'usemotif';
import { darkTheme, lightTheme } from '@usemotif/tokens';

export const ${camel}Light = extendTheme(lightTheme, {
  name: '${input.name}-light',
  tokens: ${json(overrides(input.light, input.radius, 'light'))},
});

export const ${camel}Dark = extendTheme(darkTheme, {
  name: '${input.name}-dark',
  tokens: ${json(overrides(input.dark, input.radius, 'dark'))},
});
`;
}

const W3C_TYPES: Readonly<Record<string, string>> = {
  colors: 'color',
  space: 'dimension',
  sizes: 'dimension',
  radii: 'dimension',
  fontSizes: 'dimension',
  letterSpacings: 'dimension',
  borderWidths: 'dimension',
  fontWeights: 'fontWeight',
  fontFamilies: 'fontFamily',
  lineHeights: 'number',
  opacities: 'number',
  zIndices: 'number',
  durations: 'duration',
  easings: 'cubicBezier',
};

function w3cValue(type: string, value: string | number): unknown {
  if (typeof value === 'string' && value.startsWith('$')) {
    // The groups keep motif's scale names, so a `$` path is already the alias path.
    return `{${value.slice(1)}}`;
  }
  if (type === 'dimension' && typeof value === 'number') return { value, unit: 'px' };
  if (type === 'dimension' && typeof value === 'string') {
    const m = /^(-?[\d.]+)([a-z%]+)$/.exec(value);
    return m === null ? undefined : { value: Number(m[1]), unit: m[2] };
  }
  if (type === 'duration' && typeof value === 'string') {
    const m = /^([\d.]+)(ms|s)$/.exec(value);
    return m === null ? undefined : { value: Number(m[1]), unit: m[2] };
  }
  if (type === 'cubicBezier' && typeof value === 'string') {
    const m = /^cubic-bezier\(([^)]+)\)$/.exec(value);
    return m === null ? undefined : m[1]!.split(',').map(Number);
  }
  if (type === 'fontFamily' && typeof value === 'string') {
    return value.split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, ''));
  }
  return value;
}

/**
 * A theme's tokens as a W3C Design Tokens document: each motif scale becomes a typed group, and a
 * `$` reference becomes an alias. Scales and values with no W3C type (shadows, animations,
 * `linear` easings) are left out.
 */
export function toDesignTokens(tokens: TokenMap): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [scale, type] of Object.entries(W3C_TYPES)) {
    const node = tokens[scale];
    if (node === undefined) continue;
    const walk = (value: unknown): unknown => {
      if (typeof value === 'object' && value !== null) {
        const group: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
          const child = walk(v);
          if (child !== undefined) group[k] = child;
        }
        return group;
      }
      const converted = w3cValue(type, value as string | number);
      return converted === undefined ? undefined : { $value: converted };
    };
    out[scale] = { $type: type, ...(walk(node) as Record<string, unknown>) };
  }
  return out;
}
