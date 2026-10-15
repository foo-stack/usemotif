import { describe, expect, it } from 'vitest';
import { designTokensToTheme } from '../../../../packages/migrate/src/design-tokens.js';
import {
  DEFAULT_INPUT,
  buildThemes,
  contrast,
  contrastChecks,
  resolveToken,
  shade,
  themeModule,
  toDesignTokens,
} from './theme-logic.js';

describe('theme builder logic', () => {
  it('computes WCAG contrast', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(contrast('red', '#fff')).toBeNull();
  });

  it('builds both themes on the presets, with the chosen colours resolvable', () => {
    const { light, dark } = buildThemes(DEFAULT_INPUT);
    expect(light.name).toBe('brand-light');
    expect(resolveToken(light.tokens, '$colors.action.primary.bg')).toBe('#2563eb');
    expect(resolveToken(dark.tokens, '$colors.surface.base')).toBe('#030712');
    expect(resolveToken(light.tokens, '$radii.md')).toBe(8);
    // Untouched preset tokens still resolve through their references.
    expect(resolveToken(light.tokens, '$colors.status.danger.fg')).toMatch(/^#/);
    expect(resolveToken(light.tokens, '$colors.action.primary.hover')).toBe(
      shade('#2563eb', -0.12),
    );
  });

  it('flags a pair below AA', () => {
    const { light } = buildThemes({
      ...DEFAULT_INPUT,
      light: { ...DEFAULT_INPUT.light, muted: '#bbbbbb' },
    });
    const checks = contrastChecks(light);
    expect(checks.map((c) => c.passes)).toEqual([true, false, true]);
    expect(checks[1]!.ratio).toBeLessThan(4.5);
  });

  it('prints a theme module with both themes', () => {
    const source = themeModule({ ...DEFAULT_INPUT, name: 'acme-co' });
    expect(source).toContain(
      "export const acmeCoLight = extendTheme(lightTheme, {\n  name: 'acme-co-light',",
    );
    expect(source).toContain("bg: '#2563eb'");
    expect(source).toContain('md: 8');
  });

  it('exports W3C tokens that the importer reads back into the same values', () => {
    const { light } = buildThemes(DEFAULT_INPUT);
    const doc = toDesignTokens(light.tokens);
    expect(doc.colors).toMatchObject({ $type: 'color' });
    const back = designTokensToTheme(doc);
    expect(resolveToken(back.tokens as never, '$colors.action.primary.bg')).toBe('#2563eb');
    expect(resolveToken(back.tokens as never, '$colors.text.default')).toBe(
      resolveToken(light.tokens, '$colors.text.default'),
    );
    expect(resolveToken(back.tokens as never, '$radii.md')).toBe(8);
  });
});
