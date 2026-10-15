import {
  buildAtRulesCss,
  buildPseudoCss,
  hashAtRules,
  hashPseudoRules,
  wrapInLayer,
  type AtRule,
  type PseudoRule,
} from '@usemotif/core';

export type { AtRule, PseudoRule };

interface StyleCacheState {
  /** Class names that have already been injected. */
  readonly injected: Set<string>;
  /** Pending CSS for environments where neither a document nor an SSR collector is available. */
  readonly pendingCss: string[];
  /** The injected `<style>` element, lazily created. */
  styleEl: HTMLStyleElement | null;
  /** Whether we've already scanned the DOM for SSR-injected styles. */
  hydrated: boolean;
}

interface SharedState {
  readonly cache: StyleCacheState;
  storage: CollectorStorage;
}

// One state per JS realm rather than per copy of this module. The CJS build
// gives each tsup entry (the barrel, `/server`, `/testing`) its own copy, and
// a collector installed through one would otherwise never see styles injected
// through another. Read lazily so importing the module has no side effect.
const SHARED_KEY = Symbol.for('usemotif.styleCache');

function shared(): SharedState {
  const registry = globalThis as unknown as Record<symbol, SharedState | undefined>;
  return (registry[SHARED_KEY] ??= {
    cache: { injected: new Set<string>(), pendingCss: [], styleEl: null, hydrated: false },
    storage: syncCollectorStorage,
  });
}

/**
 * Per-request collector for server-side rendering. The renderer routes
 * injected CSS to whichever collector is currently active rather than
 * trying to touch a (non-existent) `document`.
 *
 * Usage:
 *
 * ```ts
 * import { renderToString } from 'react-dom/server';
 * import { SSRStyleCollector } from '@usemotif/react';
 *
 * const collector = new SSRStyleCollector();
 * const html = collector.collect(() => renderToString(<App />));
 * const styleTag = collector.getStyleTag();
 * // Embed `styleTag` in <head> alongside `html` in the response.
 * ```
 *
 * **Concurrency:** by default the active-collector pointer is
 * module-level - safe for synchronous `renderToString` calls. Streaming
 * SSR (`renderToReadableStream`) and React Server Components both
 * interleave async work across requests, which corrupts a module-level
 * pointer. To make collection async-safe, import
 * `@usemotif/react/server` once at app startup; that module
 * registers an `AsyncLocalStorage`-backed storage backend.
 */
export class SSRStyleCollector {
  private readonly rules: string[] = [];
  private readonly localInjected = new Set<string>();

  /**
   * Run `fn` with this collector active. CSS produced by motif components
   * during the call is captured here instead of injected into the
   * document. The previous active collector (if any) is restored on exit.
   */
  collect<T>(fn: () => T): T {
    return shared().storage.run(this, fn);
  }

  /** Raw CSS captured during this collector's `collect()` call. */
  getCss(): string {
    return this.rules.join('\n');
  }

  /**
   * The captured CSS wrapped in a `<style data-motif-ssr>` tag, ready to
   * embed in the rendered HTML's `<head>`. Returns an empty string if
   * nothing was collected.
   *
   * The `data-motif-ssr` marker is read on the client to seed the
   * style-cache's injected set so the same rules aren't injected twice
   * after hydration.
   */
  getStyleTag(): string {
    if (this.rules.length === 0) return '';
    return `<style data-motif-ssr>${this.rules.join('\n')}</style>`;
  }

  /** Internal: append a rule to this collector. */
  _append(className: string, css: string): void {
    if (this.localInjected.has(className)) return;
    this.localInjected.add(className);
    this.rules.push(css);
  }

  /**
   * Internal: drain the captured CSS without resetting the dedup set.
   * Used by streaming SSR registries that emit a `<style>` block per
   * suspense flush - the next flush should only include rules added
   * since the last drain. Leaving `localInjected` populated prevents
   * the same rule from being re-emitted across flushes.
   */
  _drain(): void {
    this.rules.length = 0;
  }
}

/**
 * Pluggable backend for tracking the currently-active collector. The
 * default {@link syncCollectorStorage} uses a module-level pointer (safe
 * for sync `renderToString`); the server-only entry registers an
 * `AsyncLocalStorage`-backed variant for streaming SSR / RSC.
 */
export interface CollectorStorage {
  get(): SSRStyleCollector | null;
  run<T>(collector: SSRStyleCollector, fn: () => T): T;
}

/** Sync (module-level) storage. Default. */
export const syncCollectorStorage: CollectorStorage = (() => {
  let active: SSRStyleCollector | null = null;
  return {
    get: () => active,
    run<T>(c: SSRStyleCollector, fn: () => T): T {
      const prev = active;
      active = c;
      try {
        return fn();
      } finally {
        active = prev;
      }
    },
  };
})();

/** Whether the runtime emitted this class, in the browser or into SSR. For the devtools. */
export function _isRuntimeClass(className: string): boolean {
  return shared().cache.injected.has(className);
}

/**
 * Swap the storage backend used to track the active collector. Intended
 * to be called once at app startup by `@usemotif/react/server` to
 * install the `AsyncLocalStorage`-backed backend. Idempotent.
 */
export function setCollectorStorage(impl: CollectorStorage): void {
  shared().storage = impl;
}

/**
 * Read SSR-injected `<style data-motif-ssr>` blocks out of the document
 * and seed the cache's injected set with the class names found inside,
 * so client-side renders don't re-inject the same rules.
 *
 * Idempotent - runs at most once per page load. No-op outside the browser.
 */
function hydrateFromSSR(): void {
  if (shared().cache.hydrated) return;
  shared().cache.hydrated = true;
  if (typeof document === 'undefined') return;
  const ssrEls = document.querySelectorAll('style[data-motif-ssr]');
  const classRe = /\.(m-[a-z0-9]+)/g;
  // @keyframes rules don't carry a `.<class>` selector, so a separate
  // pass picks up their name from `@keyframes m-anim-<hash>` so the
  // client dedup matches what SSR already emitted.
  const keyframeRe = /@keyframes\s+(m-anim-[a-z0-9]+)/g;
  for (const el of ssrEls) {
    const css = el.textContent ?? '';
    for (const match of css.matchAll(classRe)) {
      shared().cache.injected.add(match[1]!);
    }
    for (const match of css.matchAll(keyframeRe)) {
      shared().cache.injected.add(match[1]!);
    }
  }
}

const SSR_NO_COLLECTOR_MESSAGE =
  'motif: tried to inject styles on the server with no active SSRStyleCollector. ' +
  'The module-level dedup cache is process-global and shared across concurrent ' +
  'requests, so falling through to it would drop rules and leak CSS between ' +
  'renders. Wrap your SSR render with the collector from "@usemotif/react/server" ' +
  '(or provide one via useActiveCollector) so each request gets isolated style state.';

/**
 * Guard the browser injection path against running on the server with no
 * collector. Without a `document`, the browser path would dedup against and
 * queue into module-global state shared by every concurrent request - silently
 * dropping rules. Throw instead so the misconfiguration surfaces.
 */
function assertBrowserOrCollector(): void {
  if (typeof document === 'undefined') {
    throw new Error(SSR_NO_COLLECTOR_MESSAGE);
  }
}

function emitToBrowser(css: string): void {
  const { cache } = shared();
  if (cache.styleEl !== null) {
    cache.styleEl.appendChild(document.createTextNode(`\n${css}`));
    return;
  }
  if (typeof document === 'undefined') {
    cache.pendingCss.push(css);
    return;
  }
  const el = document.createElement('style');
  el.setAttribute('data-motif-style-cache', '');
  el.appendChild(document.createTextNode(css));
  document.head.appendChild(el);
  cache.styleEl = el;
}

/**
 * Generate a deterministic class name for a set of at-rules and inject the
 * corresponding CSS into the document (deduplicated by class name).
 *
 * Returns the class name, or `undefined` if there are no rules to inject.
 *
 * Safe to call from render. On the server it routes to the active
 * `SSRStyleCollector`; on the client it appends to a singleton
 * `<style data-motif-style-cache>` element. SSR-emitted classes (carried
 * over via `<style data-motif-ssr>`) are picked up on first call to
 * prevent double-injection after hydration.
 */
export function injectAtRules(
  rules: readonly AtRule[],
  override?: SSRStyleCollector | null,
  layer?: string,
): string | undefined {
  if (rules.length === 0) return undefined;

  // The layer is folded into the class name as well as the emitted CSS: the
  // dedup sets below are keyed by class name, so two scopes with identical
  // declarations in different layers would otherwise collapse and the second
  // layer's rule would never be written.
  const className = hashAtRules(rules, layer);
  const css = buildAtRulesCss(className, rules, layer);

  // Server path: route to the active per-request collector. Each collector
  // dedupes locally so concurrent requests don't shadow each other's CSS.
  // The `override` (typically from `useActiveCollector()`) wins over the
  // module-level storage so React-context-driven setups (App Router) and
  // call-site setups (renderToString) compose cleanly.
  const collector = override ?? shared().storage.get();
  if (collector !== null) {
    collector._append(className, css);
    return className;
  }

  // Browser path: dedup against the module-level set, emit to <style>.
  assertBrowserOrCollector();
  hydrateFromSSR();
  if (shared().cache.injected.has(className)) return className;
  shared().cache.injected.add(className);
  emitToBrowser(css);
  return className;
}

/**
 * Generate a deterministic class name for a set of pseudo-state rules and
 * inject them. Mirrors {@link injectAtRules} but emits selector-suffixed
 * rules (`:hover`, `:focus-visible`, etc.) rather than at-rule blocks.
 *
 * Returns the class name, or `undefined` if there are no rules to inject.
 */
export function injectPseudoRules(
  rules: readonly PseudoRule[],
  override?: SSRStyleCollector | null,
  layer?: string,
): string | undefined {
  if (rules.length === 0) return undefined;

  const className = hashPseudoRules(rules, layer);
  const css = buildPseudoCss(className, rules, layer);

  const collector = override ?? shared().storage.get();
  if (collector !== null) {
    collector._append(className, css);
    return className;
  }

  assertBrowserOrCollector();
  hydrateFromSSR();
  if (shared().cache.injected.has(className)) return className;
  shared().cache.injected.add(className);
  emitToBrowser(css);
  return className;
}

/**
 * Register an `@keyframes` block. Idempotent per `name` - calling with
 * the same `name` more than once is a no-op (assumes the body matches;
 * the runtime trusts the caller, since `keyframes(...)` returns a
 * stable hash-based name derived from the body).
 *
 * On the server: routes to the active `SSRStyleCollector`. Each
 * collector dedupes locally so concurrent requests don't shadow each
 * other's `@keyframes`. On the client: appends to the singleton
 * `<style data-motif-style-cache>` element. SSR-emitted `@keyframes`
 * (carried over via `<style data-motif-ssr>`) are picked up on first
 * call to prevent double-injection after hydration.
 */
export function injectKeyframes(
  name: string,
  css: string,
  override?: SSRStyleCollector | null,
  layer?: string,
): void {
  // The keyframes *name* is not layer-scoped - it is hashed from the body, so
  // identical names always describe identical animations and whichever layer
  // wins produces the same result. Only the emitted CSS is wrapped.
  const wrapped = wrapInLayer(css, layer);
  const collector = override ?? shared().storage.get();
  if (collector !== null) {
    collector._append(name, wrapped);
    return;
  }
  assertBrowserOrCollector();
  hydrateFromSSR();
  if (shared().cache.injected.has(name)) return;
  shared().cache.injected.add(name);
  emitToBrowser(wrapped);
}

/**
 * Flush any CSS queued in environments without a document and without an
 * active `SSRStyleCollector`. Should be unused in normal SSR flows - the
 * collector is the supported path. Returns the queued CSS and clears the
 * queue.
 */
export function flushPendingCss(): string {
  const out = shared().cache.pendingCss.join('\n');
  shared().cache.pendingCss.length = 0;
  return out;
}

/** Test-only: reset the cache and the storage backend. */
export function _resetStyleCacheForTesting(): void {
  shared().cache.injected.clear();
  shared().cache.pendingCss.length = 0;
  shared().cache.styleEl = null;
  shared().cache.hydrated = false;
  shared().storage = syncCollectorStorage;
}
