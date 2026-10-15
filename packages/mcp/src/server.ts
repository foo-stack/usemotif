import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TokenMap } from '@usemotif/core';
import { z } from 'zod';
import { componentApi, searchDocs, type DocPage } from './docs.js';
import { checkTokenPaths, flattenTokens, resolveChain } from './tokens.js';

export interface ServerOptions {
  /** The themes the project uses, by name. */
  readonly themes: Readonly<Record<string, TokenMap>>;
  /** The motif docs, as markdown pages. */
  readonly docs: readonly DocPage[];
  /** The package version, reported to clients. */
  readonly version?: string;
}

const text = (value: string) => ({ content: [{ type: 'text' as const, text: value }] });

/** An MCP server exposing a project's motif tokens and the motif docs to coding agents. */
export function createServer({ themes, docs, version = '0.0.0' }: ServerOptions): McpServer {
  const server = new McpServer({ name: 'usemotif', version });
  const names = Object.keys(themes);
  const entriesOf = (theme: string | undefined) => flattenTokens(themes[theme ?? names[0]!] ?? {});
  const themeArg = z
    .enum(names as [string, ...string[]])
    .optional()
    .describe(`Which theme to read. Defaults to ${names[0]}.`);

  server.registerTool(
    'list_tokens',
    {
      description:
        'List the theme tokens as $-paths with their values, optionally under a prefix such as $colors.action or $space.',
      inputSchema: { prefix: z.string().optional(), theme: themeArg },
    },
    ({ prefix, theme }) => {
      const entries = entriesOf(theme).filter(
        (t) => prefix === undefined || t.path.startsWith(prefix),
      );
      if (entries.length === 0) return text(`No tokens under ${prefix ?? 'the theme'}.`);
      return text(
        entries
          .map((t) =>
            t.value === t.resolved
              ? `${t.path} = ${t.value}`
              : `${t.path} = ${t.value} (${String(t.resolved)})`,
          )
          .join('\n'),
      );
    },
  );

  server.registerTool(
    'resolve_token',
    {
      description: 'Follow a $-path through any references to the literal value it ends at.',
      inputSchema: { path: z.string(), theme: themeArg },
    },
    ({ path, theme }) => {
      const chain = resolveChain(entriesOf(theme), path);
      return text(
        chain.length === 0 ? `${path} is not a token in this theme.` : chain.join(' -> '),
      );
    },
  );

  server.registerTool(
    'check_token_paths',
    {
      description:
        'Check every $-token reference in a snippet of code against the theme, and suggest the nearest real paths for unknown ones.',
      inputSchema: { source: z.string(), theme: themeArg },
    },
    ({ source, theme }) => {
      const checks = checkTokenPaths(entriesOf(theme), source);
      if (checks.length === 0) return text('No $-token references found.');
      return text(
        checks
          .map((c) =>
            c.known ? `ok ${c.ref}` : `unknown ${c.ref}; did you mean ${c.suggestions.join(', ')}?`,
          )
          .join('\n'),
      );
    },
  );

  server.registerTool(
    'search_docs',
    {
      description: 'Search the motif docs. Returns matching pages with their paths, for get_doc.',
      inputSchema: { query: z.string() },
    },
    ({ query }) => {
      const hits = searchDocs(docs, query);
      if (hits.length === 0) return text(`No docs pages match "${query}".`);
      return text(hits.map((p) => `${p.path} - ${p.title}: ${p.description}`).join('\n'));
    },
  );

  server.registerTool(
    'get_doc',
    {
      description: 'Read one motif docs page as markdown, by the path search_docs gives.',
      inputSchema: { path: z.string() },
    },
    ({ path }) => {
      const page = docs.find(
        (p) => p.path === path || p.path === `/${path.replace(/^\/|\/$/g, '')}`,
      );
      return text(page === undefined ? `No docs page at ${path}.` : page.markdown);
    },
  );

  server.registerTool(
    'component_api',
    {
      description:
        "A motif component's or hook's props and API, from the docs page that documents it.",
      inputSchema: {
        name: z.string().describe('An export name, such as Box, DataTable or useScroll.'),
      },
    },
    ({ name }) => {
      const found = componentApi(docs, name);
      return text(
        found === undefined
          ? `No docs page documents ${name}.`
          : `${found.page.path}\n\n${found.section}`,
      );
    },
  );

  return server;
}
