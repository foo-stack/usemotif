/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { TitleBar } from './TitleBar.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('TitleBar', () => {
  // jsdom drops `-webkit-app-region` and `env()` values, so the Electron example's smoke test
  // checks the drag region and the overlay padding.
  it('marks the bar and title as Tauri drag regions, but not its slots', () => {
    render(
      <TitleBar
        data-testid="bar"
        title="Untitled"
        leading={<button>Menu</button>}
        trailing={<button>Close</button>}
      />,
    );
    const bar = container.querySelector<HTMLElement>('[data-testid="bar"]')!;
    expect(bar.hasAttribute('data-tauri-drag-region')).toBe(true);
    const title = [...bar.querySelectorAll('*')].find((el) => el.textContent === 'Untitled')!;
    expect(title.hasAttribute('data-tauri-drag-region')).toBe(true);

    for (const label of ['Menu', 'Close']) {
      const slot = [...bar.querySelectorAll('button')].find(
        (b) => b.textContent === label,
      )!.parentElement!;
      expect(slot.hasAttribute('data-tauri-drag-region')).toBe(false);
      expect(slot.parentElement).toBe(bar);
    }
    // The overlay insets are spacers at the ends, so padding on the bar adds to them.
    for (const spacer of [bar.firstElementChild!, bar.lastElementChild!]) {
      expect(spacer.getAttribute('aria-hidden')).toBe('true');
      expect(spacer.hasAttribute('data-tauri-drag-region')).toBe(true);
    }
  });

  it('takes children in place of the title, and merges a style', () => {
    render(
      <TitleBar data-testid="bar" style={{ color: 'red' }}>
        <span>Tabs</span>
      </TitleBar>,
    );
    const bar = container.querySelector<HTMLElement>('[data-testid="bar"]')!;
    expect(bar.textContent).toBe('Tabs');
    expect(bar.style.color).toBe('red');
  });
});
