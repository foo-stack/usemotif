/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Stepper } from './navigation.js';

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

const STEPS = [
  { id: 'cart', label: 'Cart', status: 'complete' as const },
  { id: 'ship', label: 'Shipping' },
  { id: 'pay', label: 'Payment' },
];

function render(props: Partial<React.ComponentProps<typeof Stepper>>): void {
  act(() =>
    root.render(
      <Stepper
        steps={STEPS}
        current="ship"
        renderStep={({ step, selectable }) => (
          <span data-selectable={String(selectable)}>{step.label as string}</span>
        )}
        {...props}
      />,
    ),
  );
}

function buttons(): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('button'));
}

describe('Stepper', () => {
  it('renders plain steps without onStepChange', () => {
    render({});
    expect(buttons()).toHaveLength(0);
    expect(container.querySelector('[aria-current="step"]')!.textContent).toBe('Shipping');
  });

  it('makes every step a button that reports its id', () => {
    const onStepChange = vi.fn();
    render({ onStepChange });
    expect(buttons().map((b) => b.disabled)).toEqual([false, false, false]);
    act(() => buttons()[2]!.click());
    expect(onStepChange).toHaveBeenCalledWith('pay');
  });

  it('in linear mode, allows going back but not skipping ahead', () => {
    const onStepChange = vi.fn();
    render({ onStepChange, linear: true });
    expect(buttons().map((b) => b.disabled)).toEqual([false, true, true]);
    expect(
      Array.from(container.querySelectorAll('[data-selectable]')).map((s) =>
        s.getAttribute('data-selectable'),
      ),
    ).toEqual(['true', 'false', 'false']);
    act(() => buttons()[2]!.click());
    expect(onStepChange).not.toHaveBeenCalled();
    act(() => buttons()[0]!.click());
    expect(onStepChange).toHaveBeenCalledWith('cart');
  });
});
