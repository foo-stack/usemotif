/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { Hide, Show } from './overlay.js';

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("keeps unmatched Show content mounted but hidden under keepMounted='activity'", () => {
  // jsdom's viewport is 1024px wide, below the 2xl breakpoint.
  act(() =>
    root.render(
      <>
        <Show above="2xl" keepMounted="activity">
          <p id="wide">wide</p>
        </Show>
        <Show above="2xl">
          <p id="dropped">dropped</p>
        </Show>
        <Hide above="2xl" keepMounted="activity">
          <p id="narrow">narrow</p>
        </Hide>
      </>,
    ),
  );
  expect(container.querySelector<HTMLElement>('#wide')!.style.display).toBe('none');
  expect(container.querySelector('#dropped')).toBeNull();
  expect(container.querySelector<HTMLElement>('#narrow')!.style.display).toBe('');
});
