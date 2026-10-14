/** @vitest-environment jsdom */
import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useThemeSetting,
  type SyncStorage,
  type UseThemeSettingResult,
} from './useThemeSetting.js';

let container: HTMLElement;
let root: Root;

interface MediaQueryHandle {
  set matches(value: boolean);
  fireChange(): void;
}

function installMatchMedia(initialDark: boolean): MediaQueryHandle {
  let matches = initialDark;
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      media: query,
      get matches() {
        return matches;
      },
      onchange: null,
      addEventListener: (_type: string, handler: (e: MediaQueryListEvent) => void) => {
        listeners.add(handler);
      },
      removeEventListener: (_type: string, handler: (e: MediaQueryListEvent) => void) => {
        listeners.delete(handler);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  return {
    set matches(value: boolean) {
      matches = value;
    },
    fireChange() {
      for (const fn of listeners) {
        fn({ matches } as MediaQueryListEvent);
      }
    },
  };
}

function captureHook(opts?: Parameters<typeof useThemeSetting>[0]): {
  current: () => UseThemeSettingResult;
  rerender: () => void;
} {
  let captured: UseThemeSettingResult | null = null;
  function Probe(): null {
    const result = useThemeSetting(opts);
    useEffect(() => {
      captured = result;
    });
    captured = result;
    return null;
  }
  act(() => {
    root.render(<Probe />);
  });
  return {
    current: () => {
      if (captured === null) throw new Error('hook not captured yet');
      return captured;
    },
    rerender: () => {
      act(() => {
        root.render(<Probe />);
      });
    },
  };
}

beforeEach(() => {
  window.localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.removeChild(container);
  window.localStorage.clear();
});

describe('useThemeSetting (web)', () => {
  it('defaults to mode=system and resolves against the OS preference', () => {
    const mq = installMatchMedia(true); // OS = dark
    void mq;
    const probe = captureHook();
    expect(probe.current().mode).toBe('system');
    expect(probe.current().resolved).toBe('dark');
  });

  it('resolves to light when OS prefers light', () => {
    installMatchMedia(false);
    const probe = captureHook();
    expect(probe.current().resolved).toBe('light');
  });

  it('updates resolved when the OS preference changes', () => {
    const mq = installMatchMedia(false);
    const probe = captureHook();
    expect(probe.current().resolved).toBe('light');

    act(() => {
      mq.matches = true;
      mq.fireChange();
    });
    expect(probe.current().resolved).toBe('dark');
  });

  it('explicit override wins over the OS preference', () => {
    installMatchMedia(true); // OS = dark
    const probe = captureHook();
    act(() => probe.current().set('light'));
    expect(probe.current().mode).toBe('light');
    expect(probe.current().resolved).toBe('light');
  });

  it('persists explicit override to localStorage', () => {
    installMatchMedia(false);
    const probe = captureHook();
    act(() => probe.current().set('dark'));
    expect(window.localStorage.getItem('motif:theme')).toBe('dark');
  });

  it('removes the storage key when set back to system', () => {
    installMatchMedia(false);
    const probe = captureHook();
    act(() => probe.current().set('dark'));
    expect(window.localStorage.getItem('motif:theme')).toBe('dark');
    act(() => probe.current().set('system'));
    expect(window.localStorage.getItem('motif:theme')).toBeNull();
  });

  it('restores a persisted override on mount', () => {
    window.localStorage.setItem('motif:theme', 'dark');
    installMatchMedia(false);
    const probe = captureHook();
    expect(probe.current().mode).toBe('dark');
    expect(probe.current().resolved).toBe('dark');
  });

  it('does not persist when storageKey is null', () => {
    installMatchMedia(false);
    const probe = captureHook({ storageKey: null });
    act(() => probe.current().set('dark'));
    expect(window.localStorage.getItem('motif:theme')).toBeNull();
    expect(probe.current().mode).toBe('dark');
  });

  it('honours a custom storage key', () => {
    installMatchMedia(false);
    const probe = captureHook({ storageKey: 'custom:theme' });
    act(() => probe.current().set('dark'));
    expect(window.localStorage.getItem('custom:theme')).toBe('dark');
    expect(window.localStorage.getItem('motif:theme')).toBeNull();
  });

  it('survives a localStorage write failure', () => {
    installMatchMedia(false);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const probe = captureHook();
    act(() => probe.current().set('dark'));
    // In-memory state still flips even when persistence throws.
    expect(probe.current().mode).toBe('dark');
    expect(probe.current().resolved).toBe('dark');
    setItem.mockRestore();
  });

  it('honours defaultResolved before the client effect runs (SSR-shape)', () => {
    // Simulate SSR by stubbing matchMedia AFTER first capture would
    // run. The hook returns defaultResolved on the very first render,
    // then the effect installs the real subscription on commit.
    const mq = installMatchMedia(true);
    const probe = captureHook({ defaultResolved: 'light' });
    // After the effect, resolved syncs to the OS value.
    expect(probe.current().resolved).toBe('dark');
    void mq;
  });

  describe('custom storage', () => {
    function memoryStorage(initial: Record<string, string> = {}): SyncStorage & {
      data: Map<string, string>;
    } {
      const data = new Map(Object.entries(initial));
      return {
        data,
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => {
          data.set(key, value);
        },
        removeItem: (key) => {
          data.delete(key);
        },
      };
    }

    it('restores the override from the custom store on mount', () => {
      installMatchMedia(false);
      const storage = memoryStorage({ 'motif:theme': 'dark' });
      const probe = captureHook({ storage });
      expect(probe.current().mode).toBe('dark');
      expect(probe.current().resolved).toBe('dark');
    });

    it('writes to the custom store and leaves localStorage alone', () => {
      installMatchMedia(false);
      const storage = memoryStorage();
      const probe = captureHook({ storage });
      act(() => probe.current().set('dark'));
      expect(storage.data.get('motif:theme')).toBe('dark');
      expect(window.localStorage.getItem('motif:theme')).toBeNull();
      act(() => probe.current().set('system'));
      expect(storage.data.has('motif:theme')).toBe(false);
    });

    it('uses storageKey with the custom store', () => {
      installMatchMedia(false);
      const storage = memoryStorage();
      const probe = captureHook({ storage, storageKey: 'app:mode' });
      act(() => probe.current().set('light'));
      expect(storage.data.get('app:mode')).toBe('light');
    });

    it('persists nothing when storage is null', () => {
      installMatchMedia(false);
      window.localStorage.setItem('motif:theme', 'dark');
      const probe = captureHook({ storage: null });
      expect(probe.current().mode).toBe('system');
      act(() => probe.current().set('light'));
      expect(window.localStorage.getItem('motif:theme')).toBe('dark');
    });

    it('falls back to system when the custom store throws', () => {
      installMatchMedia(true);
      const storage: SyncStorage = {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('blocked');
        },
        removeItem: () => {
          throw new Error('blocked');
        },
      };
      const probe = captureHook({ storage });
      expect(probe.current().mode).toBe('system');
      expect(probe.current().resolved).toBe('dark');
      act(() => probe.current().set('light'));
      expect(probe.current().resolved).toBe('light');
    });
  });
});
