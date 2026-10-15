'use client';

import {
  ContextMenu as HeadlessContextMenu,
  type ContextMenuContentProps as HeadlessContextMenuContentProps,
} from '@usemotif/headless';
import type { ReactNode } from 'react';
import { Box } from 'usemotif';
import { platformText } from './_platform-text.js';

// Hoisted stable references (lint: no-new-object). The item highlights on both
// mouse hover and keyboard focus - `asChild` makes this themed Box the focusable
// menuitem, so `_focus` (`:focus-visible`) catches arrow-key navigation.
const ITEM_HOVER = { bg: '$colors.surface.interactive' } as const;
const ITEM_FOCUS = { bg: '$colors.surface.interactive' } as const;

export interface ContextMenuItemPropsThemed {
  readonly children?: ReactNode;
  readonly onSelect?: () => void;
  readonly disabled?: boolean;
}

/** The floating panel (positioned at the cursor) - a themed `surface.raised`
 * card around the items. */
function ContextMenuContent({ children, ...rest }: HeadlessContextMenuContentProps) {
  return (
    <HeadlessContextMenu.Content {...rest}>
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
    </HeadlessContextMenu.Content>
  );
}

/** One item - the headless semantics project onto this themed `Box` via
 * `asChild`, so the styled row is itself the focusable element. */
function ContextMenuItem({ children, onSelect, disabled }: ContextMenuItemPropsThemed) {
  return (
    <HeadlessContextMenu.Item
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
    </HeadlessContextMenu.Item>
  );
}

/** A hairline divider between groups of items. */
function ContextMenuSeparator() {
  return <Box as="div" role="separator" my="$space.1" height={1} bg="$colors.border.default" />;
}

/**
 * Themed right-click menu over the accessible headless `ContextMenu` (opens at
 * the cursor on `contextmenu`, arrow-key navigation, Escape + click-outside
 * dismissal). `Root` and `Trigger` are the headless parts; `Content`, `Item`,
 * and `Separator` carry the theming.
 *
 * ```tsx
 * <ContextMenu.Root>
 *   <ContextMenu.Trigger><div>Right-click me</div></ContextMenu.Trigger>
 *   <ContextMenu.Content>
 *     <ContextMenu.Item onSelect={cut}>Cut</ContextMenu.Item>
 *     <ContextMenu.Item onSelect={copy}>Copy</ContextMenu.Item>
 *     <ContextMenu.Separator />
 *     <ContextMenu.Item disabled>Paste</ContextMenu.Item>
 *   </ContextMenu.Content>
 * </ContextMenu.Root>
 * ```
 */
/**
 * Parts exported flat so `*.namespace.ts` can assemble the namespace in the
 * server graph. Internal: the barrel does not re-export these by name.
 */
export { ContextMenuContent, ContextMenuItem, ContextMenuSeparator };
