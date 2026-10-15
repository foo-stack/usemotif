import { describe, expect, it } from 'vitest';
import { mdxToMarkdown } from './mdx-to-markdown.js';

const PAGE = `---
title: Tag
---

import { ApiSignature, ArticleMeta, Callout, CodeBlock, Eyebrow, Lede } from '../components/index.js';

<Eyebrow>UI kit</Eyebrow>

# Tag

<Lede>
  A small \`label\` for a thing.
</Lede>

<ArticleMeta />

| Prop | Use |
| --- | --- |
| \`tone\` | The colour |

<CodeBlock lang="tsx" filename="App.tsx" code={\`<Tag tone="loud">
  New \\\${count}
</Tag>\`} />

<Callout variant="info" title="Related">
  [Badge](/kit/badge) for a status.
</Callout>

<ApiSignature
  name="Tag"
  signature={\`function Tag(props: TagProps): JSX.Element\`}
  params={[
    { name: 'tone', type: "'quiet' | 'loud'", default: "'quiet'", description: 'The \`colour\`.' },
    { name: 'children', type: 'ReactNode', required: true },
  ]}
/>

<Hero title="x">Kept text</Hero>

<CodeBlock
  tabs={[
    { label: 'npm', code: 'npm install usemotif' },
    { label: 'yarn', code: 'yarn add usemotif' },
  ]}
/>
`;

describe('mdxToMarkdown', () => {
  const md = mdxToMarkdown(PAGE);

  it('drops imports, frontmatter and page chrome', () => {
    expect(md).not.toContain('import ');
    expect(md).not.toContain('title: Tag');
    expect(md).not.toContain('UI kit');
    expect(md.startsWith('# Tag')).toBe(true);
  });

  it('keeps prose, inline code and tables', () => {
    expect(md).toContain('A small `label` for a thing.');
    expect(md).toContain('| `tone` | The colour |');
    expect(md).not.toContain('\\|');
  });

  it('turns CodeBlock into a fenced block with its language and file name', () => {
    expect(md).toContain('```tsx App.tsx\n<Tag tone="loud">\n  New ${count}\n</Tag>\n```');
  });

  it('turns Callout into a quote led by its title', () => {
    expect(md).toContain('> **Related**\n>\n> [Badge](/kit/badge) for a status.');
  });

  it('turns ApiSignature into the signature and a parameter list', () => {
    expect(md).toContain('```ts\nfunction Tag(props: TagProps): JSX.Element\n```');
    expect(md).toContain("* `tone` (`'quiet' | 'loud'`, default `'quiet'`): The `colour`.");
    expect(md).toContain('* `children` (`ReactNode`, required)');
  });

  it('turns a tabbed CodeBlock into one labelled block per tab', () => {
    expect(md).toContain(
      '**npm**\n\n```\nnpm install usemotif\n```\n\n**yarn**\n\n```\nyarn add usemotif\n```',
    );
  });

  it('keeps the text of any other component', () => {
    expect(md).toContain('Kept text');
    expect(md).not.toContain('<Hero');
  });
});
