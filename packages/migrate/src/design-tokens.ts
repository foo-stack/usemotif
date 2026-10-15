/**
 * W3C Design Tokens (DTCG) file to a motif theme.
 *
 * Each token lands in the motif scale its `$type` names: `color` in `colors`, `fontFamily` in
 * `fontFamilies`, `fontWeight` in `fontWeights`, `duration` in `durations`, `cubicBezier` in
 * `easings`, `shadow` in `shadows`. A `dimension` or `number` goes to the scale its group is named
 * for (`spacing`, `radius`, `fontSize`, `lineHeight`, `opacity`, `zIndex` and so on); an unnamed
 * dimension goes to `space`. Group names that only name the scale drop out of the path, so
 * `color.blue.500` becomes `colors.blue.500`.
 *
 * A token whose whole value is an alias (`{color.blue.500}`) becomes a `$` reference to the
 * aliased token, which keeps the file's primitive and semantic layers. Aliases inside a shadow
 * are resolved to their value, since a reference has to be a whole value. `typography`,
 * `border`, `transition`, `gradient` and `strokeStyle` tokens have no single motif scale and are
 * skipped with a warning.
 */
import { key, quote } from './_ast.js';

type Leaf = string | number;
interface Scale {
  [name: string]: Leaf | Scale;
}

/** A converted theme: the token tree, and what could not be converted. */
export interface DesignTokensResult {
  tokens: Record<string, Scale>;
  warnings: string[];
}

interface RawToken {
  path: string[];
  type: string | undefined;
  value: unknown;
}

const GROUP_SCALES: Readonly<Record<string, string>> = {
  color: 'colors',
  colors: 'colors',
  space: 'space',
  spacing: 'space',
  size: 'sizes',
  sizes: 'sizes',
  sizing: 'sizes',
  radius: 'radii',
  radii: 'radii',
  borderradius: 'radii',
  fontsize: 'fontSizes',
  fontsizes: 'fontSizes',
  fontweight: 'fontWeights',
  fontweights: 'fontWeights',
  font: 'fontFamilies',
  fonts: 'fontFamilies',
  fontfamily: 'fontFamilies',
  fontfamilies: 'fontFamilies',
  lineheight: 'lineHeights',
  lineheights: 'lineHeights',
  letterspacing: 'letterSpacings',
  letterspacings: 'letterSpacings',
  borderwidth: 'borderWidths',
  borderwidths: 'borderWidths',
  shadow: 'shadows',
  shadows: 'shadows',
  elevation: 'shadows',
  zindex: 'zIndices',
  zindices: 'zIndices',
  opacity: 'opacities',
  opacities: 'opacities',
  duration: 'durations',
  durations: 'durations',
  easing: 'easings',
  easings: 'easings',
};

const TYPE_SCALES: Readonly<Record<string, string>> = {
  color: 'colors',
  fontFamily: 'fontFamilies',
  fontWeight: 'fontWeights',
  duration: 'durations',
  cubicBezier: 'easings',
  shadow: 'shadows',
};

const FONT_WEIGHTS: Readonly<Record<string, number>> = {
  thin: 100,
  hairline: 100,
  'extra-light': 200,
  'ultra-light': 200,
  light: 300,
  normal: 400,
  regular: 400,
  book: 400,
  medium: 500,
  'semi-bold': 600,
  'demi-bold': 600,
  bold: 700,
  'extra-bold': 800,
  'ultra-bold': 800,
  black: 900,
  heavy: 900,
  'extra-black': 950,
  'ultra-black': 950,
};

const ALIAS = /^\{([^{}]+)\}$/;
const groupScale = (segment: string): string | undefined =>
  GROUP_SCALES[segment.toLowerCase().replace(/[-_\s]/g, '')];

function collect(node: unknown, path: string[], type: string | undefined, out: RawToken[]): void {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return;
  const record = node as Record<string, unknown>;
  const ownType = typeof record.$type === 'string' ? record.$type : type;
  if ('$value' in record) {
    out.push({ path, type: ownType, value: record.$value });
    return;
  }
  for (const [name, child] of Object.entries(record)) {
    if (!name.startsWith('$')) collect(child, [...path, name], ownType, out);
  }
}

/** The scale a token belongs in, or `null` when there is none. */
function scaleOf(token: RawToken): string | null {
  const type = token.type;
  if (type !== undefined && TYPE_SCALES[type] !== undefined) return TYPE_SCALES[type];
  if (type !== 'dimension' && type !== 'number') return null;
  for (let i = token.path.length - 2; i >= 0; i--) {
    const scale = groupScale(token.path[i]!);
    if (scale !== undefined) return scale;
  }
  return type === 'dimension' ? 'space' : null;
}

/** A DTCG path inside its motif scale, with the segments that only name the scale dropped. */
function pathIn(scale: string, path: readonly string[]): string[] {
  const kept = path.filter((segment, i) => i === path.length - 1 || groupScale(segment) !== scale);
  return kept.length > 0 ? kept : [path[path.length - 1]!];
}

export function designTokensToTheme(file: unknown): DesignTokensResult {
  const raw: RawToken[] = [];
  collect(file, [], undefined, raw);
  const byPath = new Map(raw.map((t) => [t.path.join('.'), t]));
  const warnings: string[] = [];
  const tokens: Record<string, Scale> = {};
  const placed = new Map<string, string>();

  // A token's type, following aliases when the token itself has none.
  const typeOf = (token: RawToken, seen = new Set<string>()): string | undefined => {
    if (token.type !== undefined) return token.type;
    const alias = typeof token.value === 'string' ? ALIAS.exec(token.value) : null;
    const target = alias === null ? undefined : byPath.get(alias[1]!);
    if (target === undefined || seen.has(alias![1]!)) return undefined;
    seen.add(alias![1]!);
    return typeOf(target, seen);
  };
  for (const token of raw) token.type = typeOf(token);

  for (const token of raw) {
    const name = token.path.join('.');
    const scale = scaleOf(token);
    if (scale === null) {
      warnings.push(`${name}: no motif scale for a ${token.type ?? 'untyped'} token; skipped`);
      continue;
    }
    placed.set(name, `${scale}.${pathIn(scale, token.path).join('.')}`);
  }

  const resolve = (value: unknown, seen: Set<string>): unknown => {
    const alias = typeof value === 'string' ? ALIAS.exec(value) : null;
    if (alias === null) return value;
    const target = byPath.get(alias[1]!);
    if (target === undefined || seen.has(alias[1]!)) return undefined;
    return resolve(target.value, new Set([...seen, alias[1]!]));
  };

  for (const token of raw) {
    const name = token.path.join('.');
    const at = placed.get(name);
    if (at === undefined) continue;
    let value: Leaf | undefined;
    const alias = typeof token.value === 'string' ? ALIAS.exec(token.value) : null;
    if (alias !== null) {
      const target = placed.get(alias[1]!);
      if (target === undefined) {
        warnings.push(`${name}: aliases ${alias[1]}, which was not converted; skipped`);
        continue;
      }
      value = `$${target}`;
    } else {
      value = convert(token.type!, resolve(token.value, new Set([name])), (v) =>
        resolve(v, new Set([name])),
      );
      if (value === undefined) {
        warnings.push(`${name}: a ${token.type} value motif cannot read; skipped`);
        continue;
      }
    }
    const [scale, ...rest] = at.split('.');
    if (!set((tokens[scale!] ??= {}), rest, value)) {
      warnings.push(`${name}: ${at} is already taken by another token; skipped`);
    }
  }
  return { tokens, warnings };
}

function set(scale: Scale, path: readonly string[], value: Leaf): boolean {
  let node = scale;
  for (const segment of path.slice(0, -1)) {
    const next = node[segment];
    if (next === undefined) node = node[segment] = {};
    else if (typeof next === 'object') node = next;
    else return false;
  }
  const last = path[path.length - 1]!;
  if (node[last] !== undefined) return false;
  node[last] = value;
  return true;
}

function dimension(value: unknown): Leaf | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const px = /^(-?[\d.]+)px$/.exec(value.trim());
    return px === null ? value.trim() : Number(px[1]);
  }
  if (typeof value === 'object' && value !== null) {
    const { value: n, unit } = value as { value?: unknown; unit?: unknown };
    if (typeof n === 'number' && typeof unit === 'string') return unit === 'px' ? n : `${n}${unit}`;
  }
  return undefined;
}

const css = (value: Leaf | undefined): string | undefined =>
  typeof value === 'number' ? (value === 0 ? '0' : `${value}px`) : value;

function color(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || value === null) return undefined;
  const { hex, colorSpace, components, alpha } = value as Record<string, unknown>;
  if (typeof hex === 'string' && (alpha === undefined || alpha === 1)) return hex;
  if (typeof colorSpace !== 'string' || !Array.isArray(components)) return undefined;
  const a = typeof alpha === 'number' && alpha !== 1 ? ` / ${alpha}` : '';
  return `color(${colorSpace} ${components.join(' ')}${a})`;
}

function convert(type: string, value: unknown, resolve: (v: unknown) => unknown): Leaf | undefined {
  switch (type) {
    case 'color':
      return color(value);
    case 'dimension':
      return dimension(value);
    case 'number':
      return typeof value === 'number' ? value : undefined;
    case 'duration': {
      const d = dimension(value);
      return typeof d === 'string' ? d : undefined;
    }
    case 'fontWeight':
      return typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? FONT_WEIGHTS[value]
          : undefined;
    case 'cubicBezier':
      return Array.isArray(value) && value.length === 4
        ? `cubic-bezier(${value.join(', ')})`
        : undefined;
    case 'fontFamily': {
      const names = Array.isArray(value) ? value : [value];
      if (!names.every((n) => typeof n === 'string')) return undefined;
      return (names as string[]).map((n) => (/[\s'"]/.test(n) ? `'${n}'` : n)).join(', ');
    }
    case 'shadow': {
      const layers = Array.isArray(value) ? value : [value];
      const out = layers.map((layer) => {
        if (typeof layer !== 'object' || layer === null) return undefined;
        const l = layer as Record<string, unknown>;
        const parts = [l.offsetX, l.offsetY, l.blur, l.spread].map((d) =>
          css(dimension(resolve(d))),
        );
        const c = color(resolve(l.color));
        if (parts.some((p) => p === undefined) || c === undefined) return undefined;
        return `${l.inset === true ? 'inset ' : ''}${parts.join(' ')} ${c}`;
      });
      return out.every((s) => s !== undefined) ? out.join(', ') : undefined;
    }
    default:
      return undefined;
  }
}

function print(node: Scale, indent: string): string {
  const lines = Object.entries(node).map(([k, v]) => {
    const value =
      typeof v === 'object'
        ? print(v, `${indent}  `)
        : typeof v === 'number'
          ? String(v)
          : quote(v);
    return `${indent}  ${key(k)}: ${value},`;
  });
  return `{\n${lines.join('\n')}\n${indent}}`;
}

/** A TypeScript module exporting the tokens as a typed `createTheme` theme. */
export function printThemeModule(
  name: string,
  tokens: Record<string, Scale>,
  from?: string,
): string {
  const exportName = `${name.replace(/[^\w$]+(\w)?/g, (_, c: string | undefined) => (c ?? '').toUpperCase()).replace(/^\d/, '_$&')}Theme`;
  return [
    from === undefined ? null : `// Generated from ${from} by usemotif-migrate import-tokens.`,
    `import { createTheme } from 'usemotif';`,
    '',
    `export const ${exportName} = createTheme({`,
    `  name: ${quote(name)},`,
    `  tokens: ${print(tokens, '  ')},`,
    '} as const);',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');
}
