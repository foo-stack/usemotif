/**
 * Type-level tests for `extendTheme`. `yarn typecheck` is the gate: the test
 * glob does not collect `.test-d.ts`.
 */
import { expectTypeOf } from 'vitest';
import { createTheme, extendTheme } from './createTheme.js';
import type { Paths } from './token-path.js';
import type { Theme } from './types.js';

const base = createTheme({
  name: 'base',
  tokens: {
    colors: { brand: { 500: '#3b82f6' }, text: '#111' },
    space: { 4: 16 },
  },
} as const);

const brand = extendTheme(base, {
  name: 'brand',
  tokens: { colors: { brand: { 600: '#7c3aed' } }, radii: { md: 8 } },
});

// Paths from the base and from the overrides both survive the merge.
expectTypeOf<Paths<(typeof brand)['tokens']['colors']>>().toEqualTypeOf<
  'brand.500' | 'brand.600' | 'text'
>();
expectTypeOf<Paths<(typeof brand)['tokens']['space']>>().toEqualTypeOf<'4'>();
expectTypeOf<Paths<(typeof brand)['tokens']['radii']>>().toEqualTypeOf<'md'>();

// The result is still a `Theme`, for `<ThemeProvider themes={[...]}>`.
expectTypeOf(brand).toExtend<Theme>();

// With no overrides the tokens are the base's.
const same = extendTheme(base, { name: 'same' });
expectTypeOf<Paths<(typeof same)['tokens']['colors']>>().toEqualTypeOf<'brand.500' | 'text'>();

// A name is required: it becomes `data-theme`, so it must differ from the base.
// @ts-expect-error - missing `name`
extendTheme(base, { tokens: {} });
