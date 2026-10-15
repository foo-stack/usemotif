/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Box } from './Box.js';
import { MotifDevtools } from './devtools.js';
import { activeBreakpoint, themeChain, variableToPath } from './_devtools-inspect.js';
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
});

describe('devtools helpers', () => {
  it('reads the theme chain outermost first', () => {
    container.innerHTML =
      '<div data-theme="brand"><div data-theme="dark"><span id="t"></span></div></div>';
    expect(themeChain(container.querySelector('#t')!)).toEqual(['brand', 'dark']);
  });

  it('names the widest breakpoint reached', () => {
    const bps = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };
    expect(activeBreakpoint(500, bps)).toBe('base');
    expect(activeBreakpoint(800, bps)).toBe('md');
    expect(activeBreakpoint(1600, bps)).toBe('2xl');
  });

  it('maps a token variable back to its path', () => {
    expect(variableToPath('--colors-surface-base')).toBe('$colors.surface.base');
    expect(variableToPath('--fontSizes-2xl')).toBe('$fontSizes.2xl');
  });
});

describe('MotifDevtools', () => {
  it('inspects the element clicked while inspecting, without running its own click', () => {
    let clicked = 0;
    render(
      <div data-theme="light">
        <Box
          id="target"
          bg="$colors.surface.base"
          p={{ base: '$2', md: '$4' }}
          onClick={() => clicked++}
        >
          x
        </Box>
        <MotifDevtools />
      </div>,
    );
    const toggle = container.querySelector<HTMLButtonElement>('[data-motif-devtools] button')!;
    act(() => toggle.click());
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    const target = container.querySelector<HTMLElement>('#target')!;
    act(() => target.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(clicked).toBe(0);

    const panel = container.querySelector('[role="dialog"]')!.textContent!;
    expect(panel).toContain('<div#target>');
    expect(panel).toContain('Themes: light');
    expect(panel).toContain('$colors.surface.base');
    expect(panel).toMatch(/\.m-\w+: runtime/);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('toggles with Alt+Shift+M and stops on Escape', () => {
    render(<MotifDevtools />);
    const toggle = container.querySelector<HTMLButtonElement>('[data-motif-devtools] button')!;
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { altKey: true, shiftKey: true, code: 'KeyM' }),
      );
    });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });
});
