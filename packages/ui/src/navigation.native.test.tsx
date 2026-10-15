/** @vitest-environment jsdom */
import { lightTheme } from '@usemotif/tokens';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Pressable, Text, ThemeProvider } from 'usemotif';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Kit from './index.native.js';

let container: HTMLElement;
let root: Root;
let errors: string[];

// The mock renders native hosts as DOM elements, so React DOM complains about
// native-only props; those warnings say nothing about the components.
const MOCK_NOISE =
  /act\(\.\.\.\)|does not recognize the|Unknown event handler|non-boolean attribute|incorrect casing|Invalid DOM property|for a non-boolean|You provided a `value` prop|cannot be a descendant|cannot contain a nested/;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = String(args[0]);
    if (!MOCK_NOISE.test(message)) errors.push(message.slice(0, 200));
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function render(node: ReactNode): void {
  act(() =>
    root.render(
      <ThemeProvider themes={[lightTheme]} active={lightTheme.name}>
        {node}
      </ThemeProvider>,
    ),
  );
}

function problems(): { stray: string[]; errors: string[]; cssVars: (string | null)[] } {
  const stray: string[] = [];
  const walk = (el: Element): void => {
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent!.trim() !== '') {
        if (el.getAttribute('data-motif-host') !== 'Text') stray.push(node.textContent!);
      } else if (node.nodeType === Node.ELEMENT_NODE) walk(node as Element);
    }
  };
  walk(document.body);
  const cssVars = Array.from(document.querySelectorAll('[data-motif-style]'))
    .filter((el) => el.getAttribute('data-motif-style')!.includes('var(--'))
    .map((el) => el.getAttribute('data-motif-host'));
  return { stray, errors, cssVars };
}
const CLEAN = { stray: [], errors: [], cssVars: [] };

const pressable = (text: string): HTMLElement =>
  Array.from(document.querySelectorAll('[data-motif-host="Pressable"]')).find(
    (el) => el.textContent === text,
  ) as HTMLElement;

const TREE = [{ id: 'src', label: 'src', children: [{ id: 'app', label: 'app.ts' }] }];

const CASES: Record<string, () => ReactNode> = {
  Tabs: () => (
    <Kit.Tabs.Root defaultValue="one">
      <Kit.Tabs.List>
        <Kit.Tabs.Tab value="one">One</Kit.Tabs.Tab>
        <Kit.Tabs.Tab value="two">Two</Kit.Tabs.Tab>
      </Kit.Tabs.List>
      <Kit.Tabs.Panel value="one">First panel</Kit.Tabs.Panel>
      <Kit.Tabs.Panel value="two">Second panel</Kit.Tabs.Panel>
    </Kit.Tabs.Root>
  ),
  Accordion: () => (
    <Kit.Accordion.Root defaultValue={['a']}>
      <Kit.Accordion.Item value="a">
        <Kit.Accordion.Trigger>Shipping</Kit.Accordion.Trigger>
        <Kit.Accordion.Content>Ships in 2-3 days.</Kit.Accordion.Content>
      </Kit.Accordion.Item>
    </Kit.Accordion.Root>
  ),
  Collapsible: () => (
    <Kit.Collapsible.Root defaultOpen>
      <Kit.Collapsible.Trigger>More</Kit.Collapsible.Trigger>
      <Kit.Collapsible.Content>Details</Kit.Collapsible.Content>
    </Kit.Collapsible.Root>
  ),
  Separator: () => <Kit.Separator />,
  Pagination: () => <Kit.Pagination page={2} total={5} onPageChange={() => {}} />,
  Stepper: () => (
    <Kit.Stepper
      current="ship"
      steps={[
        { id: 'cart', label: 'Cart', status: 'complete' },
        { id: 'ship', label: 'Shipping' },
      ]}
    />
  ),
  Breadcrumb: () => (
    <Kit.Breadcrumb>
      <Kit.Breadcrumb.Item href="/">Home</Kit.Breadcrumb.Item>
      <Kit.Breadcrumb.Item>Data</Kit.Breadcrumb.Item>
    </Kit.Breadcrumb>
  ),
  Toolbar: () => (
    <Kit.Toolbar aria-label="Format">
      <Pressable>
        <Text>Bold</Text>
      </Pressable>
    </Kit.Toolbar>
  ),
  NavigationMenu: () => (
    <Kit.NavigationMenu>
      <Kit.NavigationMenu.Item id="home" href="/">
        Home
      </Kit.NavigationMenu.Item>
    </Kit.NavigationMenu>
  ),
  CommandPalette: () => (
    <Kit.CommandPalette open commands={[{ id: 'save', label: 'Save', onSelect: () => {} }]} />
  ),
  TreeView: () => <Kit.TreeView data={TREE} defaultExpanded={['src']} aria-label="Files" />,
  Stat: () => <Kit.Stat label="Revenue" value="$12k" />,
  EmptyState: () => <Kit.EmptyState title="Nothing here" description="Add an item." />,
  Timeline: () => <Kit.Timeline items={[{ id: 'a', title: 'Placed', time: '09:30' }]} />,
  AvatarGroup: () => <Kit.AvatarGroup avatars={[{ name: 'Jane Doe' }, { name: 'Sam Lee' }]} />,
};

describe('@usemotif/ui navigation and display on React Native', () => {
  for (const [name, make] of Object.entries(CASES)) {
    it(`${name} renders with its text in Text`, () => {
      render(make());
      expect(problems()).toEqual(CLEAN);
    });
  }

  it('switches Tabs and toggles an Accordion item on press', () => {
    render(
      <>
        {CASES.Tabs!()}
        {CASES.Accordion!()}
      </>,
    );
    act(() => pressable('Two').click());
    expect(document.body.textContent).toContain('Second panel');
    act(() => pressable('Shipping').click());
    expect(document.body.textContent).not.toContain('Ships in 2-3 days.');
  });

  it('pages a Pagination on press', () => {
    const onPageChange = vi.fn();
    render(<Kit.Pagination page={2} total={5} onPageChange={onPageChange} />);
    act(() => pressable('3').click());
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
