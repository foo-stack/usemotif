import { useContext, useMemo, type ReactNode } from 'react';
import {
  type BreakpointName,
  configureBreakpoints,
  getBreakpoints,
  resolveBreakpoints,
  type Theme as ThemeType,
} from '@usemotif/core';
import { ThemeContext, type ThemeContextValue } from './theme-context.js';

export interface ThemeProviderProps {
  /**
   * All themes available at this scope. Pre-registered so `<Theme>`
   * boundaries below can switch by name without re-uploading the
   * token tree on every change.
   */
  themes: readonly ThemeType[];
  /**
   * Name of the active theme. Must match the `name` of one of `themes`;
   * an unknown name leaves descendants with `useTheme()` returning
   * `undefined`.
   */
  active: string;
  /**
   * Override the breakpoint pixel widths for this app. Merges over the
   * defaults (the five names - `sm`/`md`/`lg`/`xl`/`2xl` - are fixed; only
   * their widths change). A convenience for calling `configureBreakpoints()`
   * at app entry: `useMedia`/`useBreakpoint` and `Adapt`/`Show`/`Hide` then
   * resolve against these widths. Treat it as static app config: set it once
   * and don't vary it at runtime.
   */
  breakpoints?: Partial<Record<BreakpointName, number>>;
  /**
   * Accepted and ignored on native.
   *
   * CSS cascade layers are a web-only mechanism, and native has no cascade at
   * all - styles resolve to a flat `StyleSheet` object, so there is nothing
   * for a layer to order against. The prop exists so a cross-platform
   * `<ThemeProvider>` written once typechecks against both renderers; see the
   * web renderer's `cssLayer` for what it does there.
   */
  cssLayer?: string | undefined;
  children?: ReactNode;
}

/**
 * Root native theme provider. Threads the active theme through React
 * context. Switching `active` re-renders every consumer of
 * `useTheme()` (Box, future Stack/Text/etc.) with the new token
 * values - native has no CSS-variable cascade to lean on.
 */
export function ThemeProvider({ themes, active, breakpoints, children }: ThemeProviderProps) {
  const widths = useMemo(() => resolveBreakpoints(breakpoints), [breakpoints]);
  // Keep the process-global in sync for the `useMedia` store (which reads it),
  // but only when it actually changes - no per-render thrash. Declarative
  // responsive props / `Show`/`Hide` / `Adapt` read `widths` per-tree via
  // ThemeContext below, so a custom breakpoint now flows to EVERY native path
  // (previously the declarative + Show/Hide tables were frozen to the defaults).
  if (breakpoints !== undefined && !sameWidths(getBreakpoints(), widths)) {
    configureBreakpoints(breakpoints);
  }
  const value: ThemeContextValue = useMemo(
    () => ({ themes, active, chain: [active], breakpoints: widths }),
    [themes, active, widths],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Shallow equality of two breakpoint-width maps (the five fixed names). */
function sameWidths(
  a: Readonly<Record<BreakpointName, number>>,
  b: Readonly<Record<BreakpointName, number>>,
): boolean {
  if (a === b) return true;
  for (const k of Object.keys(b) as BreakpointName[]) if (a[k] !== b[k]) return false;
  return true;
}

export interface ThemeProps {
  /**
   * Name of the theme to apply to this subtree. Must be a name
   * registered with the nearest enclosing `<ThemeProvider>`; otherwise
   * descendants get an `undefined` resolved theme.
   */
  name: string;
  children?: ReactNode;
}

/**
 * Nested theme boundary. Reads the registered `themes` list from the
 * surrounding context and rebinds `active` to `name`. The outer
 * `themes` array is preserved - no need to re-pass it.
 *
 * @example
 *
 * ```tsx
 * <ThemeProvider themes={[lightTheme, darkTheme]} active="light">
 *   <Box bg="$colors.surface.base">
 *     <Theme name="dark">
 *       <Box bg="$colors.surface.base">{/* dark surface island *\/}</Box>
 *     </Theme>
 *   </Box>
 * </ThemeProvider>
 * ```
 */
export function Theme({ name, children }: ThemeProps) {
  const outer = useContext(ThemeContext);
  // Breakpoint widths are app-level, not per-theme - inherit the parent's
  // (or the global when orphaned) so nested scopes resolve against the same set.
  const widths = outer?.breakpoints ?? getBreakpoints();
  const outerChain = outer?.chain;
  const value: ThemeContextValue = useMemo(
    () => ({
      themes: outer?.themes ?? [],
      active: name,
      chain: [...(outerChain ?? []), name],
      breakpoints: widths,
    }),
    [outer?.themes, outerChain, name, widths],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
