import { describe, expect, it } from 'vitest';
import { resolveResponsiveVariants } from './responsive-variants.js';

const SIZES: Record<string, Record<string, unknown>> = {
  sm: { px: 2, fontSize: 'sm', _hover: { bg: 'gray' } },
  lg: { px: 4, fontSize: 'lg', _hover: { bg: 'black' } },
};

/** A stand-in for styled(): base, then the size variant, then a compound. */
function build(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { display: 'flex', transition: 'all 1s' };
  Object.assign(out, SIZES[String(values.size)]);
  if (values.size === 'lg' && values.tone === 'loud') out.fontWeight = 700;
  return out;
}

describe('resolveResponsiveVariants', () => {
  it('is build() itself when no value is responsive', () => {
    expect(resolveResponsiveVariants({ size: 'sm' }, build)).toEqual(build({ size: 'sm' }));
  });

  it('folds per-breakpoint bags into responsive style props', () => {
    const out = resolveResponsiveVariants({ size: { base: 'sm', md: 'lg' } }, build);
    expect(out).toEqual({
      display: 'flex',
      transition: 'all 1s',
      px: { base: 2, md: 4 },
      fontSize: { base: 'sm', md: 'lg' },
      _hover: { bg: { base: 'gray', md: 'black' } },
    });
  });

  it('reads the array and DSL forms the same way', () => {
    const fromObject = resolveResponsiveVariants({ size: { base: 'sm', md: 'lg' } }, build);
    expect(resolveResponsiveVariants({ size: ['sm', undefined, 'lg'] }, build)).toEqual(fromObject);
    expect(resolveResponsiveVariants({ size: 'base:sm md:lg' }, build)).toEqual(fromObject);
  });

  it('matches compound variants per breakpoint', () => {
    const out = resolveResponsiveVariants({ size: { base: 'sm', lg: 'lg' }, tone: 'loud' }, build);
    expect(out.fontWeight).toEqual({ lg: 700 });
  });

  it('cascades mobile-first and keeps container slots', () => {
    const out = resolveResponsiveVariants({ size: { base: 'sm', sm: 'lg', '@md': 'sm' } }, build);
    expect(out.px).toEqual({ base: 2, sm: 4, '@md': 2 });
  });

  it("keeps the slots of a responsive value inside a variant's own styles", () => {
    const out = resolveResponsiveVariants({ size: { base: 'sm', md: 'lg' } }, (values) => ({
      ...build(values),
      gap: { base: 1, xl: 3 },
    }));
    expect(out.gap).toEqual({ base: 1, md: 1, xl: 3 });
  });
});
