'use client';

import { NavigationMenu as HeadlessNavigationMenu } from '@usemotif/headless';
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import { PlatformLink } from './_link.js';
import { usePlatformStyle } from './_platform-style.js';

// The active item's id is shared down so each Item can style itself; the headless
// also reads each child's `id` prop to set `aria-current="page"` on its <li>.
const CurrentContext = createContext<string | undefined>(undefined);

const NAV_STYLE: CSSProperties = { display: 'flex' };
const LINK_HOVER = { color: '$colors.text.default' } as const;

export interface NavigationMenuProps {
  /** id of the active item - applied as `aria-current="page"` and emphasized. */
  readonly current?: string;
  readonly 'aria-label'?: string;
  readonly children?: ReactNode;
}

export interface NavigationMenuItemProps {
  /** Stable id; matched against the menu's `current`. */
  readonly id: string;
  readonly href?: string;
  readonly children?: ReactNode;
}

/** A top-level link. Emphasized (and `aria-current` upstream) when its `id`
 * matches the menu's `current`. */
function NavigationMenuItem({ id, href, children }: NavigationMenuItemProps) {
  const current = useContext(CurrentContext);
  const active = current === id;
  return (
    <PlatformLink
      href={href}
      display="inline-flex"
      alignItems="center"
      px="$space.3"
      py="$space.2"
      bg="transparent"
      borderWidth={0}
      fontSize="$fontSizes.md"
      fontWeight={active ? 600 : 500}
      color={active ? '$colors.action.primary.bg' : '$colors.text.muted'}
      cursor="pointer"
      _hover={LINK_HOVER}
    >
      {children}
    </PlatformLink>
  );
}

/**
 * A themed top-level navigation bar over the accessible headless
 * `NavigationMenu` (a `nav` landmark; `aria-current="page"` on the active item).
 * Single-level: use `NavigationMenu.Item` for each link.
 *
 * ```tsx
 * <NavigationMenu current="docs" aria-label="Primary">
 *   <NavigationMenu.Item id="home" href="/">Home</NavigationMenu.Item>
 *   <NavigationMenu.Item id="docs" href="/docs">Docs</NavigationMenu.Item>
 * </NavigationMenu>
 * ```
 */
function NavigationMenuRoot({ current, children, ...rest }: NavigationMenuProps) {
  const platformStyle = usePlatformStyle();
  return (
    <CurrentContext.Provider value={current}>
      <HeadlessNavigationMenu
        style={platformStyle(NAV_STYLE)}
        {...(current !== undefined ? { current } : {})}
        {...(rest['aria-label'] !== undefined ? { 'aria-label': rest['aria-label'] } : {})}
      >
        {children}
      </HeadlessNavigationMenu>
    </CurrentContext.Provider>
  );
}

/** Parts exported flat for the namespace module. Internal. */
export { NavigationMenuItem, NavigationMenuRoot };
