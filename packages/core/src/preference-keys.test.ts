import { describe, expect, it } from 'vitest';
import { isResponsiveObject, parseResponsiveKey } from './breakpoints.js';
import { resolveResponsiveStylesToVars } from './style.js';

describe('preference conditions as responsive keys', () => {
  it('parses the five preference keys, and leaves container keys alone', () => {
    expect(parseResponsiveKey('@contrast')).toEqual({
      kind: 'preference',
      preference: '@contrast',
    });
    expect(parseResponsiveKey('@print')).toEqual({ kind: 'preference', preference: '@print' });
    expect(parseResponsiveKey('@md')).toEqual({ kind: 'container', bp: 'md' });
    expect(parseResponsiveKey('@print.md')).toEqual({ kind: 'container', bp: 'md', name: 'print' });
    expect(parseResponsiveKey('@dark')).toBeNull();
    expect(isResponsiveObject({ '@landscape': 1 })).toBe(true);
  });

  it('emits each as its media query, after the width rules', () => {
    const { atRules } = resolveResponsiveStylesToVars({
      p: { base: 2, md: 4, '@landscape': 8, '@contrast': 6 },
      bg: {
        base: 'white',
        '@forcedColors': 'Canvas',
        '@reducedTransparency': 'white',
        '@print': 'white',
      },
    });
    expect(atRules.map((r) => r.atRule)).toEqual([
      '',
      '@media (min-width: 768px)',
      '@media (prefers-contrast: more)',
      '@media (forced-colors: active)',
      '@media (prefers-reduced-transparency: reduce)',
      '@media print',
      '@media (orientation: landscape)',
    ]);
    expect(atRules[2]!.style).toEqual({ padding: 6 });
    expect(atRules[3]!.style).toEqual({ backgroundColor: 'Canvas' });
  });
});
