/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DEFAULT_MESSAGES } from '@usemotif/core';
import { PasswordInput } from './forms.js';
import { MessagesProvider, useMessages } from './messages.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function Probe() {
  const m = useMessages();
  return <p id="probe">{`${m.dismiss}|${m.remove}|${m.removeItem('x')}`}</p>;
}

describe('MessagesProvider', () => {
  it('falls back to English with no provider', () => {
    render(<Probe />);
    expect(container.querySelector('#probe')!.textContent).toBe('Dismiss|Remove|Remove x');
    expect(DEFAULT_MESSAGES.pagination).toBe('Pagination');
  });

  it('layers nested translations over the outer ones', () => {
    render(
      <MessagesProvider messages={{ dismiss: 'Fermer', remove: 'Retirer' }}>
        <MessagesProvider messages={{ removeItem: (item) => `Retirer ${item}` }}>
          <Probe />
        </MessagesProvider>
      </MessagesProvider>,
    );
    expect(container.querySelector('#probe')!.textContent).toBe('Fermer|Retirer|Retirer x');
  });

  it('translates the password toggle', () => {
    render(
      <MessagesProvider messages={{ showPassword: 'Afficher le mot de passe' }}>
        <PasswordInput aria-label="Password" />
      </MessagesProvider>,
    );
    expect(container.querySelector('button')!.getAttribute('aria-label')).toBe(
      'Afficher le mot de passe',
    );
  });
});
