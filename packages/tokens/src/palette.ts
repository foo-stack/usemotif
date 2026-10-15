import { parseColor } from '@usemotif/core';

/** A 12-step colour scale, keyed `1` to `12` like the preset's palettes. */
export type PaletteScale = Readonly<Record<PaletteStep, string>>;
export type PaletteStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** The light and dark scales {@link generatePalette} builds from one colour. */
export interface Palette {
  readonly light: PaletteScale;
  readonly dark: PaletteScale;
}

type Rgb = readonly [number, number, number];

// OKLCH lightness per step. 1-2 are backgrounds, 3-5 component backgrounds, 6-8 borders,
// 9 the colour itself, 10 its hover, 11-12 text. Steps 9 and 10 are set from the input instead.
const LIGHT_L = [0.993, 0.982, 0.956, 0.93, 0.902, 0.868, 0.82, 0.75, 0, 0, 0.52, 0.32];
const DARK_L = [0.17, 0.205, 0.255, 0.295, 0.335, 0.385, 0.45, 0.53, 0, 0, 0.8, 0.94];
// Share of the input's chroma each step keeps, before gamut mapping.
const CHROMA = [0.06, 0.12, 0.25, 0.36, 0.46, 0.56, 0.68, 0.84, 1, 1, 0.92, 0.5];
// WCAG contrast the text steps hold against step 2.
const TEXT_CONTRAST = { 11: 4.5, 12: 7 } as const;

function toLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function toOklch([r, g, b]: Rgb): [number, number, number] {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180) / Math.PI];
}

/** Linear sRGB for an OKLCH colour, unclamped so a caller can tell when it is out of gamut. */
function toLinearRgb(L: number, C: number, h: number): Rgb {
  const A = C * Math.cos((h * Math.PI) / 180);
  const B = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: Rgb): boolean => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/** The sRGB colour at this lightness and hue, with chroma reduced until it fits. */
function oklchToRgb(L: number, C: number, h: number): Rgb {
  let lo = 0;
  let hi = C;
  if (!inGamut(toLinearRgb(L, C, h))) {
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(toLinearRgb(L, mid, h))) lo = mid;
      else hi = mid;
    }
  } else lo = C;
  return toLinearRgb(L, lo, h).map((v) => {
    const c = Math.min(1, Math.max(0, v));
    return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
  }) as unknown as Rgb;
}

const hex = (rgb: Rgb): string => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map(toLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two sRGB colours. */
function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

function scale(input: Rgb, lightness: readonly number[], dark: boolean): PaletteScale {
  const [L9, C, h] = toOklch(input);
  const steps: Rgb[] = [];
  for (let i = 0; i < 12; i++) {
    let L = lightness[i]!;
    if (i === 8) L = L9;
    if (i === 9) L = dark ? L9 + 0.05 : L9 - 0.05;
    let rgb = i === 8 ? input : oklchToRgb(L, C * CHROMA[i]!, h);
    const target = TEXT_CONTRAST[(i + 1) as 11 | 12];
    // Text steps move away from the background until they reach their contrast.
    while (target !== undefined && contrast(rgb, steps[1]!) < target && L > 0 && L < 1) {
      L += dark ? 0.01 : -0.01;
      rgb = oklchToRgb(L, C * CHROMA[i]!, h);
    }
    steps.push(rgb);
  }
  return Object.fromEntries(steps.map((rgb, i) => [i + 1, hex(rgb)])) as unknown as PaletteScale;
}

/**
 * Build a 12-step light and dark scale from one brand colour, in OKLCH so each step looks evenly
 * spaced. Step 9 is the colour itself and step 10 its hover; 1 and 2 are backgrounds, 3 to 5
 * component backgrounds, 6 to 8 borders, and 11 and 12 text, held to 4.5:1 and 7:1 contrast
 * against step 2. Hue is kept throughout, and chroma is reduced where a step would leave sRGB.
 *
 * @example
 * ```ts
 * const brand = generatePalette('#7c3aed');
 * createTheme({ ...lightTheme, tokens: { ...lightTheme.tokens,
 *   colors: { ...lightTheme.tokens.colors, brand: brand.light } } });
 * // `$colors.brand.9` is #7c3aed, `$colors.brand.11` is accessible text on `$colors.brand.2`
 * ```
 */
export function generatePalette(color: string): Palette {
  const parsed = parseColor(color.trim());
  if (parsed === null) throw new Error(`generatePalette: cannot read the colour ${color}`);
  const input: Rgb = [parsed.r, parsed.g, parsed.b].map(Math.round) as unknown as Rgb;
  return { light: scale(input, LIGHT_L, false), dark: scale(input, DARK_L, true) };
}
