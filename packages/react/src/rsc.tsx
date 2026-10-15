import { hashString, isMotionValue } from '@usemotif/core';
import { createElement, Fragment, type ReactElement } from 'react';
import type { BoxProps } from './Box.js';
import type { StackProps } from './Stack.js';
import type { TextProps } from './Text.js';
import { resolveBox } from './_box-render.js';
import * as client from './_client-entry.js';
import { resolveLineClampStyle } from './_line-clamp.js';
import { SSRStyleCollector } from './style-cache.js';

/**
 * Layout primitives for React Server Components.
 *
 * `Box`, `Stack`, `HStack`, `VStack` and `Text` from here render on the server with no client
 * boundary: their styles resolve to class names there, and the CSS ships with them as React's
 * hoisted `<style href precedence>`, which React deduplicates into the document head while the
 * page streams. Props that need the client (event handlers, `ref`, `enterStyle`, `exitStyle`,
 * `layout`, `drag`, motion values, `stagger`) hand the element to the client primitive instead.
 *
 * Tokens resolve to CSS variables, so a server primitive picks up the theme from the
 * `ThemeProvider` above it through the cascade. A `ThemeProvider` `cssLayer` is client context
 * and does not reach these.
 */

const CLIENT_PROPS: ReadonlySet<string> = new Set([
  'ref',
  'enterStyle',
  'exitStyle',
  'layout',
  'layoutId',
  'layoutTransition',
  'drag',
  'stagger',
]);

function needsClient(props: Record<string, unknown>): boolean {
  for (const key in props) {
    const value = props[key];
    if (value === undefined) continue;
    if (CLIENT_PROPS.has(key) || /^on[A-Z]/.test(key) || isMotionValue(value)) return true;
  }
  return false;
}

/** A `Box` rendered as a Server Component. See the module note for what falls back. */
export function Box(props: BoxProps): ReactElement {
  if (needsClient(props as Record<string, unknown>)) return createElement(client.Box, props);
  const collector = new SSRStyleCollector();
  const resolved = resolveBox(props, collector, undefined);
  if (resolved.kind === 'plain') return createElement(resolved.as, resolved.props, props.children);
  const element = createElement(
    resolved.as,
    {
      ...resolved.passThrough,
      className: resolved.finalClassName,
      style: { ...resolved.baseStyle, ...resolved.inlineStyle },
    },
    props.children,
  );
  const css = collector.getCss();
  if (css === '') return element;
  return createElement(
    Fragment,
    null,
    createElement('style', { href: `motif-${hashString(css)}`, precedence: 'motif' }, css),
    element,
  );
}

/** A `Stack` rendered as a Server Component; `stagger` needs the client one. */
export function Stack({
  direction = 'column',
  stagger,
  staggerFrom,
  ...rest
}: StackProps): ReactElement {
  if (stagger !== undefined) {
    return createElement(client.Stack, {
      direction,
      stagger,
      ...(staggerFrom !== undefined ? { staggerFrom } : {}),
      ...rest,
    });
  }
  return createElement(Box, { display: 'flex', flexDirection: direction, ...rest });
}

/** `Stack direction="row"`, as a Server Component. */
export function HStack(props: Omit<StackProps, 'direction'>): ReactElement {
  return createElement(Stack, { direction: 'row', ...props });
}

/** `Stack direction="column"`, as a Server Component. */
export function VStack(props: Omit<StackProps, 'direction'>): ReactElement {
  return createElement(Stack, { direction: 'column', ...props });
}

/** A `Text` rendered as a Server Component. */
export function Text({ as = 'span', lines, style, ...rest }: TextProps): ReactElement {
  const clamp = lines === undefined ? undefined : resolveLineClampStyle(lines);
  const merged = clamp === undefined ? style : { ...clamp, ...style };
  return createElement(Box, { as, ...(merged === undefined ? {} : { style: merged }), ...rest });
}

export type { BoxProps, StackProps, TextProps };
