import { PassThrough } from 'node:stream';
import { createReadableStreamFromReadable } from '@react-router/node';
import { CollectorContext } from '@usemotif/react';
import { motifStyleStream, SSRStyleCollector } from '@usemotif/react/server';
import { isbot } from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import { ServerRouter, type EntryContext } from 'react-router';

export const streamTimeout = 5000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  return new Promise<Response>((resolve, reject) => {
    // One collector per request: styles from this render never reach another response.
    const collector = new SSRStyleCollector();
    const waitForAll = isbot(request.headers.get('user-agent') ?? '');
    const { pipe, abort } = renderToPipeableStream(
      <CollectorContext.Provider value={collector}>
        <ServerRouter context={routerContext} url={request.url} />
      </CollectorContext.Provider>,
      {
        [waitForAll ? 'onAllReady' : 'onShellReady']() {
          const body = new PassThrough();
          responseHeaders.set('Content-Type', 'text/html');
          resolve(
            new Response(createReadableStreamFromReadable(body), {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(motifStyleStream(collector)).pipe(body);
        },
        onShellError: reject,
        onError(error: unknown) {
          responseStatusCode = 500;
          console.error(error);
        },
      },
    );
    setTimeout(abort, streamTimeout + 1000);
  });
}
