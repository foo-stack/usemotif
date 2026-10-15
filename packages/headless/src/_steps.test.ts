import { describe, expect, it } from 'vitest';
import { activeStepIndex, canSelectStep } from './_steps.js';

const steps = [{ id: 'a' }, { id: 'b', status: 'active' }, { id: 'c' }];

describe('activeStepIndex', () => {
  it('prefers `current`, then the step marked active, else -1', () => {
    expect(activeStepIndex(steps, 'c')).toBe(2);
    expect(activeStepIndex(steps, undefined)).toBe(1);
    expect(activeStepIndex([{ id: 'x' }], undefined)).toBe(-1);
  });
});

describe('canSelectStep', () => {
  it('allows any step unless linear, and then only earlier ones', () => {
    expect([0, 1, 2].map((i) => canSelectStep(i, 1, false))).toEqual([true, true, true]);
    expect([0, 1, 2].map((i) => canSelectStep(i, 1, true))).toEqual([true, false, false]);
  });
});
