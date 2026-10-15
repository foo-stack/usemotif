import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Icon, IconProvider } from './Icon.js';

describe('Icon (web)', () => {
  it('renders an <svg> with currentColor stroke and 1em sizing default token', () => {
    const html = renderToStaticMarkup(
      <Icon>
        <line x1="0" y1="0" x2="1" y2="1" />
      </Icon>,
    );
    expect(html).toMatch(/<svg/);
    expect(html).toContain('stroke="currentColor"');
  });

  it('decorative icons set aria-hidden=true', () => {
    const html = renderToStaticMarkup(
      <Icon>
        <circle cx="0" cy="0" r="1" />
      </Icon>,
    );
    expect(html).toMatch(/aria-hidden="true"/);
  });

  it('labelled icons get role=img and drop aria-hidden', () => {
    const html = renderToStaticMarkup(
      <Icon aria-label="Search">
        <circle cx="0" cy="0" r="1" />
      </Icon>,
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Search"');
    expect(html).not.toContain('aria-hidden');
  });

  it('size="md" maps to 20px', () => {
    const html = renderToStaticMarkup(
      <Icon size="md">
        <circle cx="0" cy="0" r="1" />
      </Icon>,
    );
    expect(html).toContain('width="20"');
    expect(html).toContain('height="20"');
  });

  it('renders content via the render prop, with web SVG primitives', () => {
    const html = renderToStaticMarkup(
      <Icon
        render={({ Line, Circle }) => (
          <>
            <Line x1="0" y1="0" x2="1" y2="1" />
            <Circle cx="0" cy="0" r="1" />
          </>
        )}
      />,
    );
    expect(html).toMatch(/<line/);
    expect(html).toMatch(/<circle/);
  });

  it('IconProvider sets the default size and stroke width, and an icon prop wins', () => {
    const html = renderToStaticMarkup(
      <IconProvider size="sm" strokeWidth={1.5}>
        <Icon />
        <Icon size={28} strokeWidth={3} />
      </IconProvider>,
    );
    const [first, second] = html.split('</svg>');
    expect(first).toContain('width="16"');
    expect(first).toContain('stroke-width="1.5"');
    expect(second).toContain('width="28"');
    expect(second).toContain('stroke-width="3"');
  });

  it('a nested IconProvider overrides only what it sets', () => {
    const html = renderToStaticMarkup(
      <IconProvider size="lg" strokeWidth={1}>
        <IconProvider size="xs">
          <Icon />
        </IconProvider>
      </IconProvider>,
    );
    expect(html).toContain('width="12"');
    expect(html).toContain('stroke-width="1"');
  });

  it('without a provider, the defaults are md and a stroke width of 2', () => {
    const html = renderToStaticMarkup(<Icon />);
    expect(html).toContain('width="20"');
    expect(html).toContain('stroke-width="2"');
  });
});
