'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeProvider } from 'usemotif';
import {
  NavProvider,
  darkTheme,
  lightTheme,
  type ScreenLinkProps,
} from '@usemotif/example-universal-shared';

function NextLink({ href, children }: ScreenLinkProps) {
  return <Link href={href}>{children}</Link>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider themes={[lightTheme, darkTheme]} active="light">
      <NavProvider link={NextLink}>{children}</NavProvider>
    </ThemeProvider>
  );
}
