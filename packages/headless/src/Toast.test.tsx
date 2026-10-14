import { act, useEffect, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePresence } from '@usemotif/react';
import { Toaster, useToast, Toast, type ToastItem } from './Toast.js';

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

// Capture toast() outside the component so the test body can call it.
let toastFn: ((input: Parameters<ReturnType<typeof useToast>['toast']>[0]) => string) | null = null;
let dismissFn: ((id: string) => void) | null = null;
function HookHarness(): null {
  const ctx = useToast();
  toastFn = ctx.toast;
  dismissFn = ctx.dismiss;
  return null;
}

function listToasts(): Element[] {
  // Toasts portal into document.body via <Portal>, so query globally.
  return Array.from(document.body.querySelectorAll('[role="status"], [role="alert"]'));
}

describe('Toaster + useToast - push / queue / aria-live', () => {
  it('useToast() throws outside a Toaster', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<HookHarness />);
    }).toThrow(/Toaster/);
    spy.mockRestore();
  });

  // #171 - role implies politeness, so the explicit aria-live on each toast
  // was redundant and dropped; the live region is the persistent container.
  it('default toast renders with role="status" and no redundant aria-live', () => {
    render(
      <Toaster>
        <HookHarness />
      </Toaster>,
    );
    act(() => {
      toastFn!({ title: 'Saved' });
    });
    const t = listToasts()[0]!;
    expect(t.getAttribute('role')).toBe('status');
    expect(t.getAttribute('aria-live')).toBeNull();
    expect(t.textContent).toContain('Saved');
    // #206 - the toast's role IS the live region; the container must NOT also
    // be one, or screen readers double-announce. No nested live region.
    expect(document.body.querySelector('[aria-live]')).toBeNull();
    expect(t.closest('[aria-live]')).toBeNull();
  });

  it('foreground type uses role="alert" with no redundant aria-live', () => {
    render(
      <Toaster>
        <HookHarness />
      </Toaster>,
    );
    act(() => {
      toastFn!({ title: 'Error', type: 'foreground' });
    });
    const t = listToasts()[0]!;
    expect(t.getAttribute('role')).toBe('alert');
    expect(t.getAttribute('aria-live')).toBeNull();
  });

  it('multiple toasts queue in order', () => {
    render(
      <Toaster>
        <HookHarness />
      </Toaster>,
    );
    act(() => {
      toastFn!({ title: 'a' });
      toastFn!({ title: 'b' });
      toastFn!({ title: 'c' });
    });
    const titles = listToasts().map((t) => t.textContent);
    expect(titles[0]).toContain('a');
    expect(titles[1]).toContain('b');
    expect(titles[2]).toContain('c');
  });
});

describe('Toaster - auto-dismiss', () => {
  it('removes a toast after `duration` ms (default 5000)', () => {
    render(
      <Toaster>
        <HookHarness />
      </Toaster>,
    );
    act(() => {
      toastFn!({ title: 'auto' });
    });
    expect(listToasts().length).toBe(1);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(listToasts().length).toBe(0);
  });

  it('honours explicit `duration` per toast', () => {
    render(
      <Toaster>
        <HookHarness />
      </Toaster>,
    );
    act(() => {
      toastFn!({ title: 'short', duration: 1000 });
    });
    expect(listToasts().length).toBe(1);
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(listToasts().length).toBe(1);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(listToasts().length).toBe(0);
  });

  it('Infinity duration keeps the toast indefinitely', () => {
    render(
      <Toaster>
        <HookHarness />
      </Toaster>,
    );
    act(() => {
      toastFn!({ title: 'sticky', duration: Infinity });
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(listToasts().length).toBe(1);
  });

  // #259 - duration <= 0 means persistent (no timer), matching native.
  it('duration: 0 keeps the toast indefinitely', () => {
    render(
      <Toaster>
        <HookHarness />
      </Toaster>,
    );
    act(() => {
      toastFn!({ title: 'persistent', duration: 0 });
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(listToasts().length).toBe(1);
  });

  // #259 - reusing an id updates in place (no duplicate) and clears the prior
  // timer so the first toast's timer can't early-dismiss the replacement.
  it('reusing an id updates in place and resets the timer', () => {
    render(
      <Toaster>
        <HookHarness />
      </Toaster>,
    );
    act(() => {
      toastFn!({ id: 'x', title: 'first', duration: 1000 });
    });
    expect(listToasts().length).toBe(1);
    // Re-push the same id near the end of the first timer.
    act(() => {
      vi.advanceTimersByTime(900);
    });
    act(() => {
      toastFn!({ id: 'x', title: 'second', duration: 1000 });
    });
    // Still a single toast (replaced, not duplicated).
    expect(listToasts().length).toBe(1);
    // The original 1000ms timer would have fired at +100ms here; it must have
    // been cleared, so the replacement is still present.
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(listToasts().length).toBe(1);
    expect(document.body.textContent).toContain('second');
    // The fresh timer dismisses it.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(listToasts().length).toBe(0);
  });

  it('defaultDuration prop changes the default for all toasts', () => {
    render(
      <Toaster defaultDuration={2000}>
        <HookHarness />
      </Toaster>,
    );
    act(() => {
      toastFn!({ title: 'a' });
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(listToasts().length).toBe(0);
  });
});

describe('Toaster - manual dismiss', () => {
  it('dismiss(id) removes the matching toast', () => {
    render(
      <Toaster>
        <HookHarness />
      </Toaster>,
    );
    let id = '';
    act(() => {
      id = toastFn!({ title: 'a' });
      toastFn!({ title: 'b' });
    });
    expect(listToasts().length).toBe(2);
    act(() => {
      dismissFn!(id);
    });
    expect(listToasts().length).toBe(1);
    expect(listToasts()[0]!.textContent).toContain('b');
  });

  it('default Close button removes the toast', () => {
    render(
      <Toaster>
        <HookHarness />
      </Toaster>,
    );
    act(() => {
      toastFn!({ title: 'closable' });
    });
    const close = document.body.querySelector<HTMLButtonElement>('button[aria-label="Dismiss"]')!;
    act(() => {
      close.click();
    });
    expect(listToasts().length).toBe(0);
  });
});

// Module-scope so the JSX prop isn't a fresh object each render (react-perf).
const SOLO_ITEM: ToastItem = { id: 'solo', title: 'a' };

// Module-scope renderToasts override (a fresh inline one would trip react-perf).
// Dismissal is driven via the harness context, so no per-item click handler.
function renderCustomList(toasts: ToastItem[]): ReactElement {
  return (
    <div>
      {toasts.map((t) => (
        <div key={t.id} role="status">
          {t.title}
        </div>
      ))}
    </div>
  );
}

describe('Toaster - animated dismiss (exitDurationMs > 0)', () => {
  it('holds a dismissed toast mounted in the exiting phase, then removes after the fallback', () => {
    render(
      <Toaster exitDurationMs={300}>
        <HookHarness />
      </Toaster>,
    );
    let id = '';
    act(() => {
      id = toastFn!({ title: 'a', duration: Infinity });
    });
    expect(listToasts().length).toBe(1);
    expect(listToasts()[0]!.getAttribute('data-motif-state')).toBeNull();

    act(() => {
      dismissFn!(id);
    });
    // Still mounted, now flagged exiting (held for its leave to play).
    expect(listToasts().length).toBe(1);
    expect(listToasts()[0]!.getAttribute('data-motif-state')).toBe('exiting');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(listToasts().length).toBe(0);
  });

  it('auto-dismiss animates: the toast exits after its duration, then unmounts after the fallback', () => {
    render(
      <Toaster exitDurationMs={300}>
        <HookHarness />
      </Toaster>,
    );
    act(() => {
      toastFn!({ title: 'auto', duration: 1000 });
    });
    act(() => {
      vi.advanceTimersByTime(1000); // duration fires → dismiss → held, exiting
    });
    expect(listToasts().length).toBe(1);
    expect(listToasts()[0]!.getAttribute('data-motif-state')).toBe('exiting');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(listToasts().length).toBe(0);
  });

  it('settles immediately when a transitionend fires before the fallback', () => {
    render(
      <Toaster exitDurationMs={5000}>
        <HookHarness />
      </Toaster>,
    );
    let id = '';
    act(() => {
      id = toastFn!({ title: 'a', duration: Infinity });
    });
    act(() => {
      dismissFn!(id);
    });
    const el = listToasts()[0] as HTMLElement;
    expect(el.getAttribute('data-motif-state')).toBe('exiting');

    const event = new Event('transitionend', { bubbles: false });
    Object.defineProperty(event, 'target', { value: el });
    act(() => {
      el.dispatchEvent(event);
    });
    expect(listToasts().length).toBe(0);
  });

  // A custom renderToasts owns its own removal, so dismissals there must stay
  // instant - holding toasts mounted would leak them.
  it('ignores exitDurationMs when a custom renderToasts is provided (instant)', () => {
    render(
      <Toaster exitDurationMs={5000} renderToasts={renderCustomList}>
        <HookHarness />
      </Toaster>,
    );
    let id = '';
    act(() => {
      id = toastFn!({ title: 'a', duration: Infinity });
    });
    expect(listToasts().length).toBe(1);
    act(() => {
      dismissFn!(id);
    });
    expect(listToasts().length).toBe(0);
  });

  it('a registered descendant exit (presence route) settles removal before the fallback', () => {
    // The standalone Toast publishes the PresenceContext; a descendant registers
    // its leave (the off-thread WAAPI settle route) and drives the unmount.
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
      <Toast item={SOLO_ITEM} open exitDurationMs={5000}>
        <ExitingChild />
      </Toast>,
    );
    expect(document.querySelector('[data-testid="surface"]')).not.toBeNull();

    render(
      <Toast item={SOLO_ITEM} open={false} exitDurationMs={5000}>
        <ExitingChild />
      </Toast>,
    );
    // Held mounted in the exiting phase; the child has registered its exit.
    expect(document.querySelector('[data-testid="surface"]')).not.toBeNull();
    expect(typeof complete).toBe('function');

    act(() => {
      complete?.();
    });
    // Completing the registered exit settles the toast WELL before the 5s
    // fallback - the presence route, not the timer, drove the unmount.
    expect(document.querySelector('[data-testid="surface"]')).toBeNull();
  });
});

describe('Toaster maxVisible and toast.promise', () => {
  let api: ReturnType<typeof useToast> | null = null;
  function Api(): null {
    api = useToast();
    return null;
  }

  it('drops the oldest toasts past maxVisible, and their timers never bring them back', () => {
    render(
      <Toaster maxVisible={2} defaultDuration={1000}>
        <Api />
      </Toaster>,
    );
    act(() => {
      api!.toast({ title: 'one' });
      api!.toast({ title: 'two' });
      api!.toast({ title: 'three' });
    });
    expect(listToasts().map((t) => t.textContent)).toEqual([
      expect.stringContaining('two'),
      expect.stringContaining('three'),
    ]);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(listToasts()).toEqual([]);
  });

  it('keeps every toast by default', () => {
    render(
      <Toaster>
        <Api />
      </Toaster>,
    );
    act(() => {
      for (let i = 0; i < 6; i++) api!.toast({ title: `t${i}` });
    });
    expect(listToasts().length).toBe(6);
  });

  it('turns one loading toast into the success toast', async () => {
    render(
      <Toaster defaultDuration={1000}>
        <Api />
      </Toaster>,
    );
    let resolve!: (v: number) => void;
    const work = new Promise<number>((r) => {
      resolve = r;
    });
    let returned: Promise<number> | null = null;
    act(() => {
      returned = api!.toast.promise(work, {
        loading: { title: 'Saving' },
        success: (n) => ({ title: `Saved ${n} rows` }),
        error: { title: 'Failed' },
      });
    });
    expect(returned).toBe(work);
    expect(listToasts().map((t) => t.textContent)).toEqual([expect.stringContaining('Saving')]);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(listToasts().length).toBe(1);
    await act(async () => {
      resolve(3);
      await work;
    });
    const toasts = listToasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0]!.textContent).toContain('Saved 3 rows');
    expect(toasts[0]!.getAttribute('role')).toBe('status');
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(listToasts()).toEqual([]);
  });

  it('turns it into an assertive error toast when the promise rejects', async () => {
    render(
      <Toaster>
        <Api />
      </Toaster>,
    );
    const work = Promise.reject(new Error('disk full'));
    work.catch(() => {});
    act(() => {
      api!.toast.promise(work, {
        loading: { title: 'Saving' },
        success: { title: 'Saved' },
        error: (e) => ({ title: `Failed: ${(e as Error).message}` }),
      });
    });
    await act(async () => {
      await work.catch(() => {});
    });
    const toasts = listToasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0]!.textContent).toContain('Failed: disk full');
    expect(toasts[0]!.getAttribute('role')).toBe('alert');
  });
});

describe('swipe to dismiss', () => {
  let api: ReturnType<typeof useToast> | null = null;
  function Api(): null {
    api = useToast();
    return null;
  }
  let clock = 0;

  beforeEach(() => {
    clock = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function pointer(el: Element, type: string, clientX: number): void {
    const ev = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'pointerId', { value: 1 });
    Object.defineProperty(ev, 'clientX', { value: clientX });
    Object.defineProperty(ev, 'clientY', { value: 0 });
    act(() => {
      el.dispatchEvent(ev);
    });
  }

  /** Drags slowly (100 ms per step) so only distance can dismiss. */
  function slowSwipe(el: Element, to: number): void {
    pointer(el, 'pointerdown', 0);
    for (let x = 20; x <= to; x += 20) {
      clock += 100;
      pointer(el, 'pointermove', x);
    }
    clock += 100;
    pointer(el, 'pointerup', to);
  }

  function show(props: { swipeToDismiss?: boolean } = {}): HTMLElement {
    render(
      <Toaster {...props}>
        <Api />
      </Toaster>,
    );
    act(() => {
      api!.toast({ title: 'Saved', duration: Infinity });
    });
    return listToasts()[0] as HTMLElement;
  }

  it('dismisses a toast swiped past the distance, following the finger on the way', () => {
    const toast = show();
    expect(toast.style.touchAction).toBe('pan-y');
    pointer(toast, 'pointerdown', 0);
    clock += 100;
    pointer(toast, 'pointermove', 40);
    expect(toast.style.transform).toBe('translateX(40px)');
    expect(Number(toast.style.opacity)).toBeLessThan(1);
    for (let x = 60; x <= 120; x += 20) {
      clock += 100;
      pointer(toast, 'pointermove', x);
    }
    clock += 100;
    pointer(toast, 'pointerup', 120);
    expect(listToasts()).toEqual([]);
  });

  it('keeps a toast after a short, slow swipe', () => {
    const toast = show();
    slowSwipe(toast, 60);
    expect(listToasts().length).toBe(1);
  });

  it('dismisses on a fast flick however short', () => {
    const toast = show();
    pointer(toast, 'pointerdown', 0);
    clock += 10;
    pointer(toast, 'pointermove', 30);
    pointer(toast, 'pointerup', 30);
    expect(listToasts()).toEqual([]);
  });

  it('does nothing with swipeToDismiss={false}', () => {
    const toast = show({ swipeToDismiss: false });
    expect(toast.style.touchAction).toBe('');
    slowSwipe(toast, 200);
    expect(listToasts().length).toBe(1);
  });

  it('leaves presses on the dismiss button to the button', () => {
    const toast = show();
    const button = toast.querySelector('button')!;
    pointer(button, 'pointerdown', 0);
    clock += 10;
    pointer(button, 'pointermove', 30);
    pointer(button, 'pointerup', 30);
    expect(listToasts().length).toBe(1);
    act(() => button.click());
    expect(listToasts()).toEqual([]);
  });

  it('attaches nothing to a toast with no onDismiss', () => {
    render(<Toast item={{ id: 'x', title: 'Inline' }} />);
    expect((listToasts()[0] as HTMLElement).style.touchAction).toBe('');
  });
});
