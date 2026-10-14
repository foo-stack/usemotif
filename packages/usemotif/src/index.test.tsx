/** @vitest-environment jsdom */
/**
 * Umbrella-surface test.
 *
 * `styled()` and `createStyledContext()` are implemented in the platform
 * packages and only re-exported from here. This asserts the re-export is
 * actually wired - a barrel that silently drops it would otherwise typecheck
 * and build clean, and only break at a consumer's import site.
 */
import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createStyledContext, styled, useScroll, useScrollTarget, useThemeChain } from './index.js';

describe('usemotif - styled surface', () => {
  it('re-exports the styled factory and its context helper', () => {
    expect(typeof styled).toBe('function');
    expect(typeof createStyledContext).toBe('function');
  });

  it('renders a styled component through the umbrella entry', () => {
    const Chip = styled('span', {
      base: { color: 'rebeccapurple' },
      variants: { tone: { loud: { fontWeight: 'bold' } } },
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<Chip tone="loud" />);
    });

    const el = container.firstElementChild as HTMLElement | null;
    expect(el?.tagName).toBe('SPAN');
    expect(el?.style.color).toBe('rebeccapurple');
    expect(el?.style.fontWeight).toBe('bold');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('builds a styled context with its declared defaults', () => {
    const ButtonContext = createStyledContext({ size: 'md' });
    expect(ButtonContext.defaults).toStrictEqual({ size: 'md' });
    expect(ButtonContext.Provider).toBeDefined();
  });
});

describe('usemotif - scroll surface', () => {
  it('re-exports useScrollTarget beside useScroll, matching the native entry', () => {
    expect(typeof useScroll).toBe('function');
    expect(typeof useScrollTarget).toBe('function');
  });
});

describe('usemotif - theme surface', () => {
  it('re-exports useThemeChain, matching the native entry', () => {
    expect(typeof useThemeChain).toBe('function');
  });
});
