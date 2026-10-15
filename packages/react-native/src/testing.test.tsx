/** @vitest-environment jsdom */
import { motifMatchers } from '@usemotif/test-utils';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// Plain host components, as a real React Native renderer sees them, in place of this repo's DOM
// mock; React Native's Pressable reads `testOnly_pressed` in tests, so this one does too.
vi.mock('react-native', async (original) => ({
  ...(await original<object>()),
  View: 'View',
  Text: 'Text',
  Pressable: ({
    style,
    testOnly_pressed,
    children,
    ...rest
  }: {
    style?: unknown;
    testOnly_pressed?: boolean;
    children?: ReactNode;
  }) =>
    createElement(
      'View',
      {
        ...rest,
        style: typeof style === 'function' ? style({ pressed: testOnly_pressed === true }) : style,
      },
      children,
    ),
}));

const { Box } = await import('./Box.js');
const { Pressable } = await import('./Pressable.js');
const { styled } = await import('./styled.js');
const { renderStyles } = await import('./testing.js');

expect.extend(motifMatchers);

const theme = {
  name: 'test',
  tokens: { space: { 3: 12, 6: 24, 8: 32 }, colors: { brand: '#7c3aed' } },
};

describe('renderStyles (native)', () => {
  it('reads base, breakpoint and pressed styles the way the web renderer reports them', () => {
    const out = renderStyles(
      <Pressable
        p={{ base: '$space.3', md: '$space.6', lg: '$space.8' }}
        bg="$colors.brand"
        _active={{ opacity: 0.8 }}
      />,
      theme,
    );
    expect(out).toHaveStyle({ padding: 12, backgroundColor: '#7c3aed' });
    expect(out).toHaveStyleAt('@media (min-width: 768px)', { padding: 24 });
    expect(out).toHaveStyleAt('@media (min-width: 1024px)', { padding: 32 });
    expect(out).toHaveStyleAt(':active', { opacity: 0.8 });
    expect(Object.keys(out.mediaRules)).toEqual([
      '@media (min-width: 768px)',
      '@media (min-width: 1024px)',
    ]);
  });

  it("asserts a consumer's styled() component", () => {
    const Card = styled(Box, {
      base: { p: '$space.3' },
      variants: { size: { lg: { p: '$space.8' } } },
    });
    expect(renderStyles(<Card size="lg" />, theme)).toHaveStyle({ padding: 32 });
    expect(renderStyles(<Box />, theme).pseudoRules).toEqual({});
  });
});
