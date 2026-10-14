/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Theme, ThemeProvider } from './Theme.js';
import { useThemeChain } from './theme-context.js';

let container: HTMLElement;
let root: Root;
let seen: readonly string[] | undefined;

function Probe(): null {
  seen = useThemeChain();
  return null;
}

function render(node: React.ReactNode): void {
  act(() => {
    root.render(node);
  });
}

beforeEach(() => {
  seen = ['unset'];
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

describe('useThemeChain (native)', () => {
  it('is undefined with no provider', () => {
    render(<Probe />);
    expect(seen).toBeUndefined();
  });

  it('starts at the provider active name', () => {
    render(
      <ThemeProvider themes={[]} active="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(seen).toEqual(['dark']);
  });

  it('appends each nested Theme name', () => {
    render(
      <ThemeProvider themes={[]} active="dark">
        <Theme name="red">
          <Probe />
        </Theme>
      </ThemeProvider>,
    );
    expect(seen).toEqual(['dark', 'red']);
    render(
      <ThemeProvider themes={[]} active="dark">
        <Theme name="red">
          <Theme name="blue">
            <Probe />
          </Theme>
        </Theme>
      </ThemeProvider>,
    );
    expect(seen).toEqual(['dark', 'red', 'blue']);
  });

  it('starts at the Theme name when no provider is above it', () => {
    render(
      <Theme name="red">
        <Probe />
      </Theme>,
    );
    expect(seen).toEqual(['red']);
  });

  it('follows a change to the provider active name', () => {
    render(
      <ThemeProvider themes={[]} active="light">
        <Theme name="red">
          <Probe />
        </Theme>
      </ThemeProvider>,
    );
    render(
      <ThemeProvider themes={[]} active="dark">
        <Theme name="red">
          <Probe />
        </Theme>
      </ThemeProvider>,
    );
    expect(seen).toEqual(['dark', 'red']);
  });
});
