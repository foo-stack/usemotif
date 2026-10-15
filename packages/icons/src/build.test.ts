import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { componentName, svgToGlyph } from './build.js';
import { main } from './cli.js';

const STROKE = `<?xml version="1.0"?>
<!-- an outline icon -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
  <title>Bell</title>
  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
  <circle cx="12" cy="20" r="1.5" />
</svg>`;

describe('svgToGlyph', () => {
  it('turns shapes into primitives, keeping the viewBox and the root presentation attributes', () => {
    const result = svgToGlyph('bell-ring.svg', STROKE);
    expect(result).toMatchObject({ name: 'BellRing' });
    const { source } = result as { source: string };
    expect(source).toContain("import { Icon, type IconProps } from '@usemotif/react/svg';");
    expect(source).toContain('viewBox="0 0 24 24"');
    expect(source).toContain('render={({ Circle, G, Path }) =>');
    expect(source).toContain(
      '<G fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><Circle cx={12} cy={20} r={1.5} /></G>',
    );
    expect(source).not.toContain('Bell</');
  });

  it('strips comments that removing another comment would join together', () => {
    const result = svgToGlyph(
      'x.svg',
      '<svg viewBox="0 0 24 24"><!<!---->--><path d="M0 0" /></svg>',
    );
    expect((result as { source: string }).source).toContain('<Path d="M0 0" />');
  });

  it('names components from file names', () => {
    expect(componentName('arrow-up-right.svg')).toBe('ArrowUpRight');
    expect(componentName('2fa.svg')).toBe('Icon2fa');
  });

  it('rejects what the native primitives cannot draw, saying why', () => {
    const reject = (inner: string, attrs = ''): string =>
      (svgToGlyph('x.svg', `<svg viewBox="0 0 24 24"${attrs}>${inner}</svg>`) as { error: string })
        .error;
    expect(reject('<text x="0">A</text>')).toMatch(
      /<text>: text has no cross-platform SVG primitive/,
    );
    expect(reject('<use href="#a" />')).toMatch(/references to other shapes/);
    expect(
      reject('<defs><linearGradient id="g" /></defs><path fill="url(#g)" d="M0 0" />'),
    ).toMatch(/<defs>: definitions .* have no cross-platform SVG primitive/);
    expect(reject('<path fill="url(#g)" d="M0 0" />')).toMatch(
      /fill refers to a definition .*plain colour/,
    );
    expect(reject('<g clip-path="url(#c)" />')).toBe('clip-path refers to a definition (url(#c))');
    expect(reject('<path class="a" d="M0 0" />')).toMatch(/class attribute/);
    expect(reject('<path style="fill:red" d="M0 0" />')).toMatch(/style attribute/);
    expect(reject('')).toBe('the <svg> has nothing to draw');
    expect((svgToGlyph('x.svg', '<div />') as { error: string }).error).toBe(
      'no <svg> element found',
    );
  });
});

describe('usemotif-icons build', () => {
  it('writes a component per icon and an index, skipping and reporting the rest', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'motif-icons-'));
    const svgs = join(dir, 'svgs');
    mkdirSync(svgs);
    writeFileSync(join(svgs, 'bell.svg'), STROKE);
    writeFileSync(join(svgs, 'label.svg'), '<svg viewBox="0 0 24 24"><text>A</text></svg>');
    // Inside the package, so the generated module resolves `@usemotif/react/svg` as an app's would.
    const out = join(import.meta.dirname, '__icons_test_out__');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(await main(['build', svgs, '--out', out])).toBe(1);
      expect(readdirSync(out).sort()).toEqual(['Bell.tsx', 'index.ts']);
      expect(readFileSync(join(out, 'index.ts'), 'utf8')).toBe(
        "export { Bell } from './Bell.js';\n",
      );
      expect(String(error.mock.calls[0]![0])).toContain('skipped label.svg: <text>');

      const { Bell } = (await import(join(out, 'Bell.tsx'))) as {
        Bell: (p: { size: number }) => React.ReactElement;
      };
      const html = renderToStaticMarkup(createElement(Bell, { size: 24 }));
      expect(html).toMatch(/^<svg[^>]*viewBox="0 0 24 24"/);
      expect(html).toContain(
        '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">',
      );
      expect(html).toContain('<circle cx="12" cy="20" r="1.5"></circle>');
    } finally {
      rmSync(out, { recursive: true, force: true });
      log.mockRestore();
      error.mockRestore();
    }
  });
});
