/** @vitest-environment jsdom */
import { motifMatchers, type NativeTestInstance } from '@usemotif/test-utils';
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Pressable, Text } from 'react-native';
import { describe, expect, it } from 'vitest';
import {
  CollapsibleContent as NativeContent,
  CollapsibleRoot as NativeRoot,
  CollapsibleTrigger as NativeTrigger,
} from './disclosure.native.js';
import { Collapsible } from './index.js';

expect.extend(motifMatchers);

function mount(node: ReactElement): HTMLElement {
  const container = document.createElement('div');
  document.body.append(container);
  act(() => createRoot(container).render(node));
  return container;
}

/** The React Native mock renders hosts as DOM; read them back as test instances carry them. */
function asInstance(el: Element): NativeTestInstance {
  const key = Object.keys(el).find((k) => k.startsWith('__reactProps'))!;
  return {
    props: (el as unknown as Record<string, Record<string, unknown>>)[key]!,
    children: Array.from(el.childNodes, (child) =>
      child.nodeType === Node.TEXT_NODE ? (child.textContent ?? '') : asInstance(child as Element),
    ),
  };
}

describe('accessibility matchers across platforms', () => {
  it('read a Collapsible trigger the same on web and on native', () => {
    const web = mount(
      <Collapsible.Root defaultOpen>
        <Collapsible.Trigger>
          <button>Shipping details</button>
        </Collapsible.Trigger>
        <Collapsible.Content>Ships in two days</Collapsible.Content>
      </Collapsible.Root>,
    ).querySelector('button')!;
    const nativeRoot = mount(
      <NativeRoot defaultOpen>
        <NativeTrigger>
          <Pressable accessibilityRole="button">
            <Text>Shipping details</Text>
          </Pressable>
        </NativeTrigger>
        <NativeContent>
          <Text>Ships in two days</Text>
        </NativeContent>
      </NativeRoot>,
    );
    const native = Array.from(nativeRoot.querySelectorAll('[data-motif-host]'), asInstance).find(
      (node) => node.props.accessibilityRole === 'button',
    )!;

    for (const trigger of [web, native]) {
      expect(trigger).toHaveRole('button');
      expect(trigger).toHaveAccessibleName('Shipping details');
      expect(trigger).toBeExpanded();
    }
  });

  it('map native role names and labels to their ARIA meaning', () => {
    const heading: NativeTestInstance = {
      props: { accessibilityRole: 'header' },
      children: ['Settings'],
    };
    const icon: NativeTestInstance = { props: { role: 'img', accessibilityLabel: 'Warning' } };
    const closed: NativeTestInstance = { props: { 'aria-expanded': false }, children: ['More'] };
    expect(heading).toHaveRole('heading');
    expect(heading).toHaveAccessibleName('Settings');
    expect(icon).toHaveRole('img');
    expect(icon).toHaveAccessibleName(/warn/i);
    expect(closed).not.toBeExpanded();

    const page = mount(
      <>
        <h2 id="t">Account</h2>
        <section aria-labelledby="t" />
        <label htmlFor="e">Email</label>
        <input id="e" type="email" />
        <img src="x.png" alt="" />
      </>,
    );
    expect(page.querySelector('h2')).toHaveRole('heading');
    expect(page.querySelector('section')).toHaveAccessibleName('Account');
    expect(page.querySelector('input')).toHaveRole('textbox');
    expect(page.querySelector('input')).toHaveAccessibleName('Email');
    expect(page.querySelector('img')).toHaveRole('presentation');
    expect(() => expect(page.querySelector('h2')).toBeExpanded()).toThrow(/no expanded state/);
  });
});
