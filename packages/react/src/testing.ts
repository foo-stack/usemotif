import type { Theme } from '@usemotif/core';
import type { RendererOutput } from '@usemotif/test-utils';
import { createElement, type ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { SSRStyleCollector, _resetStyleCacheForTesting } from './style-cache.js';
import { ThemeProvider } from './Theme.js';

/**
 * Render any element, a consumer's own `styled()` component included, and
 * return the styles it resolved in the shape `toHaveStyle` and `toHaveStyleAt`
 * from `@usemotif/test-utils` read: the root element's visible style, plus its
 * `@media`, `@container` and pseudo-state rules.
 *
 * The element renders inside a `ThemeProvider` for `theme`, and token
 * variables are resolved back to that theme's values, so expectations read as
 * the tokens resolve (`padding: 16`, not `var(--space-4)`).
 *
 * @example
 * ```tsx
 * import { renderStyles } from '@usemotif/react/testing';
 * import { motifMatchers } from '@usemotif/test-utils';
 * expect.extend(motifMatchers);
 *
 * const out = renderStyles(<Button intent="primary">Save</Button>, theme);
 * expect(out).toHaveStyle({ paddingInline: 16 });
 * expect(out).toHaveStyleAt(':hover', { opacity: 0.92 });
 * ```
 */
export function renderStyles(element: ReactElement, theme: Theme): RendererOutput {
  // A class already injected by an earlier render would not be emitted again,
  // so start each render from an empty cache to collect every rule it needs.
  _resetStyleCacheForTesting();
  const collector = new SSRStyleCollector();
  const html = collector.collect(() =>
    renderToString(createElement(ThemeProvider, { themes: [theme], active: theme.name }, element)),
  );

  const { className, inlineStyle } = extractRoot(html);
  const { baseClassRule, mediaRules, containerRules, pseudoRules } = parseCollectedCss(
    collector.getCss(),
    className,
  );

  const normalisedInline = normaliseDecls(inlineStyle, theme);
  const normalisedBase = normaliseDecls(baseClassRule, theme);
  // The `style` slot mirrors what visually renders at the base
  // viewport: non-responsive props live inline, responsive `base`
  // values live in the bare class block (1.6). The cross-renderer
  // `expectStyle` describes the visible result, so we merge.
  // Inline wins over the class block on key collision (mirrors the
  // CSS specificity that does win at runtime when both populate
  // the same property).
  return {
    style: { ...normalisedBase, ...normalisedInline },
    baseClassRule: normalisedBase,
    mediaRules: normaliseRuleMap(mediaRules, theme),
    containerRules: normaliseRuleMap(containerRules, theme),
    pseudoRules: normaliseRuleMap(pseudoRules, theme),
  };
}

/**
 * Extract the rendered primitive's root element from the SSR HTML.
 * The structure is:
 * ```
 * <style data-motif-themes>...</style>
 * <div data-theme="...">
 *   <ROOT class="m-..." style="...">...</ROOT>
 * </div>
 * ```
 */
function extractRoot(html: string): {
  className: string | null;
  inlineStyle: Record<string, string>;
} {
  const themeDivIdx = html.search(/<div data-theme="[^"]*">/);
  if (themeDivIdx === -1) return { className: null, inlineStyle: {} };
  const after = html.slice(themeDivIdx);
  const rootMatch = after.match(/<div data-theme="[^"]*">\s*<([a-z]+)([^>]*)>/);
  if (rootMatch === null) return { className: null, inlineStyle: {} };
  const attrs = rootMatch[2] ?? '';

  const classMatch = attrs.match(/\bclass="([^"]+)"/);
  const className = classMatch?.[1]?.trim() ?? null;

  const styleMatch = attrs.match(/\bstyle="([^"]*)"/);
  const inlineStyle = styleMatch !== null ? parseInlineStyle(styleMatch[1] ?? '') : {};

  return { className, inlineStyle };
}

function parseInlineStyle(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of s.split(';')) {
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (prop.length === 0) continue;
    out[kebabToCamel(prop)] = value;
  }
  return out;
}

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

interface ParsedRules {
  baseClassRule: Record<string, string>;
  mediaRules: Record<string, Record<string, string>>;
  containerRules: Record<string, Record<string, string>>;
  pseudoRules: Record<string, Record<string, string>>;
}

/**
 * Parse the collector's CSS into four rule kinds. Only rules scoped to
 * the given `className` are included.
 *
 * The CSS shape produced by motif's style-cache is:
 * - `.m-xxx { decls }` (the 1.6 base class block - emitted for the
 *   `base` slot of any responsive prop with overrides)
 * - `@media (min-width: ...) { .m-xxx { decls } }`
 * - `@container [name] (min-width: ...) { .m-xxx { decls } }`
 * - `.m-xxx:hover { decls }` (pseudo)
 * - `.m-xxx:disabled, .m-xxx[aria-disabled="true"] { decls }` (composite)
 */
function parseCollectedCss(css: string, className: string | null): ParsedRules {
  const out: ParsedRules = {
    baseClassRule: {},
    mediaRules: {},
    containerRules: {},
    pseudoRules: {},
  };
  if (className === null) return out;
  const cls = className.split(/\s+/).find((c) => /^m-[a-z0-9]+$/.test(c));
  if (cls === undefined) return out;
  const escapedCls = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const atRuleRe = /(@(?:media|container)[^{]+?)\{\s*\.([a-z0-9-]+)\s*\{([^}]*)\}\s*\}/g;
  for (const m of css.matchAll(atRuleRe)) {
    const prefix = m[1]!.trim();
    const ruleClass = m[2]!;
    if (ruleClass !== cls) continue;
    const decls = parseDecls(m[3]!);
    if (prefix.startsWith('@media')) out.mediaRules[prefix] = decls;
    else out.containerRules[prefix] = decls;
  }

  // Strip @media / @container blocks before scanning for pseudo and
  // base-class rules - otherwise their inner `.m-xxx { ... }` would be
  // double-matched here as a phantom base block.
  const cssOutsideAtRules = css.replace(/@(?:media|container)[^{]+\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  const pseudoRe = new RegExp(`(\\.${escapedCls}[^,{}]*(?:,[^,{}]+)*)\\s*\\{([^}]*)\\}`, 'g');
  for (const m of cssOutsideAtRules.matchAll(pseudoRe)) {
    const selectorList = m[1]!;
    const firstSelector = selectorList.split(',')[0]!.trim();
    if (!firstSelector.startsWith(`.${cls}`)) continue;
    const pseudoKey = firstSelector.slice(`.${cls}`.length);
    // Empty pseudo key === bare `.m-xxx { ... }` - the 1.6 base class block.
    if (pseudoKey === '') {
      out.baseClassRule = parseDecls(m[2]!);
      continue;
    }
    out.pseudoRules[pseudoKey] = parseDecls(m[2]!);
  }

  return out;
}

function parseDecls(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of body.split(';')) {
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (prop.length === 0) continue;
    out[kebabToCamel(prop)] = value;
  }
  return out;
}

function normaliseDecls(
  decls: Record<string, string>,
  theme: Theme,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const k in decls) {
    out[k] = normaliseValue(decls[k]!, theme);
  }
  return out;
}

function normaliseRuleMap(
  rules: Record<string, Record<string, string>>,
  theme: Theme,
): Record<string, Record<string, string | number>> {
  const out: Record<string, Record<string, string | number>> = {};
  for (const k in rules) {
    out[k] = normaliseDecls(rules[k]!, theme);
  }
  return out;
}

/**
 * Resolve `var(--...)` refs back to literal token values via the theme,
 * then strip a trailing `px` so numeric values round-trip back to
 * numbers. The cross-renderer expectations use raw numbers; the web
 * renderer's CSS path emits `px`-suffixed values for length scales.
 */
function normaliseValue(value: string, theme: Theme): string | number {
  const resolved = value.replace(/var\(--([a-z0-9_-]+)\)/g, (_, name: string) => {
    const segments = name.split('-').map((s) => s.replace(/_/g, '.'));
    let node: unknown = theme.tokens;
    for (const seg of segments) {
      if (node !== null && typeof node === 'object' && seg in (node as Record<string, unknown>)) {
        node = (node as Record<string, unknown>)[seg];
      } else {
        return `var(--${name})`;
      }
    }
    return typeof node === 'number' ? `${node}px` : String(node);
  });
  const numMatch = /^(-?\d+(?:\.\d+)?)px$/.exec(resolved);
  if (numMatch !== null) return Number(numMatch[1]);
  if (/^-?\d+(?:\.\d+)?$/.test(resolved)) return Number(resolved);
  return resolved;
}
