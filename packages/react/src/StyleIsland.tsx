'use client';

import { hashString } from '@usemotif/core';
import { useState, type ReactElement, type ReactNode } from 'react';
import { CollectorContext } from './collector-context.js';
import { SSRStyleCollector } from './style-cache.js';

function CollectedStyles({ collector }: { collector: SSRStyleCollector }): ReactElement | null {
  // Rendered after the island's content, so the server has collected all of its CSS by now.
  const css = collector.getCss();
  return css === '' ? null : (
    // `precedence` makes this a React 19 hoistable stylesheet; the lint rule predates it.
    // eslint-disable-next-line react/no-unknown-property
    <style href={`motif-${hashString(css)}`} precedence="motif">
      {css}
    </style>
  );
}

/**
 * Server-renders its children with their own style collector and emits their CSS with them, as a
 * React 19 hoistable `<style>`. For frameworks that render each island separately, such as Astro
 * with React islands, where there is no stream or document to collect styles into. In the
 * browser it renders its children alone, and the runtime takes over.
 *
 * @example
 * ```tsx
 * export default function Card(props) {
 *   return (
 *     <StyleIsland>
 *       <ThemeProvider themes={[lightTheme]} active="light">
 *         <Box p="$space.4">{props.title}</Box>
 *       </ThemeProvider>
 *     </StyleIsland>
 *   );
 * }
 * ```
 */
export function StyleIsland({ children }: { children?: ReactNode }): ReactElement {
  const [collector] = useState(() =>
    typeof window === 'undefined' ? new SSRStyleCollector() : null,
  );
  if (collector === null) return <>{children}</>;
  return (
    <CollectorContext.Provider value={collector}>
      {children}
      <CollectedStyles collector={collector} />
    </CollectorContext.Provider>
  );
}
