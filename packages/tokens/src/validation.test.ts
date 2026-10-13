import { describe, expect, it } from 'vitest';
import { resolveValue } from '@usemotif/core';
import { primerLightTheme } from './__fixtures__/primer.js';
import { atlassianLightTheme } from './__fixtures__/atlassian.js';
import { m3LightTheme } from './__fixtures__/m3.js';

/**
 * Validation: prove motif's two-layer token model can carry the three
 * canonical real-world design systems. Each suite below resolves a
 * representative subset of tokens through the live resolver.
 *
 * **Pass criterion:** every distinctive shape from the source system
 * resolves to the expected literal value via motif's `resolveValue`.
 * The fixtures live in `__fixtures__/{primer,atlassian,m3}.ts`.
 */

describe('Token model - Primer (GitHub) light', () => {
  const t = primerLightTheme;

  it('resolves bare primitive refs ($gray.5 with default scale `colors`)', () => {
    expect(resolveValue('$gray.5', t, { defaultScale: 'colors' })).toBe('#6e7781');
    expect(resolveValue('$blue.5', t, { defaultScale: 'colors' })).toBe('#0969da');
  });

  it('resolves explicit-scale primitive refs', () => {
    expect(resolveValue('$colors.gray.0', t)).toBe('#f6f8fa');
    expect(resolveValue('$colors.red.5', t)).toBe('#cf222e');
  });

  it('chains semantic refs through to a primitive literal', () => {
    // fg.default → $colors.gray.9 → '#24292f'
    expect(resolveValue('$colors.fg.default', t)).toBe('#24292f');
    expect(resolveValue('$colors.fg.muted', t)).toBe('#57606a');
    expect(resolveValue('$colors.fg.onEmphasis', t)).toBe('#f6f8fa');
  });

  it('handles nested semantic groups (canvas, border, accent, success, danger)', () => {
    expect(resolveValue('$colors.canvas.default', t)).toBe('#ffffff');
    expect(resolveValue('$colors.canvas.subtle', t)).toBe('#f6f8fa'); // → gray.0
    expect(resolveValue('$colors.border.default', t)).toBe('#d0d7de'); // → gray.2
    expect(resolveValue('$colors.accent.fg', t)).toBe('#0969da'); // → blue.5
    expect(resolveValue('$colors.success.emphasis', t)).toBe('#2da44e'); // → green.4
    expect(resolveValue('$colors.danger.subtle', t)).toBe('#ffebe9'); // → red.0
  });

  it('resolves the spacing scale (multiples of 4)', () => {
    expect(resolveValue('$1', t, { defaultScale: 'space' })).toBe(4);
    expect(resolveValue('$4', t, { defaultScale: 'space' })).toBe(16);
    expect(resolveValue('$12', t, { defaultScale: 'space' })).toBe(64);
  });

  it('resolves typography (fontSizes / fontWeights)', () => {
    expect(resolveValue('$2', t, { defaultScale: 'fontSizes' })).toBe(16);
    expect(resolveValue('$semibold', t, { defaultScale: 'fontWeights' })).toBe(600);
  });
});

describe('Token model - Atlassian Design System light', () => {
  const t = atlassianLightTheme;

  it('resolves NNN-step palette refs', () => {
    expect(resolveValue('$colors.blue.500', t)).toBe('#388bff');
    expect(resolveValue('$colors.neutral.1000', t)).toBe('#172b4d');
    expect(resolveValue('$colors.green.700', t)).toBe('#1f845a');
  });

  it('resolves text.* semantic refs through to a primitive', () => {
    expect(resolveValue('$colors.text.default', t)).toBe('#172b4d'); // → neutral.1000
    expect(resolveValue('$colors.text.subtle', t)).toBe('#44546f'); // → neutral.800
    expect(resolveValue('$colors.text.brand', t)).toBe('#0c66e4'); // → blue.700
    expect(resolveValue('$colors.text.disabled', t)).toBe('#b3b9c4'); // → neutral.400
  });

  it('resolves deeply-nested background.brand.bold (two-level semantic)', () => {
    expect(resolveValue('$colors.background.brand.bold', t)).toBe('#0c66e4'); // → blue.700
    expect(resolveValue('$colors.background.brand.subtle', t)).toBe('#e9f2ff'); // → blue.100
    expect(resolveValue('$colors.background.danger.bold', t)).toBe('#c9372c'); // → red.700
    expect(resolveValue('$colors.background.success.subtle', t)).toBe('#dcfff1'); // → green.100
  });

  it('handles `space.NNN` keys (with leading zeros)', () => {
    expect(resolveValue('$colors.background.input', t)).toBe('#ffffff'); // → neutral.0
    expect(resolveValue('$space.050', t)).toBe(4);
    expect(resolveValue('$space.100', t)).toBe(8);
    expect(resolveValue('$space.1000', t)).toBe(80);
  });

  it('resolves border.* roles', () => {
    expect(resolveValue('$colors.border.default', t)).toBe('#dcdfe4');
    expect(resolveValue('$colors.border.brand', t)).toBe('#0c66e4');
  });
});

describe('Token model - Material Design 3 light', () => {
  const t = m3LightTheme;

  it('resolves tonal-palette refs (tone 0-100 lightness ramp)', () => {
    expect(resolveValue('$colors.primary.40', t)).toBe('#6750a4');
    expect(resolveValue('$colors.primary.100', t)).toBe('#ffffff');
    expect(resolveValue('$colors.primary.0', t)).toBe('#000000');
    expect(resolveValue('$colors.primary.95', t)).toBe('#f6edff');
    expect(resolveValue('$colors.neutral.99', t)).toBe('#fffbfe');
  });

  it('resolves color roles for all four key groups (primary / secondary / tertiary / error)', () => {
    expect(resolveValue('$colors.role.primary', t)).toBe('#6750a4'); // → primary.40
    expect(resolveValue('$colors.role.onPrimary', t)).toBe('#ffffff'); // → primary.100
    expect(resolveValue('$colors.role.primaryContainer', t)).toBe('#eaddff'); // → primary.90
    expect(resolveValue('$colors.role.onPrimaryContainer', t)).toBe('#21005d'); // → primary.10

    expect(resolveValue('$colors.role.secondary', t)).toBe('#625b71');
    expect(resolveValue('$colors.role.tertiary', t)).toBe('#7d5260');
    expect(resolveValue('$colors.role.error', t)).toBe('#b3261e');
  });

  it('resolves surface / outline roles to neutral and neutralVariant tones', () => {
    expect(resolveValue('$colors.role.surface', t)).toBe('#fffbfe'); // → neutral.99
    expect(resolveValue('$colors.role.onSurface', t)).toBe('#1c1b1f'); // → neutral.10
    expect(resolveValue('$colors.role.surfaceVariant', t)).toBe('#e7e0ec'); // → neutralVariant.90
    expect(resolveValue('$colors.role.outline', t)).toBe('#79747e'); // → neutralVariant.50
  });

  it('resolves all four typography scales for the same slot name', () => {
    // The compound-token contract: a component reads
    // `$fontSizes.titleMedium` AND `$lineHeights.titleMedium` AND
    // `$fontWeights.titleMedium` AND `$letterSpacings.titleMedium`,
    // each giving the M3-specified value for that slot.
    expect(resolveValue('$fontSizes.titleMedium', t)).toBe(16);
    expect(resolveValue('$lineHeights.titleMedium', t)).toBe(24);
    expect(resolveValue('$fontWeights.titleMedium', t)).toBe(500);
    expect(resolveValue('$letterSpacings.titleMedium', t)).toBe('0.15px');

    // Spot-check display + body + label slots.
    expect(resolveValue('$fontSizes.displayLarge', t)).toBe(57);
    expect(resolveValue('$lineHeights.displayLarge', t)).toBe(64);
    expect(resolveValue('$letterSpacings.displayLarge', t)).toBe('-0.25px');

    expect(resolveValue('$fontSizes.bodyMedium', t)).toBe(14);
    expect(resolveValue('$letterSpacings.bodyMedium', t)).toBe('0.25px');

    expect(resolveValue('$fontSizes.labelSmall', t)).toBe(11);
    expect(resolveValue('$fontWeights.labelSmall', t)).toBe(500);
  });

  it('resolves M3 shape scale (named radii)', () => {
    expect(resolveValue('$radii.none', t)).toBe(0);
    expect(resolveValue('$radii.extraSmall', t)).toBe(4);
    expect(resolveValue('$radii.medium', t)).toBe(12);
    expect(resolveValue('$radii.extraLarge', t)).toBe(28);
  });
});

describe('Token model - cross-system properties', () => {
  it('all three themes carry a non-empty colors scale', () => {
    for (const t of [primerLightTheme, atlassianLightTheme, m3LightTheme]) {
      expect(t.tokens.colors).toBeDefined();
      expect(Object.keys(t.tokens.colors!).length).toBeGreaterThan(3);
    }
  });

  it('all three themes have a usable spacing scale', () => {
    for (const t of [primerLightTheme, atlassianLightTheme, m3LightTheme]) {
      expect(t.tokens.space).toBeDefined();
      expect(Object.keys(t.tokens.space!).length).toBeGreaterThan(3);
    }
  });

  it('all three themes have radii', () => {
    for (const t of [primerLightTheme, atlassianLightTheme, m3LightTheme]) {
      expect(t.tokens.radii).toBeDefined();
      expect(Object.keys(t.tokens.radii!).length).toBeGreaterThan(0);
    }
  });

  it('semantic refs in any theme resolve to literals - no leftover `$` strings', () => {
    const checks: ReadonlyArray<readonly [string, ReturnType<typeof resolveValue>, string]> = [
      ['primer fg.default', resolveValue('$colors.fg.default', primerLightTheme), 'primer'],
      ['primer canvas.subtle', resolveValue('$colors.canvas.subtle', primerLightTheme), 'primer'],
      [
        'atlassian text.brand',
        resolveValue('$colors.text.brand', atlassianLightTheme),
        'atlassian',
      ],
      [
        'atlassian background.brand.bold',
        resolveValue('$colors.background.brand.bold', atlassianLightTheme),
        'atlassian',
      ],
      ['m3 role.primary', resolveValue('$colors.role.primary', m3LightTheme), 'm3'],
      [
        'm3 role.onPrimaryContainer',
        resolveValue('$colors.role.onPrimaryContainer', m3LightTheme),
        'm3',
      ],
    ];
    for (const [label, resolved] of checks) {
      expect(resolved, label).toBeDefined();
      // No leftover `$` ref means the chain completed.
      expect(typeof resolved === 'string' && resolved.startsWith('$'), label).toBe(false);
    }
  });
});
