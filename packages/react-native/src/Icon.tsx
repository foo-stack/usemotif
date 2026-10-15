import {
  createContext,
  useContext,
  useMemo,
  type Context,
  type ReactElement,
  type ReactNode,
} from 'react';
import { SVG_PRIMITIVES, Svg, type SvgPrimitives, type SvgProps } from './Svg.js';

export interface IconProps extends Omit<SvgProps, 'size' | 'children'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  accessibilityLabel?: string;
  /**
   * Render-prop receiving the platform's SVG primitives (Path, Line,
   * Circle, ...). On native this is `null` when `react-native-svg` isn't
   * installed; in that case `Icon` renders a sized `Box` placeholder.
   */
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

// The same global key as the web build, so a provider and a glyph reached
// through different copies of this module still share one context.
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

export function Icon({
  size,
  render,
  children,
  accessibilityLabel,
  ...rest
}: IconProps): ReactElement {
  const defaults = useContext(iconDefaultsContext());
  const resolved = size ?? defaults.size ?? 'md';
  const px = typeof resolved === 'number' ? resolved : SIZE_PX[resolved];
  // When react-native-svg is installed, hand the render prop the
  // platform primitives. When it isn't, drop to children (which are
  // typically nothing for icon glyphs that use the render prop) so
  // the fallback Box renders empty rather than throwing on unknown
  // host components.
  const content =
    render !== undefined && SVG_PRIMITIVES !== null ? render(SVG_PRIMITIVES) : children;
  // Decorative by default (mirrors web's `aria-hidden`): an unlabelled
  // icon is hidden from the screen reader; a labelled one is announced
  // as an image with that label.
  const hasLabel = accessibilityLabel !== undefined && accessibilityLabel !== '';
  const a11y = hasLabel
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel }
    : {
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const,
      };
  return (
    <Svg
      size={px}
      {...(defaults.strokeWidth !== undefined && { strokeWidth: defaults.strokeWidth })}
      {...rest}
      {...a11y}
    >
      {content}
    </Svg>
  );
}
