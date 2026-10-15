'use client';

import {
  type BreakpointName,
  configureBreakpoints,
  getBreakpoints,
  resolveBreakpoints,
  themesRuntimeCss,
  themesToCssBlock,
  type Theme as ThemeType,
} from '@usemotif/core';
import { useContext, useEffect, useMemo, type ReactNode } from 'react';
import { syncBrowserChrome } from './_browser-chrome.js';
import { warnIfCssLayerNeverOrdered } from './_dev-warnings.js';
import { CssLayerContext } from './css-layer-context.js';
import { ThemeContext, type ThemeContextValue } from './theme-context.js';
import { useViewTransitionValue } from './_view-transition.js';
import { useIsomorphicLayoutEffect } from './_use-isomorphic-layout-effect.js';
import { registerStyleTarget } from './style-cache.js';

export interface ThemeProviderProps {
  /**
   * All themes available at this scope. Their CSS-variable definitions
   * are emitted once via a `<style>` element so theme switches become
   * attribute swaps rather than React re-renders.
   *
   * For chainable / composable sub-themes, register the combination
   * themes (e.g. `dark_red`) alongside the root ones - they're picked
   * up automatically when a `<Theme>` boundary chain produces a name
   * that matches.
   */
  themes: readonly ThemeType[];
  /**
   * Name of the active theme. Must match the `name` of one of `themes`,
   * otherwise CSS variables fall back to browser defaults.
   */
  active: string;
  /**
   * Override the breakpoint pixel widths for this app. Merges over the
   * defaults (the five names - `sm`/`md`/`lg`/`xl`/`2xl` - are fixed; only
   * their widths change). A convenience for calling `configureBreakpoints()`
   * at app entry: `useMedia`/`useBreakpoint` and the runtime responsive CSS
   * then resolve against these widths.
   *
   * Pass the SAME object to the compiler plugin's `breakpoints` option so the
   * compiled `@media` rules match - `@media` can't read `var()`, so the widths
   * must be fixed at build time, and a mismatch means dev and prod disagree.
   * Treat it as static app config: set it once and don't vary it at runtime.
   */
  breakpoints?: Partial<Record<BreakpointName, number>>;
  /**
   * Wrap every rule Motif emits in `@layer <name>`, so the app can decide
   * Motif's precedence against its own stylesheet explicitly.
   *
   * Cascade layers settle precedence independently of specificity *and*
   * source order, which is the only mechanism that can do this: Motif's base
   * style props are otherwise inline (`1,0,0,0`) and beat any host utility
   * class (`0,1,0`) regardless of authoring order, and runtime-injected rules
   * land in `document.head` after the bundled stylesheet anyway.
   *
   * Declare the order yourself, in a stylesheet that loads before Motif -
   * Motif deliberately does not emit an order statement, because racing the
   * app's stylesheet for first-occurrence would make precedence depend on DOM
   * insertion timing:
   *
   * ```css
   * @layer motif, app;
   * ```
   *
   * Setting this changes how base style props are emitted: they become a
   * class rather than inline styles, since inline styles cannot belong to a
   * layer. Visual output is unchanged in an app with no competing stylesheet.
   *
   * Pass the SAME name to the compiler plugin's `cssLayer` option, or
   * compiled and runtime rules hash to different class names and stop
   * deduplicating - the same constraint as `breakpoints`.
   */
  cssLayer?: string | undefined;
  /**
   * Animate a change of `active` with the browser's View Transitions API: the page crossfades
   * from the old theme to the new one. Where the API is missing, or the reader prefers reduced
   * motion, the switch is instant as usual.
   */
  viewTransition?: boolean;
  /**
   * A shadow root or another document, such as an iframe's, that this tree renders into. The
   * theme CSS and every rule motif emits at runtime are adopted there as a constructable
   * stylesheet, since styles in the main document's `<head>` don't reach it.
   */
  styleTarget?: Document | ShadowRoot | null | undefined;
  children?: ReactNode;
}

/**
 * Top-level theme provider.
 *
 * Renders a `<style>` element containing every theme's tokens, scoped
 * to `[data-theme="<name>"]`. Wraps `children` in a container that
 * carries the active theme name on its `data-theme` attribute.
 * Switching themes amounts to changing that attribute - the CSS
 * cascade does the rest, no React re-renders required.
 */
/** Shallow equality of two breakpoint-width maps (the five fixed names), so
 * the process-global `@media` config is only re-applied when it truly changes. */
function sameWidths(
  a: Readonly<Record<BreakpointName, number>>,
  b: Readonly<Record<BreakpointName, number>>,
): boolean {
  if (a === b) return true;
  for (const k of Object.keys(b) as BreakpointName[]) if (a[k] !== b[k]) return false;
  return true;
}

export function ThemeProvider({
  themes,
  active: requested,
  breakpoints,
  cssLayer,
  viewTransition = false,
  styleTarget,
  children,
}: ThemeProviderProps) {
  const { value: active } = useViewTransitionValue(requested, viewTransition);
  const widths = useMemo(() => resolveBreakpoints(breakpoints), [breakpoints]);
  // Keep the process-global in sync for the `@media` CSS widths (a shared
  // stylesheet's at-rule preludes can't be `var()`-driven), but only when it
  // changes - no per-render / StrictMode thrash. JS match resolution reads
  // `widths` per-tree via ThemeContext below, not this global.
  if (breakpoints !== undefined && !sameWidths(getBreakpoints(), widths)) {
    configureBreakpoints(breakpoints);
  }
  const cssBlock = useMemo(() => themesToCssBlock(themes, cssLayer), [themes, cssLayer]);
  // Runtime CSS - `@font-face` declarations, body / `::selection`
  // resets, and the `prefers-reduced-motion` guard. Empty string when
  // no theme registers any of the three fields, in which case we skip
  // the second `<style>` element entirely.
  const runtimeBlock = useMemo(() => themesRuntimeCss(themes, cssLayer), [themes, cssLayer]);
  useIsomorphicLayoutEffect(
    () =>
      styleTarget === null || styleTarget === undefined
        ? undefined
        : registerStyleTarget(styleTarget, `${cssBlock}\n${runtimeBlock}`),
    [styleTarget, cssBlock, runtimeBlock],
  );
  const value: ThemeContextValue = useMemo(
    () => ({ themes, active, chain: [active], breakpoints: widths }),
    [themes, active, widths],
  );

  // After mount, so `document.styleSheets` reflects the app's own CSS rather
  // than whatever had loaded when this component first rendered.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') warnIfCssLayerNeverOrdered(cssLayer);
  }, [cssLayer]);

  // The browser's own chrome follows the active theme. An effect, so the
  // server render and the first client render stay identical.
  const activeTheme = themes.find((t) => t.name === active);
  useEffect(
    () => (activeTheme === undefined ? undefined : syncBrowserChrome(activeTheme)),
    [activeTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <CssLayerContext.Provider value={cssLayer}>
        <style data-motif-themes="root" dangerouslySetInnerHTML={{ __html: cssBlock }} />
        {runtimeBlock !== '' && (
          <style data-motif-themes="runtime" dangerouslySetInnerHTML={{ __html: runtimeBlock }} />
        )}
        <div data-theme={active}>{children}</div>
      </CssLayerContext.Provider>
    </ThemeContext.Provider>
  );
}

export interface ThemeProps {
  /**
   * Name of the theme to apply to this subtree. Combined with the
   * parent chain, motif looks up a registered combination theme -
   * e.g. inside `<ThemeProvider active="dark">`, `<Theme name="red">`
   * looks for a `'dark_red'` theme, falling back to the inner name
   * `'red'` (or the parent name) if no combination is registered.
   */
  name: string;
  children?: ReactNode;
}

/**
 * Nested sub-theme boundary. Switches the active theme for descendants
 * by setting `data-theme` on a wrapping element. CSS-variable cascade
 * handles the visual change without touching React state.
 *
 * **Chainable / composable**: when nested inside a parent `<Theme>` (or
 * `<ThemeProvider>`), motif composes the names with `_` and looks for a
 * registered combination theme. Pre-generate the combinations you care
 * about and pass them all to `<ThemeProvider themes={...}>` - they
 * activate automatically when the chain matches.
 *
 * @example
 *
 * ```tsx
 * <ThemeProvider themes={[light, dark, light_red, dark_red]} active="dark">
 *   <Box bg="$colors.surface.base">          // dark
 *     <Theme name="red">
 *       <Box bg="$colors.surface.base">      // dark_red
 *     </Theme>
 *   </Box>
 * </ThemeProvider>
 * ```
 */
// Stable empty fallback for an orphaned <Theme> (no provider parent). A fresh
// `[]` each render would change the `themes` identity, defeating the
// context-value useMemo below and re-rendering every ThemeContext consumer on
// every render. With a real ThemeProvider above, `parent.themes` is already
// stable, so this only matters on the orphaned path.
const EMPTY_THEMES: readonly ThemeType[] = [];

export function Theme({ name, children }: ThemeProps) {
  const parent = useContext(ThemeContext);
  const themes = parent?.themes ?? EMPTY_THEMES;

  // Chain composition: inherit the parent chain (or start fresh if no
  // provider is in scope) and append this boundary's name.
  const chain: readonly string[] = parent === undefined ? [name] : [...parent.chain, name];

  // Resolve the name to apply: prefer the deepest registered combo
  // (`dark_red_blue` → `dark_red` → `red`), falling back to the parent
  // active name if nothing in this branch is registered.
  const resolved = resolveActiveName(themes, chain, parent?.active);

  // Breakpoint widths are app-level, not per-theme - inherit the parent's
  // (or the global when this <Theme> is orphaned) so a nested scope resolves
  // responsive matches against the same widths as the root provider.
  const widths = parent?.breakpoints ?? getBreakpoints();
  const value: ThemeContextValue = useMemo(
    () => ({ themes, active: resolved, chain, breakpoints: widths }),
    // chain identity is stable per composition path; resolved tracks chain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themes, resolved, chain.join('_'), widths],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div data-theme={resolved}>{children}</div>
    </ThemeContext.Provider>
  );
}

/**
 * Resolve the chain to the most appropriate registered theme name.
 *
 * Priority (most specific → least):
 *
 * 1. **Full chain combo** (`dark_red_blue`) - registered combinations
 *    are exactly what they're for; if one matches, use it.
 * 2. **Inner name** (last chain element, e.g. `red`) - preserves the
 *    user's explicit `<Theme>` intent when no combo is registered.
 * 3. **Parent's resolved active** - the cascade keeps inheriting from
 *    the parent boundary if neither of the above matched. For 3-deep
 *    chains this naturally drops to `dark_red` etc., because the
 *    parent `<Theme red>` boundary already resolved to `dark_red`.
 *
 * No SVG-style "drop one at a time from each end" combinatorial walk
 * - that's expensive and surprising. The above three steps are
 * deterministic, easy to reason about, and cover the cases that
 * matter for real apps.
 */
function resolveActiveName(
  themes: readonly ThemeType[],
  chain: readonly string[],
  parentActive: string | undefined,
): string {
  const names = new Set(themes.map((t) => t.name));
  const fullChain = chain.join('_');
  if (names.has(fullChain)) return fullChain;
  const inner = chain.at(-1);
  if (inner !== undefined && names.has(inner)) return inner;
  return parentActive ?? inner ?? '';
}
