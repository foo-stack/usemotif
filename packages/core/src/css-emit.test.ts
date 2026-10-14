import { describe, expect, it } from 'vitest';
import {
  buildAtRulesCss,
  buildPseudoCss,
  escapeCssValue,
  escapeCssVarNameSegment,
  hashAtRules,
  hashPseudoRules,
  maybePx,
  wrapInLayer,
} from './css-emit.js';
import { resolveStateRules, resolveStylesToVars } from './style.js';

describe('maybePx unitless props', () => {
  it('appends px to length-like numeric props', () => {
    expect(maybePx('padding', 8)).toBe('8px');
    expect(maybePx('width', 100)).toBe('100px');
  });

  it('keeps React isUnitlessNumber props bare (no px)', () => {
    // Regression: aspect-ratio / flex / grid line props must not get a `px`
    // suffix - the browser drops `aspect-ratio: 1.5px`, and the compiler/
    // runtime would otherwise emit divergent (non-deduping) CSS.
    expect(maybePx('aspectRatio', 1.5)).toBe('1.5');
    expect(maybePx('flex', 1)).toBe('1');
    expect(maybePx('gridColumn', 2)).toBe('2');
    expect(maybePx('gridColumnStart', 2)).toBe('2');
    expect(maybePx('gridColumnEnd', 4)).toBe('4');
    expect(maybePx('gridRow', 1)).toBe('1');
    expect(maybePx('gridArea', 1)).toBe('1');
    expect(maybePx('opacity', 0.5)).toBe('0.5');
    expect(maybePx('zIndex', 10)).toBe('10');
  });

  it('emits unitless values through stringifyDeclarations / buildAtRulesCss', () => {
    const css = buildAtRulesCss('m-abc', [{ atRule: '', style: { aspectRatio: 1.5, flex: 1 } }]);
    expect(css).toBe('.m-abc { aspect-ratio: 1.5; flex: 1; }');
  });
});

describe('escapeCssValue', () => {
  it('leaves legitimate values byte-identical', () => {
    expect(escapeCssValue('#ffffff')).toBe('#ffffff');
    expect(escapeCssValue('var(--space-4)')).toBe('var(--space-4)');
    expect(escapeCssValue('cubic-bezier(0.4, 0, 0.2, 1)')).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
    expect(escapeCssValue('"liga" 1')).toBe('"liga" 1');
  });

  it('does not touch backslash so author CSS escapes keep working', () => {
    expect(escapeCssValue('\\2022')).toBe('\\2022');
  });

  it('hex-escapes the structural breakout characters', () => {
    expect(escapeCssValue('red; } body {')).toBe('red\\3b  \\7d  body \\7b ');
    // `<` is escaped (defeats `</style>`); a bare `>` is left intact.
    expect(escapeCssValue('</style>')).toBe('\\3c /style>');
    expect(escapeCssValue('">"')).toBe('">"');
  });
});

describe('buildAtRulesCss escaping', () => {
  it('neutralises a value that tries to close the rule block', () => {
    const css = buildAtRulesCss('m-abc', [
      { atRule: '', style: { content: '"x"; } body { display: none } .y {' } },
    ]);
    expect(css).not.toMatch(/}\s*body/);
    expect(css.match(/}/g)?.length ?? 0).toBe(1); // only the real terminator
  });
});

describe('buildAtRulesCss', () => {
  it('wraps a media at-rule around the class selector', () => {
    const css = buildAtRulesCss('m-abc', [
      { atRule: '@media (min-width: 768px)', style: { padding: 16 } },
    ]);
    expect(css).toBe('@media (min-width: 768px) { .m-abc { padding: 16px; } }');
  });

  it('emits a bare class selector when atRule is the empty-string sentinel (1.6)', () => {
    // The base class block - emitted *without* an at-rule wrapper so it
    // sits at the same specificity (0,0,1,0) as its breakpoint
    // overrides.
    const css = buildAtRulesCss('m-abc', [{ atRule: '', style: { display: 'flex' } }]);
    expect(css).toBe('.m-abc { display: flex; }');
  });

  it('preserves source order: base block first, then media, then container', () => {
    // Source order matters: same-specificity rules cascade by appearance,
    // so base must precede the overrides.
    const css = buildAtRulesCss('m-abc', [
      { atRule: '', style: { display: 'block' } },
      { atRule: '@media (min-width: 768px)', style: { display: 'flex' } },
      { atRule: '@container card (min-width: 1024px)', style: { display: 'grid' } },
    ]);
    expect(css.split('\n')).toEqual([
      '.m-abc { display: block; }',
      '@media (min-width: 768px) { .m-abc { display: flex; } }',
      '@container card (min-width: 1024px) { .m-abc { display: grid; } }',
    ]);
  });
});

describe('buildPseudoCss', () => {
  it('scopes a single pseudo to the class', () => {
    expect(buildPseudoCss('m-abc', [{ pseudo: ':hover', style: { opacity: 0.8 } }])).toBe(
      '.m-abc:hover { opacity: 0.8; }',
    );
  });

  it('substitutes & with the class selector', () => {
    expect(
      buildPseudoCss('m-abc', [{ pseudo: '&[aria-disabled="true"]', style: { opacity: 0.5 } }]),
    ).toBe('.m-abc[aria-disabled="true"] { opacity: 0.5; }');
  });

  // Regression: `:disabled, &[aria-disabled="true"]` previously left the
  // first member as a page-global `:disabled` rule that styled every disabled
  // element in the app. Every comma-separated member must be class-scoped.
  it('scopes every member of a selector list - no bare global :disabled', () => {
    const css = buildPseudoCss('m-abc', [
      { pseudo: '&:disabled, &[aria-disabled="true"]', style: { opacity: 0.5 } },
    ]);
    expect(css).toBe('.m-abc:disabled, .m-abc[aria-disabled="true"] { opacity: 0.5; }');
    // No selector member begins at the rule start or after the comma without
    // the class prefix (i.e. no global selector leaked in).
    expect(css).not.toMatch(/(^|,\s*):disabled/);
  });

  it('scopes a bare (un-&-prefixed) member defensively', () => {
    // Even if a member omits `&`, it must still be scoped to the class.
    const css = buildPseudoCss('m-abc', [
      { pseudo: ':disabled, &[aria-disabled="true"]', style: { opacity: 0.5 } },
    ]);
    expect(css).not.toMatch(/(^|,\s*):disabled/);
    expect(css).toContain('.m-abc:disabled');
  });

  it('does not split commas inside :not() or attribute values', () => {
    const css = buildPseudoCss('m-abc', [
      { pseudo: '&:not(:first-child, :last-child)', style: { opacity: 1 } },
    ]);
    expect(css).toBe('.m-abc:not(:first-child, :last-child) { opacity: 1; }');
  });
});

describe('escapeCssVarNameSegment', () => {
  it('leaves safe segments unchanged and maps dots to underscores', () => {
    expect(escapeCssVarNameSegment('blue-500')).toBe('blue-500');
    expect(escapeCssVarNameSegment('0.5')).toBe('0_5');
  });

  it('hex-escapes structural characters from untrusted keys', () => {
    const out = escapeCssVarNameSegment('x;}body{');
    expect(out).not.toContain('}');
    expect(out).not.toContain('{');
    expect(out).not.toContain(';');
    expect(out).toContain('\\7d '); // }
    expect(out).toContain('\\7b '); // {
    expect(out).toContain('\\3b '); // ;
  });
});

describe('hashAtRules', () => {
  it('produces deterministic hashes including the empty-atRule sentinel', () => {
    // The base block must contribute to the hash so two boxes with the
    // same overrides but different bases get distinct class names.
    const a = hashAtRules([
      { atRule: '', style: { display: 'block' } },
      { atRule: '@media (min-width: 768px)', style: { display: 'flex' } },
    ]);
    const b = hashAtRules([
      { atRule: '', style: { display: 'inline-block' } },
      { atRule: '@media (min-width: 768px)', style: { display: 'flex' } },
    ]);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^m-[a-z0-9]+$/);
  });

  // Regression: the old `|` / `||` join was not injective. These two
  // structurally-different rule sets both serialised to `m|||n|` under it
  // and collided on one class name; the JSON-encoded serialisation keeps
  // them distinct.
  it('does not collide when a selector contains the old delimiter chars', () => {
    const twoRules = hashAtRules([
      { atRule: 'm', style: {} },
      { atRule: 'n', style: {} },
    ]);
    const oneRule = hashAtRules([{ atRule: 'm|||n', style: {} }]);
    expect(twoRules).not.toBe(oneRule);
  });
});

describe('wrapInLayer', () => {
  it('returns the CSS unchanged with no layer', () => {
    expect(wrapInLayer('.a { color: red; }')).toBe('.a { color: red; }');
    expect(wrapInLayer('.a { color: red; }', '')).toBe('.a { color: red; }');
  });

  it('wraps in @layer when a name is given', () => {
    expect(wrapInLayer('.a { color: red; }', 'motif')).toBe('@layer motif { .a { color: red; } }');
  });

  it('accepts dot-separated sub-layer names', () => {
    expect(wrapInLayer('.a{}', 'motif.base')).toBe('@layer motif.base { .a{} }');
  });

  it('leaves empty CSS empty rather than emitting a bare layer block', () => {
    expect(wrapInLayer('', 'motif')).toBe('');
  });

  it('rejects a layer name that is not a CSS identifier', () => {
    // A layer name is structural, not a value - mangling it would produce a
    // layer the app cannot order against, so this throws rather than escapes.
    expect(() => wrapInLayer('.a{}', 'a { } .evil')).toThrow(/invalid CSS layer name/);
    expect(() => wrapInLayer('.a{}', '9lives')).toThrow(/invalid CSS layer name/);
    expect(() => wrapInLayer('.a{}', 'has space')).toThrow(/invalid CSS layer name/);
  });
});

describe('layered rule building', () => {
  const atRules = [{ atRule: '', style: { color: 'red' } }];
  const pseudoRules = [{ pseudo: ':hover', style: { opacity: 0.8 } }];

  it('wraps at-rule CSS in the layer', () => {
    expect(buildAtRulesCss('m-x', atRules, 'motif')).toBe('@layer motif { .m-x { color: red; } }');
  });

  it('wraps pseudo CSS in the layer', () => {
    expect(buildPseudoCss('m-x', pseudoRules, 'motif')).toBe(
      '@layer motif { .m-x:hover { opacity: 0.8; } }',
    );
  });

  it('emits identical CSS to today when no layer is given', () => {
    expect(buildAtRulesCss('m-x', atRules)).toBe('.m-x { color: red; }');
    expect(buildPseudoCss('m-x', pseudoRules)).toBe('.m-x:hover { opacity: 0.8; }');
  });

  it('folds the layer into the class hash so layers cannot collide', () => {
    // Same declarations, different layer - these must not dedup to one class,
    // or the second scope's rule would never be emitted by the style cache.
    expect(hashAtRules(atRules, 'motif')).not.toBe(hashAtRules(atRules, 'other'));
    expect(hashPseudoRules(pseudoRules, 'motif')).not.toBe(hashPseudoRules(pseudoRules, 'other'));
  });

  it('keeps unlayered class names byte-identical', () => {
    expect(hashAtRules(atRules, undefined)).toBe(hashAtRules(atRules));
    expect(hashAtRules(atRules, '')).toBe(hashAtRules(atRules));
    expect(hashPseudoRules(pseudoRules, '')).toBe(hashPseudoRules(pseudoRules));
  });
});

describe('resolveStateRules', () => {
  it('keeps a flat bag as one rule, hashed exactly as before', () => {
    const rules = resolveStateRules(':hover', { opacity: 0.5, bg: 'red' });
    expect(rules).toEqual([
      { pseudo: ':hover', style: resolveStylesToVars({ opacity: 0.5, bg: 'red' }).style },
    ]);
    expect(hashPseudoRules(rules)).toBe(
      hashPseudoRules([
        { pseudo: ':hover', style: resolveStylesToVars({ opacity: 0.5, bg: 'red' }).style },
      ]),
    );
  });

  it('nests responsive slots in at-rules under the state selector', () => {
    const rules = resolveStateRules(':hover', { bg: { base: 'red', md: 'blue' }, opacity: 0.5 });
    expect(rules).toEqual([
      { pseudo: ':hover', style: { backgroundColor: 'red', opacity: 0.5 } },
      { pseudo: ':hover', style: { backgroundColor: 'blue' }, at: '@media (min-width: 768px)' },
    ]);
    expect(buildPseudoCss('m-x', rules)).toBe(
      '.m-x:hover { background-color: red; opacity: 0.5; }\n' +
        '@media (min-width: 768px) { .m-x:hover { background-color: blue; } }',
    );
  });

  it('takes the array and DSL forms, and container keys', () => {
    expect(resolveStateRules(':hover', { opacity: [1, undefined, 0.5] })[1]?.at).toBe(
      '@media (min-width: 768px)',
    );
    expect(resolveStateRules(':hover', { opacity: 'base:1 md:0.5' })[1]?.at).toBe(
      '@media (min-width: 768px)',
    );
    expect(resolveStateRules(':hover', { opacity: { base: 1, '@md': 0.5 } })[1]?.at).toMatch(
      /^@container/,
    );
  });

  it('keeps the at-rule in the hash, so the same declarations at two widths do not collide', () => {
    const flat = [{ pseudo: ':hover', style: { opacity: 0.5 } }];
    const nested = [{ pseudo: ':hover', style: { opacity: 0.5 }, at: '@media (min-width: 768px)' }];
    expect(hashPseudoRules(nested)).not.toBe(hashPseudoRules(flat));
  });
});
