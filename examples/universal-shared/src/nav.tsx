'use client';

import { createContext, useContext, type ComponentType, type ReactNode } from 'react';

/** The routes the screens link between. Each app maps them to its own router's paths. */
export type Route = '/' | '/settings';

export interface ScreenLinkProps {
  readonly href: Route;
  readonly children: ReactNode;
}

/**
 * How a screen links to another. The screens never import a router: each app provides its own
 * router's `Link` (next/link, expo-router) through `NavProvider`, so the same screen tree runs
 * under both.
 */
const NavContext = createContext<ComponentType<ScreenLinkProps> | null>(null);

export function NavProvider({
  link,
  children,
}: {
  link: ComponentType<ScreenLinkProps>;
  children: ReactNode;
}) {
  return <NavContext.Provider value={link}>{children}</NavContext.Provider>;
}

export function ScreenLink(props: ScreenLinkProps) {
  const Link = useContext(NavContext);
  if (Link === null) throw new Error('ScreenLink needs a NavProvider from the app.');
  return <Link {...props} />;
}
