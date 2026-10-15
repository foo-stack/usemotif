import { afterEach, describe, expect, it } from 'vitest';
import { configureBreakpoints } from './breakpoints.js';
import { toTailwindTheme } from './tailwind.js';

const TOKENS = {
  colors: { blue: { 500: '#3b82f6' }, action: { primary: { bg: '$colors.blue.500' } } },
  space: { 4: 16, '1.5': 6 },
  radii: { md: 8 },
  zIndices: { modal: 50 },
};

afterEach(() => configureBreakpoints({}));

describe('toTailwindTheme', () => {
  it('points each Tailwind namespace at the motif token variables, inline', () => {
    const css = toTailwindTheme(TOKENS);
    expect(css).toContain('@theme inline {');
    expect(css).toContain('  --color-blue-500: var(--colors-blue-500);');
    expect(css).toContain('  --color-action-primary-bg: var(--colors-action-primary-bg);');
    expect(css).toContain('  --spacing-4: var(--space-4);');
    expect(css).toContain('  --spacing-1_5: var(--space-1_5);');
    expect(css).toContain('  --radius-md: var(--radii-md);');
    // Scales with no Tailwind theme namespace are left out.
    expect(css).not.toContain('modal');
  });

  it("copies motif's breakpoints, or leaves them out", () => {
    configureBreakpoints({ md: 800 });
    expect(toTailwindTheme(TOKENS)).toContain('  --breakpoint-md: 800px;');
    expect(toTailwindTheme(TOKENS, { breakpoints: false })).not.toContain('--breakpoint');
  });

  it("clears Tailwind's own values in the namespaces it fills when asked", () => {
    const css = toTailwindTheme(TOKENS, { replace: true });
    expect(css).toContain('  --color-*: initial;');
    expect(css).toContain('  --spacing-*: initial;');
    expect(css).toContain('  --breakpoint-*: initial;');
    expect(css).not.toContain('--text-*: initial;');
  });
});
