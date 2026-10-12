export type ColorFormat = 'hex' | 'rgb' | 'hsl';

export interface HSVColor {
  /** 0..360 */ readonly h: number;
  /** 0..1 */ readonly s: number;
  /** 0..1 */ readonly v: number;
  /** 0..1 */ readonly a: number;
}

export const HEX_RE = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export const RGB_RE =
  /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;

export const HSL_RE =
  /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/i;

/**
 * Best-effort colour-string parser. Handles `#rgb`, `#rgba`, `#rrggbb`,
 * `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`, `hsla()`. Falls back to opaque
 * black on unparseable input rather than throwing - UI controls expect
 * a value at all times.
 */
export function parseColor(input: string): HSVColor {
  const s = input.trim();
  const hex = HEX_RE.exec(s);
  if (hex !== null) {
    const body = hex[1]!;
    let r: number, g: number, b: number, a: number;
    if (body.length === 3) {
      r = parseInt(body[0]! + body[0], 16);
      g = parseInt(body[1]! + body[1], 16);
      b = parseInt(body[2]! + body[2], 16);
      a = 1;
    } else if (body.length === 4) {
      r = parseInt(body[0]! + body[0], 16);
      g = parseInt(body[1]! + body[1], 16);
      b = parseInt(body[2]! + body[2], 16);
      a = parseInt(body[3]! + body[3], 16) / 255;
    } else if (body.length === 6) {
      r = parseInt(body.slice(0, 2), 16);
      g = parseInt(body.slice(2, 4), 16);
      b = parseInt(body.slice(4, 6), 16);
      a = 1;
    } else {
      r = parseInt(body.slice(0, 2), 16);
      g = parseInt(body.slice(2, 4), 16);
      b = parseInt(body.slice(4, 6), 16);
      a = parseInt(body.slice(6, 8), 16) / 255;
    }
    return rgbToHsv(r, g, b, a);
  }
  const rgb = RGB_RE.exec(s);
  if (rgb !== null) {
    // Clamp channels to 0-255 so out-of-gamut input (`rgb(300,0,0)`) doesn't
    // produce v>1 (thumb above the track, aria-valuenow>100, >255 round-trip).
    return rgbToHsv(
      clampChannel(Number(rgb[1])),
      clampChannel(Number(rgb[2])),
      clampChannel(Number(rgb[3])),
      rgb[4] !== undefined ? Number(rgb[4]) : 1,
    );
  }
  const hsl = HSL_RE.exec(s);
  if (hsl !== null) {
    // Wrap hue into 0-359 (`hsl(540,...)` → 180) and clamp s/l to 0-1.
    return hslToHsv(
      clampHue(Number(hsl[1])),
      clamp01(Number(hsl[2]) / 100),
      clamp01(Number(hsl[3]) / 100),
      hsl[4] !== undefined ? Number(hsl[4]) : 1,
    );
  }
  return { h: 0, s: 0, v: 0, a: 1 };
}

/** Format an HSV colour back to a CSS string in the requested format. */
export function formatColor(c: HSVColor, format: ColorFormat): string {
  if (format === 'hex') {
    const { r, g, b } = hsvToRgb(c.h, c.s, c.v);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  if (format === 'rgb') {
    const { r, g, b } = hsvToRgb(c.h, c.s, c.v);
    if (c.a < 1) return `rgba(${r}, ${g}, ${b}, ${round(c.a, 3)})`;
    return `rgb(${r}, ${g}, ${b})`;
  }
  // hsl
  const { h, s, l } = hsvToHsl(c.h, c.s, c.v);
  const sp = `${round(s * 100, 1)}%`;
  const lp = `${round(l * 100, 1)}%`;
  if (c.a < 1) return `hsla(${round(h, 1)}, ${sp}, ${lp}, ${round(c.a, 3)})`;
  return `hsl(${round(h, 1)}, ${sp}, ${lp})`;
}

export function rgbToHsv(r: number, g: number, b: number, a: number): HSVColor {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rf) h = ((gf - bf) / d) % 6;
    else if (max === gf) h = (bf - rf) / d + 2;
    else h = (rf - gf) / d + 4;
    h = h * 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max, a: clamp01(a) };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function hsvToHsl(h: number, s: number, v: number): { h: number; s: number; l: number } {
  const l = v * (1 - s / 2);
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return { h, s: sl, l };
}

export function hslToHsv(h: number, s: number, l: number, a: number): HSVColor {
  const v = l + s * Math.min(l, 1 - l);
  const sv = v === 0 ? 0 : 2 * (1 - l / v);
  return { h, s: sv, v, a: clamp01(a) };
}

export function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, '0');
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Clamp an 8-bit colour channel to 0-255 (NaN → 0). */
export function clampChannel(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(255, n));
}

export function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function clampHue(h: number): number {
  let n = h % 360;
  if (n < 0) n += 360;
  return n;
}
