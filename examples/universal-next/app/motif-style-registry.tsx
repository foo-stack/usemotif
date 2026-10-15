'use client';

import { useState, type ReactNode } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { CollectorContext, SSRStyleCollector } from '@usemotif/react';

/**
 * Drop-in style registry for Next.js App Router.
 *
 * - Creates a per-request `SSRStyleCollector` (lazy `useState` init).
 * - Provides it via `CollectorContext` so motif components route their
 *   generated CSS to this collector instead of the default storage.
 * - On every server-side flush (`useServerInsertedHTML`), drains the
 *   collector and returns a `<style data-motif-ssr>` block that Next
 *   inlines into the streamed HTML.
 * - On the client, falls through to children - motif's runtime path
 *   (browser injection into `<style data-motif-style-cache>`) takes over.
 *
 * Place inside the root `<body>` of `app/layout.tsx`.
 */
export function MotifStyleRegistry({ children }: { children: ReactNode }) {
  const [collector] = useState(() => new SSRStyleCollector());

  useServerInsertedHTML(() => {
    const css = collector.getCss();
    if (css.length === 0) return null;
    collector._drain();
    return <style data-motif-ssr dangerouslySetInnerHTML={{ __html: css }} />;
  });

  if (typeof window !== 'undefined') {
    return <>{children}</>;
  }

  return <CollectorContext.Provider value={collector}>{children}</CollectorContext.Provider>;
}
