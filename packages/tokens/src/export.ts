import {
  isTokenRef,
  parseColor,
  resolveToken,
  themeToCssBlock,
  type Theme,
  type TokenNode,
  type TokenRef,
  type TokenScale,
} from '@usemotif/core';

/** The output formats {@link exportTheme} writes. */
export type TokenExportFormat = 'css' | 'json' | 'w3c' | 'swift' | 'kotlin';

export interface TokenExportOptions {
  /** The type name Swift and Kotlin output declares. Default `<theme name>Tokens`, PascalCased. */
  readonly name?: string;
}

interface Leaf {
  readonly scale: string;
  readonly path: readonly string[];
  readonly raw: TokenNode;
  readonly value: string | number | undefined;
}

// Scales whose numbers are lengths in px.
const LENGTHS = new Set(['space', 'sizes', 'radii', 'fontSizes', 'borderWidths', 'letterSpacings']);
const W3C_TYPES: Readonly<Record<string, string>> = {
  colors: 'color',
  space: 'dimension',
  sizes: 'dimension',
  radii: 'dimension',
  fontSizes: 'dimension',
  borderWidths: 'dimension',
  letterSpacings: 'dimension',
  fontWeights: 'fontWeight',
  fontFamilies: 'fontFamily',
  lineHeights: 'number',
  opacities: 'number',
  zIndices: 'number',
  durations: 'duration',
};

// W3C's cubicBezier is four numbers; the CSS keywords are these curves.
const CURVES: Readonly<Record<string, readonly number[]>> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

function curve(value: unknown): readonly number[] | undefined {
  if (typeof value !== 'string') return undefined;
  const fn = /^cubic-bezier\(([^)]*)\)$/.exec(value.trim());
  const points = fn?.[1]?.split(',').map(Number);
  return points?.length === 4 && points.every(Number.isFinite) ? points : CURVES[value.trim()];
}

function leaves(theme: Theme): Leaf[] {
  const out: Leaf[] = [];
  const walk = (scale: string, node: TokenNode, path: string[]): void => {
    if (typeof node === 'object' && node !== null) {
      for (const [key, child] of Object.entries(node as TokenScale))
        walk(scale, child, [...path, key]);
      return;
    }
    const value = isTokenRef(node) ? resolveToken(node, theme) : node;
    out.push({ scale, path, raw: node, value });
  };
  for (const [scale, node] of Object.entries(theme.tokens)) {
    // Animation presets are objects, not values, and have no portable form.
    if (scale === 'animations' || scale === 'fontScale' || node === undefined) continue;
    walk(scale, node as TokenNode, []);
  }
  return out;
}

// `1.5` keeps its point as `1_5`, so it cannot meet a `15` key.
const words = (parts: readonly string[]): string[] =>
  parts
    .flatMap((part) => part.replace(/(\d)\.(\d)/g, '$1_$2').split(/[^A-Za-z0-9_]+/))
    .filter((w) => w !== '');
const pascal = (parts: readonly string[]): string =>
  words(parts)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join('');
const camel = (parts: readonly string[]): string => {
  const name = pascal(parts);
  const id = name[0]!.toLowerCase() + name.slice(1);
  return /^\d/.test(id) ? `_${id}` : id;
};

function nested(
  theme: Theme,
  leaf: (l: Leaf) => unknown,
  name: (key: string) => string = (key) => key,
): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const l of leaves(theme)) {
    let node = root;
    for (const key of [l.scale, ...l.path.slice(0, -1)]) {
      node = (node[name(key)] ??= {}) as Record<string, unknown>;
    }
    node[name(l.path[l.path.length - 1]!)] = leaf(l);
  }
  return root;
}

const px = (l: Leaf): string | number | undefined =>
  typeof l.value === 'number' && LENGTHS.has(l.scale) ? `${l.value}px` : l.value;

/** Split on commas outside parentheses, as CSS lists are. */
function topLevel(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of list) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += ch;
  }
  parts.push(current.trim());
  return parts.filter((p) => p !== '');
}

/** A CSS `box-shadow` as W3C shadow objects, or undefined when it is not one. */
function shadow(value: unknown): unknown {
  if (typeof value !== 'string' || value.trim() === 'none') return undefined;
  const layers = topLevel(value).map((layer) => {
    const inset = /\binset\b/.test(layer);
    const words = layer.replace(/\binset\b/, '').match(/[a-z-]+\([^)]*\)|\S+/gi) ?? [];
    const lengths = words
      .filter((w) => /^-?\d*\.?\d+(px)?$/.test(w))
      .map((w) => (/\d$/.test(w) ? `${w}px` : w));
    const color = words.find((w) => !/^-?\d*\.?\d+(px)?$/.test(w));
    if (lengths.length < 2 || color === undefined) return null;
    const [offsetX, offsetY, blur = '0px', spread = '0px'] = lengths;
    return { color, offsetX, offsetY, blur, spread, ...(inset ? { inset: true } : {}) };
  });
  if (layers.some((l) => l === null)) return undefined;
  return layers.length === 1 ? layers[0] : layers;
}

/** A ref's path, with `$space.1.5` read as the `1.5` key, as the resolver reads it. */
function refPath(ref: string): string[] {
  const segments = ref.slice(1).split('.');
  const out: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const next = segments[i + 1];
    if (/^\d+$/.test(segments[i]!) && next !== undefined && /^\d+$/.test(next)) {
      out.push(`${segments[i]}.${next}`);
      i++;
    } else out.push(segments[i]!);
  }
  return out;
}

// W3C token names may not contain `.`, so `space.1.5` is written `space.1_5`.
const w3cName = (key: string): string => key.replace(/\./g, '_');

function w3c(theme: Theme): string {
  const tree = nested(
    theme,
    (l) => {
      if (isTokenRef(l.raw)) {
        const target = refPath((l.raw as TokenRef).replace(/\s*\?\?.*$/, '')).map(w3cName);
        return { $value: `{${target.join('.')}}`, ...typeOf(l.scale) };
      }
      if (l.scale === 'easings') {
        const points = curve(l.value);
        return points === undefined
          ? { $value: l.value }
          : { $value: points, $type: 'cubicBezier' };
      }
      if (l.scale === 'shadows') {
        const layers = shadow(l.value);
        return layers === undefined ? { $value: l.value } : { $value: layers, $type: 'shadow' };
      }
      return { $value: px(l), ...typeOf(l.scale) };
    },
    w3cName,
  );
  return `${JSON.stringify(tree, null, 2)}\n`;
}

const typeOf = (scale: string): { $type?: string } => {
  const type = W3C_TYPES[scale];
  return type === undefined ? {} : { $type: type };
};

function rgba(value: string | number | undefined): [number, number, number, number] | null {
  if (typeof value !== 'string') return null;
  const c = parseColor(value);
  return c === null ? null : [c.r, c.g, c.b, c.a];
}

const fixed = (n: number): string => String(+n.toFixed(4));

const SWIFT_KEYWORDS = new Set(
  (
    'as associatedtype break case catch class continue default defer deinit do else enum ' +
    'extension fallthrough false fileprivate for func guard if import in init inout internal ' +
    'is let nil open operator private protocol public repeat rethrows return self Self static ' +
    'struct subscript super switch throw throws true try typealias var where while'
  ).split(' '),
);

function swift(theme: Theme, name: string): string {
  const groups = new Map<string, string[]>();
  for (const l of leaves(theme)) {
    const plain = camel(l.path);
    const id = SWIFT_KEYWORDS.has(plain) ? `\`${plain}\`` : plain;
    const color = l.scale === 'colors' ? rgba(l.value) : null;
    let line: string | null = null;
    if (color !== null) {
      const [r, g, b, a] = color;
      line = `public static let ${id} = Color(red: ${fixed(r / 255)}, green: ${fixed(g / 255)}, blue: ${fixed(b / 255)}, opacity: ${fixed(a)})`;
    } else if (typeof l.value === 'number') {
      line = `public static let ${id}: CGFloat = ${l.value}`;
    } else if (typeof l.value === 'string') {
      line = `public static let ${id} = ${JSON.stringify(l.value)}`;
    }
    if (line === null) continue;
    const group = pascal([l.scale]);
    groups.set(group, [...(groups.get(group) ?? []), line]);
  }
  const body = [...groups]
    .map(
      ([group, lines]) =>
        `  public enum ${group} {\n${lines.map((l) => `    ${l}`).join('\n')}\n  }`,
    )
    .join('\n\n');
  return `// Generated by usemotif-tokens from the "${theme.name}" theme. Do not edit.\nimport SwiftUI\n\npublic enum ${name} {\n${body}\n}\n`;
}

const KOTLIN_UNITS: Readonly<Record<string, string>> = {
  space: 'dp',
  sizes: 'dp',
  radii: 'dp',
  borderWidths: 'dp',
  fontSizes: 'sp',
  letterSpacings: 'sp',
};

function kotlin(theme: Theme, name: string): string {
  const groups = new Map<string, string[]>();
  for (const l of leaves(theme)) {
    const id = pascal(l.path);
    const safe = /^\d/.test(id) ? `_${id}` : id;
    const color = l.scale === 'colors' ? rgba(l.value) : null;
    let line: string | null = null;
    if (color !== null) {
      const [r, g, b, a] = color;
      const hex = [Math.round(a * 255), r, g, b]
        .map((v) => Math.round(v).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      line = `val ${safe} = Color(0x${hex})`;
    } else if (typeof l.value === 'number') {
      const unit = KOTLIN_UNITS[l.scale];
      line =
        unit === undefined ? `const val ${safe} = ${l.value}f` : `val ${safe} = ${l.value}.${unit}`;
    } else if (typeof l.value === 'string') {
      line = `const val ${safe} = ${JSON.stringify(l.value)}`;
    }
    if (line === null) continue;
    const group = pascal([l.scale]);
    groups.set(group, [...(groups.get(group) ?? []), line]);
  }
  const body = [...groups]
    .map(([group, lines]) => `  object ${group} {\n${lines.map((l) => `    ${l}`).join('\n')}\n  }`)
    .join('\n\n');
  return (
    `// Generated by usemotif-tokens from the "${theme.name}" theme. Do not edit.\n` +
    'import androidx.compose.ui.graphics.Color\nimport androidx.compose.ui.unit.dp\nimport androidx.compose.ui.unit.sp\n\n' +
    `object ${name} {\n${body}\n}\n`
  );
}

/**
 * Write a theme in another format: `css` custom properties, `json` with every reference
 * resolved, `w3c` Design Tokens with references kept as aliases, or `swift` and `kotlin`
 * constants for native code outside React Native. Animation presets are left out of all of
 * them; Swift and Kotlin also leave out values they cannot represent.
 */
export function exportTheme(
  theme: Theme,
  format: TokenExportFormat,
  options: TokenExportOptions = {},
): string {
  const name = options.name ?? `${pascal([theme.name])}Tokens`;
  switch (format) {
    case 'css':
      return `${themeToCssBlock(theme)}\n`;
    case 'json':
      return `${JSON.stringify(nested(theme, px), null, 2)}\n`;
    case 'w3c':
      return w3c(theme);
    case 'swift':
      return swift(theme, name);
    case 'kotlin':
      return kotlin(theme, name);
  }
}
