/**
 * React Native resolution of `@usemotif/react/svg`.
 *
 * The web entry renders an inline `<svg>` host, which doesn't exist on
 * native - so a glyph imported from `@usemotif/react/svg` (e.g. any
 * `@usemotif/icons` export) must resolve to the `react-native-svg`-backed
 * primitives instead. This twin re-exports the native `Icon`/`Svg` so the
 * shared glyph source (`<Icon render={({ Path }) => ...}/>`) renders for
 * real on RN rather than red-screening on an unknown `svg` component.
 *
 * Wired up via the `react-native` export condition on `./svg` in
 * `package.json`; web bundlers never see this file.
 */

export {
  Icon,
  IconProvider,
  NATIVE_SVG_COMPONENT,
  SVG_PRIMITIVES,
  Svg,
} from '@usemotif/react-native';
export type { IconProps, IconProviderProps, SvgPrimitives, SvgProps } from '@usemotif/react-native';
