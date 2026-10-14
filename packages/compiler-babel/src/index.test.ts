import { transformSync } from '@babel/core';
import {
  configureBreakpoints,
  hashPseudoRules,
  resolveResponsiveStylesToVars,
  resolveStateRules,
} from '@usemotif/core';
import { afterEach, describe, expect, it } from 'vitest';
import motifBabelPlugin, {
  type AggressiveReport,
  type BailEvent,
  type MotifBabelOptions,
} from './index.js';

interface TransformResult {
  readonly code: string;
  readonly css: string;
}

function transform(source: string, options: MotifBabelOptions = {}): TransformResult {
  const cssChunks: string[] = [];
  const result = transformSync(source, {
    babelrc: false,
    configFile: false,
    filename: 'test.tsx',
    plugins: [
      [
        motifBabelPlugin,
        {
          ...options,
          onCss: (css) => {
            cssChunks.push(css);
            options.onCss?.(css);
          },
        } satisfies MotifBabelOptions,
      ],
    ],
    parserOpts: { plugins: ['jsx', 'typescript'] },
    generatorOpts: { compact: false, retainLines: false },
  });
  return { code: result?.code ?? '', css: cssChunks.join('\n') };
}

/** Extract the generated `m-<hash>` class from transformed code, if any. */
function motifClassName(code: string): string | undefined {
  return code.match(/className="(m-[a-z0-9]+)"/)?.[1];
}

/** A component source using a `useMedia()` result on a single Box prop. */
function withMedia(prop: string): string {
  return `import { Box, useMedia } from '@usemotif/react';
     const X = () => { const media = useMedia(); return <Box ${prop} />; };`;
}

describe('motif babel plugin - extraction', () => {
  it('bakes literal style props into a style attribute', () => {
    const { code, css } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box p={4} bg="red" />;
    `);
    expect(code).not.toMatch(/\bp=\{4\}/);
    expect(code).not.toMatch(/bg="red"/);
    expect(code).toContain('style');
    expect(code).toContain('padding: 4');
    expect(code).toContain('backgroundColor: "red"');
    expect(css).toBe('');
  });

  it('emits a className and CSS for responsive props', () => {
    const { code, css } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box p={{ base: '$2', md: '$4' }} />;
    `);
    expect(code).toMatch(/className="m-[a-z0-9]+"/);
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).toContain('--space-4');
  });

  it('leaves dynamic call sites untouched', () => {
    const { code, css } = transform(`
      import { Box } from '@usemotif/react';
      const X = ({ size }) => <Box p={size} />;
    `);
    expect(code).toContain('p={size}');
    expect(css).toBe('');
  });

  it('handles partial-static - keeps dynamic props on JSX, bakes static ones', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = ({ brand }) => <Box p={4} bg={brand} />;
    `);
    expect(code).not.toMatch(/\bp=\{4\}/);
    expect(code).toContain('bg={brand}');
    expect(code).toContain('padding: 4');
  });

  it('bails on spread', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = ({ rest }) => <Box p={4} {...rest} />;
    `);
    expect(code).toContain('p={4}');
    expect(code).toContain('...rest');
  });

  it('does not touch non-motif components', () => {
    const { code } = transform(`
      import { Box } from '@chakra-ui/react';
      const X = () => <Box p={4} />;
    `);
    expect(code).toContain('p={4}');
  });

  it('respects aliased imports', () => {
    const { code } = transform(`
      import { Box as MotifBox } from '@usemotif/react';
      const X = () => <MotifBox p={4} />;
    `);
    expect(code).not.toMatch(/p=\{4\}/);
    expect(code).toContain('padding: 4');
  });

  it('merges baked style with an existing literal style attribute (user wins)', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box p={4} style={{ padding: 99 }} />;
    `);
    // User's `padding: 99` must remain (it's the override per Box semantics).
    expect(code).toContain('padding: 99');
  });

  it('appends a generated className to an existing className', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box p={{ base: '$2', md: '$4' }} className="user" />;
    `);
    expect(code).toMatch(/className="m-[a-z0-9]+ user"/);
  });

  it('does not leave a trailing space when the existing className is empty (#306)', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box p={{ base: '$2', md: '$4' }} className="" />;
    `);
    // filter(Boolean) drops the empty existing class → no `"m-x "` trailing space.
    expect(code).toMatch(/className="m-[a-z0-9]+"/);
    expect(code).not.toMatch(/className="m-[a-z0-9]+ "/);
  });

  // #176 - a dynamic className must merge with falsy-safe semantics
  // (`[...].filter(Boolean).join(' ')`), not raw `+` concatenation, so a
  // falsy value never stringifies into the class list (`"m-x undefined"`).
  it('merges a dynamic className with filter(Boolean), not raw concat', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = ({ cls }) => <Box p={{ base: '$2', md: '$4' }} className={cls} />;
    `);
    expect(code).toMatch(/\[\s*"m-[a-z0-9]+",\s*cls\s*\]\.filter\(Boolean\)\.join\(" "\)/);
    // The brittle concatenation form must be gone.
    expect(code).not.toMatch(/"m-[a-z0-9]+ "\s*\+/);
  });

  it('extracts named container queries', () => {
    const { code, css } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box p={{ base: '$2', '@card.lg': '$8' }} />;
    `);
    expect(code).toMatch(/className="m-[a-z0-9]+"/);
    expect(css).toContain('@container card (min-width: 1024px)');
  });

  it('processes Stack and HStack identically', () => {
    const { code } = transform(`
      import { Stack, HStack } from '@usemotif/react';
      const X = () => <><Stack p={4} /><HStack m={2} /></>;
    `);
    expect(code).not.toMatch(/p=\{4\}/);
    expect(code).not.toMatch(/m=\{2\}/);
  });

  it('hoists native styles into StyleSheet.create when target is native', () => {
    const { code, css } = transform(
      `
      import { Box } from '@usemotif/react-native';
      const X = () => <Box p={4} />;
    `,
      { target: 'native' },
    );
    expect(code).not.toMatch(/\bp=\{4\}/);
    expect(code).toContain('StyleSheet');
    expect(code).toContain('_motifStyles');
    expect(code).toContain('padding: 4');
    expect(css).toBe('');
  });

  it('invokes onCss exactly once per file with non-empty CSS', () => {
    let calls = 0;
    transform(
      `
      import { Box } from '@usemotif/react';
      const X = () => <><Box p={{ base: '$1', md: '$2' }} /><Box p={{ base: '$3', md: '$4' }} /></>;
    `,
      {
        onCss: () => {
          calls += 1;
        },
      },
    );
    expect(calls).toBe(1);
  });

  it('does not call onCss when nothing was extracted', () => {
    let calls = 0;
    transform(
      `
      import { Box } from '@usemotif/react';
      const X = ({ x }) => <Box p={x} />;
    `,
      {
        onCss: () => {
          calls += 1;
        },
      },
    );
    expect(calls).toBe(0);
  });
});

describe('motif babel plugin - non-identifier object keys (#285)', () => {
  it('quotes a non-identifier key (2xl) when baking a responsive object into a prop', () => {
    const { code } = transform(`
      import { Box, styled } from 'usemotif';
      const B = styled(Box, {
        base: { p: { base: 2, '2xl': 8 } },
        variants: { tone: { soft: { opacity: 0.5 } } },
      });
      const X = () => <B tone="soft" />;
    `);
    // The variant path re-emits the merged \`p\` responsive object as a JSX
    // prop. The \`2xl\` key is not a valid JS identifier, so it must be quoted;
    // an unquoted \`2xl:\` would be unparseable and break the build.
    expect(code).toMatch(/(['"])2xl\1\s*:/);
    expect(code).not.toMatch(/[^'"\w]2xl\s*:/);
    // And the whole emitted module must re-parse.
    expect(() =>
      transformSync(code ?? '', {
        babelrc: false,
        configFile: false,
        filename: 'out.tsx',
        parserOpts: { plugins: ['jsx', 'typescript'] },
      }),
    ).not.toThrow();
  });
});

describe('motif babel plugin - binding resolution', () => {
  it('does not rewrite a JSX name shadowed by a local binding', () => {
    const { code, css } = transform(`
      import { Box } from '@usemotif/react';
      function Demo({ components }) {
        const Box = components.Box;
        return <Box padding={4} />;
      }
    `);
    // The local \`Box\` shadows the import - must be left untouched, not folded
    // into a <div>/style.
    expect(code).toMatch(/padding=\{4\}/);
    expect(code).not.toContain('<div');
    expect(css).toBe('');
  });

  it('does not register a declaration-level type-only import', () => {
    const { code, css } = transform(`
      import type { Box } from '@usemotif/react';
      const X = () => <Box padding={4} />;
    `);
    expect(code).toMatch(/padding=\{4\}/);
    expect(css).toBe('');
  });

  it('does not register a specifier-level type-only import', () => {
    const { code, css } = transform(`
      import { type Box } from '@usemotif/react';
      const X = () => <Box padding={4} />;
    `);
    expect(code).toMatch(/padding=\{4\}/);
    expect(css).toBe('');
  });

  it('expands styled() imported from the umbrella `usemotif` package', () => {
    const { code } = transform(`
      import { Box, styled } from 'usemotif';
      const Big = styled(Box, { base: { p: 8 } });
      const X = () => <Big />;
    `);
    expect(code).toContain('padding: 8');
    expect(code).not.toMatch(/<Big\b/);
  });

  it('bails styled expansion when a caller prop colliding with config may be undefined', () => {
    const { code } = transform(`
      import { Box, styled } from 'usemotif';
      const Card = styled(Box, { base: { padding: 16 } });
      const X = ({ cond }) => <Card padding={cond ? 4 : undefined} />;
    `);
    // The runtime keeps the config padding (16) when the caller value is
    // undefined; the compiler can't replicate that fallback, so it must NOT
    // expand - leave <Card> for the runtime.
    expect(code).toMatch(/<Card\b/);
  });

  it('still expands styled when the caller prop is definitely defined', () => {
    const { code } = transform(`
      import { Box, styled } from 'usemotif';
      const Card = styled(Box, { base: { padding: 16 } });
      const X = () => <Card padding={4} />;
    `);
    // Caller padding=4 is defined, so expansion proceeds and the caller wins.
    expect(code).not.toMatch(/<Card\b/);
    expect(code).toContain('padding: 4');
  });

  it('extracts a pseudo-state from a base-only styled() config', () => {
    const { code, css } = transform(`
      import { Box, styled } from 'usemotif';
      const Card = styled(Box, { base: { padding: 16, _hover: { backgroundColor: 'navy' } } });
      const X = () => <Card />;
    `);
    // Flattened to the host element with static padding baked inline...
    expect(code).not.toMatch(/<Card\b/);
    expect(code).toContain('padding: 16');
    // ...and the base _hover lifted to a hashed :hover rule, exactly as the
    // runtime would emit it (a styled() layer can now carry interaction state).
    expect(css).toMatch(/:hover\s*\{[^}]*background-color:\s*navy/);
  });

  it('extracts _checked / _selected to their ARIA-state pseudo rules', () => {
    const { css } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => (
        <Box _checked={{ backgroundColor: 'navy' }} _selected={{ backgroundColor: 'teal' }} />
      );
    `);
    // :checked covers native inputs + [aria-checked]; _selected → [aria-selected].
    expect(css).toMatch(/:checked[^{]*\{[^}]*background-color:\s*navy/);
    expect(css).toMatch(/\[aria-selected="true"\]\s*\{[^}]*background-color:\s*teal/);
  });

  it('extracts _expanded to its [aria-expanded] pseudo rule', () => {
    const { css } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => (
        <Box _expanded={{ backgroundColor: 'olive' }} />
      );
    `);
    expect(css).toMatch(/\[aria-expanded="true"\]\s*\{[^}]*background-color:\s*olive/);
  });

  it('extracts _groupHover to a rule keyed on the group ancestor', () => {
    const { code, css } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box _groupHover={{ color: 'red' }} />;
    `);
    const cls = hashPseudoRules(resolveStateRules('[data-motif-group]:hover &', { color: 'red' }));
    expect(code).toContain(`<div className="${cls}"`);
    expect(css).toContain(`[data-motif-group]:hover .${cls} { color: red; }`);
  });

  it('extracts a responsive state bag with the class and CSS the runtime builds', () => {
    const { code, css } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box _hover={{ bg: { base: 'red', md: 'blue' } }} />;
    `);
    const cls = hashPseudoRules(resolveStateRules(':hover', { bg: { base: 'red', md: 'blue' } }));
    expect(code).toContain(`<div className="${cls}"`);
    expect(css).toContain(
      `@media (min-width: 768px) { .${cls}:hover { background-color: blue; } }`,
    );
  });

  it('extracts _invalid, _pressed, _focusWithin and _readOnly, and strips the Box', () => {
    const { code, css } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => (
        <Box
          _invalid={{ borderColor: 'red' }}
          _pressed={{ backgroundColor: 'navy' }}
          _focusWithin={{ outlineColor: 'blue' }}
          _readOnly={{ opacity: 0.6 }}
        />
      );
    `);
    expect(code).toMatch(/<div className=/);
    expect(css).toMatch(/\[aria-invalid="true"\]\s*\{[^}]*border-color:\s*red/);
    expect(css).toMatch(/\[aria-pressed="true"\]\s*\{[^}]*background-color:\s*navy/);
    expect(css).toMatch(/:focus-within\s*\{[^}]*outline-color:\s*blue/);
    expect(css).toMatch(/\[readonly\][^{]*\{[^}]*opacity:\s*0\.6/);
  });

  it('keeps a static prop conflicting with a dynamic prop on the JSX (no precedence inversion)', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = ({ x }) => <Box p={4} pt={x} />;
    `);
    // p (padding) conflicts with pt (paddingTop, dynamic) → p stays on the JSX
    // so the runtime resolves both in source order (pt wins at the top edge).
    expect(code).toMatch(/p=\{4\}/);
    expect(code).toMatch(/pt=\{x\}/);
  });

  it('does not expand a styled local shadowed at the call site', () => {
    const { code } = transform(`
      import { Box, styled } from 'usemotif';
      const Card = styled(Box, { base: { padding: 16 } });
      function Demo({ Card }) {
        return <Card size="sm" />;
      }
    `);
    // The destructured \`Card\` param shadows the module styled() const, so
    // the element must be left as <Card> (not expanded to the primitive).
    expect(code).toMatch(/<Card\b/);
    expect(code).toMatch(/size="sm"/);
  });

  it('leaves a context-bound styled at runtime (the context field forces a bail)', () => {
    const { code } = transform(`
      import { Box, styled, createStyledContext } from 'usemotif';
      const Ctx = createStyledContext({ size: 'md' });
      const Frame = styled(Box, { context: Ctx, base: { padding: 8 } });
      const X = () => <Frame />;
    `);
    // The context field needs runtime React context, so the config is an
    // unknown-key bail - <Frame> must stay for the runtime, never expanded.
    expect(code).toMatch(/<Frame\b/);
  });

  it('bails styled expansion when a value routes through a ctx-aware fallback variant', () => {
    const { code } = transform(`
      import { Box, styled } from 'usemotif';
      const Chip = styled(Box, {
        variants: { '...scale': (v, ctx) => ({ padding: v * (ctx.tokens ? 1 : 1) }) },
      });
      const X = () => <Chip scale={10} />;
    `);
    // Fallback bodies are opaque at compile time, so an active fallback value
    // forces a bail - <Chip> stays for the runtime.
    expect(code).toMatch(/<Chip\b/);
  });
});

describe('motif babel plugin - aggressive: static spread extraction', () => {
  it('safe mode (default) leaves a static object spread untouched', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box {...{ padding: 8 }} />;
    `);
    // No optimizationLevel → conservative tier: the spread forces a runtime
    // bail, so the element is left exactly as written.
    expect(code).toMatch(/\.\.\./);
    expect(code).toMatch(/<Box\b/);
  });

  it('aggressive inlines a static object spread and bakes it', () => {
    const { code } = transform(
      `
      import { Box } from '@usemotif/react';
      const X = () => <Box {...{ padding: 8 }} />;
    `,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).not.toMatch(/\.\.\./);
    expect(code).toContain('padding: 8');
  });

  it('aggressive resolves a const-bound static spread', () => {
    const { code } = transform(
      `
      import { Box } from '@usemotif/react';
      const S = { padding: 8 };
      const X = () => <Box {...S} />;
    `,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).not.toMatch(/\{\.\.\.S\}/);
    expect(code).toContain('padding: 8');
  });

  it('aggressive resolves an aliased shorthand inside the spread', () => {
    const { code } = transform(
      `
      import { Box } from '@usemotif/react';
      const X = () => <Box {...{ p: 8 }} />;
    `,
      { optimizationLevel: 'aggressive' },
    );
    // p → padding through the alias map, exactly as an explicit p={8} would.
    expect(code).toContain('padding: 8');
  });

  it('aggressive preserves precedence - a later explicit prop wins over the spread', () => {
    const { code } = transform(
      `
      import { Box } from '@usemotif/react';
      const X = () => <Box {...{ padding: 8 }} padding={4} />;
    `,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).toContain('padding: 4');
    expect(code).not.toContain('padding: 8');
  });

  it('aggressive preserves precedence - a later spread wins over an earlier prop', () => {
    const { code } = transform(
      `
      import { Box } from '@usemotif/react';
      const X = () => <Box padding={4} {...{ padding: 8 }} />;
    `,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).toContain('padding: 8');
    expect(code).not.toContain('padding: 4');
  });

  it('aggressive still bails on a dynamic spread', () => {
    const { code } = transform(
      `
      import { Box } from '@usemotif/react';
      const X = ({ rest }) => <Box {...rest} />;
    `,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).toContain('...rest');
  });

  it('aggressive bails on a spread that carries a dynamic value', () => {
    const { code } = transform(
      `
      import { Box } from '@usemotif/react';
      const X = ({ x }) => <Box {...{ padding: x }} />;
    `,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).toMatch(/\.\.\./); // spread left intact
  });

  it('produces byte-identical output to the explicit-prop equivalent (same hash + CSS)', () => {
    const viaSpread = transform(
      `import { Box } from '@usemotif/react';
       const X = () => <Box {...{ p: { base: '$2', md: '$4' } }} />;`,
      { optimizationLevel: 'aggressive' },
    );
    const viaExplicit = transform(
      `import { Box } from '@usemotif/react';
       const X = () => <Box p={{ base: '$2', md: '$4' }} />;`,
    );
    // The spread path runs through the identical extract pipeline, so the
    // generated class hash and CSS body must match the explicit form exactly
    // - and therefore match the runtime too (guardrail: byte-for-byte parity).
    expect(motifClassName(viaSpread.code)).toBeDefined();
    expect(motifClassName(viaSpread.code)).toBe(motifClassName(viaExplicit.code));
    expect(viaSpread.css).toBe(viaExplicit.css);
  });

  it('inlines a static spread on the native target too (hoisted into the StyleSheet)', () => {
    const { code } = transform(
      `import { Box } from '@usemotif/react-native';
       const X = () => <Box {...{ padding: 8 }} />;`,
      { target: 'native', optimizationLevel: 'aggressive' },
    );
    expect(code).not.toMatch(/\.\.\./);
    expect(code).toMatch(/id0:\s*\{[^}]*padding:\s*8/);
  });

  it('reports inlined and bailed spread counts', () => {
    const reports: AggressiveReport[] = [];
    transform(
      `
      import { Box } from '@usemotif/react';
      const A = () => <Box {...{ padding: 8 }} />;
      const B = ({ rest }) => <Box {...rest} />;
    `,
      { optimizationLevel: 'aggressive', onAggressiveReport: (r) => reports.push(r) },
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]?.spreadsInlined).toBe(1);
    expect(reports[0]?.spreadsBailed).toBe(1);
  });

  it('safe mode never invokes the aggressive report', () => {
    const reports: AggressiveReport[] = [];
    transform(
      `
      import { Box } from '@usemotif/react';
      const X = () => <Box {...{ padding: 8 }} />;
    `,
      { onAggressiveReport: (r) => reports.push(r) },
    );
    expect(reports).toHaveLength(0);
  });
});

describe('motif babel plugin - aggressive: static ternary extraction', () => {
  it('lowers prop={cond ? A : B} to a conditional inline style value', () => {
    const { code } = transform(
      `import { Box } from '@usemotif/react';
       const X = ({ cond }) => <Box p={cond ? 4 : 8} />;`,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).not.toMatch(/\bp=\{/);
    expect(code).toMatch(/padding:\s*cond\s*\?\s*4\s*:\s*8/);
  });

  it('safe mode (default) leaves the ternary on the JSX', () => {
    const { code } = transform(
      `import { Box } from '@usemotif/react';
       const X = ({ cond }) => <Box p={cond ? 4 : 8} />;`,
    );
    expect(code).toMatch(/p=\{cond \? 4 : 8\}/);
  });

  it('resolves token-reference branches to CSS vars', () => {
    const { code } = transform(
      `import { Box } from '@usemotif/react';
       const X = ({ on }) => <Box bg={on ? '$colors.brand' : '$colors.muted'} />;`,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).toMatch(/backgroundColor:\s*on\s*\?/);
    expect(code).toContain('var(--colors-brand)');
    expect(code).toContain('var(--colors-muted)');
  });

  it('coexists with a static sibling prop in one inline style object', () => {
    const { code } = transform(
      `import { Box } from '@usemotif/react';
       const X = ({ cond }) => <Box p={cond ? 4 : 8} bg="red" />;`,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).toContain('backgroundColor: "red"');
    expect(code).toMatch(/padding:\s*cond\s*\?\s*4\s*:\s*8/);
    expect(code).not.toMatch(/\bp=\{/);
    expect(code).not.toMatch(/bg=/);
  });

  it('bails all ternaries when a truly-dynamic prop is also present', () => {
    const { code } = transform(
      `import { Box } from '@usemotif/react';
       const X = ({ cond, m }) => <Box p={cond ? 4 : 8} m={m} />;`,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).toMatch(/p=\{cond \? 4 : 8\}/);
    expect(code).toMatch(/m=\{m\}/);
  });

  it('bails when a static prop shares a shorthand family with the ternary (no cascade inversion)', () => {
    const { code } = transform(
      `import { Box } from '@usemotif/react';
       const X = ({ cond }) => <Box p={cond ? 4 : 8} pt={2} />;`,
      { optimizationLevel: 'aggressive' },
    );
    // pt (paddingTop) conflicts with the padding-family ternary; baking the
    // ternary post-base could invert source order, so leave it to the runtime.
    expect(code).toMatch(/p=\{cond \? 4 : 8\}/);
  });

  it('bails a ternary with a non-static branch', () => {
    const { code } = transform(
      `import { Box } from '@usemotif/react';
       const X = ({ cond, v }) => <Box p={cond ? v : 8} />;`,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).toMatch(/p=\{cond \? v : 8\}/);
  });

  it('bails a ternary whose branch is a responsive object', () => {
    const { code } = transform(
      `import { Box } from '@usemotif/react';
       const X = ({ cond }) => <Box p={cond ? { base: 2, md: 4 } : 8} />;`,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).toMatch(/p=\{cond \?/);
  });

  it('does not extract ternaries on the native target', () => {
    const { code } = transform(
      `import { Box } from '@usemotif/react-native';
       const X = ({ cond }) => <Box p={cond ? 4 : 8} />;`,
      { target: 'native', optimizationLevel: 'aggressive' },
    );
    expect(code).toMatch(/p=\{cond \? 4 : 8\}/);
  });

  it('reports the number of ternaries inlined', () => {
    const reports: AggressiveReport[] = [];
    transform(
      `import { Box } from '@usemotif/react';
       const X = ({ cond }) => <Box p={cond ? 4 : 8} />;`,
      { optimizationLevel: 'aggressive', onAggressiveReport: (r) => reports.push(r) },
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]?.ternariesInlined).toBe(1);
  });
});

describe('motif babel plugin - aggressive: useMedia erasure', () => {
  it('rewrites prop={media.bp ? A : B} to a CSS media query', () => {
    const { code, css } = transform(withMedia("flexDirection={media.md ? 'row' : 'column'}"), {
      optimizationLevel: 'aggressive',
    });
    expect(code).not.toMatch(/media\.md/); // the runtime media read is gone
    expect(code).toMatch(/className="m-[a-z0-9]+"/);
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).toMatch(/row/); // bp → truthy branch (exact mapping covered by the parity test)
  });

  it('produces the same output as the explicit responsive form (same hash + CSS)', () => {
    const viaMedia = transform(withMedia("flexDirection={media.md ? 'row' : 'column'}"), {
      optimizationLevel: 'aggressive',
    });
    const viaExplicit = transform(
      `import { Box } from '@usemotif/react';
       const X = () => <Box flexDirection={{ base: 'column', md: 'row' }} />;`,
    );
    expect(motifClassName(viaMedia.code)).toBeDefined();
    expect(motifClassName(viaMedia.code)).toBe(motifClassName(viaExplicit.code));
    expect(viaMedia.css).toBe(viaExplicit.css);
  });

  it('resolves token-reference branches', () => {
    const { css } = transform(withMedia("bg={media.lg ? '$colors.a' : '$colors.b'}"), {
      optimizationLevel: 'aggressive',
    });
    expect(css).toContain('@media (min-width: 1024px)');
    expect(css).toContain('var(--colors-a)');
  });

  it('safe mode leaves the media ternary on the JSX', () => {
    const { code, css } = transform(withMedia("flexDirection={media.md ? 'row' : 'column'}"));
    expect(code).toMatch(/media\.md \? 'row' : 'column'/);
    expect(css).toBe('');
  });

  it('bails when the variable is not a useMedia() result (falls back to inline ternary)', () => {
    const { code, css } = transform(
      `import { Box } from '@usemotif/react';
       const getMedia = () => ({ md: true });
       const X = () => { const media = getMedia(); return <Box flexDirection={media.md ? 'row' : 'column'} />; };`,
      { optimizationLevel: 'aggressive' },
    );
    // Not erased to CSS; the generic ternary path keeps it an inline conditional.
    expect(css).toBe('');
    expect(code).toMatch(/flexDirection: media\.md \?/);
  });

  it('bails when the media variable is reassigned (not const)', () => {
    const { css } = transform(
      `import { Box, useMedia } from '@usemotif/react';
       const X = () => { let media = useMedia(); media = media; return <Box flexDirection={media.md ? 'row' : 'column'} />; };`,
      { optimizationLevel: 'aggressive' },
    );
    expect(css).toBe(''); // not erased to a media query
  });

  it('bails a media ternary with a dynamic branch', () => {
    const { code } = transform(withMedia("flexDirection={media.md ? dir : 'column'}"), {
      optimizationLevel: 'aggressive',
    });
    expect(code).toMatch(/media\.md \? dir/);
  });

  it('does not erase on the native target', () => {
    const { code } = transform(withMedia("flexDirection={media.md ? 'row' : 'column'}"), {
      target: 'native',
      optimizationLevel: 'aggressive',
    });
    expect(code).toMatch(/flexDirection=\{media\.md \?/); // untouched on native
  });

  it('reports the number of media reads erased', () => {
    const reports: AggressiveReport[] = [];
    transform(withMedia("flexDirection={media.md ? 'row' : 'column'}"), {
      optimizationLevel: 'aggressive',
      onAggressiveReport: (r) => reports.push(r),
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]?.mediaErased).toBe(1);
  });
});

describe('motif babel plugin - aggressive: deeper wrapper flatten', () => {
  it('flattens a nested base-only styled() chain to the underlying element', () => {
    const { code } = transform(
      `import { Box, styled } from '@usemotif/react';
       const A = styled(Box, { base: { p: 8 } });
       const B = styled(A, { base: { m: 4 } });
       const X = () => <B />;`,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).not.toMatch(/<B\b/); // the chain collapsed away
    expect(code).toContain('padding: 8');
    expect(code).toContain('margin: 4');
  });

  it('safe mode (default) leaves a styled() chain at runtime', () => {
    const { code } = transform(
      `import { Box, styled } from '@usemotif/react';
       const A = styled(Box, { base: { p: 8 } });
       const B = styled(A, { base: { m: 4 } });
       const X = () => <B />;`,
    );
    expect(code).toMatch(/<B\s*\/>/); // not flattened
  });

  it('flattens a three-level chain', () => {
    const { code } = transform(
      `import { Box, styled } from '@usemotif/react';
       const A = styled(Box, { base: { p: 8 } });
       const B = styled(A, { base: { m: 4 } });
       const C = styled(B, { base: { borderRadius: 2 } });
       const X = () => <C />;`,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).not.toMatch(/<C\b/);
    expect(code).toContain('padding: 8');
    expect(code).toContain('margin: 4');
    expect(code).toContain('borderRadius: 2');
  });

  it('the outer base wins on a conflicting property', () => {
    const { code } = transform(
      `import { Box, styled } from '@usemotif/react';
       const A = styled(Box, { base: { p: 8 } });
       const B = styled(A, { base: { p: 16 } });
       const X = () => <B />;`,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).toContain('padding: 16');
    expect(code).not.toContain('padding: 8');
  });

  it('does not flatten a chain when a level has variants', () => {
    const { code } = transform(
      `import { Box, styled } from '@usemotif/react';
       const A = styled(Box, { variants: { size: { sm: { p: 4 } } } });
       const B = styled(A, { base: { m: 4 } });
       const X = () => <B />;`,
      { optimizationLevel: 'aggressive' },
    );
    expect(code).toMatch(/<B\s*\/>/); // variant level → left to the runtime
  });
});

describe('motif babel plugin - native StyleSheet hoisting', () => {
  function transformNative(source: string): { code: string } {
    const result = transformSync(source, {
      babelrc: false,
      configFile: false,
      filename: 'test.tsx',
      plugins: [[motifBabelPlugin, { target: 'native' } satisfies MotifBabelOptions]],
      parserOpts: { plugins: ['jsx', 'typescript'] },
      generatorOpts: { compact: false, retainLines: false },
    });
    return { code: result?.code ?? '' };
  }

  it('hoists a single Box style into _motifStyles.id0', () => {
    const { code } = transformNative(`
      import { Box } from '@usemotif/react-native';
      const X = () => <Box p={4} />;
    `);
    expect(code).toContain('import { StyleSheet as _motifStyleSheet } from "react-native"');
    expect(code).toMatch(/const _motifStyles = _motifStyleSheet\.create\(\{/);
    expect(code).toMatch(/id0:\s*\{[^}]*padding:\s*4/);
    expect(code).toMatch(/style=\{_motifStyles\.id0\}/);
  });

  it('hoists multiple call sites with sequential ids', () => {
    const { code } = transformNative(`
      import { Box } from '@usemotif/react-native';
      const X = () => <><Box p={4} /><Box m={8} /></>;
    `);
    expect(code).toMatch(/style=\{_motifStyles\.id0\}/);
    expect(code).toMatch(/style=\{_motifStyles\.id1\}/);
    expect(code).toMatch(/id0:\s*\{[^}]*padding:\s*4/);
    expect(code).toMatch(/id1:\s*\{[^}]*margin:\s*8/);
  });

  it('skips token-ref values (theme is dynamic on native)', () => {
    const { code } = transformNative(`
      import { Box } from '@usemotif/react-native';
      const X = () => <Box bg="$colors.brand.500" />;
    `);
    // Token ref → no literal extracted → no hoisting.
    expect(code).toContain('bg="$colors.brand.500"');
    expect(code).not.toContain('_motifStyles');
  });

  it('merges with an existing user style as an array (user wins)', () => {
    const { code } = transformNative(`
      import { Box } from '@usemotif/react-native';
      const X = () => <Box p={4} style={userStyle} />;
    `);
    // Hoisted entry first, user entry last → user overrides.
    expect(code).toMatch(/style=\{\[_motifStyles\.id0,\s*userStyle\]\}/);
  });

  it('prepends to an existing array style', () => {
    const { code } = transformNative(`
      import { Box } from '@usemotif/react-native';
      const X = () => <Box p={4} style={[a, b]} />;
    `);
    expect(code).toMatch(/style=\{\[_motifStyles\.id0,\s*a,\s*b\]\}/);
  });

  it('leaves dynamic call sites alone on native', () => {
    const { code } = transformNative(`
      import { Box } from '@usemotif/react-native';
      const X = ({ size }) => <Box p={size} />;
    `);
    expect(code).toContain('p={size}');
    expect(code).not.toContain('_motifStyles');
  });

  it('does not hoist when nothing was extracted', () => {
    const { code } = transformNative(`
      import { Box } from '@usemotif/react-native';
      const X = () => <Box bg="$colors.brand.500" />;
    `);
    expect(code).not.toContain('StyleSheet');
    expect(code).not.toContain('_motifStyles');
  });

  it('inserts the hoisted StyleSheet declaration after all imports', () => {
    const { code } = transformNative(`
      import { Box } from '@usemotif/react-native';
      import other from 'somewhere';
      const X = () => <Box p={4} />;
    `);
    const lastImportIdx = code.lastIndexOf("from 'somewhere'");
    const ssImportIdx = code.indexOf('_motifStyleSheet');
    const declIdx = code.indexOf('_motifStyles =');
    expect(lastImportIdx).toBeGreaterThanOrEqual(0);
    expect(ssImportIdx).toBeGreaterThan(lastImportIdx);
    expect(declIdx).toBeGreaterThan(ssImportIdx);
  });
});

describe('motif babel plugin - pseudo-state extraction', () => {
  it('extracts a static _hover bag into a className + pseudo CSS', () => {
    const { code, css } = transform(`
      import { Pressable } from '@usemotif/react';
      const X = () => <Pressable _hover={{ opacity: 0.9 }} />;
    `);
    expect(code).not.toMatch(/_hover=/);
    expect(code).toMatch(/className="m-[a-z0-9]+"/);
    expect(css).toContain(':hover');
    expect(css).toContain('opacity: 0.9');
  });

  it('combines at-rule + pseudo class names with a space', () => {
    const { code, css } = transform(`
      import { Pressable } from '@usemotif/react';
      const X = () => <Pressable p={{ base: '$2', md: '$4' }} _hover={{ opacity: 0.9 }} />;
    `);
    expect(code).toMatch(/className="m-[a-z0-9]+ m-[a-z0-9]+"/);
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).toContain(':hover');
  });

  it('rewrites & inside selectors to the generated class', () => {
    const { code, css } = transform(`
      import { Pressable } from '@usemotif/react';
      const X = () => <Pressable _disabled={{ opacity: 0.5 }} />;
    `);
    expect(code).toMatch(/className="m-[a-z0-9]+"/);
    expect(css).toContain('[aria-disabled="true"]');
    expect(css).toContain(':disabled');
    expect(css).not.toMatch(/&\[aria-disabled/);
  });

  it('leaves a dynamic _hover bag on the JSX', () => {
    const { code } = transform(`
      import { Pressable } from '@usemotif/react';
      const X = ({ hov }) => <Pressable _hover={hov} />;
    `);
    expect(code).toContain('_hover={hov}');
  });
});

describe('motif babel plugin - motion + animation extraction', () => {
  it('bakes a literal `transition` string into inline style', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box transition="opacity 200ms ease" />;
    `);
    expect(code).not.toMatch(/transition=/);
    expect(code).toContain('transition: "opacity 200ms ease"');
  });

  it('resolves a `transition` object literal with defaults', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box transition={{ property: 'opacity' }} />;
    `);
    expect(code).toContain('transition: "opacity 200ms ease"');
  });

  it('expands `animation="<name>"` to a var-based transition string', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box animation="bouncy" />;
    `);
    expect(code).not.toMatch(/animation=/);
    expect(code).toContain('var(--motif-anim-bouncy-duration)');
    expect(code).toContain('var(--motif-anim-bouncy-easing)');
  });

  it('respects `animateOnly` to limit the transition property list', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box animation="normal" animateOnly={['transform']} />;
    `);
    expect(code).toContain('transform var(--motif-anim-normal-duration)');
    expect(code).not.toMatch(/animateOnly=/);
  });

  it('emits an [data-motif-state="exiting"] pseudo rule for `exitStyle`', () => {
    const { code, css } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box exitStyle={{ opacity: 0 }} />;
    `);
    expect(code).not.toMatch(/exitStyle=/);
    expect(code).toMatch(/className="m-[a-z0-9]+"/);
    expect(css).toContain('[data-motif-state="exiting"]');
    expect(css).toContain('opacity: 0');
  });

  it('leaves `enterStyle` on the JSX (runtime-only overlay)', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box opacity={1} enterStyle={{ opacity: 0 }} />;
    `);
    expect(code).toContain('enterStyle={{');
    // opacity={1} still extracted; the wrapper stays because enterStyle
    // blocks stripping (Box owns the first-paint overlay machinery).
    expect(code).toMatch(/<Box\b/);
    expect(code).toContain('opacity: 1');
  });

  it('strips the wrapper for transition-only call sites', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box transition="opacity 200ms ease" />;
    `);
    // Transition reduces to a plain inline style - works on any element,
    // so the wrapper can collapse to <div>.
    expect(code).toContain('<div');
    expect(code).not.toMatch(/<Box\b/);
  });

  it('does NOT strip when `enterStyle` is present', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box enterStyle={{ opacity: 0 }} />;
    `);
    expect(code).toMatch(/<Box\b/);
  });
});

describe('motif babel plugin - theme-chain pre-generation', () => {
  function chainsFrom(source: string): readonly string[] {
    const observed = new Set<string>();
    transform(source, {
      onThemeChains: (combos) => {
        for (const c of combos) observed.add(c);
      },
    });
    return [...observed].sort();
  }

  it('emits the inner Theme chain ignoring the dynamic provider active', () => {
    const src = `
      import { ThemeProvider, Theme } from '@usemotif/react';
      const X = ({ active }) => (
        <ThemeProvider active={active}>
          <Theme name="red"><div /></Theme>
        </ThemeProvider>
      );
    `;
    expect(chainsFrom(src)).toEqual(['red']);
  });

  it('emits both layers for a nested <Theme>', () => {
    const src = `
      import { Theme } from '@usemotif/react';
      const X = () => (
        <Theme name="red">
          <Theme name="blue"><div /></Theme>
        </Theme>
      );
    `;
    expect(chainsFrom(src)).toEqual(['red', 'red_blue']);
  });

  it('skips dynamic Theme.name', () => {
    const src = `
      import { Theme } from '@usemotif/react';
      const X = ({ name }) => <Theme name={name}><div /></Theme>;
    `;
    expect(chainsFrom(src)).toEqual([]);
  });

  it('does not call the callback when no chains are observed', () => {
    let called = false;
    transform(
      `
        import { Box } from '@usemotif/react';
        const X = () => <Box p={4} />;
      `,
      {
        onThemeChains: () => {
          called = true;
        },
      },
    );
    expect(called).toBe(false);
  });
});

describe('motif babel plugin - styled() variant extraction', () => {
  it('expands a base-only styled() into the underlying primitive', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      import { styled } from '@usemotif/react';
      const Big = styled(Box, { base: { p: 8 } });
      const X = () => <Big />;
    `);
    // `<Big />` → `<Box p={8} />` → wrapper-stripped to `<div style={...}>`.
    expect(code).toContain('<div');
    expect(code).not.toMatch(/<Big\b/);
    expect(code).toContain('padding: 8');
  });

  it('selects the matching variant case at compile time', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      import { styled } from '@usemotif/react';
      const Btn = styled(Box, { variants: { size: { sm: { p: 2 }, lg: { p: 8 } } } });
      const X = () => <Btn size="sm" />;
    `);
    expect(code).toContain('padding: 2');
    expect(code).not.toMatch(/size="sm"/);
    expect(code).not.toMatch(/<Btn\b/);
  });

  it('layers compoundVariants on top when every matcher is satisfied', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      import { styled } from '@usemotif/react';
      const Btn = styled(Box, {
        base: { p: 1 },
        variants: {
          size: { sm: { p: 2 }, lg: { p: 8 } },
          intent: { primary: { fontSize: 12 } },
        },
        compoundVariants: [
          { size: 'lg', intent: 'primary', css: { fontWeight: 700 } },
        ],
      });
      const X = () => <Btn size="lg" intent="primary" />;
    `);
    expect(code).toContain('padding: 8');
    expect(code).toContain('fontSize: 12');
    expect(code).toContain('fontWeight: 700');
  });

  it('respects defaultVariants when the call site omits a variant', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      import { styled } from '@usemotif/react';
      const Btn = styled(Box, {
        variants: { size: { sm: { p: 2 }, lg: { p: 8 } } },
        defaultVariants: { size: 'lg' },
      });
      const X = () => <Btn />;
    `);
    expect(code).toContain('padding: 8');
  });

  it('caller-supplied style props win over variant-derived defaults', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      import { styled } from '@usemotif/react';
      const Big = styled(Box, { base: { p: 8 } });
      const X = () => <Big p={2} />;
    `);
    // The merged config sets `padding: 8`, but the caller's `p={2}`
    // overrides it. After extraction the inline style ends up as
    // `padding: 2`.
    expect(code).toContain('padding: 2');
    expect(code).not.toContain('padding: 8');
  });

  it('leaves dynamic variant call-sites at runtime', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      import { styled } from '@usemotif/react';
      const Btn = styled(Box, { variants: { size: { sm: { p: 2 } } } });
      const X = ({ s }) => <Btn size={s} />;
    `);
    // Element name should stay `<Btn>` so the runtime resolver picks
    // up the dynamic variant at render time.
    expect(code).toMatch(/<Btn\b/);
    expect(code).toContain('size={s}');
  });

  it('leaves the call site alone when the styled() config is non-literal', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      import { styled } from '@usemotif/react';
      const Btn = styled(Box, dynamicConfig);
      const X = () => <Btn size="sm" />;
    `);
    expect(code).toMatch(/<Btn\b/);
    expect(code).toContain('size="sm"');
  });

  it('handles aliased styled imports', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      import { styled as s } from '@usemotif/react';
      const Big = s(Box, { base: { p: 8 } });
      const X = () => <Big />;
    `);
    expect(code).toContain('padding: 8');
    expect(code).not.toMatch(/<Big\b/);
  });

  it('passes through non-variant attrs unchanged', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      import { styled } from '@usemotif/react';
      const Btn = styled(Box, { variants: { size: { sm: { p: 2 } } } });
      const X = () => <Btn size="sm" id="hello" data-x="y" />;
    `);
    expect(code).toContain('id="hello"');
    expect(code).toContain('data-x="y"');
  });
});

describe('motif babel plugin - wrapper stripping', () => {
  it('replaces fully-static <Box> with <div>', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box p={4} bg="red" />;
    `);
    expect(code).toContain('<div');
    expect(code).not.toMatch(/<Box\b/);
  });

  it('strips a <Box> with literal _before / _after, emitting ::before and ::after', () => {
    const { code, css } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => (
        <Box p={4} _before={{ content: '"*"', color: '$colors.text.muted' }} _after={{ bg: 'red' }} />
      );
    `);
    expect(code).toMatch(/<div\b/);
    expect(code).not.toMatch(/<Box\b/);
    expect(code).not.toContain('_before');
    expect(code).not.toContain('_after');
    expect(code).toMatch(/className="m-[a-z0-9]+"/);
    expect(css).toMatch(/\.m-[a-z0-9]+::before \{[^}]*content: "\*"/);
    expect(css).toMatch(/::after \{[^}]*content: "";[^}]*background-color: red/);
  });

  it('keeps <Box> when a _before bag is dynamic', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = ({ bag }) => <Box p={4} _before={bag} />;
    `);
    expect(code).toMatch(/<Box\b/);
    expect(code).toContain('_before={bag}');
  });

  it('replaces fully-static <Text> with <span>', () => {
    const { code } = transform(`
      import { Text } from '@usemotif/react';
      const X = () => <Text fontSize={16}>hi</Text>;
    `);
    expect(code).toContain('<span');
    expect(code).toContain('</span>');
    expect(code).not.toMatch(/<Text\b/);
  });

  it('replaces <HStack> with <div> + display:flex / flexDirection:row', () => {
    const { code } = transform(`
      import { HStack } from '@usemotif/react';
      const X = () => <HStack p={4} />;
    `);
    expect(code).toContain('<div');
    expect(code).not.toMatch(/<HStack\b/);
    expect(code).toContain('display: "flex"');
    expect(code).toContain('flexDirection: "row"');
    expect(code).toContain('padding: 4');
  });

  it('replaces <VStack> with <div> + display:flex / flexDirection:column', () => {
    const { code } = transform(`
      import { VStack } from '@usemotif/react';
      const X = () => <VStack m={2} />;
    `);
    expect(code).toContain('<div');
    expect(code).not.toMatch(/<VStack\b/);
    expect(code).toContain('display: "flex"');
    expect(code).toContain('flexDirection: "column"');
  });

  it('rewrites <Stack direction="row"> → <div display:flex flexDirection:row>', () => {
    const { code } = transform(`
      import { Stack } from '@usemotif/react';
      const X = () => <Stack direction="row" p={4} />;
    `);
    expect(code).toContain('<div');
    expect(code).not.toMatch(/<Stack\b/);
    expect(code).not.toMatch(/direction=/);
    expect(code).toContain('flexDirection: "row"');
  });

  it('uses Stack default direction=column when no direction prop', () => {
    const { code } = transform(`
      import { Stack } from '@usemotif/react';
      const X = () => <Stack p={4} />;
    `);
    expect(code).toContain('<div');
    expect(code).toContain('flexDirection: "column"');
  });

  it('does NOT strip <Box> when `as` is set', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box as="section" p={4} />;
    `);
    expect(code).toMatch(/<Box\b/);
    expect(code).toContain('as="section"');
  });

  it('does NOT strip <Box> with a dynamic style prop (partial-static)', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = ({ size }) => <Box p={4} bg={size} />;
    `);
    expect(code).toMatch(/<Box\b/);
  });

  it('does NOT strip <Box> with spread (dynamic)', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = ({ rest }) => <Box p={4} {...rest} />;
    `);
    expect(code).toMatch(/<Box\b/);
  });

  it('does NOT strip <Pressable> (pseudo-states / event-handler runtime needed)', () => {
    const { code } = transform(`
      import { Pressable } from '@usemotif/react';
      const X = () => <Pressable p={4} bg="red" />;
    `);
    expect(code).toMatch(/<Pressable\b/);
    expect(code).not.toContain('<button');
  });

  it('strips with children (closing tag rewritten)', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box p={4}>hello</Box>;
    `);
    expect(code).toContain('<div');
    expect(code).toContain('</div>');
    expect(code).not.toMatch(/<Box\b/);
    expect(code).not.toMatch(/<\/Box>/);
  });

  it('does NOT strip when classification is partial-static (Stack with dynamic direction)', () => {
    const { code } = transform(`
      import { Stack } from '@usemotif/react';
      const X = ({ dir }) => <Stack direction={dir} p={4} />;
    `);
    expect(code).toMatch(/<Stack\b/);
  });

  it('does NOT strip <Box> when a `ref` attribute is set', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = ({ ref }) => <Box ref={ref} p={4} />;
    `);
    expect(code).toMatch(/<Box\b/);
    expect(code).toContain('ref={ref}');
  });

  it('does NOT strip <Box> with a function-as-child', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box p={4}>{(state) => state.x}</Box>;
    `);
    expect(code).toMatch(/<Box\b/);
  });

  it('does NOT strip <Box> with a FunctionExpression child', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = () => <Box p={4}>{function (s) { return s; }}</Box>;
    `);
    expect(code).toMatch(/<Box\b/);
  });

  it('strips <Box> with a regular expression child (not a function)', () => {
    const { code } = transform(`
      import { Box } from '@usemotif/react';
      const X = ({ name }) => <Box p={4}>{name}</Box>;
    `);
    expect(code).toContain('<div');
    expect(code).not.toMatch(/<Box\b/);
  });
});

// Integration-level coverage of the v2 back-compat entries in
// `DEFAULT_MOTIF_SOURCES` (compiler-core/src/imports.ts). The unit test in
// compiler-core exercises the allow-list directly; this fixture ensures the
// full extraction pipeline still fires for `@motif-js/react` imports so
// consumers who upgrade the compiler before migrating their import sites get
// the same extraction they had on v2. Drop alongside the allow-list entries
// in @usemotif/compiler-core@2.0.0.
describe('motif babel plugin - v2 @motif-js/react back-compat', () => {
  it('still extracts <Box> imported from @motif-js/react (v2 DOM bindings)', () => {
    const { code } = transform(`
      import { Box } from '@motif-js/react';
      const X = () => <Box p={4} bg="red" />;
    `);
    expect(code).toContain('<div');
    expect(code).not.toMatch(/<Box\b/);
    expect(code).not.toMatch(/\bp=\{4\}/);
    expect(code).not.toMatch(/bg="red"/);
    expect(code).toContain('padding: 4');
  });

  it('still tracks aliased v2 imports', () => {
    const { code } = transform(`
      import { Box as MotifBox } from '@motif-js/react';
      const X = () => <MotifBox p={2} />;
    `);
    expect(code).toContain('<div');
    expect(code).not.toMatch(/<MotifBox\b/);
  });

  it('still extracts <Box> imported from @motif-js/react-native (v2 native bindings)', () => {
    const { code } = transform(
      `
      import { Box } from '@motif-js/react-native';
      const X = () => <Box p={4} bg="red" />;
    `,
      { target: 'native' },
    );
    // On native the JSX element name is preserved (the runtime is a real
    // <Box> RN component); extraction hoists the styles into a sibling
    // StyleSheet.create() and reroutes them via the style prop.
    expect(code).not.toMatch(/\bp=\{4\}/);
    expect(code).not.toMatch(/bg="red"/);
    expect(code).toContain('_motifStyleSheet.create');
    expect(code).toMatch(/style=\{_motifStyles\./);
  });
});

// Negative case: the v1→v2 back-compat window closed in this major. The v1
// DOM-bindings specifier no longer extracts; consumers still on v1 imports
// see their JSX primitives left in source. The fix is to run `rename-v3`
// (or rename-v2 then rename-v3) - documented in the v2→v3 migration guide.
describe('motif babel plugin - v1 @motif-js/react-web back-compat dropped', () => {
  it('does NOT extract <Box> imported from @motif-js/react-web (v1 name)', () => {
    const { code } = transform(`
      import { Box } from '@motif-js/react-web';
      const X = () => <Box p={4} bg="red" />;
    `);
    // The Box import is no longer recognised as a motif source, so the JSX
    // call site survives unchanged and the `bg`/`p` props stay on the
    // element (the runtime will handle them - slower, but correct).
    expect(code).toMatch(/<Box\b/);
  });
});

describe('motif babel plugin - configurable breakpoints', () => {
  // The `breakpoints` option mutates a core module-global for the duration of
  // a Program. The plugin resets it at Program-exit, but guard against an
  // assertion throwing mid-transform and leaving the global dirty for the next
  // test by always restoring defaults here.
  afterEach(() => configureBreakpoints({}));

  it('emits @media at the configured width, not the default', () => {
    const { css } = transform(
      `import { Box } from '@usemotif/react';
       const X = () => <Box p={{ base: '$2', md: '$4' }} />;`,
      { breakpoints: { md: 800 } },
    );
    expect(css).toContain('@media (min-width: 800px)');
    expect(css).not.toContain('@media (min-width: 768px)');
  });

  it('compiled @media is byte-identical to the runtime resolver under the same config', () => {
    // Compiler path: the same prop, compiled with the override.
    const { css } = transform(
      `import { Box } from '@usemotif/react';
       const X = () => <Box p={{ md: '$4' }} />;`,
      { breakpoints: { md: 800 } },
    );
    // Runtime path: the same prop + config through the shared core resolver the
    // compiler also calls. Their `@media` prefix must be the identical string.
    configureBreakpoints({ md: 800 });
    const { atRules } = resolveResponsiveStylesToVars({ p: { md: '$4' } });
    const runtimeMedia = atRules.find((r) => r.atRule.startsWith('@media'))?.atRule;
    expect(runtimeMedia).toBe('@media (min-width: 800px)');
    expect(css).toContain(runtimeMedia);
  });

  it('overriding one breakpoint leaves the others at their defaults', () => {
    const { css } = transform(
      `import { Box } from '@usemotif/react';
       const X = () => <Box p={{ md: '$4', lg: '$8' }} />;`,
      { breakpoints: { md: 800 } },
    );
    expect(css).toContain('@media (min-width: 800px)'); // overridden md
    expect(css).toContain('@media (min-width: 1024px)'); // default lg
  });

  it('resets after each file - a later default build emits the default width', () => {
    transform(
      `import { Box } from '@usemotif/react';
       const X = () => <Box p={{ md: '$4' }} />;`,
      { breakpoints: { md: 800 } },
    );
    const { css } = transform(
      `import { Box } from '@usemotif/react';
       const X = () => <Box p={{ md: '$4' }} />;`,
    );
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).not.toContain('800px');
  });

  it('is byte-identical to the default build when no breakpoints option is passed', () => {
    const source = `import { Box } from '@usemotif/react';
       const X = () => <Box p={{ base: '$2', md: '$4' }} />;`;
    const withEmpty = transform(source, {});
    expect(withEmpty.css).toContain('@media (min-width: 768px)');
  });
});

describe('motif babel plugin - onBail', () => {
  function bails(source: string): BailEvent[] {
    const events: BailEvent[] = [];
    transform(source, { onBail: (e) => events.push(e) });
    return events;
  }

  it('reports an element whose style props are all dynamic, with the props', () => {
    const events = bails(`import { Box } from '@usemotif/react';
export const A = ({ pad }) => <Box p={pad} />;`);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      filename: expect.stringContaining('test.tsx'),
      line: 2,
      element: 'Box',
      reason: 'dynamic-props',
      props: ['p'],
    });
  });

  it('names the spread when a spread hides the props', () => {
    const events = bails(`import { Box } from '@usemotif/react';
const rest = {};
export const A = () => <Box p={8} {...rest} />;`);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ element: 'Box', reason: 'has-spread', line: 3 });
  });

  it('reports a kept wrapper, with the dynamic props, when only some props are static', () => {
    const events = bails(`import { Box } from '@usemotif/react';
export const A = ({ pad }) => <Box p={pad} bg="red" />;`);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      element: 'Box',
      reason: 'non-static-classification',
      props: ['p'],
    });
  });

  it('reports a kept wrapper with the strip-safety reason for a ref', () => {
    const events = bails(`import { Box } from '@usemotif/react';
export const A = ({ r }) => <Box p={8} ref={r} />;`);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ element: 'Box', reason: 'ref-attribute' });
  });

  it('reports nothing for an element that is fully extracted and stripped', () => {
    expect(
      bails(`import { Box } from '@usemotif/react';
export const A = () => <Box p={8} bg="red" />;`),
    ).toEqual([]);
  });

  it('leaves the output unchanged whether or not onBail is set', () => {
    const source = `import { Box } from '@usemotif/react';
const rest = {};
export const A = ({ pad }) => <><Box p={pad} /><Box p={8} {...rest} /><Box p={8} /></>;`;
    const withBail = transform(source, { onBail: () => {} });
    const without = transform(source);
    expect(withBail.code).toBe(without.code);
    expect(withBail.css).toBe(without.css);
  });
});
