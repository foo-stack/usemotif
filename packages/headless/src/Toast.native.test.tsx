/** @vitest-environment jsdom */
/** Native `toast.promise` and `maxVisible`, on the `react-native` jsdom mock. */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ReactNativeModule from '@usemotif/react-native';
import { Toaster, useToast, type ToastItem } from './Toast.native.js';

type DragEnd = (info: {
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
}) => void;
const dragEnds: DragEnd[] = [];
// Record the drag options each toast passes, so a swipe's release can be
// replayed without a real gesture pipeline.
vi.mock('@usemotif/react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactNativeModule>();
  return {
    ...actual,
    useDrag: (options: { onDragEnd?: DragEnd }) => {
      if (options.onDragEnd !== undefined) dragEnds.push(options.onDragEnd);
      return actual.useDrag(options as Parameters<typeof actual.useDrag>[0]);
    },
  };
});

let container: HTMLElement;
let root: Root;
let api: ReturnType<typeof useToast> | null = null;

function Api(): null {
  api = useToast();
  return null;
}

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function titles(): string[] {
  return (api?.toasts ?? []).map((t: ToastItem) => String(t.title));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.removeChild(container);
});

describe('native toast.promise', () => {
  it('turns one loading toast into the success toast, then an error one', async () => {
    render(
      <Toaster>
        <Api />
      </Toaster>,
    );
    let resolve!: () => void;
    const ok = new Promise<void>((r) => {
      resolve = r;
    });
    act(() => {
      api!.toast.promise(ok, {
        loading: { title: 'Saving' },
        success: { title: 'Saved' },
        error: { title: 'Failed' },
      });
    });
    expect(titles()).toEqual(['Saving']);
    expect(api!.toasts[0]!.duration).toBe(Infinity);
    await act(async () => {
      resolve();
      await ok;
    });
    expect(titles()).toEqual(['Saved']);

    const bad = Promise.reject(new Error('x'));
    bad.catch(() => {});
    act(() => {
      api!.toast.promise(bad, {
        loading: { title: 'Again' },
        success: { title: 'Fine' },
        error: { title: 'Broke' },
      });
    });
    await act(async () => {
      await bad.catch(() => {});
    });
    expect(titles()).toEqual(['Saved', 'Broke']);
    expect(api!.toasts[1]!.type).toBe('foreground');
  });

  it('still drops the oldest toasts past maxVisible', () => {
    render(
      <Toaster maxVisible={2}>
        <Api />
      </Toaster>,
    );
    act(() => {
      api!.toast({ title: 'one' });
      api!.toast({ title: 'two' });
      api!.toast({ title: 'three' });
    });
    expect(titles()).toEqual(['two', 'three']);
  });
});

describe('native swipe to dismiss', () => {
  it('dismisses on a long or fast swipe and keeps the toast on a short slow one', () => {
    render(
      <Toaster>
        <Api />
      </Toaster>,
    );
    act(() => {
      api!.toast({ title: 'Saved', duration: Infinity });
    });
    const release = (x: number, vx: number): void => {
      act(() => dragEnds.at(-1)!({ offset: { x, y: 0 }, velocity: { x: vx, y: 0 } }));
    };
    release(40, 100);
    expect(titles()).toEqual(['Saved']);
    release(-120, 0);
    expect(titles()).toEqual([]);
    act(() => {
      api!.toast({ title: 'Again', duration: Infinity });
    });
    release(20, 900);
    expect(titles()).toEqual([]);
  });
});
