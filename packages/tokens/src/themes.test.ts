import { describe, expect, it } from 'vitest';
import { resolveAnimationToken, resolveValue, type Theme } from '@usemotif/core';
import { darkTheme, highContrastDarkTheme, highContrastLightTheme, lightTheme } from './themes.js';

/**
 * The default themes must carry every scale the core style props
 * resolve against - otherwise a `$`-ref like `borderWidth="$borderWidths.thin"`
 * has nothing to resolve to on the shipped token set.
 */
describe('default themes - borderWidths + letterSpacings scales', () => {
  for (const theme of [lightTheme, darkTheme]) {
    describe(theme.name, () => {
      it('carries a borderWidths scale', () => {
        expect(theme.tokens.borderWidths).toBeDefined();
        expect(resolveValue('$borderWidths.none', theme)).toBe(0);
        expect(resolveValue('$borderWidths.hairline', theme)).toBe(0.5);
        expect(resolveValue('$borderWidths.thin', theme)).toBe(1);
        expect(resolveValue('$borderWidths.thick', theme)).toBe(2);
      });

      it('carries a letterSpacings scale', () => {
        expect(theme.tokens.letterSpacings).toBeDefined();
        expect(resolveValue('$letterSpacings.tighter', theme)).toBe(-0.8);
        expect(resolveValue('$letterSpacings.normal', theme)).toBe(0);
        expect(resolveValue('$letterSpacings.wide', theme)).toBe(0.4);
      });

      it('resolves bare refs against the scale as a default', () => {
        expect(resolveValue('$thin', theme, { defaultScale: 'borderWidths' })).toBe(1);
        expect(resolveValue('$wide', theme, { defaultScale: 'letterSpacings' })).toBe(0.4);
      });

      // Regression: the prebuilt themes shipped without the motion scales,
      // so the `animation` prop and `$durations`/`$easings` refs silently
      // no-opped on the default themes.
      it('carries durations + easings scales', () => {
        expect(theme.tokens.durations).toBeDefined();
        expect(theme.tokens.easings).toBeDefined();
        expect(resolveValue('$durations.2', theme)).toBe('150ms');
        expect(resolveValue('$easings.standard', theme)).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
      });

      it('carries the animations preset scale and resolves a preset', () => {
        expect(theme.tokens.animations).toBeDefined();
        const normal = resolveAnimationToken('normal', theme);
        expect(normal).toBeDefined();
        expect(normal).toMatchObject({ duration: '$durations.3', easing: '$easings.standard' });
        expect(resolveAnimationToken('snappy', theme)).toMatchObject({ type: 'spring' });
      });
    });
  }
});

/**
 * `action.neutral` exists so `intent="neutral"` can invert between themes.
 * Wiring it to a primitive `gray` step is what made it the one intent that
 * could not: a ramp resolves to the same literal everywhere, so a neutral
 * control kept a light fill and near-black ink on a dark canvas.
 */
describe('default themes - action.neutral', () => {
  for (const theme of [lightTheme, darkTheme]) {
    describe(theme.name, () => {
      it('defines the same roles as the other intents', () => {
        for (const role of ['bg', 'fg', 'hover'] as const) {
          expect(resolveValue(`$colors.action.neutral.${role}`, theme)).toMatch(/^#[0-9a-f]{6}$/i);
        }
      });
    });
  }

  it('resolves to different literals per theme, unlike the gray ramp it replaced', () => {
    for (const role of ['bg', 'fg', 'hover'] as const) {
      const ref = `$colors.action.neutral.${role}`;
      expect(resolveValue(ref, lightTheme)).not.toBe(resolveValue(ref, darkTheme));
    }
    // The ramp the intent used to read is theme-independent - the defect.
    expect(resolveValue('$colors.gray.200', lightTheme)).toBe(
      resolveValue('$colors.gray.200', darkTheme),
    );
  });

  it('keeps the fill readable against the theme it belongs to', () => {
    // Light: a pale fill with dark ink. Dark: a dark fill with pale ink.
    expect(resolveValue('$colors.action.neutral.bg', lightTheme)).toBe('#e4e4e7');
    expect(resolveValue('$colors.action.neutral.fg', lightTheme)).toBe('#18181b');
    expect(resolveValue('$colors.action.neutral.bg', darkTheme)).toBe('#27272a');
    expect(resolveValue('$colors.action.neutral.fg', darkTheme)).toBe('#fafafa');
  });
});

/** WCAG 2 relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const channel = (i: number): number => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(theme: Theme, a: string, b: string): number {
  const la = luminance(String(resolveValue(`$colors.${a}`, theme)));
  const lb = luminance(String(resolveValue(`$colors.${b}`, theme)));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Every pair a high-contrast theme promises, with the ratio it must reach. */
function contrastPairs(): [string, string, number][] {
  const pairs: [string, string, number][] = [];
  const surfaces = ['base', 'muted', 'raised', 'sunken', 'interactive'];
  for (const text of ['default', 'muted', 'subtle']) {
    for (const surface of surfaces) pairs.push([`text.${text}`, `surface.${surface}`, 7]);
  }
  pairs.push(['text.inverse', 'surface.inverse', 7]);
  for (const action of ['primary', 'danger', 'success', 'neutral']) {
    pairs.push([`action.${action}.fg`, `action.${action}.bg`, 7]);
    pairs.push([`action.${action}.fg`, `action.${action}.hover`, 7]);
  }
  for (const status of ['neutral', 'info', 'success', 'warning', 'danger']) {
    pairs.push([`status.${status}.fg`, `status.${status}.tint`, 7]);
    pairs.push([`status.${status}.border`, `status.${status}.tint`, 3]);
  }
  for (const border of ['default', 'muted', 'strong']) {
    for (const surface of surfaces.slice(0, 4))
      pairs.push([`border.${border}`, `surface.${surface}`, 3]);
  }
  return pairs;
}

describe('high-contrast themes', () => {
  for (const theme of [highContrastLightTheme, highContrastDarkTheme]) {
    describe(theme.name, () => {
      for (const [fg, bg, min] of contrastPairs()) {
        it(`${fg} on ${bg} reaches ${min}:1`, () => {
          expect(contrast(theme, fg, bg)).toBeGreaterThanOrEqual(min);
        });
      }
    });
  }

  it('the check fails a low-contrast pair', () => {
    // The default light theme's subtle text is gray.500 on white: about 4.8:1.
    expect(contrast(lightTheme, 'text.subtle', 'surface.base')).toBeLessThan(7);
  });
});

describe('default themes - browser chrome', () => {
  it('declare their colour scheme, and a theme colour that resolves to the page background', () => {
    expect(
      [lightTheme, darkTheme, highContrastLightTheme, highContrastDarkTheme].map(
        (t) => t.colorScheme,
      ),
    ).toEqual(['light', 'dark', 'light', 'dark']);
    for (const theme of [lightTheme, darkTheme, highContrastLightTheme, highContrastDarkTheme]) {
      expect(theme.themeColor).toBe('$colors.surface.base');
      expect(resolveValue(theme.themeColor, theme)).toMatch(/^#[0-9a-f]{3,8}$/i);
    }
  });
});
