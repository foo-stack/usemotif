/** A converted icon, or the reason it cannot be drawn by the cross-platform SVG primitives. */
export type GlyphResult =
  | { readonly name: string; readonly source: string }
  | { readonly name: string; readonly error: string };

interface SvgElement {
  readonly tag: string;
  readonly attrs: Record<string, string>;
  readonly children: SvgElement[];
}

const PRIMITIVES: Readonly<Record<string, string>> = {
  path: 'Path',
  circle: 'Circle',
  rect: 'Rect',
  line: 'Line',
  polygon: 'Polygon',
  polyline: 'Polyline',
  ellipse: 'Ellipse',
  g: 'G',
};

// Why each unsupported element cannot become a glyph.
const REJECTED: Readonly<Record<string, string>> = {
  text: 'text has no cross-platform SVG primitive; convert it to paths',
  tspan: 'text has no cross-platform SVG primitive; convert it to paths',
  image: 'embedded images are not drawable by the SVG primitives',
  use: 'references to other shapes are not supported; inline the shape',
  defs: 'definitions (gradients, clip paths, masks, shared shapes) have no cross-platform SVG primitive',
  symbol: 'references to other shapes are not supported; inline the shape',
  lineargradient: 'gradients have no cross-platform SVG primitive',
  radialgradient: 'gradients have no cross-platform SVG primitive',
  mask: 'masks have no cross-platform SVG primitive',
  clippath: 'clip paths have no cross-platform SVG primitive',
  filter: 'filters have no cross-platform SVG primitive',
  pattern: 'patterns have no cross-platform SVG primitive',
  style: 'CSS styles do not reach React Native; use presentation attributes',
  foreignobject: 'foreign content cannot be drawn on React Native',
  animate: 'SVG animation is not supported',
  animatetransform: 'SVG animation is not supported',
};

// Children of these carry nothing an icon draws.
const IGNORED = new Set(['title', 'desc', 'metadata']);
// Attributes that do not reach the drawing.
const DROPPED = (name: string): boolean =>
  name === 'xmlns' || name.startsWith('xmlns:') || name === 'id' || name.startsWith('data-');
// Presentation attributes the root `<svg>` passes down to its shapes.
const INHERITED = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'fill-rule',
  'clip-rule',
  'opacity',
];

class Unsupported extends Error {}

function parse(svg: string): SvgElement {
  const stack: SvgElement[] = [{ tag: '#root', attrs: {}, children: [] }];
  // Comments, the prolog and doctype carry nothing to draw. Stripped until nothing changes, so
  // a removal cannot join two fragments into a new `<!--`.
  let body = svg;
  for (let previous = ''; previous !== body; ) {
    previous = body;
    body = body.replace(/<!--[^]*?-->|<\?[^]*?\?>|<!DOCTYPE[^>]*>/gi, '');
  }
  const TAG = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/g;
  for (const m of body.matchAll(TAG)) {
    const [, closing, rawTag, rawAttrs = '', selfClosing] = m;
    const tag = rawTag!.toLowerCase();
    if (closing === '/') {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const attrs: Record<string, string> = {};
    for (const a of rawAttrs.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g)) {
      attrs[a[1]!] = a[2] ?? a[3] ?? '';
    }
    const element: SvgElement = { tag, attrs, children: [] };
    stack[stack.length - 1]!.children.push(element);
    if (selfClosing !== '/') stack.push(element);
  }
  const root = stack[0]!.children.find((child) => child.tag === 'svg');
  if (root === undefined) throw new Unsupported('no <svg> element found');
  return root;
}

const camel = (name: string): string =>
  name.replace(/[-:]([a-z])/g, (_, c: string) => c.toUpperCase());

function attributes(attrs: Readonly<Record<string, string>>): string {
  return Object.entries(attrs)
    .filter(([name]) => !DROPPED(name))
    .map(([name, value]) => {
      if (name === 'class' || name === 'style') {
        throw new Unsupported(`a ${name} attribute; CSS does not reach React Native`);
      }
      if (/url\(\s*#/.test(value)) {
        const fix = name === 'fill' || name === 'stroke' ? '; use a plain colour' : '';
        throw new Unsupported(`${name} refers to a definition (${value})${fix}`);
      }
      const key = camel(name);
      return /^-?\d*\.?\d+$/.test(value)
        ? `${key}={${Number(value)}}`
        : `${key}=${JSON.stringify(value)}`;
    })
    .join(' ');
}

function element(node: SvgElement, used: Set<string>): string {
  const reason = REJECTED[node.tag];
  if (reason !== undefined) throw new Unsupported(`<${node.tag}>: ${reason}`);
  const primitive = PRIMITIVES[node.tag];
  if (primitive === undefined) throw new Unsupported(`<${node.tag}> is not a drawable SVG shape`);
  used.add(primitive);
  const attrs = attributes(node.attrs);
  const open = attrs === '' ? primitive : `${primitive} ${attrs}`;
  const children = node.children.filter((child) => !IGNORED.has(child.tag));
  if (children.length === 0) return `<${open} />`;
  return `<${open}>${children.map((child) => element(child, used)).join('')}</${primitive}>`;
}

/** `arrow-up.svg` becomes `ArrowUp`; a name that would start with a digit gets `Icon` first. */
export function componentName(file: string): string {
  const base = file.replace(/\.svg$/i, '');
  const name = base
    .split(/[^A-Za-z0-9]+/)
    .filter((part) => part !== '')
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('');
  return /^\d/.test(name) || name === '' ? `Icon${name}` : name;
}

/**
 * Convert one SVG file into a glyph component drawn through `@usemotif/react/svg`'s
 * cross-platform primitives, or explain why it cannot be. The root's `viewBox` is kept, and its
 * presentation attributes (fill, stroke and the like) move onto a `G` around the shapes so they
 * apply on both platforms.
 */
export function svgToGlyph(file: string, svg: string): GlyphResult {
  const name = componentName(file);
  try {
    const root = parse(svg);
    const used = new Set<string>();
    const shapes = root.children.filter((child) => !IGNORED.has(child.tag));
    if (shapes.length === 0) throw new Unsupported('the <svg> has nothing to draw');
    let body = shapes.map((child) => element(child, used)).join('');
    const inherited = Object.fromEntries(
      INHERITED.filter((attr) => root.attrs[attr] !== undefined).map((attr) => [
        attr,
        root.attrs[attr]!,
      ]),
    );
    if (Object.keys(inherited).length > 0) {
      used.add('G');
      body = `<G ${attributes(inherited)}>${body}</G>`;
    } else if (shapes.length > 1) {
      body = `<>${body}</>`;
    }
    const viewBox = root.attrs.viewBox ?? root.attrs.viewbox ?? '0 0 24 24';
    const params = [...used].sort().join(', ');
    const source =
      `import { Icon, type IconProps } from '@usemotif/react/svg';\n` +
      `import type { ReactElement } from 'react';\n\n` +
      `export function ${name}(props: IconProps): ReactElement {\n` +
      `  return (\n` +
      `    <Icon\n` +
      `      viewBox=${JSON.stringify(viewBox)}\n` +
      `      {...props}\n` +
      `      render={({ ${params} }) => ${body}}\n` +
      `    />\n` +
      `  );\n` +
      `}\n`;
    return { name, source };
  } catch (error) {
    if (error instanceof Unsupported) return { name, error: error.message };
    throw error;
  }
}
