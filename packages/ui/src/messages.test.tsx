/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MessagesProvider } from 'usemotif';
import { Alert } from './Alert.js';
import { Chip } from './Chip.js';
import { Spinner } from './Spinner.js';

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

describe('kit labels through MessagesProvider', () => {
  it('translates the labels the kit writes itself, and a prop still wins', () => {
    render(
      <MessagesProvider messages={{ loading: 'Laden', dismiss: 'Sluiten', remove: 'Verwijderen' }}>
        <Spinner />
        <Alert title="Let op" onDismiss={() => {}} />
        <Chip onRemove={() => {}}>Rood</Chip>
        <Chip onRemove={() => {}} removeLabel="Blauw weg">
          Blauw
        </Chip>
      </MessagesProvider>,
    );
    const labels = [...container.querySelectorAll('[aria-label]')].map((el) =>
      el.getAttribute('aria-label'),
    );
    expect(labels).toEqual(['Laden', 'Sluiten', 'Verwijderen', 'Blauw weg']);
  });
});
