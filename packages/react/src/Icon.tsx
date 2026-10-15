'use client';

import {
  createContext,
  useContext,
  useMemo,
  type Context,
  type ReactElement,
  type ReactNode,
} from 'react';
import { SVG_PRIMITIVES, Svg, type SvgPrimitives, type SvgProps } from './Svg.js';

/**
 * Icon primitive. A semantic wrapper over `<Svg>` that:
 *
 * - Sets `aria-hidden` by default (icons are decorative unless given
 *   a label). Pass `aria-label` to opt in to a labelled icon, in
 *   which case `role="img"` is set and `aria-hidden` is dropped.
 * - Picks a fixed size from a small token-friendly enum (xs..xl) or
 *   accepts a raw size override.
 *
 * Cross-platform glyphs use the `render` prop and receive the host
 * platform's SVG primitives so the same icon source works on web
 * and on native (with `react-native-svg`):
 *
 * ```tsx
 * <Icon render={({ Line }) => (
 *   <>
 *     <Line x1="12" y1="5" x2="12" y2="19" />
 *     <Line x1="5" y1="12" x2="19" y2="12" />
 *   </>
 * )} />
 * ```
 *
 * `children` are still accepted for legacy / web-only icons; the
 * `@usemotif/icons` package uses the `render` form so its glyphs
 * work on both platforms.
 */
export interface IconProps extends Omit<SvgProps, 'size' | 'children'> {
  /**
   * Size token. Maps to a pixel value. Defaults to the nearest
   * `IconProvider`'s `size`, then `'md'` (20px).
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Decorative icons are hidden from a11y. Set `aria-label` to opt in. */
  'aria-label'?: string;
  /** Render-prop receiving the platform's SVG primitives. */
  render?: (primitives: SvgPrimitives) => ReactNode;
  children?: ReactNode;
}

const SIZE_PX: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

/** Props for {@link IconProvider}. Each one unset inherits from an outer provider. */
export interface IconProviderProps {
  /** Default `size` for every `Icon` below. */
  size?: IconProps['size'];
  /** Default stroke width for every `Icon` below. */
  strokeWidth?: number | string;
  children?: ReactNode;
}

type IconDefaults = Omit<IconProviderProps, 'children'>;

// Kept on a global symbol so the ESM and CJS builds, and the barrel and the
// `/svg` entry, all read one context: a glyph and a provider imported through
// different copies of this module would otherwise never meet.
const ICON_DEFAULTS_KEY = Symbol.for('usemotif.iconDefaults');

function iconDefaultsContext(): Context<IconDefaults> {
  const registry = globalThis as unknown as Record<symbol, Context<IconDefaults> | undefined>;
  return (registry[ICON_DEFAULTS_KEY] ??= createContext<IconDefaults>({}));
}

/**
 * Sets the default `size` and `strokeWidth` of every `Icon` in its subtree,
 * including every `@usemotif/icons` glyph. A prop on the icon itself wins,
 * and a nested provider overrides only what it sets.
 *
 * @example
 * ```tsx
 * <IconProvider size="sm" strokeWidth={1.5}>
 *   <Toolbar />
 * </IconProvider>
 * ```
 */
export function IconProvider({ size, strokeWidth, children }: IconProviderProps): ReactElement {
  const IconDefaultsContext = iconDefaultsContext();
  const outer = useContext(IconDefaultsContext);
  const resolvedSize = size ?? outer.size;
  const resolvedStroke = strokeWidth ?? outer.strokeWidth;
  const value = useMemo<IconDefaults>(
    () => ({
      ...(resolvedSize !== undefined && { size: resolvedSize }),
      ...(resolvedStroke !== undefined && { strokeWidth: resolvedStroke }),
    }),
    [resolvedSize, resolvedStroke],
  );
  return <IconDefaultsContext.Provider value={value}>{children}</IconDefaultsContext.Provider>;
}

export function Icon({ size, render, children, ...rest }: IconProps): ReactElement {
  const defaults = useContext(iconDefaultsContext());
  const resolved = size ?? defaults.size ?? 'md';
  const px = typeof resolved === 'number' ? resolved : SIZE_PX[resolved];
  const label = rest['aria-label'];
  const labelled = typeof label === 'string' && label.length > 0;
  const content = render !== undefined ? render(SVG_PRIMITIVES) : children;
  return (
    <Svg
      size={px}
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
      {...(defaults.strokeWidth !== undefined && { strokeWidth: defaults.strokeWidth })}
      {...rest}
    >
      {content}
    </Svg>
  );
}
