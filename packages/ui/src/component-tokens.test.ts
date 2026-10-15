import { resolveToken, type Theme } from '@usemotif/core';
import * as recipes from '@usemotif/recipes';
import { darkTheme, lightTheme } from '@usemotif/tokens';
import { describe, expect, it } from 'vitest';

function chains(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string' && node.startsWith('$components.')) out.push(node);
  else if (typeof node === 'object' && node !== null) {
    for (const value of Object.values(node)) chains(value, out);
  }
  return out;
}

const ALL = Object.values(recipes).flatMap((recipe) => chains(recipe));

describe('component tokens in the recipes', () => {
  it('fall back to a token the default themes define', () => {
    expect(ALL.length).toBeGreaterThan(50);
    for (const theme of [lightTheme, darkTheme]) {
      for (const ref of ALL) expect(resolveToken(ref as `$${string}`, theme), ref).toBeDefined();
    }
  });

  it('read a theme override before the semantic token', () => {
    const brand: Theme = {
      ...lightTheme,
      tokens: {
        ...lightTheme.tokens,
        components: { button: { primary: { bg: '#7c3aed' } } },
      },
    };
    const ref = recipes.buttonRecipe.variants.intent.primary.bg;
    expect(resolveToken(ref, brand)).toBe('#7c3aed');
    expect(resolveToken(ref, lightTheme)).toBe(
      resolveToken('$colors.action.primary.bg', lightTheme),
    );
  });
});
