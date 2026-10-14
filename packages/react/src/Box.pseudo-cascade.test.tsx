/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Box } from './Box.js';
import { _resetStyleCacheForTesting } from './style-cache.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

beforeEach(() => {
  _resetStyleCacheForTesting();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.head.querySelectorAll('style[data-motif-style-cache]').forEach((el) => el.remove());
});

function getEmittedCss(): string {
  return document.head.querySelector('style[data-motif-style-cache]')?.textContent ?? '';
}

describe('Box - pseudo-state override cascade (#39)', () => {
  it('lifts base props out of inline when a state pseudo bag overrides them', () => {
    render(
      <Box
        as="button"
        bg="#FFC80F"
        color="#271F30"
        boxShadow="0 6px 18px rgba(255,200,15,0.28)"
        _disabled={{
          bg: 'rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.3)',
          boxShadow: 'none',
        }}
      >
        Continue
      </Box>,
    );
    const el = container.firstElementChild as HTMLElement;
    // The three overridden props should NOT be in inline style - they
    // must live in the base class block so the pseudo rule can win.
    expect(el.style.backgroundColor).toBe('');
    expect(el.style.color).toBe('');
    expect(el.style.boxShadow).toBe('');

    const css = getEmittedCss();
    // Base values live in a bare class block now (0,1,0).
    const baseBlock = /\.m-\w+\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(baseBlock, css).toMatch(/background-color:\s*#FFC80F/i);
    expect(baseBlock, css).toMatch(/color:\s*#271F30/i);
    expect(baseBlock, css).toMatch(/box-shadow:\s*0 6px 18px/);

    // Override values land in the :disabled rule (0,1,1) - cascade wins.
    const disabledBlock = /:disabled[^{]*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(disabledBlock, css).toMatch(/background-color:\s*rgba\(255,\s*255,\s*255,\s*0\.06\)/);
    expect(disabledBlock, css).toMatch(/color:\s*rgba\(255,\s*255,\s*255,\s*0\.3\)/);
    expect(disabledBlock, css).toMatch(/box-shadow:\s*none/);
  });

  it('actually overrides at the browser-cascade level for a disabled button', () => {
    render(
      <Box
        as="button"
        aria-disabled="true"
        bg="#FFC80F"
        color="#271F30"
        boxShadow="0 6px 18px rgba(255,200,15,0.28)"
        _disabled={{
          bg: 'rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.3)',
          boxShadow: 'none',
        }}
      >
        Continue
      </Box>,
    );
    const el = container.firstElementChild as HTMLElement;
    const computed = window.getComputedStyle(el);
    // jsdom's computed cascade - pseudo class rule wins now that base
    // values aren't inline.
    expect(computed.backgroundColor).toBe('rgba(255, 255, 255, 0.06)');
    expect(computed.color).toBe('rgba(255, 255, 255, 0.3)');
    expect(computed.boxShadow).toBe('none');
  });

  it('leaves non-overridden base props in inline (no over-lifting)', () => {
    render(
      <Box as="button" bg="#FFC80F" color="#271F30" padding={16} _disabled={{ bg: '#aaa' }}>
        Continue
      </Box>,
    );
    const el = container.firstElementChild as HTMLElement;
    // bg is overridden by _disabled - lifted.
    expect(el.style.backgroundColor).toBe('');
    // color and padding are NOT overridden - stay inline (no cascade
    // fight in their case).
    expect(el.style.color).toBe('rgb(39, 31, 48)');
    expect(el.style.padding).toBe('16px');
  });

  it('does not lift base when only pseudo-element overrides are set', () => {
    render(
      <Box as="button" color="#271F30" _before={{ content: '"›"', color: 'red' }}>
        Continue
      </Box>,
    );
    const el = container.firstElementChild as HTMLElement;
    // ::before rule targets the pseudo-element, not the parent - no
    // cascade conflict, no need to lift the parent's `color`.
    expect(el.style.color).toBe('rgb(39, 31, 48)');
  });

  it('does not break when no pseudo bags are present', () => {
    render(
      <Box bg="#FFC80F" color="#271F30">
        plain
      </Box>,
    );
    const el = container.firstElementChild as HTMLElement;
    // Without any pseudo bag, base props remain inline - fast-path
    // unchanged.
    expect(el.style.backgroundColor).toBe('rgb(255, 200, 15)');
    expect(el.style.color).toBe('rgb(39, 31, 48)');
  });

  it('merges lifted props with the existing base class block (responsive overrides)', () => {
    render(
      <Box
        bg="#FFC80F"
        // `p` has a responsive override → existing baseClassStyle path
        // already lifts the base `p` value into a class block.
        p={{ base: 8, md: 16 }}
        _disabled={{ bg: '#aaa' }}
      >
        x
      </Box>,
    );
    const el = container.firstElementChild as HTMLElement;
    // Both lifts collapse into one class block - bg from the pseudo
    // lift, padding from the responsive lift. Inline holds neither.
    expect(el.style.backgroundColor).toBe('');
    expect(el.style.padding).toBe('');

    const css = getEmittedCss();
    // The bare class block (no atRule prefix) should contain both
    // background-color and padding.
    const baseBlock = /^\.m-\w+\s*\{([^}]*)\}/m.exec(css)?.[1] ?? '';
    expect(baseBlock, css).toMatch(/background-color:\s*#FFC80F/i);
    expect(baseBlock, css).toMatch(/padding:\s*8px/);
  });
});

describe('Box - responsive values inside state bags', () => {
  it('nests the breakpoint under the state selector', () => {
    render(<Box _hover={{ bg: { base: 'red', md: 'blue' }, opacity: [1, undefined, 0.5] }} />);
    const el = container.firstElementChild as HTMLElement;
    const cls = Array.from(el.classList).find((c) => c.startsWith('m-'))!;
    const css = getEmittedCss();
    expect(css).toContain(`.${cls}:hover { background-color: red; opacity: 1; }`);
    expect(css).toContain(
      `@media (min-width: 768px) { .${cls}:hover { background-color: blue; opacity: 0.5; } }`,
    );
  });
});

describe('Box - group states', () => {
  it('marks a group and styles a child by the group state', () => {
    render(
      <Box group>
        <Box _groupHover={{ color: 'red' }} _groupFocus={{ color: 'blue' }} />
      </Box>,
    );
    const parent = container.firstElementChild as HTMLElement;
    expect(parent.hasAttribute('data-motif-group')).toBe(true);
    expect(parent.hasAttribute('group')).toBe(false);
    const child = parent.firstElementChild as HTMLElement;
    const cls = Array.from(child.classList).find((c) => c.startsWith('m-'))!;
    const css = getEmittedCss();
    expect(css).toContain(`[data-motif-group]:hover .${cls} { color: red; }`);
    expect(css).toContain(`[data-motif-group]:focus-visible .${cls} { color: blue; }`);
  });

  it('renders no marker without group', () => {
    render(<Box group={false} />);
    expect((container.firstElementChild as HTMLElement).hasAttribute('data-motif-group')).toBe(
      false,
    );
  });
});
