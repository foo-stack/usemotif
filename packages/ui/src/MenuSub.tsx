'use client';

import {
  Menu as HeadlessMenu,
  type MenuSubContentProps,
  type MenuSubTriggerProps,
} from '@usemotif/headless';
import { Box } from 'usemotif';

// Hoisted so the bag props are stable references (lint: no-new-object).
const ITEM_HOVER = { bg: '$colors.surface.interactive' } as const;
const ITEM_FOCUS = { bg: '$colors.surface.interactive' } as const;

export type MenuSubTriggerPropsThemed = Omit<MenuSubTriggerProps, 'style' | 'asChild'>;

/**
 * A menu row that opens a submenu: themed like a menu item, with a trailing
 * chevron. Shared by the kit's Menu and ContextMenu.
 */
export function MenuSubTrigger({ children, disabled }: MenuSubTriggerPropsThemed) {
  return (
    <HeadlessMenu.SubTrigger asChild {...(disabled !== undefined ? { disabled } : {})}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap="$space.4"
        px="$space.3"
        py="$space.2"
        borderRadius="$radii.md"
        fontSize="$fontSizes.sm"
        color={disabled === true ? '$colors.text.muted' : '$colors.text.default'}
        _hover={ITEM_HOVER}
        _focus={ITEM_FOCUS}
      >
        {children}
        <Box as="span" aria-hidden color="$colors.text.muted">
          ›
        </Box>
      </Box>
    </HeadlessMenu.SubTrigger>
  );
}

/** The submenu panel: the same raised card as the menu it opens from. */
export function MenuSubContent({ children, ...rest }: MenuSubContentProps) {
  return (
    <HeadlessMenu.SubContent {...rest}>
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
    </HeadlessMenu.SubContent>
  );
}
