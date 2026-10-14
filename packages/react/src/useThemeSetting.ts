'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * The user's preferred theme mode.
 *
 * - `'system'` (the default) - follow the OS's `prefers-color-scheme`.
 * - `'light'` / `'dark'` - explicit override that persists across reloads.
 */
export type ThemeMode = 'system' | 'light' | 'dark';

/** Concrete theme name after `'system'` is resolved against the OS. */
export type ResolvedTheme = 'light' | 'dark';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';
const DEFAULT_STORAGE_KEY = 'motif:theme';

// Reading `window.localStorage` throws when storage is blocked (sandboxed
// iframes, some private modes), so the default is looked up lazily, inside
// the callers' try blocks.
function storageFor(storage: SyncStorage | null | undefined): SyncStorage | null {
  if (storage !== undefined) return storage;
  return typeof window === 'undefined' ? null : window.localStorage;
}

export interface UseThemeSettingOptions {
  /**
   * Key the user override is persisted under in `storage`. Set to `null`
   * to disable persistence (useful when the host app already owns
   * theme state and only needs the system-preference subscription).
   * Defaults to `'motif:theme'`.
   */
  readonly storageKey?: string | null;
  /**
   * Theme to assume during SSR / before the first client effect runs.
   * Browsers can't know the user's system preference until JS runs, so
   * the very first paint of a server-rendered page falls back to this.
   * Defaults to `'light'`.
   */
  readonly defaultResolved?: ResolvedTheme;
  /**
   * Where the user override is persisted. Pass any object with synchronous
   * `getItem` / `setItem` / `removeItem` (a cookie or in-memory store, a
   * namespaced wrapper). `null` disables persistence. Defaults to
   * `window.localStorage`. Pass a stable object: a new one each render
   * re-reads the stored mode on every render.
   */
  readonly storage?: SyncStorage | null;
}

/** The synchronous store `useThemeSetting` persists the user override to. */
export interface SyncStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface UseThemeSettingResult {
  /** The user's selected mode. `'system'` until they explicitly choose. */
  readonly mode: ThemeMode;
  /** The concrete theme to render. Equal to `mode` unless `mode === 'system'`. */
  readonly resolved: ResolvedTheme;
  /** Update the mode; persists to `storage` unless `storage` or `storageKey` is `null`. */
  readonly set: (next: ThemeMode) => void;
}

/**
 * Auto dark/light mode hook for web. Reads the user's persisted
 * override from `storage` (default `localStorage`), falls back to
 * `prefers-color-scheme`, and subscribes to OS-level changes via
 * `matchMedia`.
 *
 * Pair with `<ThemeProvider>`:
 *
 * ```tsx
 * function App() {
 *   const { resolved } = useThemeSetting();
 *   return (
 *     <ThemeProvider themes={[lightTheme, darkTheme]} active={resolved}>
 *       {...}
 *     </ThemeProvider>
 *   );
 * }
 * ```
 *
 * **SSR**: the first server-rendered HTML uses `defaultResolved`
 * (default `'light'`) since the OS preference is unreachable from
 * Node. Hydration runs the client effect and updates to the real
 * value; React's hydration model treats this as a normal post-mount
 * state change (no warning). If you want to avoid the brief flash on
 * dark-preferring users, write the resolved value to a cookie at SSR
 * time and pass it back in via `defaultResolved`.
 */
export function useThemeSetting(options: UseThemeSettingOptions = {}): UseThemeSettingResult {
  const { storageKey = DEFAULT_STORAGE_KEY, defaultResolved = 'light', storage } = options;

  // First-render values - deliberately deterministic for hydration.
  // The effect below replaces them with the real client values.
  const [mode, setMode] = useState<ThemeMode>('system');
  const [systemResolved, setSystemResolved] = useState<ResolvedTheme>(defaultResolved);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Restore the user override.
    if (storageKey !== null) {
      try {
        const stored = storageFor(storage)?.getItem(storageKey);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setMode(stored);
        }
      } catch {
        // Storage may be blocked (private mode, sandboxed iframe). Fall
        // through to the system default.
      }
    }

    // Subscribe to OS changes.
    const mq = window.matchMedia(MEDIA_QUERY);
    setSystemResolved(mq.matches ? 'dark' : 'light');
    const onChange = (event: MediaQueryListEvent): void => {
      setSystemResolved(event.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
    };
  }, [storage, storageKey]);

  const set = useCallback(
    (next: ThemeMode) => {
      setMode(next);
      if (storageKey === null) return;
      try {
        const target = storageFor(storage);
        if (next === 'system') {
          target?.removeItem(storageKey);
        } else {
          target?.setItem(storageKey, next);
        }
      } catch {
        // Storage write failed (quota, private mode). The in-memory
        // state still updates so the current session works; the next
        // reload reverts to the system default.
      }
    },
    [storage, storageKey],
  );

  const resolved: ResolvedTheme = mode === 'system' ? systemResolved : mode;

  return useMemo(() => ({ mode, resolved, set }), [mode, resolved, set]);
}
