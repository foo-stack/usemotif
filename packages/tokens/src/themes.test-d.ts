/** Type-level tests: `yarn typecheck` is the gate for `.test-d.ts` files. */
import { expectTypeOf } from 'vitest';
import { extendTheme, type Paths, type Theme } from '@usemotif/core';
import { type darkTheme, lightTheme } from './themes.js';

type Colors<T extends { readonly tokens: { readonly colors: object } }> = Paths<
  T['tokens']['colors']
>;

// The presets keep their literal shape: primitive and semantic paths are real.
expectTypeOf<'blue.500'>().toExtend<Colors<typeof lightTheme>>();
expectTypeOf<'surface.base'>().toExtend<Colors<typeof darkTheme>>();
expectTypeOf<'nope.500'>().not.toExtend<Colors<typeof lightTheme>>();
expectTypeOf(lightTheme).toExtend<Theme>();

// Extending a preset keeps its paths and adds the overrides'.
const brand = extendTheme(lightTheme, {
  name: 'brand',
  tokens: { colors: { brand: { 500: '#7c3aed' } } },
});
expectTypeOf<'blue.500' | 'surface.base' | 'brand.500'>().toExtend<Colors<typeof brand>>();
expectTypeOf(brand).toExtend<Theme>();
