import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { transformAsync, types as t, type NodePath, type PluginObj } from '@babel/core';
import motifBabelPlugin, { type MotifBabelOptions } from '@usemotif/compiler-babel';

/**
 * Options for the Turbopack loader. Turbopack passes loader options as JSON, so only the
 * serialisable motif options apply; `onCss` does not.
 */
export interface MotifTurbopackOptions extends Omit<MotifBabelOptions, 'onCss'> {
  /**
   * Where each module's extracted CSS is written. Default `node_modules/.cache/usemotif/css`
   * under the project root.
   */
  readonly cacheDir?: string;
}

/** The part of the webpack loader context Turbopack provides and this loader reads. */
interface LoaderContext {
  readonly resourcePath: string;
  readonly rootContext?: string;
  async(): (error: Error | null, code?: string, map?: unknown) => void;
  getOptions?(): MotifTurbopackOptions | undefined;
}

/**
 * Turbopack loader for motif extraction. Turbopack runs webpack loaders but not webpack
 * plugins, so the bundler plugin never sees a Turbopack build; this loader runs the same Babel
 * extraction per module instead.
 *
 * There is no point in a loader pipeline where every module's CSS can be gathered into one
 * stylesheet, so each module's CSS goes to its own file, named by a hash of its content, and the
 * module imports it. Identical CSS from two modules is one file. In the App Router a global CSS
 * import is allowed from any module, so the styles ship with the code that uses them.
 *
 * ```ts
 * // next.config.ts
 * const nextConfig = {
 *   turbopack: {
 *     rules: {
 *       '*.tsx': { loaders: ['@usemotif/compiler-web/turbopack'], as: '*.tsx' },
 *       '*.jsx': { loaders: ['@usemotif/compiler-web/turbopack'], as: '*.jsx' },
 *     },
 *   },
 * };
 * ```
 */
export default function motifTurbopackLoader(this: LoaderContext, source: string): void {
  const callback = this.async();
  extract(this, source).then(
    (result) => callback(null, result.code, result.map),
    (error: unknown) => callback(error instanceof Error ? error : new Error(String(error))),
  );
}

async function extract(
  context: LoaderContext,
  source: string,
): Promise<{ code: string; map?: unknown }> {
  const id = context.resourcePath;
  if (id.split(sep).includes('node_modules')) return { code: source };
  const { cacheDir, ...options } = context.getOptions?.() ?? {};
  const root = context.rootContext ?? process.cwd();
  const dir = cacheDir ?? join(root, 'node_modules', '.cache', 'usemotif', 'css');

  const css: string[] = [];
  let sheet: { file: string; content: string } | null = null;
  // `post` runs once the whole traversal is done, so after the motif plugin has reported its
  // CSS from its own `Program.exit`. Babel keeps directives apart from the body, so the import
  // lands after a client directive rather than ahead of it.
  const importSheet: PluginObj = {
    visitor: {},
    post(file) {
      if (css.length === 0) return;
      const content = `${[...new Set(css.join('\n').split('\n'))].join('\n')}\n`;
      const name = `${createHash('sha256').update(content).digest('hex').slice(0, 16)}.css`;
      sheet = { file: join(dir, name), content };
      const specifier = relative(dirname(id), sheet.file).split(sep).join('/');
      (file.path as NodePath<t.Program>).unshiftContainer(
        'body',
        t.importDeclaration(
          [],
          t.stringLiteral(specifier.startsWith('.') ? specifier : `./${specifier}`),
        ),
      );
    },
  };

  const result = await transformAsync(source, {
    babelrc: false,
    configFile: false,
    filename: id,
    sourceMaps: true,
    parserOpts: { plugins: ['jsx', 'typescript'] },
    plugins: [
      [motifBabelPlugin, { ...options, onCss: (chunk: string) => css.push(chunk) }],
      () => importSheet,
    ],
  });
  if (result === null || result.code === null || result.code === undefined) {
    return { code: source };
  }
  const written = sheet as { file: string; content: string } | null;
  if (written !== null) {
    await mkdir(dirname(written.file), { recursive: true });
    await writeFile(written.file, written.content);
  }
  return { code: result.code, map: result.map ?? undefined };
}
