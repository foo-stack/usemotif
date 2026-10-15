import { describe, expect, it } from 'vitest';
import { applyFromStyledComponents, cssToStyle } from './from-styled-components.js';

describe('cssToStyle', () => {
  it('camelCases declarations and keeps unitless numbers as numbers', () => {
    expect(cssToStyle('padding: 8px 12px; z-index: 2; -webkit-line-clamp: 3;')).toEqual({
      padding: '8px 12px',
      zIndex: 2,
      WebkitLineClamp: 3,
    });
  });

  it('maps state selectors to state props', () => {
    expect(cssToStyle('color: red; &:hover { color: blue; } &::before { content: "x" }')).toEqual({
      color: 'red',
      _hover: { color: 'blue' },
      _before: { content: '"x"' },
    });
  });

  it('gives up on selectors, at-rules and !important it cannot map', () => {
    expect(cssToStyle('& > span { color: red; }')).toBeNull();
    expect(cssToStyle('@media (min-width: 40em) { color: red; }')).toBeNull();
    expect(cssToStyle('color: red !important;')).toBeNull();
  });
});

describe('applyFromStyledComponents', () => {
  it('converts a static template and swaps the import', () => {
    const out = applyFromStyledComponents(`import styled from 'styled-components';

export const Card = styled.div\`
  padding: 16px;
  border-radius: 8px;
  &:hover {
    opacity: 0.9;
  }
\`;
const Title = styled(Text)\`font-weight: 600;\`;
`);
    expect(out).toBe(`import { styled } from 'usemotif';

export const Card = styled('div', { base: {
  padding: '16px',
  borderRadius: '8px',
  _hover: {
    opacity: 0.9,
  },
} });
const Title = styled(Text, { base: {
  fontWeight: 600,
} });
`);
  });

  it('marks what it leaves and runs both libraries side by side', () => {
    const out = applyFromStyledComponents(`import styled, { css } from 'styled-components';

const A = styled.a\`color: red;\`;
const B = styled.button\`
  color: \${(p) => p.color};
\`;
const C = styled.input.attrs({ type: 'text' })\`color: red;\`;
`);
    expect(out).toBe(`// usemotif-migrate: finish by hand: css
import styled, { css } from 'styled-components';
import { styled as motifStyled } from 'usemotif';

const A = motifStyled('a', { base: {
  color: 'red',
} });
// usemotif-migrate: interpolations: express them as variants or tokens
const B = styled.button\`
  color: \${(p) => p.color};
\`;
// usemotif-migrate: .attrs() has no motif equivalent; move the props to the call site
const C = styled.input.attrs({ type: 'text' })\`color: red;\`;
`);
  });

  it('does not mark the same thing twice on a second run', () => {
    const once = applyFromStyledComponents(
      `import styled from 'styled-components';\nconst B = styled.b\`& > i { color: red; }\`;\n`,
    );
    expect(applyFromStyledComponents(once)).toBe(once);
    expect(once.match(/usemotif-migrate/g)).toHaveLength(1);
  });

  it('leaves a file without styled-components alone', () => {
    const src = `import { styled } from 'usemotif';\n`;
    expect(applyFromStyledComponents(src)).toBe(src);
  });
});

describe('cssToStyle - comments', () => {
  it('drops comments, keeping an unclosed one as text', () => {
    expect(cssToStyle('/* a */ padding: 4px; /* b */ margin: 0;')).toEqual({
      padding: '4px',
      margin: 0,
    });
    expect(cssToStyle('padding: 4px; /* never closed')).toBeNull();
  });

  // The backtracking regex this replaced took seconds on this input, growing with its square; the
  // linear scan takes milliseconds. The bound leaves room for a busy CI runner.
  it('strips many unclosed comment openers in linear time', () => {
    const start = performance.now();
    cssToStyle(`/*${'a/*'.repeat(200_000)}`);
    expect(performance.now() - start).toBeLessThan(2000);
  });
});
