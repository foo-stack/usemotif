import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { ThemeProvider } from '@usemotif/react';
import { lightTheme } from '@usemotif/tokens';
import type { ReactNode } from 'react';

export const Route = createRootRoute({
  head: () => ({ meta: [{ charSet: 'utf-8' }, { title: 'motif on TanStack Start' }] }),
  shellComponent: Shell,
  component: Outlet,
});

function Shell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider themes={[lightTheme]} active="light">
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
