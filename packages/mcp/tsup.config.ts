import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { defineConfig } from 'tsup';
import { mdxToMarkdown } from '../../apps/docs/plugins/mdx-to-markdown.js';

const CONTENT = join(import.meta.dirname, '..', '..', 'apps', 'docs', 'content');

async function mdxFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await mdxFiles(path)));
    else if (entry.name.endsWith('.mdx')) out.push(path);
  }
  return out;
}

/**
 * Bundle the docs as markdown, so the server answers from the docs of the version it ships with
 * and works offline. Uses the same converter as the docs site's `llms-full.txt`.
 */
async function writeDocs(): Promise<void> {
  const pages = [];
  for (const file of (await mdxFiles(CONTENT)).sort()) {
    const source = await readFile(file, 'utf8');
    const front = /^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? '';
    const field = (name: string): string =>
      new RegExp(`^${name}:\\s*(.*)$`, 'm').exec(front)?.[1]?.replace(/^['"]|['"]$/g, '') ?? '';
    const covers = [
      ...(/^covers:\s*\[([\s\S]*?)\]/m.exec(front)?.[1] ?? '').matchAll(/['"]([^'"]+)['"]/g),
    ].map((m) => m[1]!);
    const markdown = mdxToMarkdown(source);
    if (markdown === '') continue;
    const route = `/${relative(CONTENT, file)
      .replace(/\.mdx$/, '')
      .replace(/(^|\/)index$/, '')}`;
    // The not-found page and the `_demo` fixtures are site internals, not docs.
    if (route === '/404' || route.startsWith('/_')) continue;
    pages.push({
      path: route,
      title: field('title'),
      description: field('description'),
      covers,
      markdown,
    });
  }
  await writeFile(join(import.meta.dirname, 'dist', 'docs.json'), JSON.stringify(pages));
}

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  dts: { entry: 'src/index.ts', compilerOptions: { ignoreDeprecations: '6.0' } },
  clean: true,
  sourcemap: true,
  target: 'es2022',
  outDir: 'dist',
  onSuccess: writeDocs,
});
