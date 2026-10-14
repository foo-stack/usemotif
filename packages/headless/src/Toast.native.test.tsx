/** @vitest-environment jsdom */
/** Native `toast.promise` and `maxVisible`, on the `react-native` jsdom mock. */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Toaster, useToast, type ToastItem } from './Toast.native.js';

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
