'use client';

import { Tabs as HeadlessTabs, type TabsPanelProps, type TabsTabProps } from '@usemotif/headless';
import type { ReactNode } from 'react';
import { Box } from 'usemotif';

// Hoisted so the bag props are stable references (lint: no-new-object). The
// active tab is styled purely from `aria-selected` via the `_selected` pseudo -
// the headless `asChild` projects the tab semantics onto this Box, so there's no
// JS state to thread.
const TAB_HOVER = { color: '$colors.text.default' } as const;
const TAB_SELECTED = {
  color: '$colors.action.primary.bg',
  borderBottomColor: '$colors.action.primary.bg',
} as const;

export type TabsListProps = { readonly children?: ReactNode };
export type TabsTabPropsThemed = Omit<TabsTabProps, 'asChild' | 'style'>;
export type TabsPanelPropsThemed = Omit<TabsPanelProps, 'asChild' | 'style'>;

/** The tablist - a themed bottom-bordered row; the headless role lands on it. */
function TabsList({ children }: TabsListProps) {
  return (
    <HeadlessTabs.List asChild>
      <Box
        display="flex"
        flexDirection="row"
        gap="$space.1"
        borderBottomWidth="$borderWidths.thin"
        borderBottomColor="$colors.border.default"
      >
        {children}
      </Box>
    </HeadlessTabs.List>
  );
}

/** One tab. The headless behaviour (role, aria-selected, focus + keyboard nav)
 * is projected onto this themed `Box as="button"`, which reacts to its own
 * `aria-selected` through `_selected` - pure CSS, no JS state. */
function TabsTab({ value, disabled, children }: TabsTabPropsThemed) {
  return (
    <HeadlessTabs.Tab asChild value={value} {...(disabled !== undefined ? { disabled } : {})}>
      <Box
        as="button"
        px="$space.4"
        py="$space.3"
        bg="transparent"
        color="$colors.text.muted"
        fontSize="$fontSizes.md"
        fontWeight={500}
        borderWidth={0}
        borderBottomWidth="$borderWidths.thick"
        borderBottomColor="transparent"
        cursor="pointer"
        transition="color 120ms ease, border-color 120ms ease"
        _hover={TAB_HOVER}
        _selected={TAB_SELECTED}
      >
        {children}
      </Box>
    </HeadlessTabs.Tab>
  );
}

/** A tab panel - themed content region; the headless role/visibility lands on it. */
function TabsPanel({ value, forceMount, keepMounted, children }: TabsPanelPropsThemed) {
  return (
    <HeadlessTabs.Panel
      asChild
      value={value}
      {...(forceMount !== undefined ? { forceMount } : {})}
      {...(keepMounted !== undefined ? { keepMounted } : {})}
    >
      <Box as="section" pt="$space.4" color="$colors.text.default">
        {children}
      </Box>
    </HeadlessTabs.Panel>
  );
}

/**
 * Themed tabs over the accessible headless `Tabs` (roving focus, arrow-key
 * navigation, panel association). The active tab colours itself from
 * `aria-selected` via the `_selected` pseudo-state, so the styling is pure CSS.
 *
 * ```tsx
 * <Tabs.Root defaultValue="account">
 *   <Tabs.List>
 *     <Tabs.Tab value="account">Account</Tabs.Tab>
 *     <Tabs.Tab value="billing">Billing</Tabs.Tab>
 *   </Tabs.List>
 *   <Tabs.Panel value="account">...</Tabs.Panel>
 *   <Tabs.Panel value="billing">...</Tabs.Panel>
 * </Tabs.Root>
 * ```
 */
/**
 * Parts exported flat so `*.namespace.ts` can assemble the namespace in the
 * server graph. Internal: the barrel does not re-export these by name.
 */
export { TabsList, TabsPanel, TabsTab };
