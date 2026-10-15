import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from './markdown.js';

const text = (value: string) => ({ type: 'text', value });

describe('parseMarkdown - blocks', () => {
  it('reads headings, paragraphs, rules and fenced code', () => {
    expect(parseMarkdown('# Title\n\nOne\ntwo\n\n---\n\n```ts\nconst a = 1;\n\n```\n')).toEqual([
      { type: 'heading', level: 1, children: [text('Title')] },
      { type: 'paragraph', children: [text('One\ntwo')] },
      { type: 'hr' },
      { type: 'code', lang: 'ts', value: 'const a = 1;\n' },
    ]);
  });

  it('reads nested bullet and ordered lists', () => {
    const [list] = parseMarkdown('3. one\n4. two\n   - a\n   - b\n5. three');
    expect(list).toMatchObject({ type: 'list', ordered: true, start: 3 });
    const items = (list as unknown as { items: unknown[][] }).items;
    expect(items).toHaveLength(3);
    expect(items[1]).toEqual([
      { type: 'paragraph', children: [text('two')] },
      {
        type: 'list',
        ordered: false,
        start: 1,
        items: [
          [{ type: 'paragraph', children: [text('a')] }],
          [{ type: 'paragraph', children: [text('b')] }],
        ],
      },
    ]);
  });

  it('reads blockquotes recursively and GFM tables with alignment', () => {
    expect(parseMarkdown('> quoted\n> # inside')).toEqual([
      {
        type: 'blockquote',
        children: [
          { type: 'paragraph', children: [text('quoted')] },
          { type: 'heading', level: 1, children: [text('inside')] },
        ],
      },
    ]);
    expect(parseMarkdown('| a | b |\n|:--|--:|\n| 1 | `2` |')).toEqual([
      {
        type: 'table',
        align: ['left', 'right'],
        header: [[text('a')], [text('b')]],
        rows: [[[text('1')], [{ type: 'code', value: '2' }]]],
      },
    ]);
  });
});

describe('parseInline', () => {
  it('reads strong, emphasis, code, links, images, breaks and escapes', () => {
    expect(
      parseInline('**bold** and *it* `x` [go](https://a.dev) ![pic](/p.png) \\*no\\*  \nnext'),
    ).toEqual([
      { type: 'strong', children: [text('bold')] },
      text(' and '),
      { type: 'em', children: [text('it')] },
      text(' '),
      { type: 'code', value: 'x' },
      text(' '),
      { type: 'link', href: 'https://a.dev', children: [text('go')] },
      text(' '),
      { type: 'image', src: '/p.png', alt: 'pic' },
      text(' *no*'),
      { type: 'break' },
      text('next'),
    ]);
  });

  it('empties link targets that could run script, and keeps HTML as text', () => {
    expect(parseInline('[x](javascript:alert(1))')[0]).toMatchObject({ type: 'link', href: '' });
    expect(parseInline('<b>hi</b>')).toEqual([text('<b>hi</b>')]);
  });

  it('leaves underscores inside words alone', () => {
    expect(parseInline('snake_case_name')).toEqual([text('snake_case_name')]);
  });
});
