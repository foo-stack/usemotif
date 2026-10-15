import { describe, expect, it } from 'vitest';
import { generatePalette, type PaletteScale } from './palette.js';

function luminance(color: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const s = parseInt(color.slice(i, i + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
const values = (s: PaletteScale): string[] => Object.values(s);

describe('generatePalette', () => {
  const COLOURS = [
    '#7c3aed',
    '#2563eb',
    '#16a34a',
    '#facc15',
    '#ef4444',
    '#0f172a',
    'oklch(0.7 0.2 30)',
  ];

  it('builds twelve hex steps with the input as step 9', () => {
    const p = generatePalette('#7c3aed');
    for (const s of [p.light, p.dark]) {
      expect(Object.keys(s)).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '11',
        '12',
      ]);
      for (const v of values(s)) expect(v).toMatch(/^#[0-9a-f]{6}$/);
      expect(s[9]).toBe('#7c3aed');
    }
  });

  it('runs light to dark in the light scale and dark to light in the dark one', () => {
    for (const c of COLOURS) {
      const { light, dark } = generatePalette(c);
      for (let i = 1; i < 8; i++) {
        expect(luminance(light[(i + 1) as 2])).toBeLessThan(luminance(light[i as 1]));
        expect(luminance(dark[(i + 1) as 2])).toBeGreaterThan(luminance(dark[i as 1]));
      }
    }
  });

  it('holds the text steps to WCAG contrast against step 2', () => {
    for (const c of COLOURS) {
      for (const s of values(generatePalette(c) as never) as unknown as PaletteScale[]) {
        expect(contrast(s[11], s[2]), c).toBeGreaterThanOrEqual(4.5);
        expect(contrast(s[12], s[2]), c).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('throws on a colour it cannot read', () => {
    expect(() => generatePalette('nope')).toThrow(/cannot read the colour nope/);
  });
});
