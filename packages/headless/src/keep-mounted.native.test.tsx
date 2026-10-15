/** @vitest-environment jsdom */
import { act, useState, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Pressable, Text } from 'react-native';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { TabsList, TabsPanel, TabsRoot, TabsTab } from './disclosure.native.js';

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

function Counter(): ReactElement {
  const [n, setN] = useState(0);
  return (
    <Pressable testID="count" onPress={() => setN(n + 1)}>
      <Text>{n}</Text>
    </Pressable>
  );
}

it("keeps a native Tabs panel's state under keepMounted='activity'", () => {
  let select: (v: string) => void = () => {};
  function App(): ReactElement {
    const [value, setValue] = useState('a');
    select = setValue;
    return (
      <TabsRoot value={value} onValueChange={setValue}>
        <TabsList>
          <TabsTab value="a">A</TabsTab>
          <TabsTab value="b">B</TabsTab>
        </TabsList>
        <TabsPanel value="a" keepMounted="activity">
          <Counter />
        </TabsPanel>
      </TabsRoot>
    );
  }
  act(() => root.render(<App />));
  const count = (): HTMLElement =>
    container.querySelector('[data-testid="count"], [testID="count"]')!;
  act(() => count().click());
  act(() => select('b'));
  expect(count().textContent).toBe('1');
  act(() => select('a'));
  expect(count().textContent).toBe('1');
});
