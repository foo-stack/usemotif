#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { darkTheme, lightTheme } from '@usemotif/tokens';
import type { DocPage } from './docs.js';
import { loadThemes } from './load-themes.js';
import { createServer } from './server.js';

const HELP = `usemotif-mcp - an MCP server for motif projects

Usage:
  usemotif-mcp [--theme <module>]

  --theme <module>   A module exporting your themes (createTheme results), as
                     .js, .mjs or .json, or .ts on a Node that runs TypeScript.
                     Without it, the default light and dark presets are served.

Runs on stdio. Point your agent's MCP config at it, for example:
  { "command": "npx", "args": ["usemotif-mcp", "--theme", "./src/theme.js"] }
`;

async function main(argv: readonly string[]): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(HELP);
    return;
  }
  const at = argv.indexOf('--theme');
  const themes =
    at === -1
      ? { light: lightTheme.tokens, dark: darkTheme.tokens }
      : await loadThemes(argv[at + 1] ?? '');
  const docs = JSON.parse(
    await readFile(new URL('./docs.json', import.meta.url), 'utf8'),
  ) as DocPage[];
  const server = createServer({ themes, docs });
  await server.connect(new StdioServerTransport());
}

main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`usemotif-mcp: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
