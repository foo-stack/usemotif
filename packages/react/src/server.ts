/**
 * Server-only entry. Importing this module **once at app startup**
 * registers an `AsyncLocalStorage`-backed collector storage backend, so
 * concurrent server renders (streaming SSR / RSC / multiple in-flight
 * `renderToString` calls) don't interfere with each other.
 *
 * @example
 *
 * ```ts
 * // app/layout.tsx (Next.js App Router)
 * import '@usemotif/react/server';
 * // ...rest of your layout
 * ```
 *
 * Re-exports `SSRStyleCollector` and the storage primitives so callers
 * who already had `import * from '@usemotif/react'` can switch to
 * the server entry without breaking imports.
 *
 * **Side effect:** importing this file calls
 * `setCollectorStorage(asyncCollectorStorage)`. Idempotent.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { Transform } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';
import {
  SSRStyleCollector,
  setCollectorStorage,
  syncCollectorStorage,
  type CollectorStorage,
} from './style-cache.js';

/**
 * `AsyncLocalStorage`-backed collector storage. Each call to
 * `collector.collect(fn)` runs `fn` inside an ALS context bound to that
 * collector, so async work spawned from `fn` continues to see the right
 * collector even when other requests are interleaving.
 */
export const asyncCollectorStorage: CollectorStorage = (() => {
  const als = new AsyncLocalStorage<SSRStyleCollector>();
  return {
    get: () => als.getStore() ?? null,
    run<T>(c: SSRStyleCollector, fn: () => T): T {
      return als.run(c, fn);
    },
  };
})();

setCollectorStorage(asyncCollectorStorage);

/**
 * A Node stream to pipe a streaming React render through, which writes the CSS `collector`
 * gathered into the HTML as it goes: into `<head>` with the shell, then ahead of each later chunk,
 * so a Suspense boundary's styles arrive before the content they style. Pair it with
 * `CollectorContext` around the app, as in a React Router `entry.server`.
 *
 * @example
 * ```tsx
 * const collector = new SSRStyleCollector();
 * const { pipe } = renderToPipeableStream(
 *   <CollectorContext.Provider value={collector}>{app}</CollectorContext.Provider>,
 *   { onShellReady: () => pipe(motifStyleStream(collector)).pipe(res) },
 * );
 * ```
 */
export function motifStyleStream(collector: SSRStyleCollector): Transform {
  const decoder = new StringDecoder('utf8');
  let headClosed = false;
  return new Transform({
    transform(chunk: Buffer | string, _encoding, done) {
      let html = typeof chunk === 'string' ? chunk : decoder.write(chunk);
      const tag = collector.getStyleTag();
      if (tag !== '') {
        const head = headClosed ? -1 : html.indexOf('</head>');
        if (head !== -1) {
          html = html.slice(0, head) + tag + html.slice(head);
          headClosed = true;
          collector._drain();
        } else if (headClosed) {
          html = tag + html;
          collector._drain();
        }
        // Before `</head>` has passed, the CSS waits for the chunk that closes it.
      } else if (!headClosed && html.includes('</head>')) {
        headClosed = true;
      }
      done(null, html);
    },
    flush(done) {
      done(null, decoder.end());
    },
  });
}

export { SSRStyleCollector, setCollectorStorage, syncCollectorStorage, type CollectorStorage };
