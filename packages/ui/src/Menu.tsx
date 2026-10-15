'use client';

import {
  Menu as HeadlessMenu,
  type MenuContentProps,
  type MenuItemProps as HeadlessMenuItemProps,
} from '@usemotif/headless';
import { Box } from 'usemotif';
import { platformText } from './_platform-text.js';

// Hoisted so the bag props are stable references (lint: no-new-object). A menu
// item highlights on both mouse hover and keyboard focus - the headless layer
// moves DOM focus between items, and `asChild` makes this themed Box the
// focusable element, so `_focus` (`:focus-visible`) catches the keyboard case.
const ITEM_HOVER = { bg: '$colors.surface.interactive' } as const;
const ITEM_FOCUS = { bg: '$colors.surface.interactive' } as const;

export type MenuItemPropsThemed = Omit<HeadlessMenuItemProps, 'style' | 'asChild'>;

/** The floating panel - a themed `surface.raised` card around the menu items. */
function MenuContent({ children, ...rest }: MenuContentProps) {
  return (
    <HeadlessMenu.Content {...rest}>
      <Box
        display="flex"
        flexDirection="column"
        gap="$space.1"
        bg="$colors.surface.raised"
        borderWidth="$borderWidths.thin"
        borderColor="$colors.border.default"
        borderRadius="$radii.lg"
        p="$space.1"
        minWidth={180}
        boxShadow="0 8px 24px rgba(0, 0, 0, 0.18)"
      >
        {children}
      </Box>
    </HeadlessMenu.Content>
  );
}

/**
 * One menu item. The headless `Menu.Item` projects its semantics (`role`,
 * `tabIndex`, the activate handlers, the registration ref) onto this themed
 * `Box` via `asChild`, so the styled row is itself the focusable element - it
 * highlights from `_hover` and `_focus` alike.
 */
function MenuItem({ children, onSelect, disabled }: MenuItemPropsThemed) {
  return (
    <HeadlessMenu.Item
      asChild
      {...(onSelect !== undefined ? { onSelect } : {})}
      {...(disabled !== undefined ? { disabled } : {})}
    >
      <Box
        px="$space.3"
        py="$space.2"
        borderRadius="$radii.md"
        fontSize="$fontSizes.sm"
        color={disabled === true ? '$colors.text.muted' : '$colors.text.default'}
        _hover={ITEM_HOVER}
        _focus={ITEM_FOCUS}
      >
        {platformText(children, {
          fontSize: '$fontSizes.sm',
          color: disabled === true ? '$colors.text.muted' : '$colors.text.default',
        })}
      </Box>
    </HeadlessMenu.Item>
  );
}

/** A hairline divider between groups of items. */
function MenuSeparator() {
  return <Box as="div" role="separator" my="$space.1" height={1} bg="$colors.border.default" />;
}

/**
 * Themed dropdown menu over the accessible headless `Menu` (arrow-key
 * navigation, focus management, Escape + click-outside dismissal). `Root` and
 * `Trigger` are the headless parts unchanged; `Content`, `Item`, and
 * `Separator` carry the theming.
 *
 * ```tsx
 * <Menu.Root>
 *   <Menu.Trigger><Button>Actions</Button></Menu.Trigger>
 *   <Menu.Content>
 *     <Menu.Item onSelect={rename}>Rename</Menu.Item>
 *     <Menu.Separator />
 *     <Menu.Item disabled>Archive</Menu.Item>
 *   </Menu.Content>
 * </Menu.Root>
 * ```
 */
/**
 * Parts exported flat so `*.namespace.ts` can assemble the namespace in the
 * server graph. Internal: the barrel does not re-export these by name.
 */
export { MenuContent, MenuItem, MenuSeparator };
