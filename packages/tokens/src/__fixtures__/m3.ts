import type { Theme } from '@usemotif/core';

/**
 * Material Design 3 (Material You) - light theme expressed in motif tokens.
 *
 * Source: https://m3.material.io/styles/color/system/overview - public
 * token set as of 2025. M3 is the harshest test of motif's two-layer
 * model: the reference layer is **tonal palettes** (each hue has a
 * 0-100 lightness ramp), and the role layer pulls specific tones into
 * named slots (`primary`, `onPrimary`, `primaryContainer`, etc.).
 *
 * Typography is even more aggressive - each "type slot" (`displayLarge`,
 * `bodyMedium`, `labelSmall`, ...) carries a compound (size, line-height,
 * weight, letter-spacing). Motif handles this by having parallel scales
 * that share the slot name as the key, so `$fontSizes.displayLarge` /
 * `$lineHeights.displayLarge` / `$fontWeights.displayLarge` /
 * `$letterSpacings.displayLarge` all resolve. The component author
 * picks slot once and gets the right value at each call site.
 */
export const m3LightTheme: Theme = {
  name: 'm3-light',
  tokens: {
    colors: {
      // ─── Reference / tonal palette ────────────────────────────────
      // Lightness ramp per hue: 0 (black) → 100 (white).
      primary: {
        0: '#000000',
        10: '#21005d',
        20: '#381e72',
        30: '#4f378b',
        40: '#6750a4',
        50: '#7f67be',
        60: '#9a82db',
        70: '#b69df8',
        80: '#d0bcff',
        90: '#eaddff',
        95: '#f6edff',
        99: '#fffbfe',
        100: '#ffffff',
      },
      secondary: {
        0: '#000000',
        10: '#1d192b',
        20: '#332d41',
        30: '#4a4458',
        40: '#625b71',
        50: '#7a7289',
        60: '#958da5',
        70: '#b0a7c0',
        80: '#ccc2dc',
        90: '#e8def8',
        95: '#f6edff',
        99: '#fffbfe',
        100: '#ffffff',
      },
      tertiary: {
        0: '#000000',
        10: '#31111d',
        20: '#492532',
        30: '#633b48',
        40: '#7d5260',
        50: '#986977',
        60: '#b58392',
        70: '#d29dac',
        80: '#efb8c8',
        90: '#ffd8e4',
        95: '#ffecf1',
        99: '#fffbfa',
        100: '#ffffff',
      },
      error: {
        0: '#000000',
        10: '#410e0b',
        20: '#601410',
        30: '#8c1d18',
        40: '#b3261e',
        50: '#dc362e',
        60: '#e46962',
        70: '#ec928e',
        80: '#f2b8b5',
        90: '#f9dedc',
        95: '#fceeee',
        99: '#fffbf9',
        100: '#ffffff',
      },
      neutral: {
        0: '#000000',
        10: '#1c1b1f',
        20: '#313033',
        30: '#484649',
        40: '#605d62',
        50: '#787579',
        60: '#939094',
        70: '#aeaaae',
        80: '#c9c5ca',
        90: '#e6e1e5',
        95: '#f4eff4',
        99: '#fffbfe',
        100: '#ffffff',
      },
      neutralVariant: {
        0: '#000000',
        10: '#1d1a22',
        20: '#322f37',
        30: '#49454f',
        40: '#605d66',
        50: '#79747e',
        60: '#938f99',
        70: '#aea9b4',
        80: '#cac4d0',
        90: '#e7e0ec',
        95: '#f5eefa',
        99: '#fffbfe',
        100: '#ffffff',
      },

      // ─── Roles (light theme tone selections) ──────────────────────
      role: {
        primary: '$colors.primary.40',
        onPrimary: '$colors.primary.100',
        primaryContainer: '$colors.primary.90',
        onPrimaryContainer: '$colors.primary.10',

        secondary: '$colors.secondary.40',
        onSecondary: '$colors.secondary.100',
        secondaryContainer: '$colors.secondary.90',
        onSecondaryContainer: '$colors.secondary.10',

        tertiary: '$colors.tertiary.40',
        onTertiary: '$colors.tertiary.100',
        tertiaryContainer: '$colors.tertiary.90',
        onTertiaryContainer: '$colors.tertiary.10',

        error: '$colors.error.40',
        onError: '$colors.error.100',
        errorContainer: '$colors.error.90',
        onErrorContainer: '$colors.error.10',

        background: '$colors.neutral.99',
        onBackground: '$colors.neutral.10',
        surface: '$colors.neutral.99',
        onSurface: '$colors.neutral.10',
        surfaceVariant: '$colors.neutralVariant.90',
        onSurfaceVariant: '$colors.neutralVariant.30',

        outline: '$colors.neutralVariant.50',
        outlineVariant: '$colors.neutralVariant.80',

        inverseSurface: '$colors.neutral.20',
        inverseOnSurface: '$colors.neutral.95',
        inversePrimary: '$colors.primary.80',
      },
    },

    // ─── Typography slots (compound across 4 scales) ────────────────
    // Each slot name appears in fontSizes / lineHeights / fontWeights /
    // letterSpacings so a component can read all four with the same key.
    fontSizes: {
      displayLarge: 57,
      displayMedium: 45,
      displaySmall: 36,
      headlineLarge: 32,
      headlineMedium: 28,
      headlineSmall: 24,
      titleLarge: 22,
      titleMedium: 16,
      titleSmall: 14,
      bodyLarge: 16,
      bodyMedium: 14,
      bodySmall: 12,
      labelLarge: 14,
      labelMedium: 12,
      labelSmall: 11,
    },
    lineHeights: {
      displayLarge: 64,
      displayMedium: 52,
      displaySmall: 44,
      headlineLarge: 40,
      headlineMedium: 36,
      headlineSmall: 32,
      titleLarge: 28,
      titleMedium: 24,
      titleSmall: 20,
      bodyLarge: 24,
      bodyMedium: 20,
      bodySmall: 16,
      labelLarge: 20,
      labelMedium: 16,
      labelSmall: 16,
    },
    fontWeights: {
      // M3 maps each slot to a weight; titles + labels lean medium,
      // display / headline / body are regular.
      displayLarge: 400,
      displayMedium: 400,
      displaySmall: 400,
      headlineLarge: 400,
      headlineMedium: 400,
      headlineSmall: 400,
      titleLarge: 400,
      titleMedium: 500,
      titleSmall: 500,
      bodyLarge: 400,
      bodyMedium: 400,
      bodySmall: 400,
      labelLarge: 500,
      labelMedium: 500,
      labelSmall: 500,
    },
    letterSpacings: {
      displayLarge: '-0.25px',
      displayMedium: '0px',
      displaySmall: '0px',
      headlineLarge: '0px',
      headlineMedium: '0px',
      headlineSmall: '0px',
      titleLarge: '0px',
      titleMedium: '0.15px',
      titleSmall: '0.1px',
      bodyLarge: '0.5px',
      bodyMedium: '0.25px',
      bodySmall: '0.4px',
      labelLarge: '0.1px',
      labelMedium: '0.5px',
      labelSmall: '0.5px',
    },

    // M3's "shape" scale - corner radii by step name.
    radii: {
      none: 0,
      extraSmall: 4,
      small: 8,
      medium: 12,
      large: 16,
      extraLarge: 28,
      full: 9999,
    },

    // Spacing isn't formally part of M3 v1 spec but a 4dp grid is the
    // canonical recommendation; included so layout primitives have
    // somewhere to read from.
    space: {
      0: 0,
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      8: 32,
      10: 40,
      12: 48,
      16: 64,
    },
  },
};
