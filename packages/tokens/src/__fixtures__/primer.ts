import type { Theme } from '@usemotif/core';

/**
 * Primer (GitHub) - light theme expressed in motif tokens.
 *
 * Source: https://primer.style/foundations/primitives - public token set
 * as of 2025. Captures the core color palette, functional (semantic)
 * color roles, spacing, radii, and typography. The point isn't full
 * coverage of every Primer token, it's to prove the model can carry
 * Primer's mental shape: numbered scales (0-9 / palette steps) +
 * functional groups (`fg.*`, `canvas.*`, `border.*`, `accent.*`,
 * `success.*`, `danger.*`, etc.) that reference primitives by `$` ref.
 */
export const primerLightTheme: Theme = {
  name: 'primer-light',
  tokens: {
    colors: {
      // ─── Primitive palette (10-step, 0 lightest → 9 darkest) ──────
      gray: {
        0: '#f6f8fa',
        1: '#eaeef2',
        2: '#d0d7de',
        3: '#afb8c1',
        4: '#8c959f',
        5: '#6e7781',
        6: '#57606a',
        7: '#424a53',
        8: '#32383f',
        9: '#24292f',
      },
      blue: {
        0: '#ddf4ff',
        1: '#b6e3ff',
        2: '#80ccff',
        3: '#54aeff',
        4: '#218bff',
        5: '#0969da',
        6: '#0550ae',
        7: '#033d8b',
        8: '#0a3069',
        9: '#002155',
      },
      green: {
        0: '#dafbe1',
        1: '#aceebb',
        2: '#6fdd8b',
        3: '#4ac26b',
        4: '#2da44e',
        5: '#1a7f37',
        6: '#116329',
        7: '#044f1e',
        8: '#003d16',
        9: '#002d11',
      },
      yellow: {
        0: '#fff8c5',
        1: '#fae17d',
        2: '#eac54f',
        3: '#d4a72c',
        4: '#bf8700',
        5: '#9a6700',
        6: '#7d4e00',
        7: '#633c01',
        8: '#4d2d00',
        9: '#3b2300',
      },
      red: {
        0: '#ffebe9',
        1: '#ffcecb',
        2: '#ffaba8',
        3: '#ff8182',
        4: '#fa4549',
        5: '#cf222e',
        6: '#a40e26',
        7: '#82071e',
        8: '#660018',
        9: '#4c0014',
      },
      purple: {
        0: '#fbefff',
        1: '#ecd8ff',
        2: '#d8b9ff',
        3: '#c297ff',
        4: '#a475f9',
        5: '#8250df',
        6: '#6639ba',
        7: '#512a97',
        8: '#3e1f79',
        9: '#2e1461',
      },

      // ─── Functional / semantic ────────────────────────────────────
      // Each role references the primitive layer via `$colors.<scale>.<step>`.
      fg: {
        default: '$colors.gray.9',
        muted: '$colors.gray.6',
        subtle: '$colors.gray.5',
        onEmphasis: '$colors.gray.0',
      },
      canvas: {
        default: '#ffffff',
        subtle: '$colors.gray.0',
        inset: '$colors.gray.1',
        overlay: '#ffffff',
      },
      border: {
        default: '$colors.gray.2',
        muted: '$colors.gray.1',
        subtle: '$colors.gray.0',
      },
      accent: {
        fg: '$colors.blue.5',
        emphasis: '$colors.blue.5',
        muted: '$colors.blue.3',
        subtle: '$colors.blue.0',
      },
      success: {
        fg: '$colors.green.5',
        emphasis: '$colors.green.4',
        muted: '$colors.green.2',
        subtle: '$colors.green.0',
      },
      attention: {
        fg: '$colors.yellow.5',
        emphasis: '$colors.yellow.4',
        muted: '$colors.yellow.2',
        subtle: '$colors.yellow.0',
      },
      danger: {
        fg: '$colors.red.5',
        emphasis: '$colors.red.5',
        muted: '$colors.red.2',
        subtle: '$colors.red.0',
      },
    },

    // Primer's spacing is a 12-step scale of multiples of 4.
    space: {
      0: 0,
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      7: 28,
      8: 32,
      9: 36,
      10: 40,
      11: 48,
      12: 64,
    },

    // Primer's three-step radii.
    radii: {
      sm: 3,
      md: 6,
      lg: 12,
      full: 9999,
    },

    // Primer's "typeScale" - six display sizes plus body/small/subtitle.
    fontSizes: {
      0: 12,
      1: 14,
      2: 16,
      3: 20,
      4: 24,
      5: 32,
      6: 40,
      7: 48,
    },

    fontWeights: {
      normal: 400,
      semibold: 600,
      bold: 700,
    },
  },
};
