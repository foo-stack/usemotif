import { isTokenRef, resolveToken, type Theme } from '@usemotif/core';

/**
 * Point the browser's own chrome at `theme`: `color-scheme` on `<html>`, so
 * scrollbars and native form controls match, and `<meta name="theme-color">`
 * for the mobile address bar. Only the fields the theme sets are touched.
 * Returns the undo, which restores what was there before.
 */
export function syncBrowserChrome(theme: Theme): () => void {
  const root = document.documentElement;
  const prevScheme = root.style.colorScheme;
  if (theme.colorScheme !== undefined) root.style.colorScheme = theme.colorScheme;

  // A meta with `media` is the app's own light/dark pair; leave those alone.
  let meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  const prevColor = meta?.content;
  const color = themeColorOf(theme);
  const created = color !== undefined && meta === null;
  if (color !== undefined) {
    if (meta === null) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = color;
  }

  return () => {
    root.style.colorScheme = prevScheme;
    if (created) meta?.remove();
    else if (meta !== null && prevColor !== undefined) meta.content = prevColor;
  };
}

/** The theme's `themeColor` as a literal: a meta tag can't read a CSS variable. */
function themeColorOf(theme: Theme): string | undefined {
  const value = theme.themeColor;
  if (value === undefined || !isTokenRef(value)) return value;
  const resolved = resolveToken(value, theme, { defaultScale: 'colors' });
  return typeof resolved === 'string' ? resolved : undefined;
}
