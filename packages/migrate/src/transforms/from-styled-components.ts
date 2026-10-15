/**
 * `from-styled-components` codemod: rewrite styled-components to motif's `styled()`.
 *
 * Converted:
 *
 * - `styled.div` and `styled(Component)` templates with no interpolations become
 *   `styled('div', { base: { ... } })`, each declaration camelCased, unitless numbers as
 *   numbers.
 * - `&:hover`, `&:focus`, `&:focus-visible`, `&:active`, `&:disabled`, `&::before` and
 *   `&::after` blocks become `_hover`, `_focus`, `_active`, `_disabled`, `_before`, `_after`.
 *
 * Left in place and marked with a `// usemotif-migrate:` comment: templates with
 * interpolations, other nested selectors, at-rules, `!important`, `.attrs()`, and the
 * `css`, `keyframes`, `createGlobalStyle` and `ThemeProvider` imports. When some templates are
 * left, the converted ones use `motifStyled`, so both libraries can run side by side until the
 * rest is done.
 */
import { Edits, indentAt, key, parseModule, quote, walk, type Node } from '../_ast.js';

const SOURCE = 'styled-components';

const NESTED: Readonly<Record<string, string>> = {
  '&:hover': '_hover',
  '&:focus': '_focus',
  '&:focus-visible': '_focus',
  '&:active': '_active',
  '&:disabled': '_disabled',
  '&::before': '_before',
  '&::after': '_after',
};

type StyleObject = { [prop: string]: string | number | StyleObject };

const camel = (prop: string): string =>
  prop
    .replace(/^-(webkit|moz|ms)-/, (_, v: string) => `${v[0]!.toUpperCase()}${v.slice(1)}-`)
    .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/** A flat CSS body as a style object, or `null` when it holds something without a mapping. */
export function cssToStyle(css: string): StyleObject | null {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let pos = 0;
  const block = (depth: number): StyleObject | null => {
    const out: StyleObject = {};
    let buffer = '';
    while (pos < text.length) {
      const ch = text[pos++]!;
      if (ch === '{') {
        const name = NESTED[buffer.trim()];
        if (depth > 0 || name === undefined) return null;
        const inner = block(depth + 1);
        if (inner === null) return null;
        out[name] = inner;
        buffer = '';
      } else if (ch === '}') {
        if (depth === 0) return null;
        return declaration(buffer, out) ? out : null;
      } else if (ch === ';') {
        if (!declaration(buffer, out)) return null;
        buffer = '';
      } else {
        buffer += ch;
      }
    }
    return depth === 0 && declaration(buffer, out) ? out : null;
  };
  return block(0);
}

function declaration(text: string, into: StyleObject): boolean {
  if (text.trim() === '') return true;
  const colon = text.indexOf(':');
  if (colon < 1) return false;
  const prop = text.slice(0, colon).trim();
  const value = text.slice(colon + 1).trim();
  if (!/^-?[a-z][a-z-]*$/.test(prop) || value === '' || value.includes('!important')) return false;
  into[camel(prop)] = /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
  return true;
}

function print(style: StyleObject, indent: string): string {
  const lines = Object.entries(style).map(([k, v]) => {
    const value =
      typeof v === 'object'
        ? print(v, `${indent}  `)
        : typeof v === 'number'
          ? String(v)
          : quote(v);
    return `${indent}  ${key(k)}: ${value},`;
  });
  return `{\n${lines.join('\n')}\n${indent}}`;
}

export function needsFromStyledComponents(source: string): boolean {
  return source.includes(SOURCE);
}

export function applyFromStyledComponents(source: string): string {
  if (!needsFromStyledComponents(source)) return source;
  const program = parseModule(source);
  const edits = new Edits(source);

  let styledLocal: string | null = null;
  let importDecl: Node | null = null;
  const others: string[] = [];
  for (const statement of program.body as Node[]) {
    if (statement.type !== 'ImportDeclaration') continue;
    if ((statement.source as { value: string }).value !== SOURCE) continue;
    importDecl = statement;
    for (const spec of statement.specifiers as Node[]) {
      const local = (spec.local as { name: string }).name;
      if (spec.type === 'ImportDefaultSpecifier') styledLocal = local;
      else others.push(local);
    }
  }
  if (importDecl === null || styledLocal === null) {
    if (importDecl !== null)
      edits.mark([program], importDecl, `finish by hand: ${others.join(', ')}`);
    return edits.apply();
  }

  const converted: { node: Node; component: string; style: StyleObject }[] = [];
  let left = 0;
  walk(program, (node, ancestors) => {
    if (node.type !== 'TaggedTemplateExpression') return;
    const tag = node.tag as Node;
    const component = componentOf(tag, styledLocal!, source);
    if (component === undefined) return;
    const quasi = node.quasi as { expressions: Node[]; quasis: { value: { cooked: string } }[] };
    let reason: string | null = null;
    if (component === null)
      reason = '.attrs() has no motif equivalent; move the props to the call site';
    else if (quasi.expressions.length > 0)
      reason = 'interpolations: express them as variants or tokens';
    const style = reason === null ? cssToStyle(quasi.quasis[0]!.value.cooked) : null;
    if (reason === null && style === null) {
      reason = 'a selector, at-rule or !important with no direct mapping';
    }
    if (reason !== null) {
      left++;
      edits.mark(ancestors, node, reason);
      return;
    }
    converted.push({ node, component: component!, style: style! });
  });

  const name = left === 0 ? 'styled' : 'motifStyled';
  for (const { node, component, style } of converted) {
    edits.replace(
      node,
      `${name}(${component}, { base: ${print(style, indentAt(source, node.start))} })`,
    );
  }

  const motifImport =
    left === 0
      ? `import { styled } from 'usemotif';`
      : `import { styled as motifStyled } from 'usemotif';`;
  if (left === 0 && others.length === 0) {
    edits.replace(importDecl, motifImport);
  } else {
    if (converted.length > 0)
      edits.replace({ start: importDecl.end, end: importDecl.end }, `\n${motifImport}`);
    if (others.length > 0)
      edits.mark([program], importDecl, `finish by hand: ${others.join(', ')}`);
  }
  return edits.apply();
}

/**
 * The component a `styled` tag renders, as source text. `undefined` when the tag is not
 * styled-components' `styled`; `null` for an `.attrs()` chain.
 */
function componentOf(tag: Node, styled: string, source: string): string | null | undefined {
  const isStyled = (n: Node): boolean => n.type === 'Identifier' && n.name === styled;
  if (tag.type === 'MemberExpression' && isStyled(tag.object as Node) && !tag.computed) {
    return quote((tag.property as { name: string }).name);
  }
  if (tag.type === 'CallExpression' && isStyled(tag.callee as Node)) {
    const [arg] = tag.arguments as Node[];
    return arg === undefined ? undefined : source.slice(arg.start, arg.end);
  }
  if (tag.type === 'CallExpression' || tag.type === 'MemberExpression') {
    const inner = (tag.type === 'CallExpression' ? tag.callee : tag.object) as Node;
    if (
      inner.type === 'MemberExpression' &&
      (inner.property as { name?: string }).name === 'attrs'
    ) {
      return componentOf(inner.object as Node, styled, source) === undefined ? undefined : null;
    }
  }
  return undefined;
}
