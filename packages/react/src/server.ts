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
 * Writes the CSS `collector` gathered into HTML as it streams: held until the chunk that closes
 * `<head>` and placed there, then ahead of each later chunk.
 */
function styleInjector(collector: SSRStyleCollector): (html: string) => string {
  let headClosed = false;
  return (html) => {
    const tag = collector.getStyleTag();
    if (tag === '') {
      if (!headClosed && html.includes('</head>')) headClosed = true;
      return html;
    }
    const head = headClosed ? -1 : html.indexOf('</head>');
    if (head !== -1) {
      headClosed = true;
      collector._drain();
      return html.slice(0, head) + tag + html.slice(head);
    }
    // Before `</head>` has passed, the CSS waits for the chunk that closes it.
    if (!headClosed) return html;
    collector._drain();
    return tag + html;
  };
}

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
  const inject = styleInjector(collector);
  return new Transform({
    transform(chunk: Buffer | string, _encoding, done) {
      done(null, inject(typeof chunk === 'string' ? chunk : decoder.write(chunk)));
    },
    flush(done) {
      done(null, decoder.end());
    },
  });
}

/**
 * {@link motifStyleStream} for web streams, for a render from `renderToReadableStream`: pipe the
 * stream through it with `pipeThrough`, as in a TanStack Start handler.
 *
 * @example
 * ```tsx
 * const stream = await renderToReadableStream(
 *   <CollectorContext.Provider value={collector}>{app}</CollectorContext.Provider>,
 * );
 * return new Response(stream.pipeThrough(motifStyleTransform(collector)));
 * ```
 */
export function motifStyleTransform(
  collector: SSRStyleCollector,
): TransformStream<Uint8Array | string, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const inject = styleInjector(collector);
  return new TransformStream({
    transform(chunk, controller) {
      const html = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
      if (html !== '') controller.enqueue(encoder.encode(inject(html)));
    },
    flush(controller) {
      const rest = decoder.decode();
      if (rest !== '') controller.enqueue(encoder.encode(inject(rest)));
    },
  });
}

export { SSRStyleCollector, setCollectorStorage, syncCollectorStorage, type CollectorStorage };
