import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Accordion, Collapsible, Tabs } from './index.js';

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
  act(() => root.render(node));
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

function click(el: Element): void {
  act(() => {
    (el as HTMLElement).click();
  });
}

describe('Collapsible', () => {
  it('starts closed; trigger toggles open + aria-expanded flips', () => {
    render(
      <Collapsible.Root>
        <Collapsible.Trigger>
          <button data-testid="trigger">Toggle</button>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <p>contents</p>
        </Collapsible.Content>
      </Collapsible.Root>,
    );
    const trigger = container.querySelector('[data-testid="trigger"]')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('[role="region"]')).toBeNull();
    click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('[role="region"]')).not.toBeNull();
  });

  it('Content binds aria-labelledby to the Trigger id', () => {
    render(
      <Collapsible.Root defaultOpen>
        <Collapsible.Trigger>
          <button data-testid="trigger">Toggle</button>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <p>contents</p>
        </Collapsible.Content>
      </Collapsible.Root>,
    );
    const trigger = container.querySelector('[data-testid="trigger"]')!;
    const region = container.querySelector('[role="region"]')!;
    expect(region.getAttribute('aria-labelledby')).toBe(trigger.id);
  });

  it('forceMount keeps the content in the tree when closed (with hidden)', () => {
    render(
      <Collapsible.Root defaultOpen={false}>
        <Collapsible.Trigger>
          <button>Toggle</button>
        </Collapsible.Trigger>
        <Collapsible.Content forceMount>
          <p data-testid="body">body</p>
        </Collapsible.Content>
      </Collapsible.Root>,
    );
    const region = container.querySelector('[role="region"]')!;
    expect(region.hasAttribute('hidden')).toBe(true);
    expect(container.querySelector('[data-testid="body"]')).not.toBeNull();
  });
});

describe('Accordion - single mode (default)', () => {
  it('opening one item closes the previously open item', () => {
    render(
      <Accordion.Root>
        <Accordion.Item value="a">
          <Accordion.Trigger>
            <button data-testid="ta">A</button>
          </Accordion.Trigger>
          <Accordion.Content>A body</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Trigger>
            <button data-testid="tb">B</button>
          </Accordion.Trigger>
          <Accordion.Content>B body</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>,
    );
    click(container.querySelector('[data-testid="ta"]')!);
    expect(container.querySelector('[data-testid="ta"]')!.getAttribute('aria-expanded')).toBe(
      'true',
    );
    click(container.querySelector('[data-testid="tb"]')!);
    expect(container.querySelector('[data-testid="ta"]')!.getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(container.querySelector('[data-testid="tb"]')!.getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('clicking the open item closes it (no item open)', () => {
    render(
      <Accordion.Root defaultValue={['a']}>
        <Accordion.Item value="a">
          <Accordion.Trigger>
            <button data-testid="ta">A</button>
          </Accordion.Trigger>
          <Accordion.Content>A body</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>,
    );
    expect(container.querySelector('[data-testid="ta"]')!.getAttribute('aria-expanded')).toBe(
      'true',
    );
    click(container.querySelector('[data-testid="ta"]')!);
    expect(container.querySelector('[data-testid="ta"]')!.getAttribute('aria-expanded')).toBe(
      'false',
    );
  });
});

describe('Accordion - collapsible={false}', () => {
  function Locked({ type = 'single' }: { type?: 'single' | 'multiple' }): React.ReactElement {
    return (
      <Accordion.Root type={type} collapsible={false} defaultValue={['a']}>
        <Accordion.Item value="a">
          <Accordion.Trigger>
            <button data-testid="ta">A</button>
          </Accordion.Trigger>
          <Accordion.Content>A body</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Trigger>
            <button data-testid="tb">B</button>
          </Accordion.Trigger>
          <Accordion.Content>B body</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    );
  }
  const attr = (id: string, name: string): string | null =>
    container.querySelector(`[data-testid="${id}"]`)!.getAttribute(name);

  it('keeps the open item open and marks its trigger disabled', () => {
    render(<Locked />);
    expect(attr('ta', 'aria-disabled')).toBe('true');
    expect(attr('tb', 'aria-disabled')).toBeNull();
    click(container.querySelector('[data-testid="ta"]')!);
    expect(attr('ta', 'aria-expanded')).toBe('true');
    click(container.querySelector('[data-testid="tb"]')!);
    expect(attr('ta', 'aria-expanded')).toBe('false');
    expect(attr('tb', 'aria-expanded')).toBe('true');
    expect(attr('ta', 'aria-disabled')).toBeNull();
    expect(attr('tb', 'aria-disabled')).toBe('true');
  });

  it('has no effect in multiple mode', () => {
    render(<Locked type="multiple" />);
    expect(attr('ta', 'aria-disabled')).toBeNull();
    click(container.querySelector('[data-testid="ta"]')!);
    expect(attr('ta', 'aria-expanded')).toBe('false');
  });
});

describe('Accordion - multiple mode', () => {
  it('multiple items can be open simultaneously', () => {
    render(
      <Accordion.Root type="multiple">
        <Accordion.Item value="a">
          <Accordion.Trigger>
            <button data-testid="ta">A</button>
          </Accordion.Trigger>
          <Accordion.Content>A body</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Trigger>
            <button data-testid="tb">B</button>
          </Accordion.Trigger>
          <Accordion.Content>B body</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>,
    );
    click(container.querySelector('[data-testid="ta"]')!);
    click(container.querySelector('[data-testid="tb"]')!);
    expect(container.querySelector('[data-testid="ta"]')!.getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(container.querySelector('[data-testid="tb"]')!.getAttribute('aria-expanded')).toBe(
      'true',
    );
  });
});

describe('Tabs', () => {
  function renderTabs(
    opts: {
      defaultValue?: string;
      orientation?: 'horizontal' | 'vertical';
      activationMode?: 'automatic' | 'manual';
    } = {},
  ) {
    render(
      <Tabs.Root {...opts}>
        <Tabs.List>
          <Tabs.Tab value="a">
            <span>A</span>
          </Tabs.Tab>
          <Tabs.Tab value="b">
            <span>B</span>
          </Tabs.Tab>
          <Tabs.Tab value="c">
            <span>C</span>
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">A body</Tabs.Panel>
        <Tabs.Panel value="b">B body</Tabs.Panel>
        <Tabs.Panel value="c">C body</Tabs.Panel>
      </Tabs.Root>,
    );
  }

  it('renders tablist with role + aria-orientation', () => {
    renderTabs({ defaultValue: 'a' });
    const list = container.querySelector('[role="tablist"]')!;
    expect(list.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('vertical orientation propagates to aria-orientation', () => {
    renderTabs({ defaultValue: 'a', orientation: 'vertical' });
    expect(container.querySelector('[role="tablist"]')!.getAttribute('aria-orientation')).toBe(
      'vertical',
    );
  });

  it('selected tab carries aria-selected="true"; others false', () => {
    renderTabs({ defaultValue: 'a' });
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('false');
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('false');
  });

  it('clicking a tab swaps the active panel', () => {
    renderTabs({ defaultValue: 'a' });
    const panels = container.querySelectorAll('[role="tabpanel"]');
    // Inactive panels are hidden / not rendered - just verify the
    // visible panel matches the selected tab.
    expect(panels[0]!.textContent).toContain('A body');
    const tabs = container.querySelectorAll<HTMLElement>('[role="tab"]');
    click(tabs[1]!);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('false');
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowRight cycles to the next tab in horizontal orientation', () => {
    renderTabs({ defaultValue: 'a' });
    const tabs = container.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs[0]!.focus();
    act(() => {
      tabs[0]!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
    });
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowLeft from first wraps to last', () => {
    renderTabs({ defaultValue: 'a' });
    const tabs = container.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs[0]!.focus();
    act(() => {
      tabs[0]!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
    });
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('true');
  });

  it('manual activation moves focus without selecting, and a press selects', () => {
    renderTabs({ defaultValue: 'a', activationMode: 'manual' });
    const tabs = container.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs[0]!.focus();
    const key = (k: string): void =>
      act(() => {
        document.activeElement!.dispatchEvent(
          new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }),
        );
      });
    key('ArrowRight');
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    key('End');
    expect(document.activeElement).toBe(tabs[2]);
    key('Home');
    expect(document.activeElement).toBe(tabs[0]);
    key('ArrowLeft');
    expect(document.activeElement).toBe(tabs[2]);
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('false');
    // Enter and Space on a focused <button> fire its click, which selects.
    click(tabs[2]!);
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('true');
  });

  it('automatic activation stays the default, selecting as focus moves', () => {
    renderTabs({ defaultValue: 'a' });
    const tabs = container.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs[0]!.focus();
    act(() => {
      tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    });
    expect(document.activeElement).toBe(tabs[2]);
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowDown / ArrowUp navigate vertical orientations', () => {
    renderTabs({ defaultValue: 'a', orientation: 'vertical' });
    const tabs = container.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs[0]!.focus();
    act(() => {
      tabs[0]!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      );
    });
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
  });
});

describe('Tabs - asChild', () => {
  it('projects the tab/list/panel semantics onto provided elements', () => {
    render(
      <Tabs.Root defaultValue="a">
        <Tabs.List asChild>
          <nav data-testid="list">
            <Tabs.Tab asChild value="a">
              <span data-testid="tab-a">A</span>
            </Tabs.Tab>
            <Tabs.Tab asChild value="b">
              <span data-testid="tab-b">B</span>
            </Tabs.Tab>
          </nav>
        </Tabs.List>
        <Tabs.Panel asChild value="a">
          <section data-testid="panel-a">Panel A</section>
        </Tabs.Panel>
      </Tabs.Root>,
    );
    // The list role lands on the provided <nav>, not a wrapping <div>.
    const list = container.querySelector('[data-testid="list"]')!;
    expect(list.tagName).toBe('NAV');
    expect(list.getAttribute('role')).toBe('tablist');
    // The tab semantics land on the provided <span> - so it can react to
    // aria-selected in CSS.
    const tabA = container.querySelector('[data-testid="tab-a"]')!;
    expect(tabA.tagName).toBe('SPAN');
    expect(tabA.getAttribute('role')).toBe('tab');
    expect(tabA.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-testid="tab-b"]')!.getAttribute('aria-selected')).toBe(
      'false',
    );
    // The panel role lands on the provided <section>.
    const panelA = container.querySelector('[data-testid="panel-a"]')!;
    expect(panelA.tagName).toBe('SECTION');
    expect(panelA.getAttribute('role')).toBe('tabpanel');
  });

  it('clicking an asChild tab selects it', () => {
    render(
      <Tabs.Root defaultValue="a">
        <Tabs.List>
          <Tabs.Tab asChild value="a">
            <span data-testid="tab-a">A</span>
          </Tabs.Tab>
          <Tabs.Tab asChild value="b">
            <span data-testid="tab-b">B</span>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.Root>,
    );
    act(() => (container.querySelector('[data-testid="tab-b"]') as HTMLElement).click());
    expect(container.querySelector('[data-testid="tab-b"]')!.getAttribute('aria-selected')).toBe(
      'true',
    );
  });
});
