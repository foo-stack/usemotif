'use client';

import {
  type MotifComponent,
  parseMarkdown,
  type PseudoRule,
  tokenRefToCssVar,
} from '@usemotif/core';
import { useMemo, type ReactElement } from 'react';
import { renderMarkdown } from './_markdown.js';
import { Box, type BoxProps } from './Box.js';
import { useActiveCollector } from './collector-context.js';
import { useCssLayer } from './css-layer-context.js';
import { injectPseudoRules } from './style-cache.js';

export interface ProseProps extends BoxProps {
  /**
   * Markdown to render instead of `children`: headings, paragraphs, lists, quotes, code, rules,
   * tables, emphasis, links and images. HTML in it stays text, and links with a scheme other
   * than http, https, mailto or tel are dropped.
   */
  markdown?: string;
}

/** A `$components.prose.*` token, then the semantic one, then a literal. */
const token = (chain: string): string => tokenRefToCssVar(chain as `$${string}`)!;

// Built on first render, so an app that never renders Prose does not keep any of this.
function buildRules(): readonly PseudoRule[] {
  const text = token('$components.prose.color ?? $colors.text.default ?? inherit');
  const muted = token('$components.prose.muted ?? $colors.text.muted ?? inherit');
  const link = token('$components.prose.link ?? $colors.action.primary.bg ?? inherit');
  const border = token('$components.prose.border ?? $colors.border.default ?? currentColor');
  const codeBg = token('$components.prose.codeBg ?? $colors.surface.muted ?? transparent');
  const preBg = token('$components.prose.preBg ?? $colors.surface.sunken ?? transparent');
  const mono = token('$fontFamilies.mono ?? monospace');
  const radius = token('$radii.md ?? 6px');

  const all = (tags: string): string =>
    tags
      .split(' ')
      .map((tag) => `:where(&) ${tag}`)
      .join(', ');

  // `:where()` keeps every rule at the specificity of its element selector, so an app's own CSS
  // for `h2` or `.my-prose a` wins without `!important`, and the rules sit in the theme's layer.
  return [
    { pseudo: ':where(&)', style: { color: text, lineHeight: 1.7 } },
    {
      pseudo: all('p ul ol blockquote pre table figure dl'),
      style: { marginTop: '1.25em', marginBottom: '1.25em' },
    },
    {
      pseudo: all('h1 h2 h3 h4 h5 h6'),
      style: {
        color: text,
        fontWeight: 700,
        lineHeight: 1.25,
        marginTop: '1.8em',
        marginBottom: '0.6em',
      },
    },
    { pseudo: all('h1'), style: { fontSize: '2.25em', marginTop: 0 } },
    { pseudo: all('h2'), style: { fontSize: '1.5em' } },
    { pseudo: all('h3'), style: { fontSize: '1.25em' } },
    {
      pseudo: all('a'),
      style: { color: link, textDecoration: 'underline', textUnderlineOffset: '0.2em' },
    },
    { pseudo: all('strong b'), style: { fontWeight: 600 } },
    {
      pseudo: all('code kbd samp'),
      style: {
        fontFamily: mono,
        fontSize: '0.875em',
        backgroundColor: codeBg,
        borderRadius: '0.25em',
        padding: '0.15em 0.35em',
      },
    },
    {
      pseudo: all('pre'),
      style: {
        backgroundColor: preBg,
        borderRadius: radius,
        padding: '1em 1.25em',
        overflowX: 'auto',
      },
    },
    {
      pseudo: ':where(&) pre code',
      style: { backgroundColor: 'transparent', padding: 0, fontSize: '0.875em' },
    },
    {
      pseudo: all('blockquote'),
      style: {
        borderInlineStart: `3px solid ${border}`,
        paddingInlineStart: '1em',
        color: muted,
        marginInline: 0,
      },
    },
    { pseudo: all('ul ol'), style: { paddingInlineStart: '1.5em' } },
    { pseudo: all('li'), style: { marginTop: '0.35em', marginBottom: '0.35em' } },
    { pseudo: all('li::marker'), style: { color: muted } },
    {
      pseudo: all('hr'),
      style: { border: 0, borderTop: `1px solid ${border}`, marginTop: '2em', marginBottom: '2em' },
    },
    { pseudo: all('img video'), style: { maxWidth: '100%', height: 'auto', borderRadius: radius } },
    {
      pseudo: all('table'),
      style: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' },
    },
    {
      pseudo: all('th td'),
      style: { borderBottom: `1px solid ${border}`, padding: '0.5em 0.75em', textAlign: 'start' },
    },
    { pseudo: all('th'), style: { fontWeight: 600 } },
    { pseudo: ':where(&) > :first-child', style: { marginTop: 0 } },
    { pseudo: ':where(&) > :last-child', style: { marginBottom: 0 } },
  ];
}
let rules: readonly PseudoRule[] | undefined;

/**
 * Prose - styles content you do not control element by element: rendered Markdown, CMS HTML,
 * MDX. Headings, paragraphs, lists, links, code, quotes, tables and images take the theme's
 * tokens. On React Native, `Prose` renders its `markdown` with motif primitives instead.
 *
 * Every rule is wrapped in `:where()`, so it carries only its element's specificity and sits in
 * `<ThemeProvider cssLayer>`'s layer when one is set; an app overrides any of it with plain CSS.
 * The colours read `$components.prose.*` first (`color`, `muted`, `link`, `border`, `codeBg`,
 * `preBg`), then the semantic tokens.
 *
 * `markdown` renders a Markdown string with no HTML parsing at all. Raw HTML goes in through
 * `dangerouslySetInnerHTML` instead, and must be sanitized first.
 *
 * @example
 * ```tsx
 * <Prose maxWidth="65ch">
 *   <ReactMarkdown>{post.body}</ReactMarkdown>
 * </Prose>
 * <Prose dangerouslySetInnerHTML={{ __html: sanitize(cmsHtml) }} />
 * ```
 */
export const Prose: MotifComponent<ProseProps, ReactElement | null> = function ({
  className,
  markdown,
  children,
  ...rest
}: ProseProps): ReactElement {
  const rendered = useMemo(
    () => (markdown === undefined ? undefined : renderMarkdown(parseMarkdown(markdown))),
    [markdown],
  );
  rules ??= buildRules();
  const prose = injectPseudoRules(rules, useActiveCollector(), useCssLayer())!;
  return (
    <Box className={className === undefined ? prose : `${prose} ${className}`} {...rest}>
      {rendered ?? children}
    </Box>
  );
};
