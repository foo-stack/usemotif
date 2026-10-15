/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MessagesProvider } from '@usemotif/react';
import { Breadcrumb, Pagination } from './navigation.js';
import { PinInput } from './pin-input.js';

const renderItem = () => <span />;

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

describe('headless labels through MessagesProvider', () => {
  it('translates landmark names and templated labels, and a prop still wins', () => {
    render(
      <MessagesProvider
        messages={{
          pagination: 'Seitennavigation',
          breadcrumb: 'Brotkrumen',
          pinCharacter: (position, length) => `Zeichen ${position} von ${length}`,
        }}
      >
        <Pagination page={1} total={3} renderItem={renderItem} />
        <Breadcrumb aria-label="Pfad" />
        <PinInput length={2} />
      </MessagesProvider>,
    );
    const navs = [...container.querySelectorAll('nav')].map((n) => n.getAttribute('aria-label'));
    expect(navs).toEqual(['Seitennavigation', 'Pfad']);
    expect(container.querySelector('input')!.getAttribute('aria-label')).toBe('Zeichen 1 von 2');
  });

  it('keeps English without a provider', () => {
    render(<Pagination page={1} total={3} renderItem={renderItem} />);
    expect(container.querySelector('nav')!.getAttribute('aria-label')).toBe('Pagination');
  });
});
