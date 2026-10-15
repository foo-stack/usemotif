import { describe, expect, it } from 'vitest';
import { lightTheme } from '@usemotif/tokens';
import { canonical, checkTokenPaths, flattenTokens, resolveChain } from './tokens.js';

const entries = flattenTokens(lightTheme.tokens);

describe('tokens', () => {
  it('flattens every leaf to a $-path and resolves references', () => {
    const accent = entries.find((t) => t.path === '$colors.action.primary.bg')!;
    expect(accent.value).toBe('$colors.blue.600');
    expect(accent.resolved).toMatch(/^#[0-9a-f]{6}$/);
    expect(entries.some((t) => t.path.startsWith('$animations'))).toBe(false);
  });

  it('follows a chain to its literal', () => {
    const chain = resolveChain(entries, '$colors.action.primary.bg');
    expect(chain[0]).toBe('$colors.action.primary.bg');
    expect(chain[1]).toBe('$colors.blue.600');
    expect(chain.at(-1)).toMatch(/^#/);
    expect(resolveChain(entries, '$colors.nope')).toEqual([]);
  });

  it('reads a reference without its scale when only one scale has that path', () => {
    expect(canonical(entries, '$blue.600')).toBe('$colors.blue.600');
  });

  it('flags unknown references in code with the nearest real paths', () => {
    const checks = checkTokenPaths(
      entries,
      `<Box bg="$colors.surface.base" color="$colors.text.defualt" p="$space.4" />`,
    );
    expect(checks.map((c) => [c.ref, c.known])).toEqual([
      ['$colors.surface.base', true],
      ['$colors.text.defualt', false],
      ['$space.4', true],
    ]);
    expect(checks[1]!.suggestions[0]).toBe('$colors.text.default');
  });
});
