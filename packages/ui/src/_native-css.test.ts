import { describe, expect, it } from 'vitest';
import { cssToNative } from './_native-css.js';

const TOKENS: Record<string, unknown> = {
  'colors.border.default': '#e4e4e7',
  'colors.surface.raised': '#ffffff',
  'radii.lg': 12,
};
const resolve = (path: string): unknown => TOKENS[path];

describe('cssToNative', () => {
  it('resolves token variables, falling back when a token is missing', () => {
    expect(
      cssToNative(
        {
          background: 'var(--colors-surface-raised, #fff)',
          color: 'var(--colors-text-nope, #111)',
        },
        resolve,
      ),
    ).toEqual({ backgroundColor: '#ffffff', color: '#111' });
  });

  it('splits the border and padding shorthands and unitless px lengths', () => {
    expect(
      cssToNative(
        {
          border: '1px solid var(--colors-border-default, #d1d5db)',
          padding: '8px 12px',
          borderRadius: 'var(--radii-lg, 12px)',
          width: '100%',
          height: 6,
        },
        resolve,
      ),
    ).toEqual({
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: '#e4e4e7',
      paddingTop: 8,
      paddingRight: 12,
      paddingBottom: 8,
      paddingLeft: 12,
      borderRadius: 12,
      width: '100%',
      height: 6,
    });
  });

  it('drops keys React Native has no use for', () => {
    expect(
      cssToNative(
        { cursor: 'pointer', font: 'inherit', transition: 'all 1s', opacity: 0.5 },
        resolve,
      ),
    ).toEqual({
      opacity: 0.5,
    });
  });
});
