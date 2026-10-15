import { getBreakpoints, type Theme } from '@usemotif/core';
import type { RendererOutput } from '@usemotif/test-utils';
import { act, cloneElement, createElement, isValidElement, type ReactElement } from 'react';
import { Dimensions } from 'react-native';
import { createRoot, type TestInstance } from 'test-renderer';
import { ThemeProvider } from './Theme.js';

type Style = Record<string, string | number>;

function flatten(style: unknown, into: Style = {}): Style {
  if (Array.isArray(style)) for (const part of style) flatten(part, into);
  else if (style !== null && typeof style === 'object') Object.assign(into, style);
  return into;
}

/** The root host element's flattened style, rendered at `width` and, when asked, pressed. */
function renderAt(element: ReactElement, theme: Theme, width: number, pressed: boolean): Style {
  const root = createRoot();
  // React Native's own Pressable reads `testOnly_pressed`, and motif's Pressable passes it on.
  const target =
    pressed && isValidElement(element)
      ? cloneElement(element as ReactElement<{ testOnly_pressed?: boolean }>, {
          testOnly_pressed: true,
        })
      : element;
  const original = Dimensions.get;
  // Responsive values read the window width when they mount.
  Dimensions.get = ((dimension: 'window' | 'screen') => ({
    ...original(dimension),
    width,
  })) as typeof Dimensions.get;
  try {
    act(() => {
      root.render(createElement(ThemeProvider, { themes: [theme], active: theme.name }, target));
    });
  } finally {
    Dimensions.get = original;
  }
  const host = root.container.children.find(
    (child): child is TestInstance => typeof child !== 'string',
  );
  const style = flatten(host?.props.style);
  act(() => root.unmount());
  return style;
}

/** What `next` sets differently from `previous`. */
function changes(previous: Style, next: Style): Style {
  const out: Style = {};
  for (const key in next) if (next[key] !== previous[key]) out[key] = next[key]!;
  return out;
}

/**
 * React Native's counterpart of `renderStyles` from `@usemotif/react/testing`: render an element,
 * a consumer's own `styled()` component included, and return its resolved styles in the shape
 * `toHaveStyle` and `toHaveStyleAt` from `@usemotif/test-utils` read, so one assertion holds on
 * both platforms.
 *
 * Native has no media queries or `:active` rules, so they are simulated: the element renders at
 * width 0 for `style`, at each breakpoint's width for that `@media (min-width: Npx)` rule (what
 * changes from the breakpoint below), and pressed, through `testOnly_pressed`, for `:active`.
 * Renders with the `test-renderer` package, which React Native Testing Library is built on.
 *
 * @example
 * ```tsx
 * import { renderStyles } from '@usemotif/react-native/testing';
 *
 * const out = renderStyles(<Card padding={{ base: '$space.3', md: '$space.6' }} />, theme);
 * expect(out).toHaveStyle({ padding: 12 });
 * expect(out).toHaveStyleAt('@media (min-width: 768px)', { padding: 24 });
 * ```
 */
export function renderStyles(element: ReactElement, theme: Theme): RendererOutput {
  const style = renderAt(element, theme, 0, false);
  const mediaRules: Record<string, Style> = {};
  let previous = style;
  const widths = Object.values(getBreakpoints()).sort((a, b) => a - b);
  for (const px of widths) {
    const at = renderAt(element, theme, px, false);
    const changed = changes(previous, at);
    if (Object.keys(changed).length > 0) mediaRules[`@media (min-width: ${px}px)`] = changed;
    previous = at;
  }
  const pressed = changes(style, renderAt(element, theme, 0, true));
  return {
    style,
    baseClassRule: {},
    mediaRules,
    containerRules: {},
    pseudoRules: Object.keys(pressed).length > 0 ? { ':active': pressed } : {},
  };
}
