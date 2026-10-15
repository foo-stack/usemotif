'use client';

/**
 * Dedicated, tree-shakeable entry for the SVG primitives.
 *
 * `Icon` and `Svg` import zero engine code. Exposing them here, off
 * the `@usemotif/react` barrel, lets a leaf import - e.g. a single
 * `@usemotif/icons` glyph - avoid dragging in `@usemotif/core` and
 * the rest of the styled primitives. Import from `@usemotif/react/svg`
 * when you only need icons.
 */

export { Icon, IconProvider } from './Icon.js';
export type { IconProps, IconProviderProps } from './Icon.js';
export { SVG_PRIMITIVES, Svg } from './Svg.js';
export type { SvgPrimitives, SvgProps } from './Svg.js';
