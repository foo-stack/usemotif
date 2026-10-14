/** @vitest-environment jsdom */
/**
 * Native TreeView tests - mirror the web `TreeView.test.tsx` shape
 * (render → roles → selection → controlled mode), adapted for the
 * native API (no keyboard navigation: native consumers tap rows
 * rather than ArrowKeys + Enter).
 *
 * Runs against the `react-native` jsdom mock from `@usemotif/react-native`
 * (aliased in this package's vitest.config.ts), so RN primitives
 * render as DOM hosts and can be queried by the standard selectors.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, type ReactElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Pressable } from 'react-native';
import { TreeView, type TreeNode } from './specialized.native.js';

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
  act(() => {
    root.unmount();
  });
  document.body.removeChild(container);
});

const tree: ReadonlyArray<TreeNode> = [
  {
    id: 'src',
    label: 'src',
    children: [
      { id: 'src/index.ts', label: 'index.ts' },
      {
        id: 'src/lib',
        label: 'lib',
        children: [
          { id: 'src/lib/a.ts', label: 'a.ts' },
          { id: 'src/lib/b.ts', label: 'b.ts' },
        ],
      },
    ],
  },
  { id: 'README.md', label: 'README.md' },
];

function renderNode(info: {
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isFocused: boolean;
  toggle: () => void;
  select: () => void;
}): ReactElement {
  // The mock Pressable forwards arbitrary props onto the rendered
  // <button> host, which jsdom can query by attribute. Cast the
  // props bag so RN's stricter PressableProps type doesn't reject
  // the `data-*` attributes we're using for assertions.
  return createElement(
    Pressable,
    {
      testID: info.node.id,
      'data-expanded': String(info.isExpanded),
      'data-selected': String(info.isSelected),
      onPress: () => {
        info.toggle();
        info.select();
      },
    } as Record<string, unknown>,
    info.node.label,
  );
}

describe('Native TreeView - render shape', () => {
  it('renders a list role with the node items inside', () => {
    render(<TreeView data={tree} renderNode={renderNode} accessibilityLabel="files" />);
    const lists = container.querySelectorAll('[accessibilityRole="list"]');
    // ScrollView outer + View inner both carry list role for AT.
    expect(lists.length).toBeGreaterThanOrEqual(1);
    // Two roots only - children of `src` are hidden until expanded.
    expect(container.querySelectorAll('[testID]').length).toBe(2);
  });

  it('aria-label / accessibilityLabel propagates to the outer ScrollView', () => {
    render(<TreeView data={tree} renderNode={renderNode} accessibilityLabel="files" />);
    const scroll = container.querySelector('[data-motif-host="ScrollView"]') as HTMLElement;
    expect(scroll.getAttribute('accessibilityLabel')).toBe('files');
  });

  it('defaultExpanded ids show their children', () => {
    render(<TreeView data={tree} defaultExpanded={['src']} renderNode={renderNode} />);
    expect(container.querySelector('[testID="src/index.ts"]')).not.toBeNull();
    expect(container.querySelector('[testID="src/lib"]')).not.toBeNull();
    // Grandchildren still hidden because src/lib isn't expanded.
    expect(container.querySelector('[testID="src/lib/a.ts"]')).toBeNull();
  });

  it('toggling a parent expands its children', () => {
    render(<TreeView data={tree} renderNode={renderNode} />);
    expect(container.querySelector('[testID="src/index.ts"]')).toBeNull();
    const src = container.querySelector('[testID="src"]') as HTMLElement;
    act(() => {
      src.click();
    });
    expect(container.querySelector('[testID="src/index.ts"]')).not.toBeNull();
  });
});

describe('Native TreeView - selection', () => {
  it('tapping a leaf node selects it', () => {
    render(<TreeView data={tree} defaultExpanded={['src']} renderNode={renderNode} />);
    const leaf = container.querySelector('[testID="src/index.ts"]') as HTMLElement;
    act(() => {
      leaf.click();
    });
    expect(leaf.getAttribute('data-selected')).toBe('true');
  });

  it('controlled mode: onValueChange fires; selection persists from prop', () => {
    const onValueChange = vi.fn();
    render(
      <TreeView
        data={tree}
        value="README.md"
        onValueChange={onValueChange}
        defaultExpanded={['src']}
        renderNode={renderNode}
      />,
    );
    expect(container.querySelector('[testID="README.md"]')!.getAttribute('data-selected')).toBe(
      'true',
    );
    const leaf = container.querySelector('[testID="src/index.ts"]') as HTMLElement;
    act(() => {
      leaf.click();
    });
    expect(onValueChange).toHaveBeenCalledWith('src/index.ts');
    // Still README.md - controlled.
    expect(container.querySelector('[testID="README.md"]')!.getAttribute('data-selected')).toBe(
      'true',
    );
  });

  it('disabled nodes do not fire onValueChange', () => {
    const onValueChange = vi.fn();
    const treeWithDisabled: ReadonlyArray<TreeNode> = [
      { id: 'a', label: 'a', disabled: true },
      { id: 'b', label: 'b' },
    ];
    render(
      <TreeView data={treeWithDisabled} renderNode={renderNode} onValueChange={onValueChange} />,
    );
    const a = container.querySelector('[testID="a"]') as HTMLElement;
    act(() => {
      a.click();
    });
    expect(onValueChange).not.toHaveBeenCalled();
    // Enabled node still works.
    const b = container.querySelector('[testID="b"]') as HTMLElement;
    act(() => {
      b.click();
    });
    expect(onValueChange).toHaveBeenCalledWith('b');
  });
});

describe('Native TreeView - lazy children and multiple selection', () => {
  function host(id: string): HTMLElement {
    return container.querySelector<HTMLElement>(`[testID="${id}"]`)!;
  }

  it('loads a hasChildren node on first expand, flagging it as loading', async () => {
    let resolve!: () => void;
    const load = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    const loadingSeen: boolean[] = [];
    const lazy = (loaded: boolean): ReadonlyArray<TreeNode> => [
      {
        id: 'docs',
        label: 'docs',
        hasChildren: true,
        ...(loaded ? { children: [{ id: 'guide', label: 'guide' }] } : {}),
      },
    ];
    const node = (info: Parameters<typeof renderNode>[0] & { isLoading: boolean }) => {
      if (info.node.id === 'docs') loadingSeen.push(info.isLoading);
      return renderNode(info);
    };
    render(<TreeView data={lazy(false)} loadChildren={load} renderNode={node} />);
    await act(async () => {
      host('docs').click();
    });
    expect(load).toHaveBeenCalledTimes(1);
    expect(loadingSeen.at(-1)).toBe(true);
    render(<TreeView data={lazy(true)} loadChildren={load} renderNode={node} />);
    await act(async () => {
      resolve();
    });
    expect(loadingSeen.at(-1)).toBe(false);
    expect(host('guide')).not.toBeNull();
  });

  it('toggles membership in multiple mode', () => {
    const onValueChange = vi.fn();
    render(
      <TreeView
        selectionMode="multiple"
        defaultValue={['README.md']}
        onValueChange={onValueChange}
        data={tree}
        renderNode={renderNode}
      />,
    );
    expect(host('README.md').getAttribute('data-selected')).toBe('true');
    act(() => host('src').click());
    expect(onValueChange).toHaveBeenLastCalledWith(['README.md', 'src']);
    act(() => host('README.md').click());
    expect(onValueChange).toHaveBeenLastCalledWith(['src']);
  });
});
