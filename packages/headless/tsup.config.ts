import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'esbuild';
import { defineConfig } from 'tsup';

const DIRECTIVE = "'use client';\n";

/**
 * Prepend `'use client'` to the client chunk, and only to it.
 *
 * Every component here is interactive, so `client.js` is a single client
 * reference; without the directive in `dist`, importing it from a React
 * Server Component fails at build time even though the source files carry it.
 *
 * `index.js` must NOT get the directive. It is the server-safe barrel, and a
 * directive there would put the namespace objects it builds back into the
 * client graph, which is the whole thing this split exists to avoid.
 *
 * tsup's `banner` option is stripped by esbuild's treeshake when the banner is
 * a free string expression, so we prepend post-build.
 */
async function prependUseClient(): Promise<void> {
  for (const file of ['dist/client.js', 'dist/client.cjs']) {
    const content = await readFile(file, 'utf8');
    if (!content.startsWith(DIRECTIVE)) {
      await writeFile(file, DIRECTIVE + content);
    }
  }
}

/**
 * Point the CJS barrel at the CJS chunk.
 *
 * The barrel's source says `./client.js` because that is what TypeScript and
 * Metro resolve. In a `"type": "module"` package that file is ESM, so the CJS
 * build has to say `./client.cjs` instead or `require()` of this package throws
 * ERR_REQUIRE_ESM on any Node without `require(esm)`.
 *
 * This cannot be done in the esbuild plugin below. With `treeshake` on, tsup
 * builds both formats as ESM and lets Rollup emit the CJS, so the plugin never
 * observes `format: 'cjs'` and Rollup carries the source specifier through
 * verbatim. Post-build is the only place the CJS output actually exists.
 *
 * The throw is not defensive padding. The failure this repairs was silent in
 * every check the project has, and a rewrite that quietly matches nothing after
 * some future bundler change would restore exactly that.
 */
async function pointCjsBarrelAtCjsChunk(): Promise<void> {
  const file = 'dist/index.cjs';
  const content = await readFile(file, 'utf8');
  const patched = content.replace(/(['"])\.\/client\.js\1/g, "'./client.cjs'");
  // Tolerate an already-rewritten file so a repeated onSuccess is a no-op, but
  // fail when neither spelling is present: that means the barrel stopped
  // referencing the chunk at all and this step is silently doing nothing.
  if (!patched.includes('./client.cjs')) {
    throw new Error(
      `${file} references neither './client.js' nor './client.cjs'. The CJS ` +
        `barrel must point at the CJS chunk; check how tsup emitted this file ` +
        `before removing this step.`,
    );
  }
  if (patched !== content) await writeFile(file, patched);
}

/**
 * Keep the barrel's import of the client chunk as a runtime import instead of
 * letting esbuild inline it. Inlining would copy every component into
 * `index.js`, which carries no directive - so the components would compile
 * into the RSC graph and the split would silently buy nothing.
 *
 * This only decides what stays external. Which extension each format points at
 * is settled after the build, in `pointCjsBarrelAtCjsChunk`, because `treeshake`
 * means this plugin only ever sees the ESM pass.
 */
function externalClientChunk(): Plugin {
  return {
    name: 'motif-external-client-chunk',
    setup(build) {
      build.onResolve({ filter: /^\.\/client\.js$/ }, ({ path }) => ({ path, external: true }));
    },
  };
}

/**
 * For the native build, resolve each relative import to its `.native.tsx` /
 * `.native.ts` sibling when one exists, as Metro would for source. Metro never
 * gets the chance: the source imports carry ESM `.js` specifiers it cannot map
 * to `.ts` files, so React Native consumers get this prebuilt bundle instead.
 */
function preferNativeModules(): Plugin {
  return {
    name: 'motif-prefer-native-modules',
    setup(build) {
      build.onResolve({ filter: /^\.\.?\// }, ({ path, resolveDir }) => {
        const base = resolve(resolveDir, path.replace(/\.js$/, ''));
        for (const ext of ['.native.tsx', '.native.ts']) {
          if (existsSync(base + ext)) return { path: base + ext };
        }
        return undefined;
      });
    },
  };
}

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/client.ts'],
    format: ['esm', 'cjs'],
    // tsup's dts pipeline trips TS 6's deprecated-`baseUrl` warning. Scope the
    // ignoreDeprecations escape hatch to dts-only so the project's tsconfig
    // stays strict for IDE / typecheck.
    //
    // Only the barrel gets declarations, deliberately. The runtime splits in two
    // because a Server Component needs a module without the directive; types have
    // no such constraint, and splitting them too breaks consumers. A namespace
    // member like `Dialog.Root` is an unexported declaration, so a consumer
    // writing `{ Root: Dialog.Root }` needs somewhere to name it from - and
    // `./client` is intentionally not a public subpath, so there is nowhere.
    // TS2883, raised in `@usemotif/ui` rather than here. One declaration file
    // keeps every type reachable through the one entry consumers resolve.
    dts: { entry: ['src/index.ts'], compilerOptions: { ignoreDeprecations: '6.0' } },
    // The native build below writes beside this one, possibly first.
    clean: ['**/*', '!index.native.js', '!index.native.js.map'],
    treeshake: true,
    sourcemap: true,
    target: 'es2022',
    outDir: 'dist',
    esbuildPlugins: [externalClientChunk()],
    onSuccess: async () => {
      await prependUseClient();
      await pointCjsBarrelAtCjsChunk();
    },
  },
  // React Native: one ESM file from the same barrel, with every `.native`
  // variant swapped in and the client chunk inlined (there is no server graph
  // to keep it out of). The `react-native` export condition points here. It
  // carries no directive, and shares the barrel's declarations.
  {
    entry: { 'index.native': 'src/index.ts' },
    format: ['esm'],
    dts: false,
    clean: false,
    sourcemap: true,
    target: 'es2022',
    outDir: 'dist',
    esbuildPlugins: [preferNativeModules()],
  },
]);
