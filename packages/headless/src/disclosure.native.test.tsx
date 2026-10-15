/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Pressable, Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AccordionItem,
  AccordionRoot,
  CollapsibleContent,
  CollapsibleTrigger,
} from './disclosure.native.js';

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
});

function state(id: string): { expanded?: boolean; disabled?: boolean } {
  const el = container.querySelector(`[testID="${id}"]`)!;
  const key = Object.keys(el).find((k) => k.startsWith('__reactProps'))!;
  return (el as unknown as Record<string, { accessibilityState: object }>)[key]!.accessibilityState;
}

describe('Accordion (native) - collapsible={false}', () => {
  it('keeps the open item open and marks its trigger disabled', () => {
    act(() =>
      root.render(
        <AccordionRoot collapsible={false} defaultValue={['a']}>
          {['a', 'b'].map((v) => (
            <AccordionItem key={v} value={v}>
              <CollapsibleTrigger>
                <Pressable testID={v}>
                  <Text>{v}</Text>
                </Pressable>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Text>{v} body</Text>
              </CollapsibleContent>
            </AccordionItem>
          ))}
        </AccordionRoot>,
      ),
    );
    expect(state('a')).toEqual({ expanded: true, disabled: true });
    act(() => (container.querySelector('[testID="a"]') as HTMLElement).click());
    expect(state('a')).toEqual({ expanded: true, disabled: true });
    act(() => (container.querySelector('[testID="b"]') as HTMLElement).click());
    expect(state('a')).toEqual({ expanded: false });
    expect(state('b')).toEqual({ expanded: true, disabled: true });
  });
});
