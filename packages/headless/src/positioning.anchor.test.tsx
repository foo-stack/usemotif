/** @vitest-environment jsdom */
import { act, useRef, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetAnchorSupportForTesting, useFloatingPosition } from './positioning.js';

let container: HTMLElement;
let root: Root;
let result: ReturnType<typeof useFloatingPosition>;

function Probe({ open }: { open: boolean }): ReactElement {
  const trigger = useRef<HTMLButtonElement | null>(null);
  result = useFloatingPosition(trigger, open, 'bottom', 6);
  return (
    <>
      <button ref={trigger}>open</button>
      <div ref={result.floatingRef} />
    </>
  );
}

beforeEach(() => {
  _resetAnchorSupportForTesting();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  _resetAnchorSupportForTesting();
});

describe('useFloatingPosition with anchor positioning', () => {
  it('shows the surface as a manual popover anchored to its reference in CSS', () => {
    vi.stubGlobal('CSS', { supports: () => true });
    const show = vi.fn(function (this: HTMLElement) {
      this.dataset.shown = '';
    });
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      value: show,
      configurable: true,
    });
    const setProperty = vi.spyOn(CSSStyleDeclaration.prototype, 'setProperty');
    // The surface ends up above the trigger, as a flip would leave it.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return (
          this.tagName === 'BUTTON'
            ? { left: 300, top: 200, width: 100, height: 40, right: 400, bottom: 240 }
            : { left: 250, top: 94, width: 200, height: 100, right: 450, bottom: 194 }
        ) as DOMRect;
      },
    );
    vi.spyOn(Element.prototype, 'matches').mockReturnValue(false);

    act(() => root.render(<Probe open />));
    const surface = container.querySelector('div')!;
    expect(surface.getAttribute('popover')).toBe('manual');
    expect(show).toHaveBeenCalledOnce();
    const name = setProperty.mock.calls.find(([p]) => p === 'anchor-name')?.[1];
    expect(name).toMatch(/^--motif-anchor-\w+$/);
    expect(result.style).toMatchObject({
      position: 'fixed',
      inset: 'auto',
      marginTop: 6,
      positionAnchor: name,
      positionArea: 'bottom',
      positionTryFallbacks: 'flip-block',
      justifySelf: 'anchor-center',
    });
    expect(result.placement).toBe('top');
    expect(result.arrow).toBe(100);
    delete (HTMLElement.prototype as { showPopover?: unknown }).showPopover;
    vi.unstubAllGlobals();
  });

  it('falls back to absolute coordinates without support', () => {
    act(() => root.render(<Probe open />));
    expect(container.querySelector('div')!.hasAttribute('popover')).toBe(false);
    expect(result.style).toEqual({
      position: 'absolute',
      top: expect.any(Number),
      left: expect.any(Number),
    });
  });
});
