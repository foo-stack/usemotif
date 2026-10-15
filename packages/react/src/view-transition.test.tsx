/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Box } from './Box.js';
import { Presence } from './Presence.js';
import { ThemeProvider } from './Theme.js';

let container: HTMLElement;
let root: Root;
let start: ReturnType<typeof vi.fn>;
let snapshots: string[];

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  snapshots = [];
  // The browser snapshots the page, then runs the update in a later task.
  start = vi.fn((update: () => void) => {
    snapshots.push(container.innerHTML);
    queueMicrotask(update);
    return {
      finished: Promise.resolve(),
      ready: Promise.resolve(),
      updateCallbackDone: Promise.resolve(),
    };
  });
  Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true });
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete (document as { startViewTransition?: unknown }).startViewTransition;
});

const themes = [
  { name: 'light', tokens: {} },
  { name: 'dark', tokens: {} },
];

describe('view transitions', () => {
  it('switches the theme inside a view transition, snapshotting the old one first', async () => {
    const render = (active: string): Promise<void> =>
      act(async () =>
        root.render(
          <ThemeProvider themes={themes} active={active} viewTransition>
            page
          </ThemeProvider>,
        ),
      );
    await render('light');
    await render('dark');
    expect(start).toHaveBeenCalledOnce();
    expect(snapshots[0]).toContain('data-theme="light"');
    expect(container.querySelector('[data-theme]')!.getAttribute('data-theme')).toBe('dark');
  });

  it('swaps keyed children at once, naming layoutId boxes and skipping enter styles', async () => {
    const render = (step: number): void =>
      act(() =>
        root.render(
          <Presence viewTransition>
            <Box
              key={step}
              id={`step-${step}`}
              enterStyle={{ opacity: 0 }}
              transition="opacity 200ms"
            >
              <Box layoutId="marker" />
            </Box>
          </Presence>,
        ),
      );
    await render(1);
    await render(2);
    expect(start).toHaveBeenCalledOnce();
    expect(snapshots[0]).toContain('id="step-1"');
    expect(container.querySelector('#step-1')).toBeNull();
    const next = container.querySelector<HTMLElement>('#step-2')!;
    expect(next.style.opacity).toBe('');
    expect(next.querySelector<HTMLElement>('div')!.style.viewTransitionName).toBe('motif-marker');
  });

  it('falls back to enter and exit styles without the API', () => {
    delete (document as { startViewTransition?: unknown }).startViewTransition;
    const render = (step: number): void =>
      act(() =>
        root.render(
          <Presence viewTransition>
            <Box
              key={step}
              id={`step-${step}`}
              exitStyle={{ opacity: 0 }}
              transition="opacity 200ms"
            />
          </Presence>,
        ),
      );
    render(1);
    render(2);
    expect(container.querySelector('#step-1')!.getAttribute('data-motif-state')).toBe('exiting');
  });
});
