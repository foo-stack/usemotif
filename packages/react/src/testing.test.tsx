import { defaultTestTheme, motifMatchers } from '@usemotif/test-utils';
import { describe, expect, it } from 'vitest';
import { Box } from './Box.js';
import { styled } from './styled.js';
import { renderStyles } from './testing.js';

expect.extend(motifMatchers);

declare module 'vitest' {
  interface Assertion {
    toHaveStyle(expected: Record<string, string | number>): void;
    toHaveStyleAt(scope: string, expected: Record<string, string | number>): void;
  }
}

// A consumer's own component, as the testing guide describes it.
const Tag = styled(Box, {
  base: { px: '$space.2', borderRadius: 4, _hover: { opacity: 0.8 } },
  variants: {
    tone: { quiet: { opacity: 0.6 }, loud: { fontWeight: 700 } },
  },
});

describe('renderStyles', () => {
  it("reads a styled() component's resolved style, variant and hover rule", () => {
    const out = renderStyles(<Tag tone="loud">New</Tag>, defaultTestTheme);
    expect(out).toHaveStyle({ fontWeight: 700, borderRadius: 4 });
    expect(out).toHaveStyleAt(':hover', { opacity: 0.8 });
  });

  it('reports responsive values per breakpoint', () => {
    const out = renderStyles(<Tag p={{ base: 4, md: 12 }} />, defaultTestTheme);
    expect(out).toHaveStyle({ padding: 4 });
    expect(out).toHaveStyleAt('@media (min-width: 768px)', { padding: 12 });
  });

  it('starts every render from a clean cache, so a repeat render still sees its rules', () => {
    renderStyles(<Tag tone="loud" />, defaultTestTheme);
    const again = renderStyles(<Tag tone="loud" />, defaultTestTheme);
    expect(again).toHaveStyleAt(':hover', { opacity: 0.8 });
  });
});
