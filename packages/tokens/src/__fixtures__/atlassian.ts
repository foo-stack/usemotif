import type { Theme } from '@usemotif/core';

/**
 * Atlassian Design System - light theme expressed in motif tokens.
 *
 * Source: https://atlassian.design/components/tokens/all-tokens -
 * public token set as of 2025. Atlassian's namespaced semantic API
 * (`color.text.subtle`, `color.background.brand.bold`,
 * `space.100`, etc.) maps cleanly onto motif's two-layer model.
 *
 * The validation goal: prove Atlassian's distinctive shape works -
 * 100-1000 numeric palette steps, deeply nested semantic groups
 * (`background.brand.bold` is two levels under `background`), and
 * `'050'` / `'1000'`-style space keys.
 */
export const atlassianLightTheme: Theme = {
  name: 'atlassian-light',
  tokens: {
    colors: {
      // ─── Primitive palette (100-1000 steps) ───────────────────────
      blue: {
        100: '#e9f2ff',
        200: '#cce0ff',
        300: '#85b8ff',
        400: '#579dff',
        500: '#388bff',
        600: '#1d7afc',
        700: '#0c66e4',
        800: '#0055cc',
        900: '#09326c',
        1000: '#1c2b41',
      },
      green: {
        100: '#dcfff1',
        200: '#baf3db',
        300: '#7ee2b8',
        400: '#4bce97',
        500: '#2abb7f',
        600: '#22a06b',
        700: '#1f845a',
        800: '#216e4e',
        900: '#164b35',
        1000: '#133527',
      },
      red: {
        100: '#ffeceb',
        200: '#ffd5d2',
        300: '#fd9891',
        400: '#f87168',
        500: '#f15b50',
        600: '#e2483d',
        700: '#c9372c',
        800: '#ae2a19',
        900: '#601e16',
        1000: '#42221f',
      },
      yellow: {
        100: '#fff7d6',
        200: '#f8e6a0',
        300: '#f5cd47',
        400: '#e2b203',
        500: '#cf9f02',
        600: '#b38600',
        700: '#946f00',
        800: '#7f5f01',
        900: '#533f04',
        1000: '#3d2e00',
      },
      neutral: {
        0: '#ffffff',
        100: '#f7f8f9',
        200: '#f1f2f4',
        300: '#dcdfe4',
        400: '#b3b9c4',
        500: '#8590a2',
        600: '#758195',
        700: '#626f86',
        800: '#44546f',
        900: '#2c3e5d',
        1000: '#172b4d',
      },

      // ─── Semantic - Atlassian's `color.text.*` ────────────────────
      text: {
        default: '$colors.neutral.1000',
        subtle: '$colors.neutral.800',
        subtlest: '$colors.neutral.600',
        disabled: '$colors.neutral.400',
        inverse: '$colors.neutral.0',
        brand: '$colors.blue.700',
        danger: '$colors.red.700',
        success: '$colors.green.700',
        warning: '$colors.yellow.700',
      },

      // ─── Semantic - `color.background.*` (deeply nested) ──────────
      background: {
        neutral: '$colors.neutral.100',
        input: '$colors.neutral.0',
        // Two-level nesting (Atlassian's standout pattern).
        brand: {
          bold: '$colors.blue.700',
          subtle: '$colors.blue.100',
        },
        danger: {
          bold: '$colors.red.700',
          subtle: '$colors.red.100',
        },
        success: {
          bold: '$colors.green.700',
          subtle: '$colors.green.100',
        },
        warning: {
          bold: '$colors.yellow.700',
          subtle: '$colors.yellow.100',
        },
      },

      // ─── Semantic - `color.border.*` ──────────────────────────────
      border: {
        default: '$colors.neutral.300',
        bold: '$colors.neutral.500',
        brand: '$colors.blue.700',
        danger: '$colors.red.700',
        success: '$colors.green.700',
      },
    },

    // Atlassian's `space.<NNN>` keys - `'050'` / `'100'` / `'1000'`.
    // Strings, not numbers; the resolver looks up by exact string key.
    space: {
      '0': 0,
      '025': 2,
      '050': 4,
      '075': 6,
      '100': 8,
      '150': 12,
      '200': 16,
      '250': 20,
      '300': 24,
      '400': 32,
      '500': 40,
      '600': 48,
      '800': 64,
      '1000': 80,
    },

    // Atlassian's border-radius scale.
    radii: {
      '050': 2,
      '100': 4,
      '200': 8,
      '300': 12,
      '400': 16,
      round: 9999,
    },

    fontSizes: {
      '050': 11,
      '075': 12,
      '100': 14,
      '200': 16,
      '300': 20,
      '400': 24,
      '500': 29,
      '600': 35,
    },

    fontWeights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
};
