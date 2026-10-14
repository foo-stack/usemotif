import { describe, expect, it } from 'vitest';
import { nextRange, rangeFlags } from './_date-math.js';

const d = (day: number, hour = 0): Date => new Date(2026, 0, day, hour);

describe('nextRange', () => {
  it('starts a range, then finishes it', () => {
    const started = nextRange(undefined, d(10));
    expect(started).toEqual({ start: d(10), end: null });
    expect(nextRange(started, d(14))).toEqual({ start: d(10), end: d(14) });
  });

  it('swaps an earlier second pick into the start', () => {
    expect(nextRange({ start: d(10), end: null }, d(3))).toEqual({ start: d(3), end: d(10) });
  });

  it('makes a one-day range when the start is picked again', () => {
    expect(nextRange({ start: d(10), end: null }, d(10, 15))).toEqual({
      start: d(10),
      end: d(10, 15),
    });
  });

  it('starts over after a finished range', () => {
    expect(nextRange({ start: d(3), end: d(10) }, d(20))).toEqual({ start: d(20), end: null });
  });
});

describe('rangeFlags', () => {
  const range = { start: d(10, 9), end: d(14, 18) };

  it('flags the ends and every day between, ignoring time of day', () => {
    expect(rangeFlags(range, d(10))).toEqual({
      isRangeStart: true,
      isRangeEnd: false,
      isInRange: true,
    });
    expect(rangeFlags(range, d(12))).toEqual({
      isRangeStart: false,
      isRangeEnd: false,
      isInRange: true,
    });
    expect(rangeFlags(range, d(14))).toEqual({
      isRangeStart: false,
      isRangeEnd: true,
      isInRange: true,
    });
    expect(rangeFlags(range, d(15)).isInRange).toBe(false);
    expect(rangeFlags(range, d(9)).isInRange).toBe(false);
  });

  it('flags only the start of an unfinished range, and nothing without one', () => {
    expect(rangeFlags({ start: d(10), end: null }, d(10))).toEqual({
      isRangeStart: true,
      isRangeEnd: false,
      isInRange: true,
    });
    expect(rangeFlags({ start: d(10), end: null }, d(11)).isInRange).toBe(false);
    expect(rangeFlags(undefined, d(10)).isInRange).toBe(false);
  });
});
