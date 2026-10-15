import { describe, expect, it } from 'vitest';
import { createMotionValue } from '@usemotif/core';
import { Fragment, isValidElement, type ReactElement } from 'react';
import * as client from './_client-entry.js';
import { Box, HStack, Stack, Text } from './rsc.js';

type Props = Record<string, unknown> & { children?: unknown };
const props = (el: ReactElement): Props => el.props as Props;

describe('Server Component primitives', () => {
  it('renders the element with its classes, and its CSS as a hoisted style', () => {
    const out = Box({ p: { base: '$2', md: '$6' }, _hover: { opacity: 0.8 }, children: 'x' });
    expect(out.type).toBe(Fragment);
    const [style, element] = props(out).children as ReactElement[];
    expect(style!.type).toBe('style');
    expect(props(style!).precedence).toBe('motif');
    expect(props(style!).href).toMatch(/^motif-\w+$/);
    const css = props(style!).children as string;
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).toContain(':hover { opacity: 0.8; }');
    expect(element!.type).toBe('div');
    for (const cls of (props(element!).className as string).split(' ')) expect(css).toContain(cls);
    expect(props(element!).children).toBe('x');
  });

  it('gives the same CSS the same href, so React keeps one copy', () => {
    const a = props(Box({ p: { base: 1, md: 2 } })).children as ReactElement[];
    const b = props(Box({ p: { base: 1, md: 2 } })).children as ReactElement[];
    expect(props(a[0]!).href).toBe(props(b[0]!).href);
  });

  it('renders inline-only styles with no style element', () => {
    const out = Box({ bg: '$colors.surface.base', as: 'section' });
    expect(out.type).toBe('section');
    expect(props(out).style).toEqual({ backgroundColor: 'var(--colors-surface-base)' });
  });

  it('hands props that need the client to the client Box', () => {
    for (const extra of [
      { enterStyle: { opacity: 0 } },
      { layout: true },
      { onClick: () => {} },
      { opacity: createMotionValue(1) },
    ]) {
      expect(Box({ p: 1, ...extra }).type).toBe(client.Box);
    }
  });

  it('keeps Stack on the server unless it staggers', () => {
    const row = HStack({ gap: 2 });
    expect(row.type).toBe(Stack);
    const resolved = Stack({ direction: 'row', gap: 2 });
    expect(resolved.type).toBe(Box);
    expect(props(resolved)).toMatchObject({ display: 'flex', flexDirection: 'row' });
    expect(Stack({ stagger: 0.05 }).type).toBe(client.Stack);
  });

  it('clamps Text lines like the client Text', () => {
    const out = Text({ lines: 1, children: 'long' });
    expect(isValidElement(out) && out.type).toBe(Box);
    expect(props(out)).toMatchObject({
      as: 'span',
      style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    });
  });
});
