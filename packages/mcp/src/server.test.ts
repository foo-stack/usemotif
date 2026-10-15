import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { darkTheme, lightTheme } from '@usemotif/tokens';
import { createServer } from './server.js';
import type { DocPage } from './docs.js';

const DOCS: DocPage[] = [
  {
    path: '/components/layout/box',
    title: 'Box',
    description: 'The atom of motif.',
    covers: ['Box', 'BoxProps'],
    markdown: '# Box\n\nIntro.\n\n## API\n\n* `as` (`ElementType`)\n\n## Examples\n\nMore.',
  },
  {
    path: '/guides/testing',
    title: 'Testing',
    description: 'Test motif components.',
    covers: [],
    markdown: '# Testing\n\nUse renderStyles.',
  },
];

async function connect() {
  const server = createServer({
    themes: { light: lightTheme.tokens, dark: darkTheme.tokens },
    docs: DOCS,
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientSide);
  return client;
}

const call = async (
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<string> => {
  const result = (await client.callTool({ name, arguments: args })) as {
    content: { text: string }[];
  };
  return result.content[0]!.text;
};

describe('usemotif MCP server', () => {
  it('lists its tools', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'check_token_paths',
      'component_api',
      'get_doc',
      'list_tokens',
      'resolve_token',
      'search_docs',
    ]);
  });

  it('answers token questions per theme', async () => {
    const client = await connect();
    const light = await call(client, 'resolve_token', { path: '$colors.surface.base' });
    const dark = await call(client, 'resolve_token', {
      path: '$colors.surface.base',
      theme: 'dark',
    });
    expect(light).not.toBe(dark);
    expect(await call(client, 'list_tokens', { prefix: '$radii' })).toContain('$radii.md = 8');
    expect(await call(client, 'check_token_paths', { source: 'p="$space.44"' })).toMatch(
      /^unknown \$space\.44; did you mean/,
    );
  });

  it('searches and reads the docs, and pulls a component API section', async () => {
    const client = await connect();
    expect(await call(client, 'search_docs', { query: 'box' })).toMatch(
      /^\/components\/layout\/box - Box/,
    );
    expect(await call(client, 'get_doc', { path: 'guides/testing' })).toContain('renderStyles');
    const api = await call(client, 'component_api', { name: 'BoxProps' });
    expect(api).toContain('## API');
    expect(api).not.toContain('## Examples');
  });
});
