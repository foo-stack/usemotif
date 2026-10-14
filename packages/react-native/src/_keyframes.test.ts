import { createTheme } from '@usemotif/core';
import { describe, expect, it } from 'vitest';
import {
  compileKeyframes,
  keyframeProgress,
  sampleKeyframes,
  type KeyframeTiming,
} from './_keyframes.js';

const linear = (t: number): number => t;

describe('compileKeyframes', () => {
  it('parses from, to, percentages and comma lists, sorted, merging shared offsets', () => {
    const stops = compileKeyframes(
      {
        to: { opacity: 1 },
        '0%, 50%': { opacity: 0 },
        '50%': { width: 10 },
        bogus: { opacity: 0.3 },
        '120%': { opacity: 0.3 },
        from: { height: 4 },
      },
      undefined,
    );
    expect(stops).toEqual([
      { offset: 0, style: { opacity: 0, height: 4 } },
      { offset: 0.5, style: { opacity: 0, width: 10 } },
      { offset: 1, style: { opacity: 1 } },
    ]);
  });

  it('converts transform strings and px lengths to native values', () => {
    const [stop] = compileKeyframes(
      { from: { transform: 'rotate(45deg) translateX(10px)', width: '12px' } },
      undefined,
    );
    expect(stop!.style).toEqual({
      transform: [{ rotate: '45deg' }, { translateX: 10 }],
      width: 12,
    });
  });

  it('resolves token refs against the theme and drops them without one', () => {
    const theme = createTheme({ name: 't', tokens: { colors: { brand: '#ff0000' } } });
    const frames = { from: { backgroundColor: '$colors.brand', opacity: 0 } };
    expect(compileKeyframes(frames, theme)[0]!.style).toEqual({
      backgroundColor: '#ff0000',
      opacity: 0,
    });
    expect(compileKeyframes(frames, undefined)[0]!.style).toEqual({ opacity: 0 });
  });
});

describe('sampleKeyframes', () => {
  const stops = compileKeyframes(
    {
      from: { opacity: 0, backgroundColor: '#000000', transform: 'rotate(0deg)' },
      '50%': { opacity: 1 },
      to: { opacity: 0.5, backgroundColor: '#ffffff', transform: 'rotate(360deg)' },
    },
    undefined,
  );

  it('interpolates numbers between the stops that define them', () => {
    expect(sampleKeyframes(stops, 0, linear).opacity).toBe(0);
    expect(sampleKeyframes(stops, 0.25, linear).opacity).toBe(0.5);
    expect(sampleKeyframes(stops, 0.5, linear).opacity).toBe(1);
    expect(sampleKeyframes(stops, 0.75, linear).opacity).toBe(0.75);
    expect(sampleKeyframes(stops, 1, linear).opacity).toBe(0.5);
  });

  it('interpolates colours and transform axes across the full range', () => {
    const mid = sampleKeyframes(stops, 0.5, linear);
    expect(mid.transform).toEqual([{ rotate: '180deg' }]);
    expect(mid.backgroundColor).toBe('rgba(128, 128, 128, 1)');
    expect(sampleKeyframes(stops, 0, linear).backgroundColor).toBe('rgba(0, 0, 0, 1)');
  });

  it('applies easing per segment, not across the whole iteration', () => {
    const half = (t: number): number => (t < 1 ? 0 : 1);
    expect(sampleKeyframes(stops, 0.25, half).opacity).toBe(0);
    expect(sampleKeyframes(stops, 0.5, half).opacity).toBe(1);
    expect(sampleKeyframes(stops, 0.75, half).opacity).toBe(1);
  });

  it('interpolates same-unit lengths and flips discrete values halfway', () => {
    const s = compileKeyframes(
      { from: { width: '10%', display: 'flex' }, to: { width: '30%', display: 'none' } },
      undefined,
    );
    expect(sampleKeyframes(s, 0.5, linear).width).toBe('20%');
    expect(sampleKeyframes(s, 0.4, linear).display).toBe('flex');
    expect(sampleKeyframes(s, 0.6, linear).display).toBe('none');
  });

  it('blends alpha and rgb() colours, and leaves unknown colour words discrete', () => {
    const s = compileKeyframes(
      {
        from: { backgroundColor: 'transparent', color: 'rgb(0, 0, 255)', borderColor: 'nope' },
        to: { backgroundColor: 'red', color: 'rgba(0, 0, 0, 0.5)', borderColor: 'white' },
      },
      undefined,
    );
    const mid = sampleKeyframes(s, 0.5, linear);
    expect(mid.backgroundColor).toBe('rgba(128, 0, 0, 0.5)');
    expect(mid.color).toBe('rgba(0, 0, 128, 0.751)');
    expect(sampleKeyframes(s, 0.4, linear).borderColor).toBe('nope');
  });

  it('treats mismatched transform lists as discrete', () => {
    const s = compileKeyframes(
      { from: { transform: 'rotate(0deg)' }, to: { transform: 'scale(2)' } },
      undefined,
    );
    expect(sampleKeyframes(s, 0.4, linear).transform).toEqual([{ rotate: '0deg' }]);
    expect(sampleKeyframes(s, 0.6, linear).transform).toEqual([{ scale: 2 }]);
  });

  it('fills a missing end stop from the base style, else holds the nearest stop', () => {
    const s = compileKeyframes({ '50%': { opacity: 1 } }, undefined);
    expect(sampleKeyframes(s, 0, linear, { opacity: 0.2 }).opacity).toBe(0.2);
    expect(sampleKeyframes(s, 0.75, linear, { opacity: 0.2 }).opacity).toBeCloseTo(0.6);
    expect(sampleKeyframes(s, 0, linear).opacity).toBe(1);
  });
});

describe('keyframeProgress', () => {
  const base: KeyframeTiming = {
    durationMs: 100,
    delayMs: 0,
    iterations: 1,
    direction: 'normal',
    fillMode: 'none',
  };

  it('runs one iteration, then stops applying without a forwards fill', () => {
    expect(keyframeProgress(0, base)).toEqual({ progress: 0, done: false });
    expect(keyframeProgress(40, base)).toEqual({ progress: 0.4, done: false });
    expect(keyframeProgress(100, base)).toEqual({ progress: null, done: true });
  });

  it('honours the delay and the backwards and forwards fills', () => {
    const delayed = { ...base, delayMs: 50 };
    expect(keyframeProgress(20, delayed).progress).toBeNull();
    expect(keyframeProgress(20, { ...delayed, fillMode: 'backwards' }).progress).toBe(0);
    expect(keyframeProgress(20, { ...delayed, fillMode: 'both' }).progress).toBe(0);
    expect(keyframeProgress(90, delayed).progress).toBeCloseTo(0.4);
    expect(keyframeProgress(500, { ...delayed, fillMode: 'forwards' })).toEqual({
      progress: 1,
      done: true,
    });
  });

  it('runs each direction', () => {
    const at = (direction: KeyframeTiming['direction'], ms: number) =>
      keyframeProgress(ms, { ...base, iterations: 2, direction }).progress;
    expect(at('normal', 130)).toBeCloseTo(0.3);
    expect(at('reverse', 130)).toBeCloseTo(0.7);
    expect(at('alternate', 30)).toBeCloseTo(0.3);
    expect(at('alternate', 130)).toBeCloseTo(0.7);
    expect(at('alternate-reverse', 30)).toBeCloseTo(0.7);
    expect(at('alternate-reverse', 130)).toBeCloseTo(0.3);
  });

  it('ends a fractional count partway, and holds the right end for alternate', () => {
    expect(
      keyframeProgress(1000, { ...base, iterations: 1.5, fillMode: 'forwards' }).progress,
    ).toBeCloseTo(0.5);
    expect(
      keyframeProgress(1000, { ...base, iterations: 2, direction: 'alternate', fillMode: 'both' })
        .progress,
    ).toBe(0);
  });

  it('never finishes an infinite animation', () => {
    expect(keyframeProgress(1_000_050, { ...base, iterations: Infinity })).toEqual({
      progress: expect.closeTo(0.5) as number,
      done: false,
    });
  });

  it('jumps straight to the end for zero duration or zero iterations', () => {
    expect(keyframeProgress(0, { ...base, durationMs: 0, fillMode: 'forwards' })).toEqual({
      progress: 1,
      done: true,
    });
    expect(keyframeProgress(0, { ...base, iterations: 0, fillMode: 'forwards' })).toEqual({
      progress: 0,
      done: true,
    });
  });
});
