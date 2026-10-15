/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { Box } from './Box.js';
import { Stack, staggerSteps } from './Stack.js';

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
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

describe('staggerSteps', () => {
  it('counts each child from the chosen origin', () => {
    const steps = (from?: 'first' | 'last' | 'center' | number): number[] =>
      [0, 1, 2, 3, 4].map((i) => staggerSteps(i, 5, from));
    expect(steps()).toEqual([0, 1, 2, 3, 4]);
    expect(steps('last')).toEqual([4, 3, 2, 1, 0]);
    expect(steps('center')).toEqual([2, 1, 0, 1, 2]);
    expect(steps(1)).toEqual([1, 0, 1, 2, 3]);
    // An even count has no middle child: the two central ones go together.
    expect([0, 1, 2, 3].map((i) => staggerSteps(i, 4, 'center'))).toEqual([1.5, 0.5, 0.5, 1.5]);
  });
});

describe('Stack - stagger', () => {
  it('starts the wave from staggerFrom', () => {
    render(
      <Stack stagger={0.05} staggerFrom="last" transition="opacity 200ms ease">
        <Box enterStyle={{ opacity: 0 }} data-testid="row-0">
          a
        </Box>
        <Box enterStyle={{ opacity: 0 }} data-testid="row-1">
          b
        </Box>
        <Box enterStyle={{ opacity: 0 }} data-testid="row-2">
          c
        </Box>
      </Stack>,
    );
    const delay = (i: number): string =>
      (container.querySelector(`[data-testid="row-${i}"]`) as HTMLElement).style.transitionDelay;
    expect(delay(0)).toBe('0.1s');
    expect(delay(1)).toBe('0.05s');
    expect(delay(2)).toBe('');
  });

  it('applies no transitionDelay when stagger is omitted', () => {
    render(
      <Stack transition="opacity 200ms ease">
        <Box enterStyle={{ opacity: 0 }} data-testid="row-0">
          a
        </Box>
        <Box enterStyle={{ opacity: 0 }} data-testid="row-1">
          b
        </Box>
      </Stack>,
    );
    const row0 = container.querySelector('[data-testid="row-0"]') as HTMLElement;
    const row1 = container.querySelector('[data-testid="row-1"]') as HTMLElement;
    expect(row0.style.transitionDelay).toBe('');
    expect(row1.style.transitionDelay).toBe('');
  });

  it('applies per-child transitionDelay when stagger is set', () => {
    render(
      <Stack stagger={0.05} transition="opacity 200ms ease">
        <Box enterStyle={{ opacity: 0 }} data-testid="row-0">
          a
        </Box>
        <Box enterStyle={{ opacity: 0 }} data-testid="row-1">
          b
        </Box>
        <Box enterStyle={{ opacity: 0 }} data-testid="row-2">
          c
        </Box>
      </Stack>,
    );
    const row0 = container.querySelector('[data-testid="row-0"]') as HTMLElement;
    const row1 = container.querySelector('[data-testid="row-1"]') as HTMLElement;
    const row2 = container.querySelector('[data-testid="row-2"]') as HTMLElement;
    // Index 0 gets no delay (0 * 0.05 = 0s).
    expect(row0.style.transitionDelay).toBe('');
    // Indices 1 and 2 get cumulative delays.
    expect(row1.style.transitionDelay).toBe('0.05s');
    expect(row2.style.transitionDelay).toBe('0.1s');
  });

  it('stagger=0 leaves children untouched', () => {
    render(
      <Stack stagger={0}>
        <Box enterStyle={{ opacity: 0 }} data-testid="row-0">
          a
        </Box>
        <Box enterStyle={{ opacity: 0 }} data-testid="row-1">
          b
        </Box>
      </Stack>,
    );
    const row1 = container.querySelector('[data-testid="row-1"]') as HTMLElement;
    expect(row1.style.transitionDelay).toBe('');
  });

  it('does not affect children without enterStyle', () => {
    // Children without enterStyle don't go through BoxWithEnter, so
    // no transitionDelay should land on them even under a stagger
    // provider.
    render(
      <Stack stagger={0.05}>
        <Box data-testid="row-0">a</Box>
        <Box data-testid="row-1">b</Box>
      </Stack>,
    );
    const row1 = container.querySelector('[data-testid="row-1"]') as HTMLElement;
    expect(row1.style.transitionDelay).toBe('');
  });
});
