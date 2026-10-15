import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformAsync } from '@babel/core';
import motifBabelPlugin, { type MotifBabelOptions } from '@usemotif/compiler-babel';
import type { NormalizedOutputOptions, OutputBundle } from 'rollup';
import { createUnplugin, type UnpluginInstance } from 'unplugin';

/**
 * Options for the bundler-side motif transform.
 *
 * A universal `unplugin` shim that exposes `vite`, `rollup`, `webpack`,
 * `rspack`, `esbuild`, `farm` entry points from one source. Internally it
 * runs the canonical `@usemotif/compiler-babel` transform on every relevant
 * file - the implementation is Babel, never SWC. SWC-based toolchains (Next,
 * Vite via `@vitejs/plugin-react-swc`) layer this BEFORE their SWC pass -
 * motif extracts, then SWC compiles JSX.
 */
export interface MotifBundlerOptions extends MotifBabelOptions {
  /**
   * File-extension allow-list. Defaults to ts/tsx/jsx/js. The plugin only
   * runs Babel against files it accepts, so it's cheap to enable on
   * mixed codebases.
   */
  readonly include?: ReadonlyArray<string | RegExp>;
  /**
   * Glob/regex paths to skip. By default `node_modules/` is excluded; if
   * you maintain a vendored package whose JSX should also be extracted,
   * pass the relevant override here.
   */
  readonly exclude?: ReadonlyArray<string | RegExp>;
  /**
   * Keep each module's result on disk and replay it, CSS included, while the module's source,
   * the options, and the compiler are unchanged. `true` uses
   * `node_modules/.cache/usemotif/compile`; a string names another directory. Skipped for a
   * module while `onBail` or `onAggressiveReport` is set, since those need the transform to run.
   */
  readonly cache?: boolean | string;
}

interface CachedModule {
  readonly code: string;
  readonly map: unknown;
  readonly css: readonly string[];
}

/** What the compiler itself is: a cached result from another build of it is stale. */
async function compilerStamp(): Promise<string> {
  const self = fileURLToPath(import.meta.url);
  const pkg = JSON.parse(await readFile(join(dirname(self), '..', 'package.json'), 'utf8')) as {
    version: string;
  };
  return `${pkg.version}:${(await stat(self)).mtimeMs}`;
}

/** The options that change the output; callbacks and file filters do not. */
function cacheableOptions(options: MotifBundlerOptions): string {
  return JSON.stringify(options, (key, value: unknown) =>
    typeof value === 'function' || key === 'include' || key === 'exclude' || key === 'cache'
      ? undefined
      : value,
  );
}

const DEFAULT_INCLUDE: readonly RegExp[] = [/\.[mc]?[jt]sx?$/];
const DEFAULT_EXCLUDE: readonly RegExp[] = [/node_modules/];

/**
 * Virtual module id surfaced to the user. Importing this anywhere in
 * the entry tree (typical: from your root layout / main entry) tells
 * the bundler to ship the aggregated extracted CSS as a real asset:
 *
 * ```ts
 * import 'virtual:motif-extract.css';
 * ```
 *
 * The bare-name alias `'motif-extract.css'` is also resolved for
 * frameworks that rewrite virtual: prefixes.
 */
const VIRTUAL_ID = 'virtual:motif-extract.css';
const VIRTUAL_ID_ALIAS = 'motif-extract.css';
// Rollup convention: `\0`-prefixed ids are not resolved against the
// filesystem and are reserved for plugin-emitted virtual modules.
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

/**
 * Sentinel emitted by `load` for the virtual module. The bundler
 * inlines this string into whatever CSS asset our virtual module
 * lands in; `generateBundle` then sweeps the bundle and rewrites
 * the sentinel to the final aggregated CSS - by that point every
 * `transform` has fired and `aggregatedCss` is complete. Without
 * this two-phase trick, `load`'s synchronous result would be
 * captured before later files have a chance to extract.
 *
 * The `/*!` prefix marks the comment as "important" so CSS
 * minifiers (LightningCSS, esbuild, cssnano) preserve it through
 * the optimisation pass - a plain `/*` comment gets stripped.
 */
const PLACEHOLDER_SENTINEL = '/*!__motif_extract_placeholder__*/';

/**
 * Strip the `?query` / `#hash` suffix Vite/Rollup append to module ids
 * (`/Button.tsx?v=abc`, `?used`, `?import`). The default include regex is
 * `$`-anchored against the extension, so without this the suffixed ids fail
 * the test and those files are silently skipped (styles never extracted).
 */
function cleanUrl(id: string): string {
  return id.split(/[?#]/)[0]!;
}

function shouldTransform(
  id: string,
  include: ReadonlyArray<string | RegExp>,
  exclude: ReadonlyArray<string | RegExp>,
): boolean {
  const clean = cleanUrl(id);
  for (const pat of exclude) {
    if (typeof pat === 'string' ? clean.includes(pat) : pat.test(clean)) return false;
  }
  for (const pat of include) {
    if (typeof pat === 'string' ? clean.includes(pat) : pat.test(clean)) return true;
  }
  return false;
}

/**
 * Universal motif extractor as an `unplugin` instance.
 *
 * Usage:
 * ```ts
 * // vite.config.ts
 * import motif from '@usemotif/compiler-web';
 * export default { plugins: [motif.vite()] };
 * ```
 *
 * The plugin emits a virtual `motif-extract.css` that aggregates every
 * extracted at-rule across the build. Hosts that need the CSS sooner
 * (e.g. dev-server HMR) can listen via the `onCss` option to catch CSS
 * per-file as it lands.
 */
export const motifExtract: UnpluginInstance<MotifBundlerOptions | undefined, false> =
  createUnplugin((rawOptions) => {
    const options = rawOptions ?? {};
    const include = options.include ?? DEFAULT_INCLUDE;
    const exclude = options.exclude ?? DEFAULT_EXCLUDE;
    // CSS keyed by module id (insertion-ordered) rather than a flat
    // append-only array. The plugin instance is created once and reused
    // across rebuilds in watch mode; an array would grow without bound,
    // re-appending each changed module's CSS every rebuild and shipping
    // duplicates. Keying by id means a re-transform overwrites that
    // module's entry, and a module edited to emit no CSS clears it.
    const cssByModule = new Map<string, string[]>();
    const cacheDir =
      options.cache === true
        ? join(process.cwd(), 'node_modules', '.cache', 'usemotif', 'compile')
        : typeof options.cache === 'string'
          ? options.cache
          : null;
    const optionsKey = cacheableOptions(options);
    let stamp: Promise<string> | undefined;
    const cacheFile = async (id: string, code: string): Promise<string | null> => {
      if (
        cacheDir === null ||
        options.onBail !== undefined ||
        options.onAggressiveReport !== undefined
      ) {
        return null;
      }
      stamp ??= compilerStamp();
      const key = createHash('sha256')
        .update(`${await stamp}\0${id}\0${optionsKey}\0${code}`)
        .digest('hex');
      return join(cacheDir, `${key}.json`);
    };

    // Set once a Vite dev server is attached (serve mode). In dev there is no
    // `generateBundle` pass, so the virtual module must serve the aggregated
    // CSS directly and be invalidated as more files extract.
    let devServer: {
      moduleGraph?: { getModuleById(id: string): unknown };
      reloadModule?: (mod: unknown) => Promise<void>;
    } | null = null;

    // Aggregate every module's CSS into one deduped, deterministically-ordered
    // stylesheet. Shared by `generateBundle` (build) and `load` (dev) so both
    // paths emit identical output.
    //
    // Order: `cssByModule` is keyed by module id in the order `transform()`
    // fired, which bundlers run concurrently and in graph order that varies
    // run-to-run - so iterating Map order would emit the same rules in
    // different orders across identical builds, defeating content-hashed asset
    // caching. Sorting by module id (stable across builds) fixes the
    // cross-module order while preserving each module's *internal* rule order,
    // so a single class's base → media → container cascade (emitted adjacently
    // by one resolve) stays intact.
    //
    // Dedup: each module contributes its CSS as newline-separated rules, and
    // the css-emit helpers emit one rule per line, so splitting on '\n' yields
    // individual rules. The `m-<hash>` scheme makes identical rule content
    // produce an identical line, so a Set over lines collapses cross-module
    // reuse (the common case for a design system) instead of shipping the same
    // rule once per importing module. Set insertion order keeps first
    // occurrence within the stable order; a hash collision keeps both lines
    // (they differ). The emit helpers never produce blank lines, so no filter
    // is needed.
    const aggregateCss = (): string =>
      [
        ...new Set(
          Array.from(cssByModule.entries())
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .flatMap(([, css]) => css)
            .flatMap((chunk) => chunk.split('\n')),
        ),
      ].join('\n');

    // In dev, push the freshly-aggregated CSS to the client by reloading the
    // already-loaded virtual module. No-op until the module has been imported
    // (and in build, where `devServer` is null).
    const invalidateVirtualCss = (): void => {
      if (devServer === null) return;
      const mod = devServer.moduleGraph?.getModuleById(RESOLVED_VIRTUAL_ID);
      if (mod !== undefined && mod !== null && typeof devServer.reloadModule === 'function') {
        void devServer.reloadModule(mod);
      }
    };

    return {
      name: '@usemotif/compiler-web',
      enforce: 'pre',
      resolveId(id) {
        if (id === VIRTUAL_ID || id === VIRTUAL_ID_ALIAS) return RESOLVED_VIRTUAL_ID;
        return null;
      },
      load(id) {
        if (id === RESOLVED_VIRTUAL_ID) {
          // Dev server: no `generateBundle` runs, so serve the aggregated CSS
          // directly (kept fresh via `invalidateVirtualCss` on each transform).
          // Build: emit the sentinel for `generateBundle` to rewrite once every
          // transform has fired.
          return devServer !== null ? aggregateCss() : PLACEHOLDER_SENTINEL;
        }
        return null;
      },
      // Evict a deleted module's CSS in watch mode; otherwise removed files
      // keep contributing stale rules to the aggregated stylesheet.
      watchChange(id: string, change?: { event?: string }) {
        if (change?.event === 'delete') {
          cssByModule.delete(id);
          cssByModule.delete(cleanUrl(id));
        }
      },
      generateBundle(_options: NormalizedOutputOptions, bundle: OutputBundle) {
        const replacement = aggregateCss();
        for (const file of Object.values(bundle)) {
          if (
            file.type === 'asset' &&
            typeof file.source === 'string' &&
            file.source.includes(PLACEHOLDER_SENTINEL)
          ) {
            file.source = file.source.replace(PLACEHOLDER_SENTINEL, replacement);
          }
        }
      },
      transformInclude(id) {
        return shouldTransform(id, include, exclude);
      },
      async transform(code, id) {
        // Reset this module's CSS contribution up front; onCss repopulates
        // it as styles extract. A re-transform (watch mode) thus replaces
        // the prior entry instead of duplicating, and a module that no
        // longer extracts any CSS ends up with an empty entry.
        const moduleCss: string[] = [];
        cssByModule.set(id, moduleCss);
        const cached = await cacheFile(id, code);
        if (cached !== null) {
          const hit = await readFile(cached, 'utf8').then(
            (text) => JSON.parse(text) as CachedModule,
            () => null,
          );
          if (hit !== null) {
            for (const css of hit.css) {
              moduleCss.push(css);
              options.onCss?.(css, id);
            }
            invalidateVirtualCss();
            return { code: hit.code, map: hit.map as never };
          }
        }
        let babelResult: Awaited<ReturnType<typeof transformAsync>>;
        try {
          babelResult = await transformAsync(code, {
            babelrc: false,
            configFile: false,
            filename: id,
            sourceMaps: true,
            parserOpts: { plugins: ['jsx', 'typescript'] },
            plugins: [
              [
                motifBabelPlugin,
                {
                  ...options,
                  onCss: (css, file) => {
                    moduleCss.push(css);
                    options.onCss?.(css, file);
                  },
                } satisfies MotifBabelOptions,
              ],
            ],
          });
        } catch (err) {
          // A parse/transform error in one file must not reject and abort the
          // whole bundler run. Warn and skip - the file falls back to runtime
          // styling. Clear its (possibly partial) CSS contribution first.
          cssByModule.delete(id);
          const message = err instanceof Error ? err.message : String(err);
          (this as { warn?: (m: string) => void }).warn?.(`[motif] skipped ${id}: ${message}`);
          return null;
        }
        if (babelResult === null || babelResult.code === null || babelResult.code === undefined) {
          return null;
        }
        // Dev: this module's CSS contribution may have changed - refresh the
        // virtual stylesheet on the client.
        invalidateVirtualCss();
        if (cached !== null) {
          const entry: CachedModule = {
            code: babelResult.code,
            map: babelResult.map ?? null,
            css: moduleCss,
          };
          // Written beside its final name and renamed into place, so a concurrent build never
          // reads half a file. A failed write only costs the next build a cache miss.
          const temp = `${cached}.${process.pid}.tmp`;
          await mkdir(dirname(cached), { recursive: true })
            .then(() => writeFile(temp, JSON.stringify(entry)))
            .then(() => rename(temp, cached))
            .catch(() => {});
        }
        return {
          code: babelResult.code,
          map: babelResult.map ?? null,
        };
      },
      // Vite-only: capture the dev server so `load` can serve aggregated CSS
      // and transforms can invalidate the virtual stylesheet (there is no
      // `generateBundle` pass in serve mode).
      vite: {
        // Typed `unknown` so the real `ViteDevServer` (whose `reloadModule`
        // takes a `ModuleNode`) is assignable here without depending on vite's
        // types; narrowed to the small surface we use via the cast.
        configureServer(server: unknown) {
          devServer = server as typeof devServer;
        },
      },
    };
  });

export default motifExtract;
export const PACKAGE_NAME = '@usemotif/compiler-web';
