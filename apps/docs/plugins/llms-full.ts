import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { definePlugin } from '@vorge/core/plugins';
import { mdxToMarkdown } from './mdx-to-markdown.js';

interface LlmsFullOptions {
  readonly siteUrl: string;
  readonly exclude?: (route: { url: string }) => boolean;
}

/**
 * Writes `/llms-full.txt`: every docs page as markdown, in sidebar order, each
 * under its URL. The index, `/llms.txt`, comes from the sitemap plugin.
 */
export function llmsFull({ siteUrl, exclude }: LlmsFullOptions) {
  return definePlugin({
    name: 'docs:llms-full',
    async postBuild({ outDir, config, env }) {
      const { discoverContent } = await import('@vorge/core/content');
      const { buildManifest } = await import('@vorge/core/router');
      const routes = buildManifest(await discoverContent({ root: env.root, config })).routes;
      const pages: string[] = [];
      for (const route of routes) {
        if (exclude?.(route) === true) continue;
        const markdown = mdxToMarkdown(await readFile(route.filePath, 'utf8'));
        if (markdown === '') continue;
        pages.push(`Source: ${siteUrl}${route.url}\n\n${markdown}`);
      }
      const header = `# ${config.title}\n\n> ${config.description ?? ''}\n`;
      await writeFile(
        resolve(outDir, 'llms-full.txt'),
        `${header}\n${pages.join('\n\n---\n\n')}\n`,
        'utf8',
      );
      console.log(`[llms-full] wrote llms-full.txt (${pages.length} pages)`);
    },
  });
}
