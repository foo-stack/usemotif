import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MotifStyleRegistry } from './motif-style-registry';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'motif universal app: Next.js',
  description: 'The same screen tree as the Expo Router app, rendered by Next.js App Router.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <MotifStyleRegistry>
          <Providers>{children}</Providers>
        </MotifStyleRegistry>
      </body>
    </html>
  );
}
