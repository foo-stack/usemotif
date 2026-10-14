import { describe, expect, it } from 'vitest';
import motifExtract from './index.js';

describe('@usemotif/compiler-web', () => {
  it('exposes vite / rollup / webpack / esbuild / rspack / farm builders', () => {
    expect(typeof motifExtract.vite).toBe('function');
    expect(typeof motifExtract.rollup).toBe('function');
    expect(typeof motifExtract.webpack).toBe('function');
    expect(typeof motifExtract.esbuild).toBe('function');
    expect(typeof motifExtract.rspack).toBe('function');
    expect(typeof motifExtract.farm).toBe('function');
  });

  it('vite plugin runs the babel transform on .tsx files', async () => {
    const captured: string[] = [];
    const plugin = motifExtract.vite({
      onCss: (css) => captured.push(css),
    });
    const inst = Array.isArray(plugin) ? plugin[0]! : plugin;

    const transform =
      typeof inst.transform === 'function'
        ? inst.transform
        : (inst.transform as { handler: (code: string, id: string) => unknown }).handler;

    const result = await transform.call(
      { warn() {}, error() {} } as unknown as ThisParameterType<typeof transform>,
      `import { Box } from '@usemotif/react';\nconst X = () => <Box p={4} />;\n`,
      '/abs/path/file.tsx',
    );
    const code = (result as { code: string }).code;
    expect(code).toContain('padding: 4');
    expect(code).not.toMatch(/\bp=\{4\}/);
  });

  it('passes onBail through to the babel transform', async () => {
    const reasons: string[] = [];
    const plugin = motifExtract.vite({ onBail: (e) => reasons.push(`${e.element}:${e.reason}`) });
    const inst = Array.isArray(plugin) ? plugin[0]! : plugin;
    const transform =
      typeof inst.transform === 'function'
        ? inst.transform
        : (inst.transform as { handler: (code: string, id: string) => unknown }).handler;

    await transform.call(
      { warn() {}, error() {} } as unknown as ThisParameterType<typeof transform>,
      `import { Box } from '@usemotif/react';\nconst X = ({ pad }) => <Box p={pad} />;\n`,
      '/abs/path/bail.tsx',
    );
    expect(reasons).toEqual(['Box:dynamic-props']);
  });

  it('skips files outside include / inside exclude', async () => {
    const plugin = motifExtract.vite();
    const inst = Array.isArray(plugin) ? plugin[0]! : plugin;
    const include =
      typeof inst.transform === 'object' && inst.transform !== null
        ? (inst.transform as { filter: { id: { include: unknown } } }).filter
        : undefined;
    // unplugin v3 surfaces include via filter; we can't easily probe it
    // without plumbing through the bundler. Verify behaviour via
    // transformInclude on the unplugin instance's raw factory output:
    const raw = motifExtract.raw({}, { framework: 'vite' });
    expect(typeof raw.transformInclude).toBe('function');
    expect(raw.transformInclude!.call({} as never, '/x/file.tsx')).toBe(true);
    expect(raw.transformInclude!.call({} as never, '/x/file.css')).toBe(false);
    expect(raw.transformInclude!.call({} as never, '/x/node_modules/y/z.tsx')).toBe(false);
    void include;
  });

  // #199 - Vite/Rollup append `?query` (and `#hash`) suffixes to module ids;
  // the $-anchored include regex must be tested against the cleaned id or those
  // files are silently skipped (styles never extracted).
  it('transforms query-suffixed module ids', () => {
    const raw = motifExtract.raw({}, { framework: 'vite' });
    expect(raw.transformInclude!.call({} as never, '/x/Button.tsx?v=abc123')).toBe(true);
    expect(raw.transformInclude!.call({} as never, '/x/Button.tsx?used')).toBe(true);
    expect(raw.transformInclude!.call({} as never, '/x/Button.tsx?import')).toBe(true);
    expect(raw.transformInclude!.call({} as never, '/x/styles.css?inline')).toBe(false);
    // node_modules exclusion still wins, suffix or not.
    expect(raw.transformInclude!.call({} as never, '/x/node_modules/y/z.tsx?v=1')).toBe(false);
  });

  // #200 - a parse error in one file must not reject and abort the whole
  // bundler run; the transform warns and skips (returns null).
  it('skips a malformed file instead of throwing', async () => {
    type Hook = ((...a: unknown[]) => unknown) | { handler: (...a: unknown[]) => unknown };
    const fn = (h: Hook | undefined): ((...a: unknown[]) => unknown) => {
      if (h === undefined) throw new Error('hook missing');
      return typeof h === 'function' ? h : h.handler;
    };
    const raw = motifExtract.raw({}, { framework: 'rollup' }) as unknown as Record<string, Hook>;
    const warnings: string[] = [];
    const ctx = { warn: (m: string) => warnings.push(m), error() {} } as never;
    // Unbalanced braces - Babel cannot parse this.
    const result = await fn(raw.transform).call(
      ctx,
      'const X = () => <Box p={4} ;;; {{{',
      '/bad.tsx',
    );
    expect(result).toBeNull();
    expect(warnings.some((w) => w.includes('/bad.tsx'))).toBe(true);
  });

  // Regression: aggregated CSS was an append-only array on the (reused)
  // plugin instance, so re-transforming a module in watch mode appended
  // its CSS again and the virtual stylesheet grew with duplicates each
  // rebuild. Keyed by module id, a re-transform must overwrite, not append.
  it('does not duplicate a module CSS across rebuilds (watch mode)', async () => {
    type Hook = ((...a: unknown[]) => unknown) | { handler: (...a: unknown[]) => unknown };
    const fn = (h: Hook | undefined): ((...a: unknown[]) => unknown) => {
      if (h === undefined) throw new Error('hook missing');
      return typeof h === 'function' ? h : h.handler;
    };
    const raw = motifExtract.raw({}, { framework: 'rollup' }) as unknown as Record<string, Hook>;
    const ctx = { warn() {}, error() {} } as never;
    const code = `import { Box } from '@usemotif/react';\nconst X = () => <Box _hover={{ opacity: 0.5 }} />;\n`;
    const id = '/abs/card.tsx';

    // Initial build + one watch-mode rebuild of the same module.
    await fn(raw.transform).call(ctx, code, id);
    await fn(raw.transform).call(ctx, code, id);

    // Resolve + load the virtual module to obtain the placeholder sentinel.
    const resolvedId = fn(raw.resolveId).call(ctx, 'virtual:motif-extract.css') as string;
    const sentinel = fn(raw.load).call(ctx, resolvedId) as string;
    const bundle: Record<string, { type: 'asset'; fileName: string; source: string }> = {
      'styles.css': { type: 'asset', fileName: 'styles.css', source: sentinel },
    };
    fn(raw.generateBundle).call(ctx, {}, bundle);

    const out = bundle['styles.css']!.source;
    expect(out).toContain(':hover');
    // The pseudo rule must appear exactly once despite two transforms.
    expect(out.split(':hover').length - 1).toBe(1);
  });

  // #177 - the same rule extracted from two different modules must appear
  // once in the aggregated stylesheet, not duplicated per importing module.
  it('dedupes an identical rule across two different modules', async () => {
    type Hook = ((...a: unknown[]) => unknown) | { handler: (...a: unknown[]) => unknown };
    const fn = (h: Hook | undefined): ((...a: unknown[]) => unknown) => {
      if (h === undefined) throw new Error('hook missing');
      return typeof h === 'function' ? h : h.handler;
    };
    const raw = motifExtract.raw({}, { framework: 'rollup' }) as unknown as Record<string, Hook>;
    const ctx = { warn() {}, error() {} } as never;
    const code = `import { Box } from '@usemotif/react';\nconst X = () => <Box _hover={{ opacity: 0.5 }} />;\n`;

    // Two distinct modules extract the same Box → the same m-<hash> rule.
    await fn(raw.transform).call(ctx, code, '/abs/a.tsx');
    await fn(raw.transform).call(ctx, code, '/abs/b.tsx');

    const resolvedId = fn(raw.resolveId).call(ctx, 'virtual:motif-extract.css') as string;
    const sentinel = fn(raw.load).call(ctx, resolvedId) as string;
    const bundle: Record<string, { type: 'asset'; fileName: string; source: string }> = {
      'styles.css': { type: 'asset', fileName: 'styles.css', source: sentinel },
    };
    fn(raw.generateBundle).call(ctx, {}, bundle);

    const out = bundle['styles.css']!.source;
    expect(out).toContain(':hover');
    expect(out.split(':hover').length - 1).toBe(1); // deduped, not once-per-module
  });

  // #230 - in a Vite dev server there is no generateBundle pass, so the
  // virtual module must serve the aggregated CSS directly from `load` (kept
  // fresh by invalidating on each transform). Otherwise responsive/pseudo
  // rules - stripped from the JSX during transform - are never served in dev.
  it('serves aggregated CSS from load() in dev (no generateBundle)', async () => {
    type Hook = ((...a: unknown[]) => unknown) | { handler: (...a: unknown[]) => unknown };
    const fn = (h: Hook | undefined): ((...a: unknown[]) => unknown) => {
      if (h === undefined) throw new Error('hook missing');
      return typeof h === 'function' ? h : h.handler;
    };
    const raw = motifExtract.raw({}, { framework: 'vite' }) as unknown as Record<string, Hook>;
    const ctx = { warn() {}, error() {} } as never;

    const resolvedId = fn(raw.resolveId).call(ctx, 'virtual:motif-extract.css') as string;
    const reloaded: unknown[] = [];
    const fakeServer = {
      moduleGraph: { getModuleById: (id: string) => (id === resolvedId ? { id } : undefined) },
      reloadModule: async (mod: unknown) => {
        reloaded.push(mod);
      },
    };
    // Attach the dev server (Vite-namespaced hook), then transform a module
    // with a pseudo prop.
    const viteHooks = raw.vite as unknown as Record<string, Hook>;
    fn(viteHooks.configureServer).call(ctx, fakeServer);
    const code = `import { Box } from '@usemotif/react';\nconst X = () => <Box _hover={{ opacity: 0.5 }} />;\n`;
    await fn(raw.transform).call(ctx, code, '/abs/card.tsx');

    // load() must return the real CSS, not the build-time placeholder sentinel.
    const served = fn(raw.load).call(ctx, resolvedId) as string;
    expect(served).toContain(':hover');
    expect(served).not.toContain('__motif_extract_placeholder__');
    // And the transform invalidated the virtual module so the client refreshes.
    expect(reloaded.length).toBeGreaterThan(0);
  });

  // #196 - bundlers transform modules concurrently and in graph order that
  // varies run-to-run. The aggregated CSS must be byte-identical regardless of
  // the order transform() fired, so content-hashed asset caching is stable.
  it('emits byte-identical CSS regardless of module transform order', async () => {
    type Hook = ((...a: unknown[]) => unknown) | { handler: (...a: unknown[]) => unknown };
    const fn = (h: Hook | undefined): ((...a: unknown[]) => unknown) => {
      if (h === undefined) throw new Error('hook missing');
      return typeof h === 'function' ? h : h.handler;
    };
    const ctx = { warn() {}, error() {} } as never;
    const codeA = `import { Box } from '@usemotif/react';\nconst A = () => <Box _hover={{ opacity: 0.5 }} />;\n`;
    const codeB = `import { Box } from '@usemotif/react';\nconst B = () => <Box _focus={{ outlineWidth: 2 }} />;\n`;

    const aggregate = async (order: ReadonlyArray<readonly [string, string]>): Promise<string> => {
      const raw = motifExtract.raw({}, { framework: 'rollup' }) as unknown as Record<string, Hook>;
      for (const [id, code] of order) await fn(raw.transform).call(ctx, code, id);
      const resolvedId = fn(raw.resolveId).call(ctx, 'virtual:motif-extract.css') as string;
      const sentinel = fn(raw.load).call(ctx, resolvedId) as string;
      const bundle: Record<string, { type: 'asset'; fileName: string; source: string }> = {
        'styles.css': { type: 'asset', fileName: 'styles.css', source: sentinel },
      };
      fn(raw.generateBundle).call(ctx, {}, bundle);
      return bundle['styles.css']!.source;
    };

    const forward = await aggregate([
      ['/abs/a.tsx', codeA],
      ['/abs/b.tsx', codeB],
    ]);
    const reverse = await aggregate([
      ['/abs/b.tsx', codeB],
      ['/abs/a.tsx', codeA],
    ]);

    expect(forward).toBe(reverse);
  });
});
