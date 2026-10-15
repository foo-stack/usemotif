/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { IconProvider } from '@usemotif/react/svg';
import {
  ActivitySquare,
  Check,
  Discord,
  Facebook,
  Github,
  Heart,
  Instagram,
  Linkedin,
  Slack,
  SquareActivity,
  Star,
  Twitter,
  X,
  Youtube,
} from './index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const GLYPHS_DIR = resolve(HERE, 'glyphs');

describe('@usemotif/icons - generator output', () => {
  it('the barrel contains a substantial number of glyphs', () => {
    // Count exported names, not files: a lucide alias re-exports its target's file.
    const indexSrc = readFileSync(resolve(HERE, 'index.ts'), 'utf8');
    expect(indexSrc.match(/^export \{ /gm)?.length).toBeGreaterThanOrEqual(1900);
  });

  it('a lucide alias is its target glyph, not a copy of it', () => {
    expect(ActivitySquare).toBe(SquareActivity);
  });

  it('each generated glyph is small (per-icon import-cost proxy)', () => {
    const files = readdirSync(GLYPHS_DIR).filter((f) => f.endsWith('.tsx'));
    let max = 0;
    let maxName = '';
    for (const f of files) {
      const size = statSync(resolve(GLYPHS_DIR, f)).size;
      if (size > max) {
        max = size;
        maxName = f;
      }
    }
    // Each glyph file is a thin wrapper (Icon + render-prop body).
    // Largest are the brand-mark / multi-path icons; cap at 4 KB raw
    // source per file (well under the 2 KB *gzipped* per-icon target
    // for consumer bundles after tree-shaking).
    expect(max, `${maxName} is ${max} bytes`).toBeLessThan(4096);
  });

  it('backward-compat: the existing motif glyph names all resolve', () => {
    // Sample of pre-T2.4 motif glyphs that must continue to work.
    expect(typeof Check).toBe('function');
    expect(typeof X).toBe('function');
    expect(typeof Heart).toBe('function');
    expect(typeof Star).toBe('function');
    // Github moved out of lucide; preserved as a hand-rolled extra.
    expect(typeof Github).toBe('function');
  });

  it('lucide brand marks (extras) all resolve as functions', () => {
    // Lucide v1 dropped its brand pack; the most-requested marks are
    // carried as hand-rolled `_extras/` entries so consumers don't
    // see a breaking name removal between motif majors.
    expect(typeof Twitter).toBe('function');
    expect(typeof Linkedin).toBe('function');
    expect(typeof Facebook).toBe('function');
    expect(typeof Youtube).toBe('function');
    expect(typeof Instagram).toBe('function');
    expect(typeof Slack).toBe('function');
    expect(typeof Discord).toBe('function');
  });
});

describe('@usemotif/icons - render', () => {
  it('Check renders an SVG with the lucide check path', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(<Check />);
    });
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const path = svg?.querySelector('path');
    expect(path?.getAttribute('d')).toBe('M20 6 9 17l-5-5');
    act(() => {
      root.unmount();
    });
  });

  it('Heart renders with the heart path data', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(<Heart />);
    });
    const path = container.querySelector('path');
    expect(path?.getAttribute('d')).toContain('M2 9.5a5.5 5.5 0 0 1');
    act(() => {
      root.unmount();
    });
  });

  it('size + color props pass through to the SVG', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(<Check size="lg" color="red" />);
    });
    const svg = container.querySelector('svg');
    // Motif's Icon maps size="lg" → 24px.
    expect(svg?.getAttribute('width')).toBe('24');
    expect(svg?.getAttribute('height')).toBe('24');
    act(() => {
      root.unmount();
    });
  });

  it('Github extra renders correctly (backward-compat path)', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
      root.render(<Github />);
    });
    const path = container.querySelector('path');
    expect(path?.getAttribute('d')).toContain('M9 19c-5');
    act(() => {
      root.unmount();
    });
  });
});

describe('@usemotif/icons - barrel index integrity', () => {
  it('every glyph file has a matching export in src/index.ts', () => {
    const files = readdirSync(GLYPHS_DIR).filter((f) => f.endsWith('.tsx'));
    const indexSrc = readFileSync(resolve(HERE, 'index.ts'), 'utf8');
    const missing: string[] = [];
    for (const f of files) {
      const name = f.slice(0, -'.tsx'.length);
      if (!indexSrc.includes(`export { ${name} }`)) {
        missing.push(name);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('@usemotif/icons - IconProvider', () => {
  it('a glyph takes its size and stroke width from the nearest provider', () => {
    const html = renderToStaticMarkup(
      <IconProvider size="lg" strokeWidth={1.25}>
        <Heart />
      </IconProvider>,
    );
    expect(html).toContain('width="24"');
    expect(html).toContain('stroke-width="1.25"');
  });
});
