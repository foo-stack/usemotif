import {
  buildAtRulesCss,
  hashAtRules,
  hashPseudoRules,
  liftPseudoOverriddenBaseProps,
  resolveResponsiveStylesToVars,
  resolveStylesToVars,
  buildPseudoCss,
  resolvePseudoElementBag,
} from '@usemotif/core';
import { describe, expect, it } from 'vitest';
import { extractWeb } from './extract-web.js';
import type { CallSiteAnalysis } from './types.js';

/**
 * Build a synthetic `CallSiteAnalysis` from a flat props bag. Lets us
 * compare extract-web output against the runtime resolver path on
 * exactly the same input.
 */
function fakeStaticAnalysis(props: Record<string, unknown>): CallSiteAnalysis {
  const staticProps = Object.entries(props).map(([name, value]) => ({
    name,
    isStatic: true as const,
    value,
  }));
  return {
    classification: 'static',
    staticProps,
    dynamicProps: [],
    passThrough: [],
    pseudoStateProps: [],
    motionProps: [],
    hasSpread: false,
  };
}

/**
 * Differential parity: the compiler must produce the exact same
 * `inlineStyle` and class name the runtime would for the same input.
 */
describe('extractWeb - runtime parity', () => {
  const cases: Record<string, Record<string, unknown>> = {
    'literal padding + bg': { p: 4, bg: '$colors.brand.500' },
    'responsive object - base + md': { p: { base: '$2', md: '$4' } },
    'full responsive ladder': {
      p: { base: '$1', sm: '$2', md: '$4', lg: '$6', xl: '$8' },
    },
    'array responsive': { p: ['$2', '$4', '$6'] },
    'DSL responsive': { p: 'base:$2 md:$4 lg:$8' },
    'anonymous container query': { p: { base: '$2', '@md': '$8' } },
    'named container query': { p: { base: '$2', '@card.lg': '$10' } },
    'mixed media + container': {
      p: { base: '$1', md: '$2', '@card.lg': '$8' },
    },
    'multi-prop': { p: 4, bg: '$colors.surface.base', borderRadius: '$2' },
  };

  for (const [name, props] of Object.entries(cases)) {
    it(`matches runtime for: ${name}`, () => {
      const expected = resolveResponsiveStylesToVars(props);
      const expectedClass = expected.atRules.length > 0 ? hashAtRules(expected.atRules) : undefined;
      const expectedCss =
        expectedClass === undefined ? '' : buildAtRulesCss(expectedClass, expected.atRules);

      const actual = extractWeb(fakeStaticAnalysis(props));

      expect(actual.inlineStyle).toEqual(expected.baseStyle);
      expect(actual.className).toEqual(expectedClass);
      expect(actual.css).toEqual(expectedCss);
      expect(actual.consumedProps).toEqual(Object.keys(props));
    });
  }
});

describe('extractWeb - bailouts', () => {
  it('returns empty result for dynamic classification', () => {
    const result = extractWeb({
      classification: 'dynamic',
      staticProps: [],
      dynamicProps: [],
      passThrough: [],
      pseudoStateProps: [],
      motionProps: [],
      hasSpread: false,
    });
    expect(result).toEqual({
      inlineStyle: {},
      className: undefined,
      css: '',
      consumedProps: [],
    });
  });

  it('returns empty result when there are no static style props', () => {
    const result = extractWeb({
      classification: 'static',
      staticProps: [],
      dynamicProps: [],
      passThrough: [{ name: 'onClick', isStatic: true }],
      pseudoStateProps: [],
      motionProps: [],
      hasSpread: false,
    });
    expect(result.consumedProps).toEqual([]);
    expect(result.inlineStyle).toEqual({});
  });

  it('extracts only the static subset for partial-static input', () => {
    const result = extractWeb({
      classification: 'partial-static',
      staticProps: [{ name: 'p', isStatic: true, value: 4 }],
      dynamicProps: [{ name: 'bg', isStatic: false }],
      passThrough: [],
      pseudoStateProps: [],
      motionProps: [],
      hasSpread: false,
    });
    expect(result.consumedProps).toEqual(['p']);
    expect(result.inlineStyle).toEqual({ padding: 4 });
  });

  it('extracts pseudo-state bags into a className + CSS', () => {
    const result = extractWeb({
      classification: 'static',
      staticProps: [],
      dynamicProps: [],
      passThrough: [],
      pseudoStateProps: [{ name: '_hover', pseudo: ':hover', style: { opacity: 0.9 } }],
      motionProps: [],
      hasSpread: false,
    });
    expect(result.consumedProps).toEqual(['_hover']);
    expect(result.className).toMatch(/^m-[a-z0-9]+$/);
    expect(result.css).toContain(':hover');
    expect(result.css).toContain('opacity: 0.9');
  });

  it('combines at-rule and pseudo class names with a space', () => {
    const result = extractWeb({
      classification: 'static',
      staticProps: [{ name: 'p', isStatic: true, value: { base: 4, md: 8 } }],
      dynamicProps: [],
      passThrough: [],
      pseudoStateProps: [{ name: '_hover', pseudo: ':hover', style: { opacity: 0.9 } }],
      motionProps: [],
      hasSpread: false,
    });
    expect(result.className).toMatch(/^m-[a-z0-9]+ m-[a-z0-9]+$/);
  });

  it('rewrites & in pseudo selectors to the generated class', () => {
    const result = extractWeb({
      classification: 'static',
      staticProps: [],
      dynamicProps: [],
      passThrough: [],
      pseudoStateProps: [
        {
          name: '_disabled',
          pseudo: ':disabled, &[aria-disabled="true"]',
          style: { opacity: 0.5 },
        },
      ],
      motionProps: [],
      hasSpread: false,
    });
    const cls = result.className!;
    expect(result.css).toContain(`.${cls}[aria-disabled="true"]`);
    expect(result.css).toContain(':disabled');
  });

  // Regression: a base prop that a state-pseudo bag overrides must be
  // lifted out of inline style into the base class block, or inline
  // (1,0,0,0) clobbers the pseudo rule (0,1,1) and the runtime - which
  // does lift - would emit a different at-rule hash, breaking dedupe.
  it('lifts a base prop overridden by a pseudo bag out of inline style', () => {
    const result = extractWeb({
      classification: 'static',
      staticProps: [{ name: 'boxShadow', isStatic: true, value: '0 0 4px' }],
      dynamicProps: [],
      passThrough: [],
      pseudoStateProps: [
        {
          name: '_disabled',
          pseudo: ':disabled, &[aria-disabled="true"]',
          style: { boxShadow: 'none' },
        },
      ],
      motionProps: [],
      hasSpread: false,
    });
    // boxShadow must NOT remain inline (it would win over :disabled otherwise).
    expect(result.inlineStyle).not.toHaveProperty('box-shadow');
    expect(result.inlineStyle).not.toHaveProperty('boxShadow');
    // It must appear in the emitted base class CSS instead.
    expect(result.css).toContain('box-shadow');
    // And the byte-identical runtime parity must hold: the lifted base
    // block hashes into the at-rules class. Recompute via the same core
    // helpers the runtime uses and confirm the class is present.
    const { baseStyle, atRules } = resolveResponsiveStylesToVars({ boxShadow: '0 0 4px' });
    const lifted = liftPseudoOverriddenBaseProps(
      baseStyle,
      [{ pseudo: ':disabled, &[aria-disabled="true"]', style: { boxShadow: 'none' } }],
      atRules,
    );
    expect(result.className).toContain(hashAtRules(lifted.atRules));
  });

  // Regression: the compiler used to emit pseudo rules in attribute order
  // while the runtime always emits in a fixed order (hover→focus→active→
  // disabled→exit). Since the class hash is order-sensitive, that produced
  // a different class than the runtime - and even two source orderings of
  // the same bags produced two different classes. They must be identical
  // and match the canonical-order hash.
  it('emits pseudo rules in canonical order regardless of attribute order', () => {
    const hoverFirst = extractWeb({
      classification: 'static',
      staticProps: [],
      dynamicProps: [],
      passThrough: [],
      pseudoStateProps: [
        { name: '_hover', pseudo: ':hover', style: { opacity: 0.9 } },
        { name: '_focus', pseudo: ':focus-visible', style: { opacity: 0.7 } },
      ],
      motionProps: [],
      hasSpread: false,
    });
    const focusFirst = extractWeb({
      classification: 'static',
      staticProps: [],
      dynamicProps: [],
      passThrough: [],
      pseudoStateProps: [
        { name: '_focus', pseudo: ':focus-visible', style: { opacity: 0.7 } },
        { name: '_hover', pseudo: ':hover', style: { opacity: 0.9 } },
      ],
      motionProps: [],
      hasSpread: false,
    });
    // Order-independent: same class either way.
    expect(focusFirst.className).toBe(hoverFirst.className);
    // And it matches the runtime's fixed hover-then-focus order.
    const canonical = hashPseudoRules([
      { pseudo: ':hover', style: resolveStylesToVars({ opacity: 0.9 }).style },
      { pseudo: ':focus-visible', style: resolveStylesToVars({ opacity: 0.7 }).style },
    ]);
    expect(hoverFirst.className).toBe(canonical);
  });
});

describe('extractWeb - motion props', () => {
  function makeAnalysis(motion: CallSiteAnalysis['motionProps']): CallSiteAnalysis {
    return {
      classification: 'static',
      staticProps: [],
      dynamicProps: [],
      passThrough: [],
      pseudoStateProps: [],
      motionProps: motion,
      hasSpread: false,
    };
  }

  it('extracts a literal `transition` string into inline style', () => {
    const result = extractWeb(makeAnalysis([{ name: 'transition', value: 'opacity 200ms ease' }]));
    expect(result.inlineStyle).toEqual({ transition: 'opacity 200ms ease' });
    expect(result.consumedProps).toEqual(['transition']);
  });

  it('resolves a `transition` object literal with defaults', () => {
    const result = extractWeb(
      makeAnalysis([{ name: 'transition', value: { property: 'opacity' } }]),
    );
    expect(result.inlineStyle).toEqual({ transition: 'opacity 200ms ease' });
  });

  it('expands `animation="<name>"` into a var-based transition string', () => {
    const result = extractWeb(makeAnalysis([{ name: 'animation', value: 'normal' }]));
    expect(result.inlineStyle).toEqual({
      transition: 'all var(--motif-anim-normal-duration) var(--motif-anim-normal-easing)',
    });
    expect(result.consumedProps).toEqual(['animation']);
  });

  it('respects `animateOnly` to restrict the property list', () => {
    const result = extractWeb(
      makeAnalysis([
        { name: 'animation', value: 'normal' },
        { name: 'animateOnly', value: ['transform', 'opacity'] },
      ]),
    );
    expect(result.inlineStyle.transition).toBe(
      'transform var(--motif-anim-normal-duration) var(--motif-anim-normal-easing), opacity var(--motif-anim-normal-duration) var(--motif-anim-normal-easing)',
    );
    expect(result.consumedProps).toEqual(['animation', 'animateOnly']);
  });

  it('prefers `transition` over `animation` when both literal', () => {
    const result = extractWeb(
      makeAnalysis([
        { name: 'transition', value: 'opacity 100ms linear' },
        { name: 'animation', value: 'normal' },
      ]),
    );
    expect(result.inlineStyle.transition).toBe('opacity 100ms linear');
    expect(result.consumedProps).toEqual(['transition', 'animation']);
  });

  it('emits an [data-motif-state="exiting"] pseudo rule for `exitStyle`', () => {
    const result = extractWeb(makeAnalysis([{ name: 'exitStyle', value: { opacity: 0 } }]));
    expect(result.className).toMatch(/^m-[a-z0-9]+$/);
    expect(result.css).toContain('[data-motif-state="exiting"]');
    expect(result.css).toContain('opacity: 0');
    expect(result.consumedProps).toEqual(['exitStyle']);
  });

  it('leaves `enterStyle` at runtime (no compile-time CSS representation)', () => {
    // enterStyle is a first-paint overlay flipped by React state; the
    // compiler can't bake it out without losing the post-mount swap.
    const result = extractWeb(makeAnalysis([{ name: 'enterStyle', value: { opacity: 0 } }]));
    expect(result.inlineStyle).toEqual({});
    expect(result.css).toBe('');
    expect(result.consumedProps).toEqual([]);
  });
});

describe('extractWeb - static/dynamic conflict bail-out', () => {
  function analysis(over: Partial<CallSiteAnalysis>): CallSiteAnalysis {
    return {
      classification: 'partial-static',
      staticProps: [],
      dynamicProps: [],
      passThrough: [],
      pseudoStateProps: [],
      motionProps: [],
      hasSpread: false,
      ...over,
    } as CallSiteAnalysis;
  }

  it('keeps a static prop that conflicts (shorthand↔longhand) with a dynamic prop', () => {
    // padding (static) vs pt (dynamic) → padding must stay on the JSX so the
    // runtime resolves both in attribute order; otherwise inline padding wins.
    const result = extractWeb(
      analysis({
        staticProps: [{ name: 'padding', isStatic: true, value: 4 }],
        dynamicProps: [{ name: 'pt', isStatic: false }],
      }),
    );
    expect(result.consumedProps).not.toContain('padding');
    expect(result.inlineStyle).not.toHaveProperty('padding');
  });

  it('keeps a static prop that conflicts on the exact same property', () => {
    const result = extractWeb(
      analysis({
        staticProps: [{ name: 'p', isStatic: true, value: 4 }],
        dynamicProps: [{ name: 'padding', isStatic: false }],
      }),
    );
    expect(result.consumedProps).not.toContain('p');
  });

  it('still extracts a static prop that does NOT conflict with the dynamic prop', () => {
    const result = extractWeb(
      analysis({
        staticProps: [{ name: 'color', isStatic: true, value: 'red' }],
        dynamicProps: [{ name: 'pt', isStatic: false }],
      }),
    );
    expect(result.consumedProps).toContain('color');
    expect(result.inlineStyle).toHaveProperty('color', 'red');
  });

  it('keeps a pseudo bag that overrides a property held by a dynamic base prop', () => {
    const result = extractWeb(
      analysis({
        dynamicProps: [{ name: 'opacity', isStatic: false }],
        pseudoStateProps: [{ name: '_hover', pseudo: ':hover', style: { opacity: 1 } }],
      }),
    );
    expect(result.consumedProps).not.toContain('_hover');
    expect(result.css).not.toContain(':hover');
  });

  it('bails motion extraction when a sibling motion prop is dynamic (animation + dynamic transition)', () => {
    const result = extractWeb(
      analysis({
        dynamicProps: [{ name: 'transition', isStatic: false }],
        motionProps: [{ name: 'animation', value: 'fade' }],
      }),
    );
    expect(result.consumedProps).not.toContain('animation');
    expect(result.inlineStyle).not.toHaveProperty('transition');
  });

  it('bails motion extraction so animateOnly is not swallowed when animation is dynamic', () => {
    const result = extractWeb(
      analysis({
        dynamicProps: [{ name: 'animation', isStatic: false }],
        motionProps: [{ name: 'animateOnly', value: ['opacity'] }],
      }),
    );
    expect(result.consumedProps).not.toContain('animateOnly');
  });
});

describe('extractWeb - cssLayer (#319)', () => {
  it('emits inline base styles and no layer by default', () => {
    const result = extractWeb(fakeStaticAnalysis({ bg: 'red', p: 4 }));

    expect(result.inlineStyle).not.toEqual({});
    expect(result.css).not.toContain('@layer');
  });

  it('moves base styles into a layered class when a layer is set', () => {
    const result = extractWeb(fakeStaticAnalysis({ bg: 'red', p: 4 }), { cssLayer: 'motif' });

    expect(result.inlineStyle).toEqual({});
    expect(result.className).toMatch(/^m-[a-z0-9]+$/);
    expect(result.css).toContain('@layer motif {');
    expect(result.css).toContain('background-color: red');
  });

  it('agrees with the runtime resolver on the class name', () => {
    // The compiled and runtime paths must hash identically or a partially
    // compiled page emits two classes for one set of declarations.
    const props = { bg: 'red', p: 4 };
    const result = extractWeb(fakeStaticAnalysis(props), { cssLayer: 'motif' });

    const { atRules } = resolveResponsiveStylesToVars(props, { baseAsClass: true });
    expect(result.className).toBe(hashAtRules(atRules, 'motif'));
    expect(result.css).toBe(buildAtRulesCss(hashAtRules(atRules, 'motif'), atRules, 'motif'));
  });

  it('layers pseudo rules too', () => {
    const result = extractWeb(
      {
        classification: 'static',
        staticProps: [],
        dynamicProps: [],
        passThrough: [],
        pseudoStateProps: [{ name: '_hover', pseudo: ':hover', style: { opacity: 0.9 } }],
        motionProps: [],
        hasSpread: false,
      },
      { cssLayer: 'motif' },
    );

    expect(result.css).toContain('@layer motif {');
    expect(result.css).toContain(':hover');
  });

  it('produces a different class per layer', () => {
    const props = { bg: 'red' };
    const a = extractWeb(fakeStaticAnalysis(props), { cssLayer: 'motif' });
    const b = extractWeb(fakeStaticAnalysis(props), { cssLayer: 'other' });

    expect(a.className).not.toBe(b.className);
  });

  it('is byte-identical to today when no layer is passed', () => {
    const props = { bg: 'red', p: { base: 4, md: 8 } };

    expect(extractWeb(fakeStaticAnalysis(props), {})).toEqual(
      extractWeb(fakeStaticAnalysis(props)),
    );
  });
});

describe('extractWeb - pseudo-element parity with the runtime', () => {
  // The runtime Box builds these rules with resolvePseudoElementBag, keys them
  // '::before' / '::after', and emits before after; the compiler must agree
  // byte for byte so compiled and runtime elements share one class.
  function analysis(bags: Record<string, Record<string, unknown>>): CallSiteAnalysis {
    return {
      ...fakeStaticAnalysis({}),
      pseudoStateProps: Object.entries(bags).map(([name, style]) => ({
        name,
        pseudo: name === '_before' ? '::before' : '::after',
        style,
      })),
    };
  }

  it('emits ::before and ::after with the runtime class and CSS, content defaulted', () => {
    const before = { content: '"\\2022"', color: '$colors.text.muted', mr: 4 };
    const after = { bg: '$colors.surface.muted' };
    const rules = [
      { pseudo: '::before', style: resolvePseudoElementBag(before) },
      { pseudo: '::after', style: resolvePseudoElementBag(after) },
    ];
    const expectedClass = hashPseudoRules(rules);
    // Attribute order is after-then-before here; the runtime order wins.
    const actual = extractWeb(analysis({ _after: after, _before: before }));
    expect(actual.className).toBe(expectedClass);
    expect(actual.css).toBe(buildPseudoCss(expectedClass, rules));
    expect(actual.css).toContain('::before');
    expect(actual.css).toContain('content: ""');
    expect(actual.consumedProps).toEqual(['_after', '_before']);
  });
});

describe('extractWeb - atomic output', () => {
  it('gives each declaration a shared class, the same on every element', () => {
    const a = extractWeb(fakeStaticAnalysis({ p: '$4', bg: '$colors.brand.500' }), {
      atomic: true,
    });
    const b = extractWeb(fakeStaticAnalysis({ bg: '$colors.brand.500', m: 2 }), { atomic: true });
    expect(a.inlineStyle).toEqual({});
    expect(a.className!.split(' ')).toHaveLength(2);
    expect(a.css.split('\n')).toEqual([
      expect.stringMatching(/^\.a-\w+ \{ padding: var\(--space-4\); \}$/),
      expect.stringMatching(/^\.a-\w+ \{ background-color: var\(--colors-brand-500\); \}$/),
    ]);
    const shared = a.className!.split(' ')[1]!;
    expect(b.className!.split(' ')).toContain(shared);
    expect(b.css).toContain(`.${shared} {`);
  });

  it('keeps declarations that override one another on the per-element path', () => {
    const r = extractWeb(
      fakeStaticAnalysis({ p: '$4', pt: '$2', bg: { base: 'red', md: 'blue' }, opacity: 1 }),
      { atomic: true },
    );
    expect(r.inlineStyle).toEqual({ padding: 'var(--space-4)', paddingTop: 'var(--space-2)' });
    const classes = r.className!.split(' ');
    expect(classes.filter((c) => c.startsWith('a-'))).toHaveLength(1);
    expect(classes.filter((c) => c.startsWith('m-'))).toHaveLength(1);
    expect(r.css).toMatch(/\.a-\w+ \{ opacity: 1; \}/);
    expect(r.css).toContain('@media (min-width: 768px)');
  });

  it('atomizes a state declaration with its selector, and wraps each atom in the layer', () => {
    const analysis: CallSiteAnalysis = {
      ...fakeStaticAnalysis({ p: '$4' }),
      pseudoStateProps: [{ name: '_hover', pseudo: ':hover', style: { opacity: 0.5 } }],
    };
    const r = extractWeb(analysis, { atomic: true, cssLayer: 'motif' });
    const lines = r.css.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/^@layer motif \{ \.a-\w+:hover \{ opacity: 0\.5; \} \}$/);
  });
});
