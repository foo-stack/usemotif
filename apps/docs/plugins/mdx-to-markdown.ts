import { parseExpressionAt } from 'acorn';
import type { Expression, SpreadElement } from 'estree';
import type { Blockquote, Code, List, Nodes, Parent, Root, RootContent } from 'mdast';
import type { Position } from 'unist';
import type { MdxJsxAttribute, MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

type JsxElement = MdxJsxFlowElement | MdxJsxTextElement;

/** Page chrome with nothing for a reader of the text. */
const DROPPED = new Set(['Eyebrow', 'ArticleMeta', 'ComponentDemoStrip']);

interface ApiParam {
  name?: unknown;
  type?: unknown;
  default?: unknown;
  required?: unknown;
  description?: unknown;
}

/**
 * Turn one docs page's MDX into plain markdown: imports, expressions and
 * frontmatter go, the docs components become the markdown they stand for
 * (`CodeBlock` a fenced block, `Callout` a quote, `ApiSignature` a signature
 * and a parameter list), and any other component keeps only its text.
 */
export function mdxToMarkdown(source: string): string {
  const tree = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkFrontmatter)
    .parse(source) as Root;
  const root: Root = {
    type: 'root',
    children: convertChildren(tree.children, source) as Root['children'],
  };
  return unified().use(remarkGfm).use(remarkStringify).stringify(root).trim();
}

function convertChildren(children: readonly Nodes[], source: string): RootContent[] {
  return children.flatMap((child) => convert(child, source));
}

function convert(node: Nodes, source: string): RootContent[] {
  switch (node.type) {
    case 'yaml':
    case 'mdxjsEsm':
    case 'mdxFlowExpression':
    case 'mdxTextExpression':
      return [];
    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement':
      return convertElement(node, source);
    default:
      if ('children' in node) {
        (node as Parent).children = convertChildren((node as Parent).children as Nodes[], source);
      }
      return [node as RootContent];
  }
}

function convertElement(el: JsxElement, source: string): RootContent[] {
  const name = el.name ?? '';
  if (DROPPED.has(name)) return [];
  if (name === 'CodeBlock') return codeBlocks(el, source);
  if (name === 'Callout') return [callout(el, source)];
  if (name === 'ApiSignature') return apiSignature(el, source);
  return convertChildren(el.children as Nodes[], source);
}

interface CodeTab {
  label?: unknown;
  code?: unknown;
  lang?: unknown;
}

/**
 * One fenced block, or for the tabbed form (`tabs={[{ label, code }]}`) one per
 * tab under its label in bold. The label is not fence meta: remark drops meta
 * from a fence with no language.
 */
function codeBlocks(el: JsxElement, source: string): RootContent[] {
  const lang = attrValue(el, 'lang', source);
  const tabs = attrValue(el, 'tabs', source);
  if (Array.isArray(tabs)) {
    return (tabs as CodeTab[]).flatMap((tab): RootContent[] => [
      {
        type: 'paragraph',
        children: [{ type: 'strong', children: [{ type: 'text', value: String(tab.label) }] }],
      },
      fenced(tab.code, typeof tab.lang === 'string' ? tab.lang : lang, null),
    ]);
  }
  const child = el.children[0];
  const code =
    attrValue(el, 'code', source) ??
    (child?.type === 'mdxFlowExpression' || child?.type === 'mdxTextExpression'
      ? literalAt(source, child.position, '{')
      : undefined);
  return [fenced(code, lang, attrValue(el, 'filename', source))];
}

function fenced(code: unknown, lang: unknown, meta: unknown): Code {
  return {
    type: 'code',
    lang: typeof lang === 'string' ? lang : null,
    meta: typeof meta === 'string' ? meta : null,
    value: typeof code === 'string' ? code.replace(/\n$/, '') : '',
  };
}

function callout(el: JsxElement, source: string): Blockquote {
  const title = attrValue(el, 'title', source);
  const lead: RootContent[] =
    typeof title === 'string'
      ? [
          {
            type: 'paragraph',
            children: [{ type: 'strong', children: [{ type: 'text', value: title }] }],
          },
        ]
      : [];
  return {
    type: 'blockquote',
    children: [
      ...lead,
      ...asBlocks(convertChildren(el.children as Nodes[], source)),
    ] as Blockquote['children'],
  };
}

const PHRASING = new Set(['text', 'inlineCode', 'link', 'strong', 'emphasis', 'delete', 'break']);

/** Wrap runs of inline content (a callout written on one line) in paragraphs. */
function asBlocks(nodes: RootContent[]): RootContent[] {
  const blocks: RootContent[] = [];
  let run: RootContent[] = [];
  const flush = (): void => {
    if (run.length > 0) blocks.push({ type: 'paragraph', children: run as never });
    run = [];
  };
  for (const node of nodes) {
    if (PHRASING.has(node.type)) run.push(node);
    else {
      flush();
      blocks.push(node);
    }
  }
  flush();
  return blocks;
}

function apiSignature(el: JsxElement, source: string): RootContent[] {
  const out: RootContent[] = [];
  const signature = attrValue(el, 'signature', source);
  if (typeof signature === 'string')
    out.push({ type: 'code', lang: 'ts', meta: null, value: signature });
  const params = attrValue(el, 'params', source);
  if (Array.isArray(params) && params.length > 0) {
    const list: List = {
      type: 'list',
      ordered: false,
      spread: false,
      children: (params as ApiParam[]).map((p) => {
        const facts = [
          typeof p.type === 'string' ? `\`${p.type}\`` : null,
          typeof p.default === 'string' ? `default \`${p.default}\`` : null,
          p.required === true ? 'required' : null,
        ].filter((f): f is string => f !== null);
        const head = `\`${String(p.name)}\`${facts.length > 0 ? ` (${facts.join(', ')})` : ''}`;
        const text = typeof p.description === 'string' ? `${head}: ${p.description}` : head;
        return {
          type: 'listItem',
          spread: false,
          children: inlineMarkdown(text),
        };
      }),
    };
    out.push(list);
  }
  return out;
}

/** Parse a short markdown string (a parameter line) so its backticks stay code spans. */
function inlineMarkdown(text: string): List['children'][number]['children'] {
  const tree = unified().use(remarkParse).parse(text) as Root;
  return tree.children as List['children'][number]['children'];
}

/** A string attribute as written, or an expression attribute's literal value. */
function attrValue(el: JsxElement, name: string, source: string): unknown {
  const attr = el.attributes.find(
    (a): a is MdxJsxAttribute => a.type === 'mdxJsxAttribute' && a.name === name,
  );
  if (attr === undefined || attr.value === null || attr.value === undefined) return undefined;
  if (typeof attr.value === 'string') return attr.value;
  return literalAt(source, attr.position, `${name}={`);
}

/**
 * The literal value of the expression written at `position`, read from the
 * page source after `prefix`. The source, not the parsed node's value: MDX
 * strips each line's indentation from an expression, which would flatten
 * every multi-line code example. Anything that is not a plain literal (an
 * imported binding, a call) gives `undefined`.
 */
function literalAt(source: string, position: Position | undefined, prefix: string): unknown {
  const start = position?.start.offset;
  const end = position?.end.offset;
  if (start === undefined || end === undefined) return undefined;
  const raw = source.slice(start, end);
  if (!raw.startsWith(prefix) || !raw.endsWith('}')) return undefined;
  try {
    return literal(
      parseExpressionAt(raw.slice(prefix.length, -1), 0, { ecmaVersion: 'latest' }) as Expression,
    );
  } catch {
    return undefined;
  }
}

function literal(node: Expression | SpreadElement | null): unknown {
  if (node === null) return undefined;
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'TemplateLiteral':
      return node.expressions.length === 0 ? node.quasis[0]?.value.cooked : undefined;
    case 'ArrayExpression':
      return node.elements.map((element) => literal(element));
    case 'ObjectExpression': {
      const out: Record<string, unknown> = {};
      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;
        const key =
          prop.key.type === 'Identifier'
            ? prop.key.name
            : prop.key.type === 'Literal'
              ? String(prop.key.value)
              : undefined;
        if (key !== undefined) out[key] = literal(prop.value as Expression);
      }
      return out;
    }
    default:
      return undefined;
  }
}
