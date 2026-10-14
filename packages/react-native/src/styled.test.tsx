import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Theme } from '@usemotif/core';
import { Box } from './Box.js';
import { ThemeProvider } from './Theme.js';
import { styled } from './styled.js';
import { __setDimensions } from './__test-setup__/react-native-mock.js';
import { _resetDevWarningsForTesting } from './_dev-warnings.js';
import { createStyledContext, type VariantContext } from './styled-context.js';

const testTheme: Theme = {
  name: 'test',
  tokens: {
    colors: {
      blue: { 500: '#3b82f6' },
      surface: { base: '#ffffff' },
    },
    space: { 1: 4, 2: 8, 4: 16, 6: 24 },
    radii: { md: 8 },
  },
};

/** Hoisted so the inline-array lint rule stays quiet across every render. */
const THEMES = [testTheme];

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
  act(() => {
    root.render(node);
  });
}

/** Read the resolved style array (JSON-encoded on `data-motif-style`) off the
 * first View host under `el` and flatten it - same shape the Box tests use. */
function viewStyle(el: HTMLElement): Record<string, unknown> {
  const view = el.querySelector('[data-motif-host="View"]');
  if (view === null) throw new Error('No View host found');
  const raw = view.getAttribute('data-motif-style');
  if (raw === null) return {};
  return flatten(JSON.parse(raw) as unknown);
}

/** All View hosts under `el`, flattened - for the context-propagation test
 * where parent and child each contribute their own resolved style. */
function allViewStyles(el: HTMLElement): Record<string, unknown>[] {
  return Array.from(el.querySelectorAll('[data-motif-host="View"]')).map((view) => {
    const raw = view.getAttribute('data-motif-style');
    return raw === null ? {} : flatten(JSON.parse(raw) as unknown);
  });
}

function flatten(s: unknown): Record<string, unknown> {
  if (s === null || s === undefined) return {};
  if (Array.isArray(s)) {
    return s.reduce<Record<string, unknown>>((acc, x) => Object.assign(acc, flatten(x)), {});
  }
  return s as Record<string, unknown>;
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.removeChild(container);
});

describe('native styled() - layers', () => {
  it('applies base styles', () => {
    const Card = styled(Box, { base: { padding: 16, backgroundColor: '#ff0000' } });
    render(
      <ThemeProvider themes={THEMES} active="test">
        <Card />
      </ThemeProvider>,
    );
    const style = viewStyle(container);
    expect(style.padding).toBe(16);
    expect(style.backgroundColor).toBe('#ff0000');
  });

  it('applies the selected explicit variant over base', () => {
    const Card = styled(Box, {
      base: { padding: 4 },
      variants: { size: { sm: { padding: 8 }, lg: { padding: 24 } } },
    });
    render(
      <ThemeProvider themes={THEMES} active="test">
        <Card size="lg" />
      </ThemeProvider>,
    );
    expect(viewStyle(container).padding).toBe(24);
  });

  it('falls back to defaultVariants when the prop is omitted', () => {
    const Card = styled(Box, {
      variants: { size: { sm: { padding: 8 }, lg: { padding: 24 } } },
      defaultVariants: { size: 'sm' },
    });
    render(
      <ThemeProvider themes={THEMES} active="test">
        <Card />
      </ThemeProvider>,
    );
    expect(viewStyle(container).padding).toBe(8);
  });

  it('applies a compound variant only when every matcher matches', () => {
    const Card = styled(Box, {
      variants: {
        tone: { loud: { backgroundColor: '#111111' } },
        size: { lg: { padding: 24 } },
      },
      compoundVariants: [{ tone: 'loud', size: 'lg', css: { borderRadius: 8 } }],
    });

    render(
      <ThemeProvider themes={THEMES} active="test">
        <Card tone="loud" size="lg" />
      </ThemeProvider>,
    );
    expect(viewStyle(container).borderRadius).toBe(8);

    render(
      <ThemeProvider themes={THEMES} active="test">
        <Card tone="loud" />
      </ThemeProvider>,
    );
    expect(viewStyle(container).borderRadius).toBeUndefined();
  });

  it('lets caller props override the variant-derived styles', () => {
    const Card = styled(Box, {
      base: { padding: 4 },
      variants: { size: { lg: { padding: 24 } } },
    });
    render(
      <ThemeProvider themes={THEMES} active="test">
        <Card size="lg" padding={2} />
      </ThemeProvider>,
    );
    expect(viewStyle(container).padding).toBe(2);
  });
});

describe('native styled() - fallback variants', () => {
  it('reads raw token values off the variant context', () => {
    const Card = styled(Box, {
      variants: {
        '...gap': (val: 1 | 2 | 4 | 6, ctx: VariantContext) => ({
          padding: (ctx.tokens?.space?.[val] as number | undefined) ?? 0,
        }),
      },
    });
    render(
      <ThemeProvider themes={THEMES} active="test">
        <Card gap={6} />
      </ThemeProvider>,
    );
    expect(viewStyle(container).padding).toBe(24);
  });
});

describe('native styled() - string element types', () => {
  beforeEach(() => {
    _resetDevWarningsForTesting();
  });

  it('does not leak the tag onto the underlying View as an `as` prop', () => {
    const Chip = styled('span', { base: { padding: 8 } });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <ThemeProvider themes={THEMES} active="test">
        <Chip />
      </ThemeProvider>,
    );
    warn.mockRestore();

    const view = container.querySelector('[data-motif-host="View"]');
    expect(view).not.toBeNull();
    // Forwarding `as` never changed the element type on native - it only ever
    // landed on the View as a stray prop. It must not appear at all.
    expect(view?.hasAttribute('as')).toBe(false);
    // The styles still resolve; only the tag is dropped.
    expect(viewStyle(container).padding).toBe(8);
  });

  it('warns once per tag that the string type collapses to a View', () => {
    const Chip = styled('button', { base: { padding: 8 } });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(
      <ThemeProvider themes={THEMES} active="test">
        <Chip />
      </ThemeProvider>,
    );
    render(
      <ThemeProvider themes={THEMES} active="test">
        <Chip />
      </ThemeProvider>,
    );

    const messages = warn.mock.calls.map((c) => String(c[0]));
    warn.mockRestore();

    const hits = messages.filter((m) => m.includes("styled('button'"));
    expect(hits).toHaveLength(1);
    expect(hits[0]).toContain('no native');
  });

  it('does not warn for component element types', () => {
    const Card = styled(Box, { base: { padding: 8 } });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <ThemeProvider themes={THEMES} active="test">
        <Card />
      </ThemeProvider>,
    );
    const messages = warn.mock.calls.map((c) => String(c[0]));
    warn.mockRestore();
    expect(messages.filter((m) => m.includes('string element types'))).toHaveLength(0);
  });
});

describe('native createStyledContext()', () => {
  it('flows a parent variant to a descendant that shares the context', () => {
    const CardContext = createStyledContext({ size: 'sm' });
    const Frame = styled(Box, {
      context: CardContext,
      variants: { size: { sm: { padding: 8 }, lg: { padding: 24 } } },
      defaultVariants: { size: 'sm' },
    });
    const Inner = styled(Box, {
      context: CardContext,
      variants: { size: { sm: { borderRadius: 2 }, lg: { borderRadius: 8 } } },
    });

    render(
      <ThemeProvider themes={THEMES} active="test">
        <Frame size="lg">
          <Inner />
        </Frame>
      </ThemeProvider>,
    );

    const styles = allViewStyles(container);
    expect(styles.some((s) => s.padding === 24)).toBe(true);
    // Inner was never handed `size` - it must inherit "lg" from Frame.
    expect(styles.some((s) => s.borderRadius === 8)).toBe(true);
  });

  it('keeps its own defaultVariants when no provider is mounted', () => {
    const CardContext = createStyledContext({ size: 'lg' });
    const Solo = styled(Box, {
      context: CardContext,
      variants: { size: { sm: { padding: 8 }, lg: { padding: 24 } } },
      defaultVariants: { size: 'sm' },
    });

    render(
      <ThemeProvider themes={THEMES} active="test">
        <Solo />
      </ThemeProvider>,
    );
    // The component's own defaultVariants outrank the context defaults.
    expect(viewStyle(container).padding).toBe(8);
  });
});

describe('native styled - responsive variant values', () => {
  const Card = styled(Box, {
    variants: { size: { sm: { padding: 4 }, lg: { padding: 16 } } },
  });

  it('resolves the variant at the current viewport width', () => {
    __setDimensions(800);
    render(
      <ThemeProvider themes={THEMES} active="test">
        <Card size={{ base: 'sm', md: 'lg' }} />
      </ThemeProvider>,
    );
    expect(viewStyle(container).padding).toBe(16);
    __setDimensions(400);
    render(
      <ThemeProvider themes={THEMES} active="test">
        <Card key="narrow" size="base:sm md:lg" />
      </ThemeProvider>,
    );
    expect(viewStyle(container).padding).toBe(4);
  });
});
