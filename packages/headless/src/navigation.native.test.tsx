/** @vitest-environment jsdom */
/**
 * Native NavigationMenu tests run against the `react-native` mock
 * (aliased in vitest.config.ts), which renders Modal / Pressable /
 * View / Text as DOM hosts. `Linking.openURL` is spied so we can assert
 * a sub-item's `href` is opened.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Linking, Text } from 'react-native';
import {
  NavigationMenu,
  Pagination,
  Stepper,
  type NavigationMenuItem,
} from './navigation.native.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function clickHost(host: Element): void {
  act(() => {
    (host as HTMLElement).click();
  });
}

/** All Pressable hosts that carry accessibilityRole="menuitem". */
function menuItems(): HTMLElement[] {
  return Array.from(container.querySelectorAll('[data-motif-host="Pressable"]')).filter(
    (el) => el.getAttribute('accessibilityrole') === 'menuitem',
  ) as HTMLElement[];
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
  vi.restoreAllMocks();
});

const items: ReadonlyArray<NavigationMenuItem> = [
  {
    id: 'products',
    label: <Text>Products</Text>,
    children: [
      {
        id: 'web',
        label: <Text>Web</Text>,
        href: 'https://example.dev/web',
        children: [{ id: 'web-box', label: <Text>Box</Text> }],
      },
    ],
  },
];

// #222 - a string `label` on a default-rendered item used to drop into
// Pressable as a raw string child (crashes on a real device). It must
// now be wrapped in a Text host.
describe('Native NavigationMenu - string labels wrapped in Text (#222)', () => {
  const stringItems: ReadonlyArray<NavigationMenuItem> = [
    { id: 'home', label: 'Home' },
    { id: 'products', label: 'Products', children: [{ id: 'web', label: 'Web' }] },
  ];

  it('wraps a default string label in a Text host', () => {
    render(<NavigationMenu items={stringItems} />);
    const texts = Array.from(container.querySelectorAll('[data-motif-host="Text"]')).map(
      (el) => el.textContent ?? '',
    );
    expect(texts).toContain('Home');
    expect(texts).toContain('Products');
  });

  it('wraps a default string sub-item label in a Text host once the menu opens', () => {
    render(<NavigationMenu items={stringItems} />);
    const trigger = Array.from(container.querySelectorAll('[data-motif-host="Pressable"]')).find(
      (el) => el.getAttribute('accessibilityrole') === 'button',
    )!;
    clickHost(trigger);
    const texts = Array.from(container.querySelectorAll('[data-motif-host="Text"]')).map(
      (el) => el.textContent ?? '',
    );
    expect(texts).toContain('Web');
  });
});

describe('Native NavigationMenu - sub-item href + nested children (#264)', () => {
  it('opens a sub-item href via Linking.openURL and recurses into nested children', () => {
    const openURL = vi.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    render(<NavigationMenu items={items} />);

    // Open the top-level menu (the trigger has children → role=button).
    const trigger = Array.from(container.querySelectorAll('[data-motif-host="Pressable"]')).find(
      (el) => el.getAttribute('accessibilityrole') === 'button',
    )!;
    clickHost(trigger);

    // The nested grandchild ("Box") must render - proving recursion, not a
    // 2-level flatten.
    expect(container.textContent).toContain('Box');

    // Tapping the "Web" sub-item opens its href.
    const web = menuItems().find((el) => el.textContent?.includes('Web'))!;
    clickHost(web);
    expect(openURL).toHaveBeenCalledWith('https://example.dev/web');
  });
});

describe('native Stepper', () => {
  it('makes earlier steps pressable in linear mode and reports the id', () => {
    const onStepChange = vi.fn();
    render(
      <Stepper
        steps={[
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
          { id: 'c', label: 'C' },
        ]}
        current="b"
        linear
        onStepChange={onStepChange}
        renderStep={({ step }) => <Text>{step.label as string}</Text>}
      />,
    );
    const steps = Array.from(container.querySelectorAll('[data-motif-host="Pressable"]'));
    expect(steps).toHaveLength(3);
    const disabled = steps.map((el) => {
      const key = Object.keys(el).find((k) => k.startsWith('__reactProps'))!;
      return (el as unknown as Record<string, { disabled?: boolean }>)[key]!.disabled;
    });
    expect(disabled).toEqual([false, true, true]);
    act(() => (steps[0] as HTMLElement).click());
    expect(onStepChange).toHaveBeenCalledWith('a');
  });
});

describe('Pagination (native) - boundaries and page size', () => {
  it('shows `boundaries` pages and offers page sizes that keep the first item in view', () => {
    const onPageSizeChange = vi.fn();
    const sizeChoices: Array<(size: number) => void> = [];
    render(
      <Pagination
        page={2}
        total={20}
        boundaries={2}
        pageSize={50}
        onPageSizeChange={onPageSizeChange}
        renderItem={(info) => (
          <Text>
            {info.type === 'page' ? String(info.page) : info.type === 'ellipsis' ? '_' : ''}
          </Text>
        )}
        renderPageSize={({ options, onChange }) => {
          sizeChoices.push(onChange);
          return <Text>{options.join(',')}</Text>;
        }}
      />,
    );
    const texts = Array.from(
      container.querySelectorAll('[data-motif-host="Text"]'),
      (el) => el.textContent,
    );
    expect(texts.filter((t) => t !== '')).toEqual(['1', '2', '3', '_', '19', '20', '50']);
    act(() => sizeChoices[0]!(10));
    expect(onPageSizeChange).toHaveBeenCalledWith(10, 6);
  });
});
