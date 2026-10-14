import { describe, expect, it } from 'vitest';
import { addTags, splitTags } from './_tags.js';

describe('tag rules', () => {
  it('splits on delimiters and newlines', () => {
    expect(splitTags('a, b\nc;d', [',', ';'])).toEqual(['a', ' b', 'c', 'd']);
  });

  it('trims, drops empties and duplicates, validates, and caps', () => {
    expect(addTags(['a'], [' b ', '', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    expect(addTags([], ['a', 'a'], { allowDuplicates: true })).toEqual(['a', 'a']);
    expect(addTags([], ['ok', 'no'], { validate: (t) => t !== 'no' })).toEqual(['ok']);
    expect(addTags(['a'], ['b', 'c'], { max: 2 })).toEqual(['a', 'b']);
  });

  it('returns the same array when nothing is added', () => {
    const current = ['a'];
    expect(addTags(current, ['a', ' '])).toBe(current);
  });
});
