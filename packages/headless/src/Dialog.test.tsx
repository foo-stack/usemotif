import { act, useEffect, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePresence } from '@usemotif/react';
import { Dialog } from './index.js';
import { Drawer } from './index.js';

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

function press(key: string): void {
  const active = document.activeElement ?? document.body;
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => {
    active.dispatchEvent(event);
  });
}

describe('Dialog - uncontrolled', () => {
  it('starts closed and opens on Trigger click', () => {
    render(
      <Dialog.Root>
        <Dialog.Trigger>
          <button data-testid="trigger">Open</button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
          <Dialog.Description>Body</Dialog.Description>
          <Dialog.Close>
            <button>Close</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Root>,
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    click(container.querySelector('[data-testid="trigger"]')!);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('Trigger sets aria-expanded that flips with state', () => {
    render(
      <Dialog.Root>
        <Dialog.Trigger>
          <button data-testid="trigger">Open</button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
        </Dialog.Content>
      </Dialog.Root>,
    );
    const trigger = container.querySelector('[data-testid="trigger"]')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('Title + Description bind via aria-labelledby + aria-describedby', () => {
    render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>
          <button>Open</button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>The title</Dialog.Title>
          <Dialog.Description>The body</Dialog.Description>
        </Dialog.Content>
      </Dialog.Root>,
    );
    const dialog = document.querySelector('[role="dialog"]')!;
    const titleId = dialog.getAttribute('aria-labelledby')!;
    const descId = dialog.getAttribute('aria-describedby')!;
    expect(document.getElementById(titleId)?.textContent).toBe('The title');
    expect(document.getElementById(descId)?.textContent).toBe('The body');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  // Regression: aria-labelledby / aria-describedby were emitted
  // unconditionally, pointing at ids that don't exist when Title /
  // Description are omitted - a dangling ARIA reference. They must only be
  // present when the corresponding element is mounted.
  it('omits aria-labelledby / aria-describedby when Title / Description are absent', () => {
    render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>
          <button>Open</button>
        </Dialog.Trigger>
        <Dialog.Content>
          <p>no title or description</p>
        </Dialog.Content>
      </Dialog.Root>,
    );
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.hasAttribute('aria-labelledby')).toBe(false);
    expect(dialog.hasAttribute('aria-describedby')).toBe(false);
  });

  it('emits only aria-labelledby when a Title is present but no Description', () => {
    render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>
          <button>Open</button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Only a title</Dialog.Title>
        </Dialog.Content>
      </Dialog.Root>,
    );
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.hasAttribute('aria-labelledby')).toBe(true);
    expect(dialog.hasAttribute('aria-describedby')).toBe(false);
  });

  it('Close button closes the dialog', () => {
    render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>
          <button>Open</button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
          <Dialog.Close>
            <button data-testid="close">Cancel</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Root>,
    );
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    click(document.querySelector('[data-testid="close"]')!);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('Escape closes the dialog by default', () => {
    render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>
          <button>Open</button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
        </Dialog.Content>
      </Dialog.Root>,
    );
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    press('Escape');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('dismissOnEscape={false} keeps the dialog open on Escape', () => {
    render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>
          <button>Open</button>
        </Dialog.Trigger>
        <Dialog.Content dismissOnEscape={false}>
          <Dialog.Title>Title</Dialog.Title>
        </Dialog.Content>
      </Dialog.Root>,
    );
    press('Escape');
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});

describe('Dialog - controlled', () => {
  it('routes open changes through onOpenChange', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog.Root open onOpenChange={onOpenChange}>
        <Dialog.Trigger>
          <button>Open</button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
          <Dialog.Close>
            <button data-testid="close">x</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Root>,
    );
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    click(document.querySelector('[data-testid="close"]')!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // In controlled mode, the parent decides whether to actually
    // close - we passed `open` (true) statically so it stays open.
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});

describe('Dialog - alertdialog role override', () => {
  it('role="alertdialog" propagates to the dialog element', () => {
    render(
      <Dialog.Root role="alertdialog" defaultOpen>
        <Dialog.Trigger>
          <button>Open</button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Confirm</Dialog.Title>
        </Dialog.Content>
      </Dialog.Root>,
    );
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('Dialog - reduced motion', () => {
  it('skips the exit phase when the user prefers reduced motion', () => {
    const restore = mockMatchMedia(true);
    try {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Trigger>
            <button>Open</button>
          </Dialog.Trigger>
          <Dialog.Content exitDurationMs={300}>
            <Dialog.Title>Title</Dialog.Title>
          </Dialog.Content>
        </Dialog.Root>,
      );
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();

      press('Escape');

      // No 'exiting' phase - the dialog unmounts synchronously.
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      restore();
    }
  });
});

/** Stub `window.matchMedia` (absent in jsdom) so `useReducedMotion`
 * can be exercised. Returns a restore fn. */
function mockMatchMedia(reduced: boolean): () => void {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: reduced,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

describe('Dialog - exit transition (exitDurationMs > 0)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the dialog rendered during exit phase, sets data-motif-state, then unmounts', () => {
    render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>
          <button>Open</button>
        </Dialog.Trigger>
        <Dialog.Content exitDurationMs={300}>
          <Dialog.Title>Title</Dialog.Title>
        </Dialog.Content>
      </Dialog.Root>,
    );
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('data-motif-state')).toBeNull();

    press('Escape');

    // Still rendered, now flagged as exiting.
    const dialogDuringExit = document.querySelector('[role="dialog"]');
    expect(dialogDuringExit).not.toBeNull();
    expect(dialogDuringExit?.getAttribute('data-motif-state')).toBe('exiting');

    // After fallback timer fires, dialog unmounts.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('settles immediately when transitionend fires before the fallback', () => {
    render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>
          <button>Open</button>
        </Dialog.Trigger>
        <Dialog.Content exitDurationMs={5000}>
          <Dialog.Title>Title</Dialog.Title>
        </Dialog.Content>
      </Dialog.Root>,
    );
    press('Escape');
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('data-motif-state')).toBe('exiting');

    // Simulate the CSS transition completing.
    const event = new Event('transitionend', { bubbles: false });
    Object.defineProperty(event, 'target', { value: dialog });
    act(() => {
      dialog.dispatchEvent(event);
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('settles via a registered descendant exit (presence route) before the fallback', () => {
    // A descendant that registers a pending exit through the PresenceContext the
    // Dialog now publishes (this is how a WAAPI-driven surface settles precisely).
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
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>
          <button>Open</button>
        </Dialog.Trigger>
        <Dialog.Content exitDurationMs={5000}>
          <ExitingChild />
        </Dialog.Content>
      </Dialog.Root>,
    );
    press('Escape');
    // Still mounted in the exiting phase, and the child has registered.
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(typeof complete).toBe('function');

    // Completing the registered exit settles the dialog WELL before the 5s
    // fallback - proof the presence route, not just the timer, drives unmount.
    act(() => {
      complete?.();
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('Dialog - background isolation', () => {
  let background: HTMLDivElement;

  beforeEach(() => {
    background = document.createElement('div');
    background.id = 'page-content';
    document.body.append(background);
  });

  afterEach(() => {
    background.remove();
    document.body.removeAttribute('style');
  });

  function openDialog(): void {
    render(
      <Dialog.Root>
        <Dialog.Trigger>
          <button data-testid="trigger">Open</button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
        </Dialog.Content>
      </Dialog.Root>,
    );
    click(container.querySelector('[data-testid="trigger"]')!);
  }

  it('isolates the background while the dialog is open', () => {
    openDialog();

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(background.getAttribute('inert')).toBe('');
    expect(background.getAttribute('aria-hidden')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores the background when the dialog closes', () => {
    openDialog();
    press('Escape');

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(background.hasAttribute('inert')).toBe(false);
    expect(background.hasAttribute('aria-hidden')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('holds isolation for the whole exit transition, not just until open flips', () => {
    vi.useFakeTimers();
    try {
      render(
        <Dialog.Root>
          <Dialog.Trigger>
            <button data-testid="trigger">Open</button>
          </Dialog.Trigger>
          <Dialog.Content exitDurationMs={200}>
            <Dialog.Title>Title</Dialog.Title>
          </Dialog.Content>
        </Dialog.Root>,
      );
      click(container.querySelector('[data-testid="trigger"]')!);
      expect(background.getAttribute('inert')).toBe('');

      press('Escape');
      // `open` is false now, but Overlay is still mounted for the exit.
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
      expect(background.getAttribute('inert')).toBe('');

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(background.hasAttribute('inert')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Drawer - background isolation', () => {
  let background: HTMLDivElement;

  beforeEach(() => {
    background = document.createElement('div');
    document.body.append(background);
  });

  afterEach(() => {
    background.remove();
    document.body.removeAttribute('style');
  });

  it('isolates and restores the background around open and close', () => {
    render(
      <Drawer.Root>
        <Drawer.Trigger>
          <button data-testid="trigger">Open</button>
        </Drawer.Trigger>
        <Drawer.Content>
          <Drawer.Title>Menu</Drawer.Title>
        </Drawer.Content>
      </Drawer.Root>,
    );
    click(container.querySelector('[data-testid="trigger"]')!);

    expect(background.getAttribute('inert')).toBe('');
    expect(document.body.style.overflow).toBe('hidden');

    press('Escape');
    expect(background.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });
});

describe('Dialog - modal={false}', () => {
  let background: HTMLButtonElement;

  beforeEach(() => {
    background = document.createElement('button');
    background.textContent = 'page button';
    document.body.append(background);
  });

  afterEach(() => {
    background.remove();
    document.body.removeAttribute('style');
  });

  function openNonModal(onOpenChange?: (open: boolean) => void): void {
    render(
      <Dialog.Root modal={false} {...(onOpenChange !== undefined ? { onOpenChange } : {})}>
        <Dialog.Trigger>
          <button data-testid="trigger">Open</button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
          <button data-testid="inside">Inside</button>
        </Dialog.Content>
      </Dialog.Root>,
    );
    click(container.querySelector('[data-testid="trigger"]')!);
  }

  it('leaves the page interactive: no inert, no scroll lock, no aria-modal', () => {
    openNonModal();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.hasAttribute('aria-modal')).toBe(false);
    expect(background.hasAttribute('inert')).toBe(false);
    expect(background.hasAttribute('aria-hidden')).toBe(false);
    expect(document.body.style.overflow).toBe('');
    // The layer is click-through; only the dialog takes the pointer.
    expect(
      (dialog.parentElement!.closest('[style*="position: fixed"]') as HTMLElement).style
        .pointerEvents,
    ).toBe('none');
    expect(dialog.style.pointerEvents).toBe('auto');
  });

  it('moves focus in, but does not pull it back when it leaves', () => {
    openNonModal();
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.contains(document.activeElement)).toBe(true);
    act(() => background.focus());
    expect(document.activeElement).toBe(background);
  });

  it('closes on a press outside and on Escape, but not on a press inside', () => {
    const onOpenChange = vi.fn();
    openNonModal(onOpenChange);
    act(() => {
      document
        .querySelector('[data-testid="inside"]')!
        .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    act(() => {
      background.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    click(container.querySelector('[data-testid="trigger"]')!);
    press('Escape');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('keeps the trigger a toggle', () => {
    openNonModal();
    const trigger = container.querySelector('[data-testid="trigger"]')!;
    act(() => {
      trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    click(trigger);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
