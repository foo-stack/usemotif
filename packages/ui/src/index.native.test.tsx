/** @vitest-environment jsdom */
import { lightTheme } from '@usemotif/tokens';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ThemeProvider } from 'usemotif';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  Progress,
  ProgressCircle,
  Skeleton,
  TextField,
} from './index.native.js';

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

function render(node: ReactNode): void {
  act(() =>
    root.render(
      <ThemeProvider themes={[lightTheme]} active={lightTheme.name}>
        {node}
      </ThemeProvider>,
    ),
  );
}

function propsOf(el: Element): Record<string, unknown> {
  const key = Object.keys(el).find((k) => k.startsWith('__reactProps'))!;
  return (el as unknown as Record<string, Record<string, unknown>>)[key]!;
}

const styleOf = (el: Element): string => el.getAttribute('data-motif-style') ?? '';

const hosts = (name: string): HTMLElement[] =>
  Array.from(container.querySelectorAll(`[data-motif-host="${name}"]`));

/** Every bare string sits inside a Text host, or React Native would throw. */
function strayText(): string[] {
  const stray: string[] = [];
  const walk = (el: Element): void => {
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent!.trim() !== '') {
        if (el.getAttribute('data-motif-host') !== 'Text') stray.push(node.textContent!);
      } else if (node.nodeType === Node.ELEMENT_NODE) walk(node as Element);
    }
  };
  walk(container);
  return stray;
}

describe('@usemotif/ui on React Native', () => {
  it('puts every label in Text, carrying the recipe colour', () => {
    render(
      <>
        <Badge intent="danger">New</Badge>
        <Button intent="primary">Save</Button>
        <Card padding="none">
          <Card.Header>Pro plan</Card.Header>
          <Card.Body>Everything in Team.</Card.Body>
        </Card>
        <Chip>Design</Chip>
        <Alert intent="info" title="Heads up" onDismiss={() => {}}>
          Body
        </Alert>
      </>,
    );
    expect(strayText()).toEqual([]);
    const save = hosts('Text').find((el) => el.textContent === 'Save')!;
    // The primary action's foreground, on the Text itself.
    expect(styleOf(save)).toContain('"color"');
  });

  it('presses a Button and dismisses an Alert', () => {
    const onPress = vi.fn();
    const onDismiss = vi.fn();
    render(
      <>
        <Button onPress={onPress}>Save</Button>
        <Alert title="Saved" onDismiss={onDismiss} />
      </>,
    );
    act(() => hosts('Pressable')[0]!.click());
    expect(onPress).toHaveBeenCalledTimes(1);
    const dismiss = hosts('Pressable').find((el) => el.getAttribute('aria-label') === 'Dismiss')!;
    act(() => dismiss.click());
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('toggles a filter Chip, apart from its remove target', () => {
    const onSelectedChange = vi.fn();
    const onRemove = vi.fn();
    render(
      <Chip defaultSelected={false} onSelectedChange={onSelectedChange} onRemove={onRemove}>
        Design
      </Chip>,
    );
    const [toggle, remove] = hosts('Pressable');
    expect(propsOf(toggle!)['aria-pressed']).toBe(false);
    act(() => toggle!.click());
    expect(onSelectedChange).toHaveBeenLastCalledWith(true);
    expect(propsOf(hosts('Pressable')[0]!)['aria-pressed']).toBe(true);
    act(() => remove!.click());
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onSelectedChange).toHaveBeenCalledTimes(1);
  });

  it('gives Progress and ProgressCircle progressbar semantics', () => {
    render(
      <>
        <Progress value={40} aria-label="Uploading" />
        <ProgressCircle value={null} aria-label="Loading" />
      </>,
    );
    const bars = hosts('View').filter((el) => propsOf(el).role === 'progressbar');
    expect(bars.map((el) => propsOf(el)['aria-label'])).toEqual(['Uploading', 'Loading']);
    expect(propsOf(bars[0]!)['aria-valuenow']).toBe(40);
    expect(propsOf(bars[1]!)['aria-valuenow']).toBeUndefined();
  });

  it('sizes Skeleton lines from the font-size token and TextField from the recipe', () => {
    render(
      <>
        <Skeleton lines={2} fontSize="$fontSizes.xl" />
        <TextField size="lg" invalid placeholder="Email" />
      </>,
    );
    const stack = hosts('View').find((el) => propsOf(el)['aria-hidden'] === true)!;
    const heights = Array.from(stack.children).map((el) => /"height":(\d+)/.exec(styleOf(el))?.[1]);
    expect(heights).toEqual(['20', '20']);
    const input = hosts('TextInput')[0]!;
    const inputStyle = styleOf(input);
    expect(inputStyle).toContain('"height":48');
    expect(propsOf(input)['aria-invalid']).toBe(true);
  });
});
