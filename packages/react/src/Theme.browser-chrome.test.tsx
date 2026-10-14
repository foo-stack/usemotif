/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Theme } from '@usemotif/core';
import { ThemeProvider } from './Theme.js';

const light: Theme = {
  name: 'light',
  colorScheme: 'light',
  themeColor: '$colors.surface.base',
  tokens: { colors: { white: '#ffffff', surface: { base: '$colors.white' } } },
};
const dark: Theme = {
  name: 'dark',
  colorScheme: 'dark',
  themeColor: '#0a0a0a',
  tokens: { colors: {} },
};
const plain: Theme = { name: 'plain', tokens: {} };

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => root.render(node));
}

function meta(): HTMLMetaElement | null {
  return document.head.querySelector('meta[name="theme-color"]:not([media])');
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  document.documentElement.style.colorScheme = '';
});

describe('ThemeProvider - browser chrome', () => {
  it('sets color-scheme on the root and a theme-color meta, resolving tokens', () => {
    render(<ThemeProvider themes={[light, dark]} active="light" />);
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(meta()?.content).toBe('#ffffff');
  });

  it('follows a theme switch, and restores what was there on unmount', () => {
    const own = document.createElement('meta');
    own.name = 'theme-color';
    own.content = '#123456';
    document.head.appendChild(own);
    render(<ThemeProvider themes={[light, dark]} active="light" />);
    render(<ThemeProvider themes={[light, dark]} active="dark" />);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(meta()?.content).toBe('#0a0a0a');
    act(() => root.unmount());
    root = createRoot(container);
    expect(document.documentElement.style.colorScheme).toBe('');
    expect(meta()?.content).toBe('#123456');
  });

  it('removes a meta it created, and leaves media-scoped metas alone', () => {
    const scoped = document.createElement('meta');
    scoped.name = 'theme-color';
    scoped.setAttribute('media', '(prefers-color-scheme: dark)');
    scoped.content = '#000000';
    document.head.appendChild(scoped);
    render(<ThemeProvider themes={[dark]} active="dark" />);
    expect(scoped.content).toBe('#000000');
    act(() => root.unmount());
    root = createRoot(container);
    expect(meta()).toBeNull();
    expect(scoped.isConnected).toBe(true);
  });

  it('touches nothing for a theme without the fields', () => {
    render(<ThemeProvider themes={[plain]} active="plain" />);
    expect(document.documentElement.style.colorScheme).toBe('');
    expect(meta()).toBeNull();
  });
});
