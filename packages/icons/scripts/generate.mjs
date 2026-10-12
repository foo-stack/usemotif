#!/usr/bin/env node
/**
 * Generate motif icon glyphs from `lucide-react`'s icon-node data.
 *
 * Each lucide icon source file (`lucide-react/dist/esm/icons/<name>.mjs`)
 * exports a named `__iconNode` array of `[tag, attributes]` tuples that
 * describe the SVG node tree. We import those directly and emit a motif
 * glyph wrapper file that uses `<Icon render={...}>` from
 * `@usemotif/react`. Doing it through motif's own SVG primitives means
 * the same generated source works on web AND React Native - the
 * primitives swap out under the hood at render time.
 *
 * Run via `yarn workspace @usemotif/icons generate`. The script is
 * idempotent: it wipes `src/glyphs/` and rewrites it, plus regenerates
 * `src/index.ts` with one named export per glyph organised by initial
 * letter. Re-run after a `lucide-react` version bump.
 *
 * **Backward compat**: the existing 81 hand-rolled motif glyph names
 * (`Check`, `X`, `Menu`, `Settings`, `MoreHorizontal`, ...) all match
 * lucide's PascalCase names exactly - no rename map needed.
 */
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, '..');
const LUCIDE_ICONS_DIR = resolve(
  PACKAGE_ROOT,
  '..',
  '..',
  'node_modules',
  'lucide-react',
  'dist',
  'esm',
  'icons',
);
const OUT_GLYPHS_DIR = resolve(PACKAGE_ROOT, 'src', 'glyphs');
const EXTRAS_DIR = resolve(PACKAGE_ROOT, 'src', '_extras');
const OUT_INDEX_FILE = resolve(PACKAGE_ROOT, 'src', 'index.ts');

/** Map lucide tag names to motif's `SvgPrimitives` field name. */
const TAG_TO_PRIMITIVE = Object.freeze({
  path: 'Path',
  circle: 'Circle',
  rect: 'Rect',
  line: 'Line',
  polygon: 'Polygon',
  polyline: 'Polyline',
  ellipse: 'Ellipse',
});

/** Reserved JS/global names where a function declaration would shadow
 * a built-in (and trip `eslint(no-shadow-restricted-names)`). The only
 * lucide icon currently in this set is `infinity`. Skip these.
 */
const RESERVED_GLOBALS = new Set(['Infinity', 'NaN', 'undefined', 'Arguments']);

/** kebab-case → PascalCase. Numeric suffixes (e.g. `volume-2`) keep
 * their digit; lucide's component name for `volume-2` is `Volume2`. */
function pascalCase(name) {
  return name
    .split('-')
    .map((part) => (part.length === 0 ? '' : part[0].toUpperCase() + part.slice(1)))
    .join('');
}

/** Format a JS attribute object as JSX attributes. Drops the `key`
 * field - that's lucide-internal stable-key bookkeeping not needed for
 * motif's render-once glyphs. Numeric values stay numeric (`r={4}`);
 * strings emit as quoted attrs (`d="..."`). */
function formatAttributes(attrs) {
  const out = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'key') continue;
    if (typeof value === 'number') {
      out.push(`${key}={${value}}`);
    } else if (typeof value === 'string') {
      out.push(`${key}=${JSON.stringify(value)}`);
    } else {
      // Future-proofing: lucide currently uses only strings + numbers.
      out.push(`${key}={${JSON.stringify(value)}}`);
    }
  }
  return out.join(' ');
}

/** Build the JSX render-prop body for one icon's __iconNode. */
function renderJsxFor(iconNode) {
  const usedPrimitives = new Set();
  const elements = iconNode.map(([tag, attrs]) => {
    const primitive = TAG_TO_PRIMITIVE[tag];
    if (primitive === undefined) {
      throw new Error(`Unknown SVG tag '${tag}' (no motif primitive mapping).`);
    }
    usedPrimitives.add(primitive);
    return `<${primitive} ${formatAttributes(attrs)} />`;
  });

  const params = [...usedPrimitives].sort().join(', ');
  if (elements.length === 1) {
    return { params, body: elements[0] };
  }
  return { params, body: `<>${elements.join('')}</>` };
}

/**
 * Generate the source for one glyph file. Long-render lines (typical
 * for multi-path or long-`d`-attribute icons) are emitted in the
 * already-broken-up shape that Prettier produces, so subsequent
 * `yarn format` runs are a no-op (avoids churn between generations).
 */
function glyphSource(componentName, iconNode) {
  const { params, body } = renderJsxFor(iconNode);
  const oneLine = `<Icon {...props} render={({ ${params} }) => ${body}} />`;
  // Prettier wraps the JSX expression when the single-line form
  // exceeds the 100-char default print width. Mirror its breaking
  // shape exactly so format-after-generate is a no-op.
  const singleLineRendered = `  return ${oneLine};`;
  const renderBody =
    singleLineRendered.length <= 100
      ? `  return ${oneLine};`
      : `  return (
    <Icon
      {...props}
      render={({ ${params} }) => (
        ${body}
      )}
    />
  );`;
  return `import { Icon, type IconProps } from '@usemotif/react/svg';
import type { ReactElement } from 'react';

export function ${componentName}(props: IconProps): ReactElement {
${renderBody}
}
`;
}

async function main() {
  const entries = await readdir(LUCIDE_ICONS_DIR);
  const iconFiles = entries
    .filter((f) => f.endsWith('.mjs') && !f.endsWith('.mjs.map'))
    .filter((f) => f !== 'index.mjs'); // lucide's barrel - not an icon.
  iconFiles.sort();

  await rm(OUT_GLYPHS_DIR, { recursive: true, force: true });
  await mkdir(OUT_GLYPHS_DIR, { recursive: true });

  // Cache resolved __iconNode per slug so alias files (which
  // `export { default } from './canonical.mjs'` without re-exporting
  // __iconNode) can pick up the target's data.
  const iconNodeBySlug = new Map();
  const aliasTargets = new Map();
  const { readFile } = await import('node:fs/promises');

  for (const file of iconFiles) {
    const slug = file.slice(0, -'.mjs'.length);
    const modulePath = join(LUCIDE_ICONS_DIR, file);
    const mod = await import(modulePath);
    if (Array.isArray(mod.__iconNode)) {
      iconNodeBySlug.set(slug, mod.__iconNode);
      continue;
    }
    // Alias: parse the source for `export { default } from './<target>.mjs'`.
    const source = await readFile(modulePath, 'utf8');
    const match = /export\s*\{\s*default\s*\}\s*from\s*['"]\.\/([\w-]+)\.mjs['"]/.exec(source);
    if (match === null) {
      throw new Error(`No __iconNode and no recognisable alias in ${file}.`);
    }
    aliasTargets.set(slug, match[1]);
  }
  // Resolve aliases (one level - lucide doesn't chain).
  for (const [slug, targetSlug] of aliasTargets) {
    const target = iconNodeBySlug.get(targetSlug);
    if (!Array.isArray(target)) {
      throw new Error(`Alias ${slug} → ${targetSlug} but target has no __iconNode.`);
    }
    iconNodeBySlug.set(slug, target);
  }

  // Dedupe by lowercased component name. Two sources of duplicates:
  //   1. Lucide ships some icons under both `arrow-up-0-1` and
  //      `arrow-up-01` style slugs; both PascalCase to `ArrowUp01`.
  //   2. Case-insensitive filesystems (macOS APFS / Windows NTFS by
  //      default) collapse `ArrowDownZA.tsx` and `ArrowDownZa.tsx` to
  //      the same path even though Linux would keep them separate.
  // Skip duplicates: keep the slug with the most hyphens (the more-
  // separated form is usually lucide's canonical naming).
  const seen = new Map(); // lowercased name → { componentName, slug, hyphens }
  for (const file of iconFiles) {
    const slug = file.slice(0, -'.mjs'.length);
    const componentName = pascalCase(slug);
    if (RESERVED_GLOBALS.has(componentName)) continue;
    const key = componentName.toLowerCase();
    const hyphens = (slug.match(/-/g) ?? []).length;
    const existing = seen.get(key);
    if (existing === undefined || hyphens > existing.hyphens) {
      seen.set(key, { componentName, slug, hyphens });
    }
  }

  // Hand-rolled extras: icons that lucide doesn't carry (or has
  // dropped) but motif keeps for backward compat. Files in
  // `src/_extras/` aren't touched by the regen - they're added to
  // the index alongside the generated glyphs and tie-broken by name
  // collision (extras win, since they exist for compat reasons).
  const extras = [];
  try {
    const extrasFiles = await readdir(EXTRAS_DIR);
    for (const f of extrasFiles) {
      if (f.endsWith('.tsx')) extras.push(f.slice(0, -'.tsx'.length));
    }
  } catch {
    // No extras directory - skip silently.
  }
  const extrasSet = new Set(extras);

  // An alias whose target is written as its own generated glyph re-exports
  // that glyph instead of duplicating its body under a second name.
  const keptTarget = (targetSlug) => {
    const targetName = pascalCase(targetSlug);
    return seen.get(targetName.toLowerCase())?.slug === targetSlug && !extrasSet.has(targetName)
      ? targetName
      : undefined;
  };

  const glyphs = [];
  for (const { componentName, slug } of seen.values()) {
    const target = aliasTargets.has(slug) ? keptTarget(aliasTargets.get(slug)) : undefined;
    if (target === undefined) {
      const source = glyphSource(componentName, iconNodeBySlug.get(slug));
      await writeFile(join(OUT_GLYPHS_DIR, `${componentName}.tsx`), source);
    }
    glyphs.push({ componentName, target });
  }

  // Drop any generated glyph that an extras file overrides.
  const generatedNotOverridden = glyphs.filter(
    ({ componentName }) => !extrasSet.has(componentName),
  );

  // Sort by name for diff-friendliness.
  generatedNotOverridden.sort((a, b) => a.componentName.localeCompare(b.componentName));
  extras.sort();

  const exportLines = [
    ...generatedNotOverridden.map(({ componentName, target }) =>
      target === undefined
        ? `export { ${componentName} } from './glyphs/${componentName}.js';`
        : `export { ${target} as ${componentName} } from './glyphs/${target}.js';`,
    ),
    ...extras.map((name) => `export { ${name} } from './_extras/${name}.js';`),
  ];

  const indexHeader = `/**
 * \`@usemotif/icons\` - pre-built icons over \`<Icon>\` from \`@usemotif/react\`.
 *
 * ${glyphs.length} glyphs generated from \`lucide-react\` (lucide.dev) - same
 * 24×24 stroke style, MIT/ISC licensed, pixel-identical to the lucide
 * source. Re-run \`yarn workspace @usemotif/icons generate\` after a
 * lucide-react version bump.
 *
 * Each glyph renders via motif's \`<Icon render={({ Path, Line, ... }) => ...}>\`
 * primitive so the same source works on web AND React Native (the SVG
 * primitives swap out under the hood). Sizes / colour are inherited
 * from the parent's font-size + colour (the SVGs use \`currentColor\`).
 *
 * For glyphs not in this set, drop down to \`<Icon>\` directly and
 * pass your own \`render\` callback - that's the same API the
 * pre-built glyphs use.
 */

export const PACKAGE_NAME = '@usemotif/icons';

`;

  const indexContent =
    indexHeader +
    exportLines.join('\n') +
    `\n\nexport type { IconProps } from '@usemotif/react/svg';\n`;

  await writeFile(OUT_INDEX_FILE, indexContent);

  console.log(`Generated ${glyphs.length} glyphs.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
