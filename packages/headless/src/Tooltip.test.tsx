import { act, useEffect, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePresence } from '@usemotif/react';
import { Tooltip } from './index.js';

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
  act(() => root.render(node));
}

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

/**
 * React 19 delegates onMouseEnter / onMouseLeave / onFocus / onBlur
 * via the document-level `mouseover` / `mouseout` / `focusin` /
 * `focusout` events (the bubbling cousins of the non-bubbling
 * native pairs). Fire those instead.
 */
function fire(el: Element, type: 'mouseenter' | 'mouseleave' | 'focus' | 'blur'): void {
  const eventName =
    type === 'mouseenter'
      ? 'mouseover'
      : type === 'mouseleave'
        ? 'mouseout'
        : type === 'focus'
          ? 'focusin'
          : 'focusout';
  const Ctor = type.startsWith('mouse') ? MouseEvent : FocusEvent;
  act(() => {
    el.dispatchEvent(new Ctor(eventName, { bubbles: true, cancelable: true }));
  });
}

describe('Tooltip', () => {
  it('does not render content initially', () => {
    render(
      <Tooltip.Root>
        <Tooltip.Trigger>
          <button data-testid="trigger">i</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Hint</Tooltip.Content>
      </Tooltip.Root>,
    );
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('opens on mouseenter after openDelay', () => {
    render(
      <Tooltip.Root openDelay={200}>
        <Tooltip.Trigger>
          <button data-testid="trigger">i</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Hint</Tooltip.Content>
      </Tooltip.Root>,
    );
    fire(container.querySelector('[data-testid="trigger"]')!, 'mouseenter');
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    act(() => vi.advanceTimersByTime(200));
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Hint');
  });

  // #168 - a role="tooltip" is not an interactive hover target: it must be
  // pointerEvents:none with no hover-keepalive, so it can't be parked open
  // by moving the cursor onto it.
  it('content is non-interactive (pointerEvents:none, no hover handlers)', () => {
    render(
      <Tooltip.Root openDelay={0}>
        <Tooltip.Trigger>
          <button data-testid="trigger">i</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Hint</Tooltip.Content>
      </Tooltip.Root>,
    );
    fire(container.querySelector('[data-testid="trigger"]')!, 'mouseenter');
    act(() => vi.advanceTimersByTime(0));
    const tip = document.querySelector('[role="tooltip"]') as HTMLElement;
    expect(tip).not.toBeNull();
    expect(tip.style.pointerEvents).toBe('none');
  });

  it('closes on mouseleave after closeDelay', () => {
    render(
      <Tooltip.Root openDelay={0} closeDelay={150}>
        <Tooltip.Trigger>
          <button data-testid="trigger">i</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Hint</Tooltip.Content>
      </Tooltip.Root>,
    );
    const trigger = container.querySelector('[data-testid="trigger"]')!;
    fire(trigger, 'mouseenter');
    act(() => vi.advanceTimersByTime(0));
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    fire(trigger, 'mouseleave');
    act(() => vi.advanceTimersByTime(150));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('opens on focus + closes on blur (keyboard parity)', () => {
    render(
      <Tooltip.Root openDelay={0} closeDelay={0}>
        <Tooltip.Trigger>
          <button data-testid="trigger">i</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Hint</Tooltip.Content>
      </Tooltip.Root>,
    );
    const trigger = container.querySelector('[data-testid="trigger"]')!;
    fire(trigger, 'focus');
    act(() => vi.advanceTimersByTime(0));
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    fire(trigger, 'blur');
    act(() => vi.advanceTimersByTime(0));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('Trigger gets aria-describedby pointing to the content id when open', () => {
    render(
      <Tooltip.Root openDelay={0}>
        <Tooltip.Trigger>
          <button data-testid="trigger">i</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Hint</Tooltip.Content>
      </Tooltip.Root>,
    );
    const trigger = container.querySelector('[data-testid="trigger"]')!;
    fire(trigger, 'mouseenter');
    act(() => vi.advanceTimersByTime(0));
    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy!)?.getAttribute('role')).toBe('tooltip');
  });
});

describe('Tooltip - exit transition (exitDurationMs > 0)', () => {
  function openThenClose(): void {
    const trigger = container.querySelector('[data-testid="trigger"]')!;
    fire(trigger, 'mouseenter');
    act(() => vi.advanceTimersByTime(0));
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    fire(trigger, 'mouseleave');
    act(() => vi.advanceTimersByTime(0)); // closeDelay=0 → open flips false
  }

  it('keeps the tip mounted during exit, flags data-motif-state, then unmounts', () => {
    render(
      <Tooltip.Root openDelay={0} closeDelay={0}>
        <Tooltip.Trigger>
          <button data-testid="trigger">i</button>
        </Tooltip.Trigger>
        <Tooltip.Content exitDurationMs={300}>Hint</Tooltip.Content>
      </Tooltip.Root>,
    );
    openThenClose();

    const exiting = document.querySelector('[role="tooltip"]');
    expect(exiting).not.toBeNull();
    expect(exiting?.getAttribute('data-motif-state')).toBe('exiting');

    act(() => vi.advanceTimersByTime(300));
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('settles immediately when transitionend fires before the fallback', () => {
    render(
      <Tooltip.Root openDelay={0} closeDelay={0}>
        <Tooltip.Trigger>
          <button data-testid="trigger">i</button>
        </Tooltip.Trigger>
        <Tooltip.Content exitDurationMs={5000}>Hint</Tooltip.Content>
      </Tooltip.Root>,
    );
    openThenClose();
    const tip = document.querySelector('[role="tooltip"]') as HTMLElement;
    expect(tip.getAttribute('data-motif-state')).toBe('exiting');

    const event = new Event('transitionend', { bubbles: false });
    Object.defineProperty(event, 'target', { value: tip });
    act(() => {
      tip.dispatchEvent(event);
    });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('settles via a registered descendant exit (presence route) before the fallback', () => {
    // A descendant that registers a pending exit through the PresenceContext the
    // tooltip publishes - the off-thread (WAAPI) settle route.
    let complete: (() => void) | null = null;
    function ExitingChild(): ReactElement {
      const presence = usePresence();
      const exiting = presence.phase === 'exiting';
      useEffect(() => {
        if (!exiting) return undefined;
        complete = presence.registerExit();
        return () => {
          complete = null;
        };
      }, [exiting, presence]);
      return <span data-testid="surface" />;
    }
    render(
      <Tooltip.Root openDelay={0} closeDelay={0}>
        <Tooltip.Trigger>
          <button data-testid="trigger">i</button>
        </Tooltip.Trigger>
        <Tooltip.Content exitDurationMs={5000}>
          <ExitingChild />
        </Tooltip.Content>
      </Tooltip.Root>,
    );
    openThenClose();
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    expect(typeof complete).toBe('function');

    act(() => {
      complete?.();
    });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
});

describe('Tooltip.Provider - delay group', () => {
  function renderGroup(withProvider: boolean): HTMLElement[] {
    const tips = (
      <>
        {['a', 'b'].map((id) => (
          <Tooltip.Root key={id} openDelay={500} closeDelay={200}>
            <Tooltip.Trigger>
              <button type="button" data-id={id}>
                {id}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>{`tip ${id}`}</Tooltip.Content>
          </Tooltip.Root>
        ))}
      </>
    );
    render(
      withProvider ? <Tooltip.Provider skipDelayDuration={300}>{tips}</Tooltip.Provider> : tips,
    );
    return Array.from(container.querySelectorAll<HTMLElement>('button'));
  }
  function shown(): string[] {
    return Array.from(document.body.querySelectorAll('[role="tooltip"]')).map(
      (t) => t.textContent ?? '',
    );
  }
  function tick(ms: number): void {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  }

  it('opens a neighbour at once and hides the first, while the group is warm', () => {
    const [a, b] = renderGroup(true);
    fire(a!, 'mouseenter');
    tick(500);
    expect(shown()).toEqual(['tip a']);
    fire(a!, 'mouseleave');
    fire(b!, 'mouseenter');
    expect(shown()).toEqual(['tip b']);
  });

  it('waits the full delay again once the group has cooled', () => {
    const [a, b] = renderGroup(true);
    fire(a!, 'mouseenter');
    tick(500);
    fire(a!, 'mouseleave');
    tick(200); // closes; the group starts cooling once the close has rendered
    tick(300);
    expect(shown()).toEqual([]);
    fire(b!, 'mouseenter');
    tick(499);
    expect(shown()).toEqual([]);
    tick(1);
    expect(shown()).toEqual(['tip b']);
  });

  it('keeps every tooltip on its own delay without a Provider', () => {
    const [a, b] = renderGroup(false);
    fire(a!, 'mouseenter');
    tick(500);
    fire(a!, 'mouseleave');
    fire(b!, 'mouseenter');
    expect(shown()).toEqual(['tip a']);
    tick(500);
    expect(shown()).toEqual(['tip b']);
  });
});
