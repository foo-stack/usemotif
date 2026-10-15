/** @vitest-environment jsdom */
import { lightTheme } from '@usemotif/tokens';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ThemeProvider } from 'usemotif';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Kit from './index.native.js';

let container: HTMLElement;
let root: Root;
let errors: string[];

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  errors = [];
  // The mock renders native hosts as DOM elements, so React DOM complains about
  // native-only props; those warnings say nothing about the components.
  const MOCK_NOISE =
    /act\(\.\.\.\)|does not recognize the|Unknown event handler|non-boolean attribute|incorrect casing|Invalid DOM property|for a non-boolean|You provided a `value` prop|cannot be a descendant|cannot contain a nested/;
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

function strayText(): string[] {
  const stray: string[] = [];
  const walk = (el: Element): void => {
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent!.trim() !== '') {
        if (el.getAttribute('data-motif-host') !== 'Text') stray.push(node.textContent!);
      } else if (node.nodeType === Node.ELEMENT_NODE) walk(node as Element);
    }
  };
  walk(document.body);
  return stray;
}

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

const CASES: Record<string, () => ReactNode> = {
  Switch: () => <Kit.Switch {...({ defaultValue: true, accessibilityLabel: 'Wi-Fi' } as object)} />,
  Checkbox: () => (
    <Kit.Checkbox {...({ defaultValue: true, accessibilityLabel: 'Agree' } as object)} />
  ),
  Radio: () => (
    <Kit.RadioGroup {...({ defaultValue: 'a' } as object)}>
      <Kit.Radio value="a" {...({ children: 'Alpha' } as object)} />
    </Kit.RadioGroup>
  ),
  Select: () => <Kit.Select options={OPTIONS} aria-label="Pick" />,
  Slider: () => <Kit.Slider defaultValue={30} aria-label="Volume" />,
  RangeSlider: () => <Kit.RangeSlider defaultValue={[20, 60]} aria-label="Price" />,
  RatingInput: () => <Kit.RatingInput defaultValue={3} aria-label="Rating" />,
  SegmentedControl: () => (
    <Kit.SegmentedControl aria-label="View" defaultValue="a" options={OPTIONS} />
  ),
  Combobox: () => <Kit.Combobox options={OPTIONS} aria-label="Fruit" />,
  MultiSelect: () => <Kit.MultiSelect options={OPTIONS} aria-label="Tags" />,
  ColorPicker: () => <Kit.ColorPicker defaultValue="#22c55e" />,
  FileUpload: () => <Kit.FileUpload onFiles={() => {}} />,
  TagsInput: () => <Kit.TagsInput defaultValue={['one']} aria-label="Tags" />,
  TimeInput: () => <Kit.TimeInput aria-label="Time" />,
  Calendar: () => <Kit.Calendar />,
  DatePicker: () => <Kit.DatePicker aria-label="Date" />,
  FormField: () => (
    <Kit.FormField label="Email" error="Required">
      <Kit.TextField placeholder="you@example.com" />
    </Kit.FormField>
  ),
};

describe('@usemotif/ui forms on React Native', () => {
  for (const [name, make] of Object.entries(CASES)) {
    it(`${name} renders with its text in Text`, () => {
      render(make());
      // No web-only CSS reaches a native host: token variables are resolved first.
      const cssVars = Array.from(document.querySelectorAll('[data-motif-style]'))
        .filter((el) => el.getAttribute('data-motif-style')!.includes('var(--'))
        .map((el) => el.getAttribute('data-motif-host'));
      expect({ stray: strayText(), errors, cssVars }).toEqual({
        stray: [],
        errors: [],
        cssVars: [],
      });
    });
  }

  it('opens a Select from its trigger, with the options in Text and native styles', () => {
    const onValueChange = vi.fn();
    render(<Kit.Select options={OPTIONS} aria-label="Pick" onValueChange={onValueChange} />);
    const trigger = Array.from(document.querySelectorAll('[data-motif-host="Pressable"]')).find(
      (el) => el.textContent?.includes('Select'),
    ) as HTMLElement;
    act(() => trigger.click());
    expect(document.body.textContent).toContain('Alpha');
    expect(strayText()).toEqual([]);
    const cssVars = Array.from(document.querySelectorAll('[data-motif-style]')).filter((el) =>
      el.getAttribute('data-motif-style')!.includes('var(--'),
    );
    expect(cssVars).toEqual([]);
    const beta = Array.from(document.querySelectorAll('[data-motif-host="Pressable"]')).find(
      (el) => el.textContent === 'Beta',
    ) as HTMLElement;
    act(() => beta.click());
    expect(onValueChange).toHaveBeenCalledWith('b');
  });
});
