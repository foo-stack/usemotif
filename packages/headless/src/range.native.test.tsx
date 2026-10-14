/** @vitest-environment jsdom */
/** Native slider marks and RangeSlider orientation on the `react-native` jsdom mock. */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RangeSlider, Slider } from './range.native.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function flatStyle(el: Element): Record<string, unknown> {
  const raw = el.getAttribute('data-motif-style');
  const parsed: unknown = raw === null ? null : JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return Object.assign({}, ...list.filter((x) => x !== null && typeof x === 'object'));
}

function marks(): Element[] {
  return Array.from(
    container.querySelectorAll('[importantForAccessibility="no-hide-descendants"]'),
  );
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.removeChild(container);
});

const MARKS = [{ value: 0, label: 'Low' }, { value: 25 }, { value: 100, label: 'High' }];

describe('native slider marks', () => {
  it('places Slider marks by percent with their labels', () => {
    render(<Slider defaultValue={25} marks={MARKS} />);
    expect(marks().map((m) => flatStyle(m).left)).toEqual(['0%', '25%', '100%']);
    expect(marks().map((m) => m.textContent)).toEqual(['Low', '', 'High']);
  });

  it('places vertical marks from the bottom', () => {
    render(<Slider orientation="vertical" marks={MARKS} />);
    expect(marks().map((m) => flatStyle(m).bottom)).toEqual(['0%', '25%', '100%']);
  });

  it('marks a RangeSlider and stacks its thumbs vertically', () => {
    render(<RangeSlider orientation="vertical" marks={MARKS} />);
    expect(marks().length).toBe(3);
    const root = container.firstElementChild!;
    expect(flatStyle(root).flexDirection).toBe('column-reverse');
  });
});
