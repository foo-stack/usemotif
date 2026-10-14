/** @vitest-environment jsdom */
/**
 * Native Calendar and DatePicker range tests, on the `react-native` jsdom
 * mock aliased in this package's vitest.config.ts. Day cells are Pressables
 * labelled with `Date.toDateString()`.
 */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Calendar, DatePicker, type CalendarDayInfo } from './datetime.native.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function press(date: Date): void {
  const cell = container.querySelector<HTMLElement>(
    `[accessibilityLabel="${date.toDateString()}"]`,
  );
  if (cell === null) throw new Error(`no day ${date.toDateString()}`);
  act(() => {
    cell.click();
  });
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

const june = (day: number): Date => new Date(2024, 5, day);

describe('Calendar range mode (native)', () => {
  it('starts, finishes and restarts a range, swapping an earlier second press', () => {
    const onValueChange = vi.fn();
    render(<Calendar mode="range" defaultViewMonth={june(1)} onValueChange={onValueChange} />);
    press(june(15));
    expect(onValueChange).toHaveBeenLastCalledWith({ start: june(15), end: null });
    press(june(12));
    expect(onValueChange).toHaveBeenLastCalledWith({ start: june(12), end: june(15) });
    press(june(20));
    expect(onValueChange).toHaveBeenLastCalledWith({ start: june(20), end: null });
  });

  it('marks the range days selected and flags the ends', () => {
    const seen = new Map<number, CalendarDayInfo>();
    render(
      <Calendar
        mode="range"
        value={{ start: june(10), end: june(12) }}
        renderDay={(info) => {
          if (info.date.getMonth() === 5) seen.set(info.date.getDate(), info);
          return null;
        }}
      />,
    );
    expect(seen.get(10)).toMatchObject({ isSelected: true, isRangeStart: true, isRangeEnd: false });
    expect(seen.get(11)).toMatchObject({ isSelected: true, isInRange: true, isRangeStart: false });
    expect(seen.get(12)).toMatchObject({ isSelected: true, isRangeEnd: true });
    expect(seen.get(13)).toMatchObject({ isSelected: false, isInRange: false });
  });

  it('reports no range flags in single mode', () => {
    const flags: boolean[] = [];
    render(
      <Calendar
        defaultValue={june(15)}
        renderDay={(info) => {
          flags.push(info.isRangeStart, info.isRangeEnd, info.isInRange);
          return null;
        }}
      />,
    );
    expect(flags.length).toBe(42 * 3);
    expect(flags.every((f) => !f)).toBe(true);
  });
});

describe('DatePicker range mode (native)', () => {
  it('stays open after the first press, closes after the second, and labels both', () => {
    const onOpenChange = vi.fn();
    const labels: string[] = [];
    render(
      <DatePicker
        mode="range"
        defaultOpen
        defaultViewMonth={june(1)}
        format={(d) => `${d.getMonth() + 1}/${d.getDate()}`}
        onOpenChange={onOpenChange}
        renderTrigger={({ value }) => {
          labels.push(
            value === undefined ? 'none' : `${value.start.getDate()}-${value.end?.getDate() ?? ''}`,
          );
          return <></>;
        }}
      />,
    );
    press(june(10));
    expect(onOpenChange).not.toHaveBeenCalled();
    press(june(14));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(labels.at(-1)).toBe('10-14');
  });

  it('labels the default trigger with the start, then both dates', () => {
    render(
      <DatePicker mode="range" defaultViewMonth={june(1)} format={(d) => `6/${d.getDate()}`} />,
    );
    const trigger = (): string | null =>
      container
        .querySelector('[accessibilityRole="button"][accessibilityState]')
        ?.getAttribute('accessibilityLabel') ?? null;
    expect(trigger()).toBe('Pick dates');
    press(june(10));
    expect(trigger()).toBe('6/10');
    press(june(14));
    expect(trigger()).toBe('6/10 - 6/14');
  });
});
