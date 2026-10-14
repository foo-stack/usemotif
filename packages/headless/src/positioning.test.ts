/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { computePosition } from './positioning.js';

const VIEWPORT = { width: 800, height: 600 };
const FLOAT = { width: 200, height: 100 };

function rect(left: number, top: number, width = 100, height = 40): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

afterEach(() => {
  window.scrollX = 0;
  window.scrollY = 0;
});

describe('computePosition', () => {
  it('places on the requested side when it fits', () => {
    const ref = rect(350, 250);
    expect(computePosition(ref, FLOAT, 'bottom', 8, VIEWPORT)).toEqual({
      top: 298,
      left: 300,
      placement: 'bottom',
    });
    expect(computePosition(ref, FLOAT, 'top', 8, VIEWPORT)).toEqual({
      top: 142,
      left: 300,
      placement: 'top',
    });
    expect(computePosition(ref, FLOAT, 'right', 8, VIEWPORT).placement).toBe('right');
    expect(computePosition(ref, FLOAT, 'left', 8, VIEWPORT).placement).toBe('left');
  });

  it('flips to the opposite side when the requested one overflows', () => {
    expect(computePosition(rect(350, 520), FLOAT, 'bottom', 8, VIEWPORT)).toMatchObject({
      top: 412,
      placement: 'top',
    });
    expect(computePosition(rect(350, 20), FLOAT, 'top', 8, VIEWPORT).placement).toBe('bottom');
    expect(computePosition(rect(680, 250), FLOAT, 'right', 8, VIEWPORT).placement).toBe('left');
    expect(computePosition(rect(20, 250), FLOAT, 'left', 8, VIEWPORT).placement).toBe('right');
  });

  it('takes the roomier side when neither fits', () => {
    const tall = { width: 200, height: 400 };
    expect(computePosition(rect(350, 200), tall, 'bottom', 8, VIEWPORT).placement).toBe('bottom');
    expect(computePosition(rect(350, 380), tall, 'bottom', 8, VIEWPORT).placement).toBe('top');
  });

  it('shifts along the cross axis to stay inside, at both edges', () => {
    expect(computePosition(rect(0, 250), FLOAT, 'bottom', 8, VIEWPORT).left).toBe(8);
    expect(computePosition(rect(760, 250, 40), FLOAT, 'bottom', 8, VIEWPORT).left).toBe(592);
    expect(computePosition(rect(350, 0, 100, 20), FLOAT, 'right', 8, VIEWPORT).top).toBe(8);
  });

  it('pins an element wider than the viewport to the near edge', () => {
    const wide = { width: 900, height: 100 };
    expect(computePosition(rect(350, 250), wide, 'bottom', 8, VIEWPORT).left).toBe(8);
  });

  it('returns document coordinates', () => {
    window.scrollX = 30;
    window.scrollY = 500;
    expect(computePosition(rect(350, 250), FLOAT, 'bottom', 8, VIEWPORT)).toMatchObject({
      top: 798,
      left: 330,
    });
  });
});
