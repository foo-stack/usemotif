import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, type ReactElement } from 'react';
import { defaultTestTheme } from '@usemotif/test-utils';
import { describe, expect, it } from 'vitest';
import { Prose } from './Prose.js';
import { ThemeProvider } from './Theme.js';
import { SSRStyleCollector } from './style-cache.js';

function render(node: ReactElement, cssLayer?: string): { html: string; css: string } {
  const collector = new SSRStyleCollector();
  const html = collector.collect(() =>
    renderToStaticMarkup(
      createElement(
        ThemeProvider,
        { themes: [defaultTestTheme], active: defaultTestTheme.name, cssLayer },
        node,
      ),
    ),
  );
  return { html, css: collector.getStyleTag() };
}

describe('Prose (web)', () => {
  it('styles descendants through one class, at element specificity', () => {
    const { html, css } = render(
      <Prose maxWidth="65ch">
        <h2>Title</h2>
        <p>
          A <a href="/x">link</a>
        </p>
      </Prose>,
    );
    const cls = html.match(/class="(m-[a-z0-9]+)"/)![1]!;
    expect(html).toContain('<h2>Title</h2>');
    expect(html).toContain('max-width:65ch');
    expect(css).toContain(`:where(.${cls}) h2`);
    expect(css).toContain(`:where(.${cls}) pre code { background-color: transparent;`);
    expect(css).toContain(`:where(.${cls}) pre { background-color: var(--components-prose-preBg`);
    expect(css).toContain(
      `:where(.${cls}) a { color: var(--components-prose-link, var(--colors-action-primary-bg, inherit));`,
    );
  });

  it('renders sanitized HTML passed through dangerouslySetInnerHTML, inside the theme layer', () => {
    const { html, css } = render(
      <Prose className="post" dangerouslySetInnerHTML={{ __html: '<ul><li>one</li></ul>' }} />,
      'motif',
    );
    expect(html).toMatch(/class="m-[a-z0-9]+ post"><ul><li>one<\/li><\/ul><\/div>/);
    expect(css).toMatch(/@layer motif \{[^]*:where\(\.m-[a-z0-9]+\) li::marker/);
  });
});

describe('Prose markdown (web)', () => {
  it('renders Markdown as plain elements, never as raw HTML', () => {
    const { html } = render(
      <Prose
        markdown={
          '# Hi\n\nSome **bold** and a [link](https://a.dev).\n\n- one\n- two\n\n| a | b |\n|---|--:|\n| 1 | 2 |\n\n<script>x</script> [bad](javascript:alert(1))'
        }
      />,
    );
    expect(html).toContain('<h1>Hi</h1>');
    expect(html).toContain(
      '<p>Some <strong>bold</strong> and a <a href="https://a.dev">link</a>.</p>',
    );
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
    expect(html).toContain('<th style="text-align:right">b</th>');
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).not.toContain('javascript:');
  });
});
