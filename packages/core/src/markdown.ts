/** Inline Markdown content. */
export type MdInline =
  | { readonly type: 'text'; readonly value: string }
  | { readonly type: 'strong'; readonly children: readonly MdInline[] }
  | { readonly type: 'em'; readonly children: readonly MdInline[] }
  | { readonly type: 'code'; readonly value: string }
  | { readonly type: 'link'; readonly href: string; readonly children: readonly MdInline[] }
  | { readonly type: 'image'; readonly src: string; readonly alt: string }
  | { readonly type: 'break' };

export type MdAlign = 'left' | 'center' | 'right' | null;

/** Block-level Markdown content. */
export type MdBlock =
  | {
      readonly type: 'heading';
      readonly level: 1 | 2 | 3 | 4 | 5 | 6;
      readonly children: readonly MdInline[];
    }
  | { readonly type: 'paragraph'; readonly children: readonly MdInline[] }
  | {
      readonly type: 'list';
      readonly ordered: boolean;
      readonly start: number;
      readonly items: readonly (readonly MdBlock[])[];
    }
  | { readonly type: 'blockquote'; readonly children: readonly MdBlock[] }
  | { readonly type: 'code'; readonly lang: string; readonly value: string }
  | { readonly type: 'hr' }
  | {
      readonly type: 'table';
      readonly align: readonly MdAlign[];
      readonly header: readonly (readonly MdInline[])[];
      readonly rows: readonly (readonly (readonly MdInline[])[])[];
    };

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)/;
const HEADING = /^ {0,3}(#{1,6})(?:\s+(.*?))?(?:\s+#+)?\s*$/;
const HR = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^ {0,3}> ?/;
const ITEM = /^( {0,3})([-*+]|\d{1,9}[.)])( +|$)/;
const TABLE_RULE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

/** A link or image target is kept only when it cannot run script. */
function safeUrl(url: string): string {
  const trimmed = url.trim();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed)?.[1]?.toLowerCase();
  return scheme === undefined || ['http', 'https', 'mailto', 'tel'].includes(scheme) ? trimmed : '';
}

function cells(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function startsBlock(line: string): boolean {
  return (
    FENCE.test(line) || HEADING.test(line) || HR.test(line) || QUOTE.test(line) || ITEM.test(line)
  );
}

/**
 * Parse Markdown into blocks: ATX headings, paragraphs, bullet and ordered lists (nested by
 * indentation), blockquotes, fenced code, rules, and GFM tables, with emphasis, strong, code
 * spans, links, images and hard breaks inline. HTML is not interpreted; it stays text. Link and
 * image targets with a scheme other than http, https, mailto or tel are emptied.
 */
export function parseMarkdown(source: string): MdBlock[] {
  return parseBlocks(source.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n'));
}

function parseBlocks(lines: readonly string[]): MdBlock[] {
  const out: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === '') {
      i++;
      continue;
    }
    const fence = FENCE.exec(line);
    if (fence !== null) {
      const marker = fence[1]!;
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trimStart().startsWith(marker)) body.push(lines[i++]!);
      i++;
      out.push({ type: 'code', lang: fence[2] ?? '', value: body.join('\n') });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading !== null) {
      const level = heading[1]!.length as 1 | 2 | 3 | 4 | 5 | 6;
      out.push({ type: 'heading', level, children: parseInline(heading[2] ?? '') });
      i++;
      continue;
    }
    if (HR.test(line)) {
      out.push({ type: 'hr' });
      i++;
      continue;
    }
    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (
        i < lines.length &&
        lines[i]!.trim() !== '' &&
        (QUOTE.test(lines[i]!) || !startsBlock(lines[i]!))
      ) {
        body.push(lines[i++]!.replace(QUOTE, ''));
      }
      out.push({ type: 'blockquote', children: parseBlocks(body) });
      continue;
    }
    const item = ITEM.exec(line);
    if (item !== null) {
      i = parseList(lines, i, out);
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && TABLE_RULE.test(lines[i + 1]!)) {
      const align = cells(lines[i + 1]!).map(
        (rule): MdAlign =>
          rule.startsWith(':') && rule.endsWith(':')
            ? 'center'
            : rule.endsWith(':')
              ? 'right'
              : rule.startsWith(':')
                ? 'left'
                : null,
      );
      const header = cells(line).map(parseInline);
      const rows: MdInline[][][] = [];
      i += 2;
      while (i < lines.length && lines[i]!.includes('|') && lines[i]!.trim() !== '') {
        rows.push(cells(lines[i++]!).map(parseInline));
      }
      out.push({ type: 'table', align, header, rows });
      continue;
    }
    const body: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      (body.length === 0 || !startsBlock(lines[i]!))
    ) {
      body.push(lines[i++]!);
    }
    out.push({
      type: 'paragraph',
      children: parseInline(body.map((l) => l.replace(/^ +/, '')).join('\n')),
    });
  }
  return out;
}

/** Parse the list starting at `start` into `out`, returning the index after it. */
function parseList(lines: readonly string[], start: number, out: MdBlock[]): number {
  const first = ITEM.exec(lines[start]!)!;
  const ordered = /\d/.test(first[2]!);
  const items: MdBlock[][] = [];
  let i = start;
  while (i < lines.length) {
    const match = ITEM.exec(lines[i]!);
    if (match === null || /\d/.test(match[2]!) !== ordered) break;
    const indent = match[0].length;
    const body = [lines[i]!.slice(indent)];
    i++;
    while (i < lines.length) {
      const next = lines[i]!;
      if (next.trim() === '') {
        // A blank line ends the item unless indented content follows it.
        const following = lines[i + 1];
        if (
          following !== undefined &&
          following.trim() !== '' &&
          /^ */.exec(following)![0].length >= indent
        ) {
          body.push('');
          i++;
          continue;
        }
        break;
      }
      const lead = /^ */.exec(next)![0].length;
      if (lead >= 2) body.push(next.slice(Math.min(lead, indent)));
      else if (!startsBlock(next)) body.push(next);
      else break;
      i++;
    }
    items.push(parseBlocks(body));
    while (i < lines.length && lines[i]!.trim() === '' && ITEM.test(lines[i + 1] ?? '')) i++;
  }
  out.push({ type: 'list', ordered, start: ordered ? Number.parseInt(first[2]!, 10) : 1, items });
  return i;
}

const INLINE_ESCAPE = /^\\([!-/:-@[-`{-~])/;

/** Parse inline Markdown. */
export function parseInline(text: string): MdInline[] {
  const out: MdInline[] = [];
  let buffer = '';
  const flush = (): void => {
    if (buffer !== '') out.push({ type: 'text', value: buffer });
    buffer = '';
  };
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    const escape = INLINE_ESCAPE.exec(rest);
    if (escape !== null) {
      buffer += escape[1];
      i += 2;
      continue;
    }
    const lineBreak = /^(?: {2,}|\\)\n/.exec(rest);
    if (lineBreak !== null) {
      flush();
      out.push({ type: 'break' });
      i += lineBreak[0].length;
      continue;
    }
    const code = /^(`+)([^]*?[^`])\1(?!`)/.exec(rest);
    if (code !== null) {
      flush();
      out.push({ type: 'code', value: code[2]!.replace(/\n/g, ' ').trim() });
      i += code[0].length;
      continue;
    }
    const image = /^!\[([^\]]*)\]\(\s*<?([^)\s>]*)>?(?:\s+"[^"]*")?\s*\)/.exec(rest);
    if (image !== null) {
      flush();
      out.push({ type: 'image', src: safeUrl(image[2]!), alt: image[1]! });
      i += image[0].length;
      continue;
    }
    const link = /^\[((?:\\.|[^\]])*)\]\(\s*<?([^)\s>]*)>?(?:\s+"[^"]*")?\s*\)/.exec(rest);
    if (link !== null) {
      flush();
      out.push({ type: 'link', href: safeUrl(link[2]!), children: parseInline(link[1]!) });
      i += link[0].length;
      continue;
    }
    const strong = /^(\*\*|__)(?=\S)([^]*?\S)\1/.exec(rest);
    if (strong !== null) {
      flush();
      out.push({ type: 'strong', children: parseInline(strong[2]!) });
      i += strong[0].length;
      continue;
    }
    const em = /^(\*|_)(?=\S)([^]*?\S)\1(?!\1)/.exec(rest);
    if (em !== null && (em[1] === '*' || !/\w/.test(text[i - 1] ?? ''))) {
      flush();
      out.push({ type: 'em', children: parseInline(em[2]!) });
      i += em[0].length;
      continue;
    }
    buffer += text[i];
    i++;
  }
  flush();
  return out;
}
