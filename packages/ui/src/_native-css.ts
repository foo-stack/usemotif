/**
 * Convert one of the kit's web CSS style objects into a React Native style:
 * `var(--token, fallback)` becomes the token's value from `resolve` (else the
 * fallback), `px` lengths become numbers, the `background`, `border` and
 * `padding` / `margin` shorthands become their React Native longhands, and
 * keys React Native has no use for are dropped.
 */
export function cssToNative(
  style: Record<string, unknown>,
  resolve: (path: string) => unknown,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(style)) {
    if (WEB_ONLY.has(key) || raw === undefined) continue;
    const value = typeof raw === 'string' ? resolveVars(raw, resolve) : raw;
    if (key === 'background') {
      out.backgroundColor = value;
    } else if (key === 'border' && typeof value === 'string') {
      const [width, lineStyle, ...color] = value.split(/\s+/);
      out.borderWidth = length(width ?? '0');
      if (lineStyle !== undefined) out.borderStyle = lineStyle;
      if (color.length > 0) out.borderColor = color.join(' ');
    } else if ((key === 'padding' || key === 'margin') && typeof value === 'string') {
      const parts = value.split(/\s+/).map(length);
      const [top, right = top, bottom = top, left = right] = parts;
      Object.assign(out, {
        [`${key}Top`]: top,
        [`${key}Right`]: right,
        [`${key}Bottom`]: bottom,
        [`${key}Left`]: left,
      });
    } else {
      out[key] = typeof value === 'string' ? length(value) : value;
    }
  }
  return out;
}

const WEB_ONLY = new Set([
  'cursor',
  'font',
  'transition',
  'appearance',
  'WebkitAppearance',
  'outline',
  'boxSizing',
  'userSelect',
  'touchAction',
  'accentColor',
]);

/** `var(--colors-border-default, #d1d5db)` -> the `colors.border.default` value, else `#d1d5db`. */
function resolveVars(value: string, resolve: (path: string) => unknown): string {
  return value.replace(
    /var\(--([a-zA-Z0-9_-]+)(?:,\s*([^)]+))?\)/g,
    (_, name: string, fallback?: string) => {
      const resolved = resolve(name.replace(/-/g, '.').replace(/_/g, '.'));
      if (typeof resolved === 'string' || typeof resolved === 'number') return String(resolved);
      return fallback?.trim() ?? '';
    },
  );
}

/** `12px` or `12` -> 12; anything else (`100%`, a colour) as written. */
function length(value: string): string | number {
  const px = /^(-?\d+(?:\.\d+)?)(?:px)?$/.exec(value.trim());
  return px === null ? value : Number(px[1]);
}
