import { describe, expect, it } from 'vitest';
import { keyframesToCss, makeKeyframe } from './keyframes.js';
import { isKeyframe, keyframeBrand } from './style-props.js';

describe('keyframesToCss', () => {
  it('emits a @keyframes block with stable hash-based name', () => {
    const { name, css } = keyframesToCss({
      '0%': { opacity: 0 },
      '100%': { opacity: 1 },
    });
    expect(name).toMatch(/^m-anim-[a-z0-9]+$/);
    expect(css).toContain('@keyframes m-anim-');
    expect(css).toContain('0% { opacity: 0;');
    expect(css).toContain('100% { opacity: 1;');
  });

  it('produces identical names for identical bodies', () => {
    const a = keyframesToCss({ '0%': { opacity: 0 }, '100%': { opacity: 1 } });
    const b = keyframesToCss({ '0%': { opacity: 0 }, '100%': { opacity: 1 } });
    expect(a.name).toBe(b.name);
    expect(a.css).toBe(b.css);
  });

  it('produces different names for different bodies', () => {
    const a = keyframesToCss({ '0%': { opacity: 0 }, '100%': { opacity: 1 } });
    const b = keyframesToCss({ '0%': { opacity: 0 }, '100%': { opacity: 0.5 } });
    expect(a.name).not.toBe(b.name);
  });

  it('resolves token references inside step values to var()', () => {
    const { css } = keyframesToCss({
      from: { backgroundColor: '$colors.bg.base' },
      to: { backgroundColor: '$colors.surface.raised' },
    });
    expect(css).toContain('background-color: var(--colors-bg-base)');
    expect(css).toContain('background-color: var(--colors-surface-raised)');
  });

  it('passes through raw CSS keys (transform, filter)', () => {
    const { css } = keyframesToCss({
      '0%': { transform: 'translateX(0)', filter: 'blur(0)' },
      '100%': { transform: 'translateX(-50%)', filter: 'blur(4px)' },
    });
    expect(css).toContain('transform: translateX(0)');
    expect(css).toContain('transform: translateX(-50%)');
    expect(css).toContain('filter: blur(0)');
    expect(css).toContain('filter: blur(4px)');
  });

  it('accepts `from` / `to` keywords', () => {
    const { css } = keyframesToCss({
      from: { opacity: 0 },
      to: { opacity: 1 },
    });
    expect(css).toContain('from { opacity: 0;');
    expect(css).toContain('to { opacity: 1;');
  });

  // Regression: the stop selector is interpolated into the @keyframes body.
  // A hostile stop key containing `{`/`}`/`;` previously closed the block and
  // could smuggle in an `@import` or top-level rule. After the fix those
  // structural characters are hex-escaped, so the only real braces left are
  // the step block and the @keyframes wrapper.
  it('escapes a malicious stop key so it cannot break out of the block', () => {
    const { css } = keyframesToCss({
      '0% { } } @import url(evil) ; x': { opacity: 1 },
    });
    expect(css).toContain('\\7b '); // `{` from the stop is hex-escaped
    expect(css).toContain('\\7d '); // `}` from the stop is hex-escaped
    expect(css).toContain('\\3b '); // `;` from the stop is hex-escaped
    // Exactly the two legitimate openers/closers: the step block and the
    // @keyframes wrapper. No injected block survived as real CSS.
    expect(css.match(/{/g)?.length ?? 0).toBe(2);
    expect(css.match(/}/g)?.length ?? 0).toBe(2);
  });
});

describe('makeKeyframe (branded)', () => {
  it('returns a branded Keyframe object', () => {
    const k = makeKeyframe({ '0%': { opacity: 0 }, '100%': { opacity: 1 } });
    expect(isKeyframe(k)).toBe(true);
    expect(k[keyframeBrand]).toBe(true);
    expect(k.name).toMatch(/^m-anim-/);
    expect(k.css).toContain('@keyframes');
  });

  it('isKeyframe rejects unbranded shapes', () => {
    expect(isKeyframe({ name: 'spin', css: '@keyframes spin { ... }' })).toBe(false);
    expect(isKeyframe('spin')).toBe(false);
    expect(isKeyframe(undefined)).toBe(false);
    expect(isKeyframe(null)).toBe(false);
  });
});

describe('makeKeyframe frames', () => {
  it('keeps the definition so native can run it', () => {
    const def = { from: { opacity: 0 }, '50%': { opacity: 0.4 }, to: { opacity: 1 } };
    const kf = makeKeyframe(def);
    expect(kf.frames).toBe(def);
    expect(kf.name).toBe(keyframesToCss(def).name);
    expect(kf.css).toBe(keyframesToCss(def).css);
  });
});
