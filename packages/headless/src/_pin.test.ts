import { describe, expect, it } from 'vitest';
import { pinBackspace, pinChars, pinInput } from './_pin.js';

describe('pin model', () => {
  it('filters by type', () => {
    expect(pinChars('1a2-B3', 'numeric')).toEqual(['1', '2', '3']);
    expect(pinChars('1a2-B3', 'alphanumeric')).toEqual(['1', 'a', '2', 'B', '3']);
  });

  it('types into a box and moves on', () => {
    expect(pinInput('', 0, '4', 4, 'numeric')).toEqual({ value: '4', focus: 1 });
    expect(pinInput('4', 1, '7', 4, 'numeric')).toEqual({ value: '47', focus: 2 });
  });

  it('overwrites a filled box', () => {
    expect(pinInput('4712', 1, '9', 4, 'numeric')).toEqual({ value: '4912', focus: 2 });
  });

  it('fills from a middle box with several characters, capped at the length', () => {
    expect(pinInput('4', 1, '765432', 4, 'numeric')).toEqual({ value: '4765', focus: 3 });
    expect(pinInput('', 0, '12-34', 4, 'numeric')).toEqual({ value: '1234', focus: 3 });
  });

  it('starts a box past the end where the value ends', () => {
    expect(pinInput('1', 3, '9', 4, 'numeric')).toEqual({ value: '19', focus: 2 });
  });

  it('ignores input it does not accept', () => {
    expect(pinInput('12', 2, 'x', 4, 'numeric')).toEqual({ value: '12', focus: 2 });
  });

  it('clears a filled box on Backspace, or the one before an empty box', () => {
    expect(pinBackspace('1234', 2)).toEqual({ value: '124', focus: 1 });
    expect(pinBackspace('12', 2)).toEqual({ value: '1', focus: 1 });
    expect(pinBackspace('', 0)).toEqual({ value: '', focus: 0 });
    expect(pinBackspace('1', 0)).toEqual({ value: '', focus: 0 });
  });
});
