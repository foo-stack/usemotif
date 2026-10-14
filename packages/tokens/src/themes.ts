import type { Theme, TokenMap, TokenScale } from '@usemotif/core';
import {
  animations,
  borderWidths,
  colors,
  durations,
  easings,
  fontFamilies,
  fontSizes,
  fontWeights,
  letterSpacings,
  lineHeights,
  opacities,
  radii,
  shadows,
  sizes,
  space,
  zIndices,
} from './primitives.js';

/**
 * The shared primitive layer. Both light and dark themes reference these by
 * `$colors.blue.500`-style paths. Primitives never change with the theme;
 * only the semantic layer rebinds.
 */
const primitiveTokens = {
  colors,
  space,
  sizes,
  radii,
  fontSizes,
  fontWeights,
  fontFamilies,
  lineHeights,
  letterSpacings,
  borderWidths,
  shadows,
  zIndices,
  opacities,
  // Motion scales - required for the `animation` prop and `transition`
  // token refs to resolve. The `animations` presets reference
  // `$durations.*` / `$easings.*`, so all three must be present together.
  durations,
  easings,
  animations,
} satisfies TokenMap;

/**
 * Build a theme by merging the shared primitives with a semantic-layer
 * override (which uses `$`-refs into the primitive tree). The return type
 * keeps the literal token shape, so `extendTheme` over a preset, and a
 * `MotifCustomTheme` augmented with one, see real `$`-paths.
 */
function buildTheme<C extends TokenScale<string>>(
  name: string,
  colorScheme: 'light' | 'dark',
  semantic: { readonly colors: C },
) {
  return {
    name,
    colorScheme,
    // The page background, so the mobile browser bar runs into the page.
    themeColor: '$colors.surface.base',
    tokens: {
      // Primitive scales - shared.
      ...primitiveTokens,
      // Semantic scales - light/dark override these.
      colors: {
        ...colors,
        ...semantic.colors,
      },
    },
  } satisfies Theme;
}

export const lightTheme = buildTheme('light', 'light', {
  colors: {
    // `interactive` is the hover / highlight fill for rows and triggers that
    // sit on a panel - menu items, listbox options, calendar days. It is a
    // distinct entry rather than a reuse of `muted` because a panel is
    // `raised`, and in the dark theme `raised` and `muted` are the same
    // primitive: a hover painted with `muted` would be invisible there.
    surface: {
      base: '$colors.white',
      muted: '$colors.gray.50',
      raised: '$colors.white',
      sunken: '$colors.gray.100',
      interactive: '$colors.gray.100',
      inverse: '$colors.gray.900',
    },
    text: {
      default: '$colors.gray.900',
      muted: '$colors.gray.600',
      subtle: '$colors.gray.500',
      inverse: '$colors.gray.50',
    },
    border: {
      default: '$colors.gray.200',
      muted: '$colors.gray.100',
      strong: '$colors.gray.300',
    },
    // `neutral` belongs here rather than being read straight off the `gray`
    // ramp: a primitive ramp resolves to the same literal in every theme, so
    // a neutral control wired to `gray.200`/`gray.900` keeps light-mode ink
    // on a dark canvas. It is the intent that most needs to invert.
    action: {
      primary: { bg: '$colors.blue.600', fg: '$colors.white', hover: '$colors.blue.700' },
      danger: { bg: '$colors.red.600', fg: '$colors.white', hover: '$colors.red.700' },
      success: { bg: '$colors.green.600', fg: '$colors.white', hover: '$colors.green.700' },
      neutral: { bg: '$colors.gray.200', fg: '$colors.gray.900', hover: '$colors.gray.300' },
    },
    // Soft-tint feedback surfaces (alerts, badges, banners). `tint` is a subtle
    // background, `fg` is the readable text/icon colour on that tint, `border`
    // a matching edge - distinct from `action`, which is for solid controls.
    status: {
      neutral: { tint: '$colors.gray.50', fg: '$colors.gray.700', border: '$colors.gray.200' },
      info: { tint: '$colors.blue.50', fg: '$colors.blue.700', border: '$colors.blue.200' },
      success: { tint: '$colors.green.50', fg: '$colors.green.700', border: '$colors.green.200' },
      warning: { tint: '$colors.amber.50', fg: '$colors.amber.800', border: '$colors.amber.200' },
      danger: { tint: '$colors.red.50', fg: '$colors.red.700', border: '$colors.red.200' },
    },
  },
});

export const darkTheme = buildTheme('dark', 'dark', {
  colors: {
    // `interactive` - see the light theme. Here it must step *up* off the
    // `raised` panel rather than down, so it is a lighter grey than either
    // `base` or `raised`.
    surface: {
      base: '$colors.gray.950',
      muted: '$colors.gray.900',
      raised: '$colors.gray.900',
      sunken: '$colors.black',
      interactive: '$colors.gray.800',
      inverse: '$colors.gray.50',
    },
    text: {
      default: '$colors.gray.50',
      muted: '$colors.gray.400',
      subtle: '$colors.gray.500',
      inverse: '$colors.gray.900',
    },
    border: {
      default: '$colors.gray.800',
      muted: '$colors.gray.900',
      strong: '$colors.gray.700',
    },
    // `neutral` - see the light theme. The fill steps *up* off the canvas here
    // and the hover steps up again, mirroring light mode where both step down.
    action: {
      primary: { bg: '$colors.blue.500', fg: '$colors.white', hover: '$colors.blue.400' },
      danger: { bg: '$colors.red.500', fg: '$colors.white', hover: '$colors.red.400' },
      success: { bg: '$colors.green.500', fg: '$colors.white', hover: '$colors.green.400' },
      neutral: { bg: '$colors.gray.800', fg: '$colors.gray.50', hover: '$colors.gray.700' },
    },
    // Soft-tint feedback surfaces - see the light theme. Dark mode uses the
    // deepest shade for the tint and a light shade for readable text.
    status: {
      neutral: { tint: '$colors.gray.900', fg: '$colors.gray.300', border: '$colors.gray.700' },
      info: { tint: '$colors.blue.950', fg: '$colors.blue.300', border: '$colors.blue.800' },
      success: { tint: '$colors.green.950', fg: '$colors.green.300', border: '$colors.green.800' },
      warning: { tint: '$colors.amber.950', fg: '$colors.amber.300', border: '$colors.amber.800' },
      danger: { tint: '$colors.red.950', fg: '$colors.red.300', border: '$colors.red.800' },
    },
  },
});

/**
 * High-contrast light: the default light layout with every pair pushed to
 * WCAG AAA. Body, muted, and subtle text reach 7:1 on every surface, solid
 * controls reach 7:1 between fill and label, and borders reach 3:1. Built only
 * from the shared palette, so it composes with the default presets and their
 * sub-themes.
 */
export const highContrastLightTheme = buildTheme('high-contrast-light', 'light', {
  colors: {
    surface: {
      base: '$colors.white',
      muted: '$colors.gray.50',
      raised: '$colors.white',
      sunken: '$colors.gray.100',
      interactive: '$colors.gray.100',
      inverse: '$colors.black',
    },
    text: {
      default: '$colors.black',
      muted: '$colors.gray.800',
      subtle: '$colors.gray.700',
      inverse: '$colors.white',
    },
    border: {
      default: '$colors.gray.700',
      muted: '$colors.gray.600',
      strong: '$colors.gray.900',
    },
    action: {
      primary: { bg: '$colors.blue.800', fg: '$colors.white', hover: '$colors.blue.900' },
      danger: { bg: '$colors.red.800', fg: '$colors.white', hover: '$colors.red.900' },
      success: { bg: '$colors.green.900', fg: '$colors.white', hover: '$colors.green.950' },
      neutral: { bg: '$colors.gray.200', fg: '$colors.black', hover: '$colors.gray.300' },
    },
    status: {
      neutral: { tint: '$colors.gray.50', fg: '$colors.gray.900', border: '$colors.gray.700' },
      info: { tint: '$colors.blue.50', fg: '$colors.blue.900', border: '$colors.blue.700' },
      success: { tint: '$colors.green.50', fg: '$colors.green.900', border: '$colors.green.700' },
      warning: { tint: '$colors.amber.50', fg: '$colors.amber.900', border: '$colors.amber.700' },
      danger: { tint: '$colors.red.50', fg: '$colors.red.900', border: '$colors.red.700' },
    },
  },
});

/**
 * High-contrast dark: a black canvas with light text and light solid
 * controls carrying dark labels, held to the same 7:1 and 3:1 thresholds as
 * the light variant.
 */
export const highContrastDarkTheme = buildTheme('high-contrast-dark', 'dark', {
  colors: {
    surface: {
      base: '$colors.black',
      muted: '$colors.gray.950',
      raised: '$colors.gray.950',
      sunken: '$colors.black',
      interactive: '$colors.gray.800',
      inverse: '$colors.white',
    },
    text: {
      default: '$colors.white',
      muted: '$colors.gray.200',
      subtle: '$colors.gray.300',
      inverse: '$colors.black',
    },
    border: {
      default: '$colors.gray.400',
      muted: '$colors.gray.500',
      strong: '$colors.gray.200',
    },
    action: {
      primary: { bg: '$colors.blue.300', fg: '$colors.black', hover: '$colors.blue.200' },
      danger: { bg: '$colors.red.300', fg: '$colors.black', hover: '$colors.red.200' },
      success: { bg: '$colors.green.300', fg: '$colors.black', hover: '$colors.green.200' },
      neutral: { bg: '$colors.gray.800', fg: '$colors.white', hover: '$colors.gray.700' },
    },
    status: {
      neutral: { tint: '$colors.gray.950', fg: '$colors.gray.200', border: '$colors.gray.400' },
      info: { tint: '$colors.blue.950', fg: '$colors.blue.200', border: '$colors.blue.400' },
      success: { tint: '$colors.green.950', fg: '$colors.green.200', border: '$colors.green.400' },
      warning: { tint: '$colors.amber.950', fg: '$colors.amber.200', border: '$colors.amber.400' },
      danger: { tint: '$colors.red.950', fg: '$colors.red.200', border: '$colors.red.400' },
    },
  },
});
