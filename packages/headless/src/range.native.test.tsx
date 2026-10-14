/** @vitest-environment jsdom */
/** Native slider marks and RangeSlider drag on the `react-native` jsdom mock. */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ReactNativeModule from '@usemotif/react-native';
import { RangeSlider, Slider } from './range.native.js';

type DragHandler = (info: { offset: { x: number; y: number } }) => void;
interface DragOptions {
  axis?: string;
  onDragStart?: DragHandler;
  onDrag?: DragHandler;
}
// The options each `useDrag` call got on the latest render, in call order, so
// a gesture can be replayed without a real responder pipeline.
let drags: DragOptions[] = [];
vi.mock('@usemotif/react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactNativeModule>();
  return {
    ...actual,
    useDrag: (options: DragOptions) => {
      drags.push(options);
      return actual.useDrag(options as Parameters<typeof actual.useDrag>[0]);
    },
  };
});

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  drags = [];
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

  it('marks a RangeSlider and places its thumbs from the bottom when vertical', () => {
    render(<RangeSlider orientation="vertical" defaultValue={[20, 60]} marks={MARKS} />);
    expect(marks().length).toBe(3);
    expect(thumbs().map((t) => flatStyle(t).bottom)).toEqual(['20%', '60%']);
  });
});

function thumbs(): Element[] {
  return Array.from(container.querySelectorAll('[accessibilityRole="adjustable"]'));
}

function now(): number[] {
  return thumbs().map((t) => {
    const props = reactProps(t) as { accessibilityValue: { now: number } };
    return props.accessibilityValue.now;
  });
}

function reactProps(el: Element): Record<string, unknown> {
  const key = Object.keys(el).find((k) => k.startsWith('__reactProps'))!;
  return (el as unknown as Record<string, Record<string, unknown>>)[key]!;
}

/** Lays the track out at 200 x 200 and drags thumb `idx` by `x`, `y`. */
function drag(idx: number, x: number, y = 0): void {
  act(() => {
    // The mock View keeps `onLayout` to itself; read it off the View's fiber.
    const el = container.firstElementChild! as unknown as Record<string, unknown>;
    const fiber = el[Object.keys(el).find((k) => k.startsWith('__reactFiber'))!] as {
      return: { memoizedProps: { onLayout: (e: unknown) => void } };
    };
    const { onLayout } = fiber.return.memoizedProps;
    onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 200 } } });
  });
  // Two `useDrag` calls per render: the latest pair is the live one.
  const live = drags.slice(-2)[idx]!;
  act(() => live.onDragStart?.({ offset: { x: 0, y: 0 } }));
  act(() => live.onDrag?.({ offset: { x, y } }));
}

describe('native RangeSlider drag', () => {
  it('renders the fill and both thumbs by percent', () => {
    render(<RangeSlider defaultValue={[20, 60]} />);
    expect(thumbs().map((t) => flatStyle(t).left)).toEqual(['20%', '60%']);
    const fill = container.firstElementChild!.firstElementChild!;
    expect(flatStyle(fill)).toMatchObject({ left: '20%', width: '40%' });
  });

  it('drags each thumb on its own along the track', () => {
    render(<RangeSlider defaultValue={[20, 60]} />);
    drag(0, 20); // 20px of 200 is 10 units
    expect(now()).toEqual([30, 60]);
    drag(1, 40);
    expect(now()).toEqual([30, 80]);
  });

  it('stops a thumb at its neighbour instead of swapping them', () => {
    render(<RangeSlider defaultValue={[20, 60]} />);
    drag(0, 180);
    expect(now()).toEqual([60, 60]);
    drag(1, -400);
    expect(now()).toEqual([60, 60]);
  });

  it('drags vertically with low values at the bottom', () => {
    render(<RangeSlider orientation="vertical" defaultValue={[20, 60]} />);
    expect(drags.slice(-2).map((d) => d.axis)).toEqual(['y', 'y']);
    drag(1, 0, -40); // up 40px of 200 is +20
    expect(now()).toEqual([20, 80]);
  });

  it('keeps the increment and decrement actions, clamped the same way', () => {
    render(<RangeSlider defaultValue={[50, 50]} step={5} />);
    const action = (idx: number, actionName: string): void =>
      act(() => {
        const fire = reactProps(thumbs()[idx]!).onAccessibilityAction as (e: unknown) => void;
        fire({ nativeEvent: { actionName } });
      });
    action(0, 'increment');
    expect(now()).toEqual([50, 50]);
    action(0, 'decrement');
    action(1, 'increment');
    expect(now()).toEqual([45, 55]);
  });

  it('ignores drags while disabled', () => {
    render(<RangeSlider defaultValue={[20, 60]} disabled />);
    drag(0, 40);
    expect(now()).toEqual([20, 60]);
  });
});
