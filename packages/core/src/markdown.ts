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
const HR = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^ {0,3}> ?/;
const ITEM = /^( {0,3})([-*+]|\d{1,9}[.)])( +|$)/;

/** A link or image target is kept only when it cannot run script. */
function safeUrl(url: string): string {
  const trimmed = url.trim();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed)?.[1]?.toLowerCase();
  return scheme === undefined || ['http', 'https', 'mailto', 'tel'].includes(scheme) ? trimmed : '';
}

/** A GFM table's delimiter row: cells of dashes, with colons marking alignment. */
function isTableRule(line: string): boolean {
  return line.includes('-') && cells(line).every((cell) => /^:?-+:?$/.test(cell));
}

function cells(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

/** An ATX heading, read by hand: the usual regex for it backtracks quadratically on spaces. */
function parseHeading(line: string): MdBlock | null {
  const indent = line.length - line.trimStart().length;
  if (indent > 3) return null;
  let level = 0;
  while (line[indent + level] === '#') level++;
  if (level < 1 || level > 6 || !isSpace(line[indent + level])) return null;
  let content = line.slice(indent + level).trim();
  // A closing run of `#`, when a space separates it from the text.
  let end = content.length;
  while (end > 0 && content[end - 1] === '#') end--;
  if (end === 0) content = '';
  else if (end < content.length && isSpace(content[end - 1]))
    content = content.slice(0, end).trimEnd();
  return { type: 'heading', level: level as 1 | 2 | 3 | 4 | 5 | 6, children: parseInline(content) };
}

function startsBlock(line: string): boolean {
  return (
    FENCE.test(line) ||
    parseHeading(line) !== null ||
    HR.test(line) ||
    QUOTE.test(line) ||
    ITEM.test(line)
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
    const heading = parseHeading(line);
    if (heading !== null) {
      out.push(heading);
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
    if (line.includes('|') && i + 1 < lines.length && isTableRule(lines[i + 1]!)) {
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

const ESCAPE = /\\([!-/:-@[-`{-~])/y;
// Bounded so a run of unclosed brackets costs linear time rather than a rescan per bracket.
const IMAGE = /!\[([^\]]{0,1000})\]\( {0,8}<?([^)\s>]{0,2048})>?(?: {1,8}"[^"]{0,1000}")? {0,8}\)/y;
const LINK =
  /\[((?:\\.|[^\]\\]){0,1000})\]\( {0,8}<?([^)\s>]{0,2048})>?(?: {1,8}"[^"]{0,1000}")? {0,8}\)/y;

const isSpace = (c: string | undefined): boolean => c === undefined || /\s/.test(c);

/**
 * Parse inline Markdown. Runs in time linear in the input: a closing delimiter is found by a
 * forward search, and a delimiter with no closer left is remembered so later openers do not
 * search again.
 */
export function parseInline(text: string): MdInline[] {
  const out: MdInline[] = [];
  const unclosed = new Set<string>();
  let buffer = '';
  const flush = (): void => {
    if (buffer !== '') out.push({ type: 'text', value: buffer });
    buffer = '';
  };
  const at = (re: RegExp, i: number): RegExpExecArray | null => {
    re.lastIndex = i;
    return re.exec(text);
  };
  /** Where `delim` next closes after `from`: preceded by a non-space, not part of a longer run. */
  const closer = (delim: string, from: number, exact: boolean): number => {
    if (unclosed.has(delim)) return -1;
    let pos = text.indexOf(delim, from);
    while (pos !== -1) {
      const after = text[pos + delim.length];
      const runs = exact && (after === delim[0] || text[pos - 1] === delim[0]);
      if (!isSpace(text[pos - 1]) && !runs) return pos;
      pos = text.indexOf(delim, pos + 1);
    }
    unclosed.add(delim);
    return -1;
  };
  // No link or image can start past the last `)`.
  const lastParen = text.lastIndexOf(')');
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    const escape = c === '\\' ? at(ESCAPE, i) : null;
    if (escape !== null) {
      buffer += escape[1];
      i += 2;
      continue;
    }
    if (c === '\\' && text[i + 1] === '\n') {
      flush();
      out.push({ type: 'break' });
      i += 2;
      continue;
    }
    if (c === ' ') {
      // A run of spaces is taken whole, so it is scanned once: two or more before a newline
      // are a hard break.
      let run = 1;
      while (text[i + run] === ' ') run++;
      if (run >= 2 && text[i + run] === '\n') {
        flush();
        out.push({ type: 'break' });
        i += run + 1;
      } else {
        buffer += text.slice(i, i + run);
        i += run;
      }
      continue;
    }
    if (c === '`') {
      let run = 1;
      while (text[i + run] === '`') run++;
      const fence = '`'.repeat(run);
      const end = closer(fence, i + run, true);
      if (end === -1) {
        buffer += fence;
        i += run;
        continue;
      }
      flush();
      out.push({
        type: 'code',
        value: text
          .slice(i + run, end)
          .replace(/\n/g, ' ')
          .trim(),
      });
      i = end + run;
      continue;
    }
    const image = c === '!' && i < lastParen ? at(IMAGE, i) : null;
    if (image !== null) {
      flush();
      out.push({ type: 'image', src: safeUrl(image[2]!), alt: image[1]! });
      i += image[0].length;
      continue;
    }
    const link = c === '[' && i < lastParen ? at(LINK, i) : null;
    if (link !== null) {
      flush();
      out.push({ type: 'link', href: safeUrl(link[2]!), children: parseInline(link[1]!) });
      i += link[0].length;
      continue;
    }
    if ((c === '*' || c === '_') && !isSpace(text[i + 1])) {
      const double = text[i + 1] === c;
      const delim = double ? c + c : c;
      // `_` inside a word is part of it, as in snake_case.
      const intraword = c === '_' && /\w/.test(text[i - 1] ?? '');
      const start = i + delim.length;
      const end = intraword || isSpace(text[start]) ? -1 : closer(delim, start + 1, !double);
      if (end !== -1) {
        flush();
        const children = parseInline(text.slice(start, end));
        out.push(double ? { type: 'strong', children } : { type: 'em', children });
        i = end + delim.length;
        continue;
      }
      buffer += delim;
      i += delim.length;
      continue;
    }
    buffer += c;
    i++;
  }
  flush();
  return out;
}
