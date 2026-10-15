/** @vitest-environment jsdom */
import { act, useState, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Dialog, Tabs } from './index.js';

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.removeAttribute('style');
});

const click = (el: Element): void => act(() => (el as HTMLElement).click());

/** Counts its own clicks, so a remount shows as a reset to 0. */
function Counter({ id }: { id: string }): ReactElement {
  const [n, setN] = useState(0);
  return (
    <button data-testid={id} onClick={() => setN(n + 1)}>
      {n}
    </button>
  );
}

describe("keepMounted='activity'", () => {
  it('keeps a Tabs panel and its state while another tab is selected', () => {
    act(() =>
      root.render(
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Tab value="a">A</Tabs.Tab>
            <Tabs.Tab value="b">B</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="a" keepMounted="activity">
            <Counter id="a" />
          </Tabs.Panel>
          <Tabs.Panel value="b">
            <Counter id="b" />
          </Tabs.Panel>
        </Tabs.Root>,
      ),
    );
    const a = (): HTMLElement => container.querySelector('[data-testid="a"]')!;
    click(a());
    click(a());
    click(container.querySelector('[role="tab"]:nth-child(2)')!);
    expect(a().textContent).toBe('2');
    expect(a().closest<HTMLElement>('[role="tabpanel"]')!.style.display).toBe('none');
    click(container.querySelector('[role="tab"]')!);
    expect(a().textContent).toBe('2');
    expect(a().closest<HTMLElement>('[role="tabpanel"]')!.style.display).toBe('');
    // A panel without the prop still unmounts.
    expect(container.querySelector('[data-testid="b"]')).toBeNull();
  });

  it('keeps closed Dialog content and its state, releasing the background', () => {
    const background = document.createElement('div');
    document.body.append(background);
    act(() =>
      root.render(
        <Dialog.Root>
          <Dialog.Trigger>
            <button data-testid="open">Open</button>
          </Dialog.Trigger>
          <Dialog.Content keepMounted="activity">
            <Dialog.Title>Edit</Dialog.Title>
            <Counter id="count" />
            <Dialog.Close>
              <button data-testid="close">Close</button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Root>,
      ),
    );
    const count = (): HTMLElement => document.querySelector('[data-testid="count"]')!;
    const surface = (): HTMLElement => document.querySelector('[role="dialog"]')!;
    expect(surface().closest<HTMLElement>('[style*="display: none"]')).not.toBeNull();

    click(document.querySelector('[data-testid="open"]')!);
    expect(background.getAttribute('inert')).toBe('');
    click(count());
    click(document.querySelector('[data-testid="close"]')!);
    expect(count().textContent).toBe('1');
    expect(surface().closest<HTMLElement>('[style*="display: none"]')).not.toBeNull();
    expect(background.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');

    click(document.querySelector('[data-testid="open"]')!);
    expect(count().textContent).toBe('1');
    expect(surface().closest<HTMLElement>('[style*="display: none"]')).toBeNull();
    background.remove();
  });
});
