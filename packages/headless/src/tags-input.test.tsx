import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TagsInput } from './index.js';

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
  act(() => root.render(node));
}

function input(): HTMLInputElement {
  return container.querySelector('input')!;
}

function type(text: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(input(), text);
    input().dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function key(k: string): void {
  act(() => {
    input().dispatchEvent(
      new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }),
    );
  });
}

function paste(text: string): void {
  const ev = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'clipboardData', { value: { getData: () => text } });
  act(() => {
    input().dispatchEvent(ev);
  });
}

function tags(): string[] {
  return Array.from(container.querySelectorAll('button[aria-label^="Remove "]')).map((b) =>
    (b.getAttribute('aria-label') ?? '').slice('Remove '.length),
  );
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

describe('TagsInput', () => {
  it('adds on Enter and comma, clears the input, and skips empties and duplicates', () => {
    const onValueChange = vi.fn();
    render(<TagsInput aria-label="Topics" onValueChange={onValueChange} />);
    type('react');
    key('Enter');
    expect(input().value).toBe('');
    type('vue');
    key(',');
    type('react');
    key('Enter');
    type('   ');
    key('Enter');
    expect(tags()).toEqual(['react', 'vue']);
    expect(onValueChange).toHaveBeenLastCalledWith(['react', 'vue']);
  });

  it('removes the last tag on Backspace in an empty input, and one through its button', () => {
    render(<TagsInput aria-label="Topics" defaultValue={['a', 'b', 'c']} />);
    key('Backspace');
    expect(tags()).toEqual(['a', 'b']);
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Remove a"]')!.click());
    expect(tags()).toEqual(['b']);
  });

  it('adds every entry of a paste, applying validate and max', () => {
    render(<TagsInput aria-label="Emails" max={2} validate={(t) => t.includes('@')} />);
    paste('a@x.io, nope\nb@y.io, c@z.io');
    expect(tags()).toEqual(['a@x.io', 'b@y.io']);
  });

  it('keeps a controlled value authoritative', () => {
    render(<TagsInput aria-label="Topics" value={['fixed']} />);
    type('new');
    key('Enter');
    expect(tags()).toEqual(['fixed']);
  });
});

describe('TagsInput with suggestions', () => {
  const suggestions = ['react', 'redux', 'vue'];

  function listed(): string[] {
    return Array.from(document.body.querySelectorAll('[role="option"]')).map(
      (o) => o.textContent ?? '',
    );
  }

  it('offers the suggestions not yet added, filtered by the text', () => {
    render(<TagsInput aria-label="Topics" suggestions={suggestions} defaultValue={['vue']} />);
    act(() => input().focus());
    expect(listed()).toEqual(['react', 'redux']);
    type('rea');
    expect(listed()).toEqual(['react']);
  });

  it('adds a highlighted suggestion on Enter instead of the typed text', () => {
    render(<TagsInput aria-label="Topics" suggestions={suggestions} />);
    act(() => input().focus());
    type('re');
    key('ArrowDown');
    key('Enter');
    expect(tags()).toEqual(['react']);
    expect(input().value).toBe('');
  });

  it('adds the typed text on Enter when nothing is highlighted', () => {
    render(<TagsInput aria-label="Topics" suggestions={suggestions} />);
    act(() => input().focus());
    type('svelte');
    key('Enter');
    expect(tags()).toEqual(['svelte']);
  });
});
