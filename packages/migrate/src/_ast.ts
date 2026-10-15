import { parse } from '@babel/parser';

/** The fields of a Babel AST node the transforms read. */
export interface Node {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

/** The comment that marks what a transform could not convert. */
export const MARKER = 'usemotif-migrate:';

export function parseModule(source: string): Node {
  return parse(source, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  }).program as unknown as Node;
}

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && typeof (value as Node).type === 'string';
}

/** Depth-first walk, handing each node its ancestors (nearest last). */
export function walk(root: Node, visit: (node: Node, ancestors: readonly Node[]) => void): void {
  const ancestors: Node[] = [];
  const step = (node: Node): void => {
    visit(node, ancestors);
    ancestors.push(node);
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
      const value = node[key];
      if (Array.isArray(value)) {
        for (const child of value) if (isNode(child)) step(child);
      } else if (isNode(value)) {
        step(value);
      }
    }
    ancestors.pop();
  };
  step(root);
}

/** The whitespace that starts the line `pos` is on. */
export function indentAt(source: string, pos: number): string {
  const lineStart = source.lastIndexOf('\n', pos - 1) + 1;
  return /^[ \t]*/.exec(source.slice(lineStart))![0];
}

/** Text edits by source position, applied together so earlier ones don't shift later ones. */
export class Edits {
  private readonly list: { start: number; end: number; text: string }[] = [];
  private readonly marks = new Map<number, Set<string>>();

  constructor(private readonly source: string) {}

  replace(node: { start: number; end: number }, text: string): void {
    this.list.push({ start: node.start, end: node.end, text });
  }

  /** Mark the statement holding a node with the reason it was left for a person. */
  mark(ancestors: readonly Node[], node: Node, reason: string): void {
    const chain = [...ancestors, node];
    let statement = node;
    for (let i = chain.length - 1; i > 0; i--) {
      const parent = chain[i - 1]!.type;
      if (parent === 'Program' || parent === 'BlockStatement') {
        statement = chain[i]!;
        break;
      }
    }
    const reasons = this.marks.get(statement.start) ?? new Set<string>();
    reasons.add(reason);
    this.marks.set(statement.start, reasons);
  }

  apply(): string {
    const edits = [...this.list];
    for (const [pos, reasons] of this.marks) {
      const indent = indentAt(this.source, pos);
      const above = this.source.slice(0, pos - indent.length);
      const fresh = [...reasons].filter((r) => !above.endsWith(`// ${MARKER} ${r}\n`));
      if (fresh.length === 0) continue;
      const text = fresh.map((r) => `// ${MARKER} ${r}\n${indent}`).join('');
      edits.push({ start: pos, end: pos, text });
    }
    edits.sort((a, b) => b.start - a.start || b.end - a.end);
    let out = this.source;
    let floor = Infinity;
    for (const edit of edits) {
      if (edit.end > floor) throw new Error('overlapping edits; convert this file by hand');
      out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
      floor = edit.start;
    }
    return out;
  }
}

/** A string as a single-quoted JS literal. */
export function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** An object key, bare when it can be. */
export function key(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : quote(name);
}
