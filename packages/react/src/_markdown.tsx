import type { MdBlock, MdInline } from '@usemotif/core';
import { createElement, type ReactNode } from 'react';

function inline(nodes: readonly MdInline[]): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text':
        return node.value;
      case 'strong':
        return <strong key={i}>{inline(node.children)}</strong>;
      case 'em':
        return <em key={i}>{inline(node.children)}</em>;
      case 'code':
        return <code key={i}>{node.value}</code>;
      case 'link':
        return node.href === '' ? (
          <span key={i}>{inline(node.children)}</span>
        ) : (
          <a key={i} href={node.href}>
            {inline(node.children)}
          </a>
        );
      case 'image':
        return node.src === '' ? node.alt : <img key={i} src={node.src} alt={node.alt} />;
      case 'break':
        return <br key={i} />;
    }
  });
}

/** A list item holding one paragraph renders its text directly, as a tight list does in HTML. */
function item(blocks: readonly MdBlock[]): ReactNode {
  const only = blocks.length === 1 ? blocks[0] : undefined;
  return only?.type === 'paragraph' ? inline(only.children) : blocks.map(block);
}

function block(node: MdBlock, i: number): ReactNode {
  switch (node.type) {
    case 'heading':
      return createElement(`h${node.level}`, { key: i }, inline(node.children));
    case 'paragraph':
      return <p key={i}>{inline(node.children)}</p>;
    case 'list': {
      const items = node.items.map((blocks, n) => <li key={n}>{item(blocks)}</li>);
      return node.ordered ? (
        <ol key={i} start={node.start === 1 ? undefined : node.start}>
          {items}
        </ol>
      ) : (
        <ul key={i}>{items}</ul>
      );
    }
    case 'blockquote':
      return <blockquote key={i}>{node.children.map(block)}</blockquote>;
    case 'code':
      return (
        <pre key={i}>
          <code className={node.lang === '' ? undefined : `language-${node.lang}`}>
            {node.value}
          </code>
        </pre>
      );
    case 'hr':
      return <hr key={i} />;
    case 'table': {
      const align = (n: number) => node.align[n] ?? undefined;
      return (
        <table key={i}>
          <thead>
            <tr>
              {node.header.map((cell, n) => (
                <th key={n} style={{ textAlign: align(n) }}>
                  {inline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {node.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, n) => (
                  <td key={n} style={{ textAlign: align(n) }}>
                    {inline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
  }
}

/** Parsed Markdown as plain HTML elements, for `Prose` to style. Nothing is set as raw HTML. */
export function renderMarkdown(blocks: readonly MdBlock[]): ReactNode {
  return blocks.map(block);
}
