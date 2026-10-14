import { readdir, readFile, writeFile } from 'node:fs/promises';
import type { Plugin } from 'esbuild';
import { defineConfig } from 'tsup';

const DIRECTIVE = "'use client';\n";

/**
 * The modules that must stay in the server graph: the barrel, and the namespace
 * assembly it re-exports. Everything else the barrel reaches is client.
 */
const SERVER_ENTRY = /^(index|.+\.namespace)\.(js|cjs)$/;

/**
 * Prepend `'use client'` to every emitted chunk except the barrel.
 *
 * The barrel is the one module that must NOT carry it. It builds the compound
 * namespaces (`Modal`, `Drawer`, and the rest) out of client references, which
 * only works if it is itself in the server graph: an object exported from a
 * client module reaches a consumer as a proxy exposing named exports, so
 * `Modal.Root` would be `undefined`.
 *
 * Everything the barrel reaches therefore has to declare the boundary itself.
 * That is every other emitted file, not just the per-component entries: the
 * build splits shared code into hashed chunks and the barrel imports those
 * directly. Listing files by name would go stale the first time a chunk hash
 * changed, so this is expressed as "everything but the entry" instead.
 *
 * tsup's `banner` option is stripped by esbuild's treeshake when the banner is
 * a free string expression, so we prepend post-build.
 */
async function prependUseClient(): Promise<void> {
  const emitted = await readdir('dist');
  for (const name of emitted) {
    if (!/\.(js|cjs)$/.test(name) || SERVER_ENTRY.test(name)) continue;
    const file = `dist/${name}`;
    const content = await readFile(file, 'utf8');
    if (!content.startsWith(DIRECTIVE)) {
      await writeFile(file, DIRECTIVE + content);
    }
  }
}

/**
 * Keep a namespace module's imports out of the chunk graph.
 *
 * These modules must stay in the server graph, and code splitting does not
 * respect that: esbuild hoists shared code into a chunk, the chunk carries the
 * directive because every chunk does, and the namespace object ends up built
 * inside a client module again. `Modal.Root` is then a read through a proxy and
 * resolves to undefined, which is the exact defect this whole arrangement
 * exists to remove.
 *
 * Scoped by importer, so only the namespace modules opt out. Every other module
 * still chunks and shares as before.
 */
function externalizeNamespaceImports(): Plugin {
  return {
    name: 'motif-externalize-namespace-imports',
    setup(build) {
      // A namespace module is never bundled into anything: not into the barrel
      // that re-exports it, and not into a chunk shared with the entry of the
      // same name. Sharing is what pulled it back behind the directive.
      build.onResolve({ filter: /^\.\/[A-Za-z]+\.namespace\.js$/ }, ({ path }) => ({
        path,
        external: true,
      }));
      // And its own imports stay external, so it holds nothing worth hoisting.
      build.onResolve({ filter: /^\.\/[A-Za-z]+\.js$/ }, ({ path, importer }) =>
        /\.namespace\.tsx?$/.test(importer) ? { path, external: true } : null,
      );
    },
  };
}

/**
 * Point a namespace module's CJS output at the CJS siblings.
 *
 * The imports above are external, so nothing rewrites their extension, and the
 * source has to say `.js` for TypeScript. Left alone the CJS build would
 * require the ESM file. Done post-build because `treeshake` means Rollup, not
 * esbuild, emits the CommonJS.
 */
async function pointNamespaceCjsAtCjs(): Promise<void> {
  for (const name of await readdir('dist')) {
    if (!name.endsWith('.cjs')) continue;
    const file = `dist/${name}`;
    const content = await readFile(file, 'utf8');
    const patched = content.replace(/(['"])(\.\/[A-Za-z.]+)\.js\1/g, "'$2.cjs'");
    if (patched !== content) await writeFile(file, patched);
  }
}

export default defineConfig({
  // One entry per component (plus the barrel) with ESM splitting, so importing
  // one component never drags in another's dependencies - notably, the display
  // components stay free of Modal's `@usemotif/headless` import.
  entry: [
    'src/index.ts',
    // Namespace assembly lives in the server graph, one module per compound
    // component so an unused one shakes away instead of dragging the headless
    // dependency into every consumer of the kit.
    'src/Modal.namespace.ts',
    'src/AlertDialog.namespace.ts',
    'src/Drawer.namespace.ts',
    'src/Popover.namespace.ts',
    'src/HoverCard.namespace.ts',
    'src/Tooltip.namespace.ts',
    'src/Menu.namespace.ts',
    'src/ContextMenu.namespace.ts',
    'src/Accordion.namespace.ts',
    'src/Collapsible.namespace.ts',
    'src/Tabs.namespace.ts',
    'src/Breadcrumb.namespace.ts',
    'src/NavigationMenu.namespace.ts',
    'src/Card.tsx',
    'src/Badge.tsx',
    'src/Spinner.tsx',
    'src/Alert.tsx',
    'src/Modal.tsx',
    'src/Tooltip.tsx',
    'src/Toast.tsx',
    'src/Switch.tsx',
    'src/Tabs.tsx',
    'src/Checkbox.tsx',
    'src/Radio.tsx',
    'src/Popover.tsx',
    'src/Accordion.tsx',
    'src/Select.tsx',
    'src/Menu.tsx',
    'src/MenuSub.tsx',
    'src/MenuItems.tsx',
    'src/Slider.tsx',
    'src/Progress.tsx',
    'src/Drawer.tsx',
    'src/AlertDialog.tsx',
    'src/ContextMenu.tsx',
    'src/Separator.tsx',
    'src/Skeleton.tsx',
    'src/Pagination.tsx',
    'src/Stepper.tsx',
    'src/Breadcrumb.tsx',
    'src/Toolbar.tsx',
    'src/NavigationMenu.tsx',
    'src/RangeSlider.tsx',
    'src/RatingInput.tsx',
    'src/Combobox.tsx',
    'src/MultiSelect.tsx',
    'src/ColorPicker.tsx',
    'src/FileUpload.tsx',
    'src/TagsInput.tsx',
    'src/TimeInput.tsx',
    'src/HoverCard.tsx',
    'src/Collapsible.tsx',
    'src/Calendar.tsx',
    'src/DatePicker.tsx',
    'src/CommandPalette.tsx',
    'src/TreeView.tsx',
    'src/Stat.tsx',
    'src/EmptyState.tsx',
    'src/Timeline.tsx',
    'src/AvatarGroup.tsx',
    'src/Chip.tsx',
    'src/Banner.tsx',
    'src/FormField.tsx',
    'src/SegmentedControl.tsx',
  ],
  splitting: true,
  format: ['esm', 'cjs'],
  // tsup's dts pipeline trips TS 6's deprecated-`baseUrl` warning. Scope the
  // ignoreDeprecations escape hatch to dts-only so the project's tsconfig
  // stays strict for IDE / typecheck.
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  clean: true,
  treeshake: true,
  sourcemap: true,
  target: 'es2022',
  outDir: 'dist',
  external: ['react', 'react-dom', 'usemotif', '@usemotif/headless', '@usemotif/recipes'],
  esbuildPlugins: [externalizeNamespaceImports()],
  onSuccess: async () => {
    await prependUseClient();
    await pointNamespaceCjsAtCjs();
  },
});
