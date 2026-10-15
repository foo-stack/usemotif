import {
  createSsrStreamResponse,
  getSsrStatus,
  transformReadableStreamWithRouter,
  type HandlerCallback,
} from '@tanstack/react-router/ssr/server';
import type { AnyRouter } from '@tanstack/react-router';
import { StartServer } from '@tanstack/react-start/server';
import { CollectorContext } from '@usemotif/react';
import { motifStyleTransform, SSRStyleCollector } from '@usemotif/react/server';
import { renderToReadableStream } from 'react-dom/server';

/**
 * TanStack Start's stream handler with motif's styles streamed in: one collector per request,
 * React's stream piped through `motifStyleTransform`, then through the router's own transform.
 */
export const motifHandler: HandlerCallback<AnyRouter> = async ({
  request,
  router,
  responseHeaders,
}) => {
  const collector = new SSRStyleCollector();
  const stream = await renderToReadableStream(
    <CollectorContext.Provider value={collector}>
      <StartServer router={router} />
    </CollectorContext.Provider>,
    { signal: request.signal },
  );
  const body = transformReadableStreamWithRouter(
    router,
    stream.pipeThrough(motifStyleTransform(collector)),
    {
      rendererSafePoint: 'script-close',
      signal: request.signal,
    },
  );
  return createSsrStreamResponse(
    router,
    new Response(body, { status: getSsrStatus(router), headers: responseHeaders }),
  );
};
