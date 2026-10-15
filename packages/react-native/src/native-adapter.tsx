import { createRoot, type Root } from 'react-dom/client';
import { act, createElement, type ComponentType, type ReactNode } from 'react';
import { defaultBreakpoints, type BreakpointName } from '@usemotif/core';
import {
  defaultTestTheme,
  type ConformanceCase,
  type PrimitiveName,
  type RendererAdapter,
  type RendererOutput,
} from '@usemotif/test-utils';
import { __setDimensions, __setLayoutWidth } from './__test-setup__/react-native-mock.js';
import { Box } from './Box.js';
import { Container } from './Container.js';
import { HStack, Stack, VStack } from './Stack.js';
import { Image } from './Image.js';
import { Pressable } from './Pressable.js';
import { Text } from './Text.js';
import { TitleBar } from './TitleBar.js';
import { ThemeProvider } from './Theme.js';

const PRIMITIVES: Record<PrimitiveName, ComponentType<Record<string, unknown>>> = {
  Box: Box as unknown as ComponentType<Record<string, unknown>>,
  Stack: Stack as unknown as ComponentType<Record<string, unknown>>,
  HStack: HStack as unknown as ComponentType<Record<string, unknown>>,
  VStack: VStack as unknown as ComponentType<Record<string, unknown>>,
  Text: Text as unknown as ComponentType<Record<string, unknown>>,
  Container: Container as unknown as ComponentType<Record<string, unknown>>,
  Pressable: Pressable as unknown as ComponentType<Record<string, unknown>>,
  Image: Image as unknown as ComponentType<Record<string, unknown>>,
  TitleBar: TitleBar as unknown as ComponentType<Record<string, unknown>>,
};

/**
 * The host element selector used to find the rendered primitive's
 * "root" in the DOM. Different motif primitives map to different RN
 * host components, which the test mock renders as different HTML
 * tags + `data-motif-host` markers.
 */
const ROOT_SELECTOR_BY_PRIMITIVE: Record<PrimitiveName, string> = {
  Box: '[data-motif-host="View"]',
  Stack: '[data-motif-host="View"]',
  HStack: '[data-motif-host="View"]',
  VStack: '[data-motif-host="View"]',
  Container: '[data-motif-host="View"]',
  Text: '[data-motif-host="Text"]',
  Pressable: '[data-motif-host="Pressable"]',
  Image: '[data-motif-host="Image"]',
  TitleBar: '[data-motif-host="View"]',
};

const BP_PX = defaultBreakpoints satisfies Record<BreakpointName, number>;

/**
 * Native renderer adapter for the conformance harness. Implements the
 * cross-renderer contract by rendering the case under multiple
 * conditions (different viewport widths, container widths, Pressable
 * states) and reporting the resulting styles in the same
 * `RendererOutput` shape as the web adapter - so the existing
 * `assertConformance` checks work unchanged.
 *
 * Each render uses a fresh DOM container; the per-testID layout
 * registry resets between cases.
 */
export function createNativeAdapter(): RendererAdapter {
  return {
    name: 'react-native',
    render(c: ConformanceCase): RendererOutput {
      const theme = c.theme ?? defaultTestTheme;
      const Component = PRIMITIVES[c.primitive];
      const rootSelector = ROOT_SELECTOR_BY_PRIMITIVE[c.primitive];

      // Default render - narrow viewport, no container.
      __setDimensions(360);
      const baseStyle = renderAndExtractStyle(theme, Component, c.props, c.children, rootSelector);

      const mediaRules: Record<string, Record<string, string | number>> = {};
      const containerRules: Record<string, Record<string, string | number>> = {};
      const pseudoRules: Record<string, Record<string, string | number>> = {};

      // For each media-rule expected, render at that breakpoint width
      // and capture the resulting inline style. The cross-renderer
      // expectations check against this map.
      if (c.expectMediaRules !== undefined) {
        for (const atRule of Object.keys(c.expectMediaRules)) {
          const bp = breakpointFromMediaPrefix(atRule);
          if (bp === null) continue;
          __setDimensions(BP_PX[bp]);
          const at = renderAndExtractStyle(theme, Component, c.props, c.children, rootSelector);
          mediaRules[atRule] = diffFromBase(baseStyle, at);
        }
        // Reset for subsequent extracts.
        __setDimensions(360);
      }

      // For each container-rule expected, render the case wrapped in a
      // Container with `__setLayoutWidth` set to the breakpoint width.
      if (c.expectContainerRules !== undefined) {
        for (const atRule of Object.keys(c.expectContainerRules)) {
          const parsed = parseContainerPrefix(atRule);
          if (parsed === null) continue;
          const { name, bp } = parsed;
          // Use a unique testID for the container so the per-id width
          // registry doesn't bleed across rules.
          const testID = `__motif_conformance_${name ?? 'anon'}_${bp}`;
          __setLayoutWidth(testID, BP_PX[bp]);
          const wrapped = (children: ReactNode) =>
            createElement(
              Container,
              { ...(name === undefined ? {} : { name }), testID } as Record<string, unknown>,
              children,
            );
          const at = renderAndExtractStyle(
            theme,
            Component,
            c.props,
            c.children,
            rootSelector,
            wrapped,
          );
          containerRules[atRule] = diffFromBase(baseStyle, at);
        }
      }

      // Pseudo states - only Pressable produces these. Re-render with
      // the matching state forced via `data-motif-pressable-state`.
      if (c.expectPseudoRules !== undefined && c.primitive === 'Pressable') {
        for (const pseudo of Object.keys(c.expectPseudoRules)) {
          const stateFlag = stateFlagForPseudo(pseudo);
          if (stateFlag === null) continue;
          const propsWithState = {
            ...c.props,
            'data-motif-pressable-state': JSON.stringify({ [stateFlag]: true }),
          };
          const at = renderAndExtractStyle(
            theme,
            Component,
            propsWithState,
            c.children,
            rootSelector,
          );
          pseudoRules[pseudo] = diffFromBase(baseStyle, at);
        }
      }

      return {
        style: baseStyle,
        // Native flattens base + breakpoint resolution into a single
        // inline style - no class system, no separate base block. The
        // empty bag here just satisfies the cross-renderer contract.
        baseClassRule: {},
        mediaRules,
        containerRules,
        pseudoRules,
      };
    },
  };
}

/** Render the case's element to a fresh DOM root and extract the
 * resolved inline style off the primitive's root host. Optionally
 * wraps in another component (e.g. `<Container>`) for container-rule
 * captures.
 *
 * The case's primitive is tagged with a sentinel testID so query
 * selectors can disambiguate when the primitive happens to share a
 * host type with its wrapper (e.g. Container also renders a View).
 */
const CASE_TEST_ID = '__motif_conformance_target';

function renderAndExtractStyle(
  theme: typeof defaultTestTheme,
  Component: ComponentType<Record<string, unknown>>,
  props: Record<string, unknown>,
  children: string | undefined,
  rootSelector: string,
  wrap?: (children: ReactNode) => ReactNode,
): Record<string, string | number> {
  const dom = document.createElement('div');
  document.body.appendChild(dom);
  const root: Root = createRoot(dom);
  try {
    const inner = createElement(
      Component,
      { ...props, testID: CASE_TEST_ID },
      children !== undefined ? (children as ReactNode) : undefined,
    );
    const wrapped = wrap === undefined ? inner : wrap(inner);
    act(() => {
      root.render(createElement(ThemeProvider, { themes: [theme], active: theme.name }, wrapped));
    });
    // Query by the sentinel testID so wrapping (Container, etc.) can't
    // shadow the actual primitive's host.
    const targeted = dom.querySelector(`${rootSelector}[testID="${CASE_TEST_ID}"]`);
    const el = targeted ?? dom.querySelector(rootSelector);
    if (el === null) return {};
    const raw = el.getAttribute('data-motif-style');
    if (raw === null) return {};
    return flattenAndStripPx(JSON.parse(raw));
  } finally {
    act(() => root.unmount());
    document.body.removeChild(dom);
  }
}

/** Flatten an RN style array into one object and coerce numeric-looking
 * `Npx` strings back to numbers for cross-renderer comparison. (Native
 * doesn't produce px strings normally, but defensively handle if a
 * future test introduces them.) */
function flattenAndStripPx(s: unknown): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  const visit = (v: unknown): void => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) {
      for (const x of v) visit(x);
      return;
    }
    if (typeof v !== 'object') return;
    for (const k in v as Record<string, unknown>) {
      const value = (v as Record<string, unknown>)[k];
      if (typeof value === 'number') {
        out[k] = value;
      } else if (typeof value === 'string') {
        const m = /^(-?\d+(?:\.\d+)?)px$/.exec(value);
        out[k] = m === null ? value : Number(m[1]);
      }
    }
  };
  visit(s);
  return out;
}

/** Compute the keys/values that differ between a baseline style and a
 * "rule" render. For a media rule expected at md, only the keys that
 * changed at md vs. base belong in the rule's declarations. */
function diffFromBase(
  base: Record<string, string | number>,
  variant: Record<string, string | number>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const k in variant) {
    if (variant[k] !== base[k]) out[k] = variant[k]!;
  }
  return out;
}

function breakpointFromMediaPrefix(prefix: string): BreakpointName | null {
  // "@media (min-width: 768px)" → 'md'
  const m = /^@media \(min-width:\s*(\d+)px\)$/.exec(prefix);
  if (m === null) return null;
  const px = Number(m[1]);
  for (const bp of Object.keys(BP_PX) as BreakpointName[]) {
    if (BP_PX[bp] === px) return bp;
  }
  return null;
}

function parseContainerPrefix(
  prefix: string,
): { name: string | undefined; bp: BreakpointName } | null {
  // "@container (min-width: 768px)" → anon md
  const anon = /^@container \(min-width:\s*(\d+)px\)$/.exec(prefix);
  if (anon !== null) {
    const px = Number(anon[1]);
    for (const bp of Object.keys(BP_PX) as BreakpointName[]) {
      if (BP_PX[bp] === px) return { name: undefined, bp };
    }
    return null;
  }
  // "@container card (min-width: 1024px)" → name=card, lg
  const named = /^@container (\S+) \(min-width:\s*(\d+)px\)$/.exec(prefix);
  if (named !== null) {
    const px = Number(named[2]);
    for (const bp of Object.keys(BP_PX) as BreakpointName[]) {
      if (BP_PX[bp] === px) return { name: named[1]!, bp };
    }
    return null;
  }
  return null;
}

/** Map the web's pseudo selector to the native Pressable state flag. */
function stateFlagForPseudo(pseudo: string): 'hovered' | 'focused' | 'pressed' | null {
  if (pseudo === ':hover') return 'hovered';
  if (pseudo.startsWith(':focus')) return 'focused';
  if (pseudo === ':active') return 'pressed';
  return null;
}
