import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { styleProps, type TokenMap } from '@usemotif/core';
import { lightTheme } from '@usemotif/tokens';

/** What `settings.motif` may hold. */
export interface MotifLintSettings {
  /** The theme's token tree, for ESLint's JavaScript config. */
  readonly tokens?: TokenMap;
  /** A JSON file holding the token tree, for configs that are JSON (oxlint). */
  readonly tokensFile?: string;
}

const SCALE_NAMES = new Set([
  'colors',
  'space',
  'sizes',
  'radii',
  'fontSizes',
  'fontWeights',
  'fontFamilies',
  'lineHeights',
  'letterSpacings',
  'shadows',
  'zIndices',
  'borderWidths',
  'opacities',
  'durations',
  'easings',
]);

/** The style prop's token scale, or `undefined` for a prop that takes no token. */
export function scaleOf(prop: string): string | undefined {
  const def = (styleProps as Record<string, { scale?: string } | undefined>)[prop];
  return def?.scale;
}

export interface Theme {
  /** Every token path in a scale (`4`, `blue.500`), with the literal it resolves to. */
  readonly scales: ReadonlyMap<string, ReadonlyMap<string, string | number>>;
}

const cache = new Map<string, Theme>();

/** The theme the rules check against: the settings' tokens, or the default light preset. */
export function themeFrom(settings: { motif?: MotifLintSettings } | undefined, cwd: string): Theme {
  const motif = settings?.motif;
  let tokens: TokenMap = lightTheme.tokens;
  let key = 'default';
  if (motif?.tokens !== undefined) {
    tokens = motif.tokens;
    key = '';
  } else if (motif?.tokensFile !== undefined) {
    key = resolve(cwd, motif.tokensFile);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    tokens = JSON.parse(readFileSync(key, 'utf8')) as TokenMap;
  } else {
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
  }
  const theme = build(tokens);
  if (key !== '') cache.set(key, theme);
  return theme;
}

function build(tokens: TokenMap): Theme {
  const raw = new Map<string, string | number>();
  const walk = (node: unknown, path: string): void => {
    if (typeof node === 'string' || typeof node === 'number') raw.set(path, node);
    else if (typeof node === 'object' && node !== null) {
      for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
    }
  };
  for (const [scale, node] of Object.entries(tokens)) {
    if (SCALE_NAMES.has(scale)) walk(node, scale);
  }
  const resolveValue = (value: string | number): string | number | undefined => {
    let current: string | number | undefined = value;
    for (let hops = 0; typeof current === 'string' && current.startsWith('$'); hops++) {
      if (hops > 16) return undefined;
      current = raw.get(current.slice(1));
    }
    return current;
  };
  const scales = new Map<string, Map<string, string | number>>();
  for (const [path, value] of raw) {
    const dot = path.indexOf('.');
    const scale = path.slice(0, dot);
    const resolved = resolveValue(value);
    if (resolved === undefined) continue;
    if (!scales.has(scale)) scales.set(scale, new Map());
    scales.get(scale)!.set(path.slice(dot + 1), resolved);
  }
  return { scales };
}

/** A `$` reference read against a prop's scale: `$4` under `p` means `space.4`. */
export function splitRef(
  ref: string,
  propScale: string | undefined,
): { scale: string; path: string } | undefined {
  const body = ref.slice(1);
  const dot = body.indexOf('.');
  const head = dot === -1 ? body : body.slice(0, dot);
  if (SCALE_NAMES.has(head) && dot !== -1) return { scale: head, path: body.slice(dot + 1) };
  return propScale === undefined ? undefined : { scale: propScale, path: body };
}

function normalise(value: string | number): string {
  if (typeof value === 'number') return String(value);
  const v = value.trim().toLowerCase();
  const px = /^(-?[\d.]+)px$/.exec(v);
  return px === null ? v : String(Number(px[1]));
}

/** The token path whose value equals `value`, preferring the shortest path. */
export function tokenFor(theme: Theme, scale: string, value: string | number): string | undefined {
  const tokens = theme.scales.get(scale);
  if (tokens === undefined) return undefined;
  const target = normalise(value);
  let best: string | undefined;
  for (const [path, v] of tokens) {
    if (normalise(v) === target && (best === undefined || path.length < best.length)) best = path;
  }
  return best;
}

export function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length]!;
}
