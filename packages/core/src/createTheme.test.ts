import { describe, expect, it } from 'vitest';
import { createTheme, extendTheme } from './createTheme.js';

const base = createTheme({
  name: 'base',
  tokens: {
    colors: { brand: { 500: '#3b82f6', 600: '#2563eb' }, text: '#111' },
    space: { 4: 16 },
    animations: { quick: { duration: '150ms', easing: 'ease-out' } },
  },
  root: { fontFamily: 'Inter' },
});

describe('extendTheme', () => {
  it('deep-merges token overrides over the base', () => {
    const t = extendTheme(base, {
      name: 'brand',
      tokens: { colors: { brand: { 500: '#7c3aed' } }, radii: { md: 8 } },
    });
    expect(t.name).toBe('brand');
    expect(t.tokens).toEqual({
      colors: { brand: { 500: '#7c3aed', 600: '#2563eb' }, text: '#111' },
      space: { 4: 16 },
      animations: { quick: { duration: '150ms', easing: 'ease-out' } },
      radii: { md: 8 },
    });
  });

  it('replaces an animation preset whole, rather than mixing its fields', () => {
    const t = extendTheme(base, {
      name: 'slow',
      tokens: { animations: { quick: { duration: '400ms' }, gentle: { duration: '1s' } } },
    });
    expect(t.tokens.animations).toEqual({
      quick: { duration: '400ms' },
      gentle: { duration: '1s' },
    });
  });

  it('lets a leaf replace a scale branch, and a branch replace a leaf', () => {
    const t = extendTheme(base, {
      name: 'flat',
      tokens: { colors: { brand: '#000', text: { strong: '#000' } } },
    });
    expect(t.tokens.colors).toEqual({ brand: '#000', text: { strong: '#000' } });
  });

  it('inherits fonts, root, and reducedMotion unless given, and leaves the base alone', () => {
    const before = JSON.stringify(base);
    const kept = extendTheme(base, { name: 'kept' });
    expect(kept.root).toEqual({ fontFamily: 'Inter' });
    expect(kept.tokens).toBe(base.tokens);
    const swapped = extendTheme(base, {
      name: 'swapped',
      root: { fontFamily: 'Mono' },
      reducedMotion: 'off',
      tokens: { space: { 8: 32 } },
    });
    expect(swapped.root).toEqual({ fontFamily: 'Mono' });
    expect(swapped.reducedMotion).toBe('off');
    expect(JSON.stringify(base)).toBe(before);
  });
});
