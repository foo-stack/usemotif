import { type BreakpointName, getBreakpoints, type Theme } from '@usemotif/core';
import { createContext, useContext } from 'react';

/**
 * Native theme context. Unlike the web renderer (which threads themes
 * via CSS variables and `[data-theme]` attribute swaps), native uses a
 * plain React context. Theme switches re-render every component that
 * read styles from the theme - fine on RN since the StyleSheet path
 * doesn't have a CSS-cascade equivalent to lean on.
 */
export interface ThemeContextValue {
  /** All themes registered at the nearest `<ThemeProvider>`. */
  readonly themes: readonly Theme[];
  /** Active theme's `name`. */
  readonly active: string;
  /** Theme names from the root provider down to this scope:
   * `<ThemeProvider active="dark">` starts it at `['dark']` and each nested
   * `<Theme name="X">` appends `X`. Optional so a hand-built value can omit
   * it; the provider and `<Theme>` always populate it. */
  readonly chain?: readonly string[];
  /** Resolved breakpoint pixel widths for this render tree. The single
   * per-tree source every native breakpoint-match path reads (responsive
   * props like `p={{ md }}`, `Show`/`Hide`, `useViewportMatch`), so the
   * imperative and declarative responsive paths agree. Optional so a
   * hand-built value can omit it and fall back to the process-global;
   * `ThemeProvider` always populates it. */
  readonly breakpoints?: Readonly<Record<BreakpointName, number>>;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Returns the currently active theme object, or `undefined` if no
 * `<ThemeProvider>` is in scope. Components that need literal token
 * values (e.g. `Box`'s style resolution) call this internally.
 */
export function useTheme(): Theme | undefined {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) return undefined;
  return ctx.themes.find((t) => t.name === ctx.active);
}

/**
 * Returns the active theme NAME without re-resolving the theme object.
 * Cheap subscription for "are we in dark mode?" style checks.
 */
export function useThemeName(): string | undefined {
  return useContext(ThemeContext)?.active;
}

/**
 * Returns the theme names from the root provider down to the current scope.
 * `<ThemeProvider active="dark"><Theme name="red">` yields `['dark', 'red']`,
 * whichever theme `useThemeName()` resolves to. `undefined` outside a provider.
 */
export function useThemeChain(): readonly string[] | undefined {
  return useContext(ThemeContext)?.chain;
}

/**
 * The breakpoint pixel widths in effect for the current render tree - the
 * nearest `<ThemeProvider breakpoints>` override, or the process-global when
 * no provider is mounted. The single per-tree source every native JS
 * breakpoint-match path reads, so declarative responsive props, `Show`/`Hide`,
 * and `useMedia` no longer disagree.
 */
export function useBreakpointWidths(): Readonly<Record<BreakpointName, number>> {
  return useContext(ThemeContext)?.breakpoints ?? getBreakpoints();
}
