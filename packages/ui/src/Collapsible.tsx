'use client';

import { Collapsible as HeadlessCollapsible, type CollapsibleRootProps } from '@usemotif/headless';
import type { ReactNode } from 'react';
import { Pressable, Box } from 'usemotif';
import { platformText } from './_platform-text.js';

// A chevron drawn as a right-aligned background image (theme-neutral grey), so
// it costs no extra DOM. The open state swaps the down chevron for an up one
// purely through the `_expanded` pseudo (`[aria-expanded="true"]`) the headless
// trigger sets on this element - no JS reads the open state.
const CHEVRON_DOWN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")";
const CHEVRON_UP =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 10l4-4 4 4'/%3E%3C/svg%3E\")";

// Hoisted so the bag props are stable references (lint: no-new-object).
const TRIGGER_TEXT = {
  color: '$colors.text.default',
  fontSize: '$fontSizes.md',
  fontWeight: 500,
} as const;
const CONTENT_TEXT = { color: '$colors.text.muted', fontSize: '$fontSizes.sm' } as const;
const TRIGGER_HOVER = { bg: '$colors.surface.interactive' } as const;
const TRIGGER_EXPANDED = {
  color: '$colors.action.primary.bg',
  backgroundImage: CHEVRON_UP,
} as const;

export type CollapsibleRootPropsThemed = CollapsibleRootProps;
export type CollapsibleTriggerProps = { readonly children?: ReactNode };
export type CollapsibleContentProps = {
  readonly children?: ReactNode;
  /** Keep the panel mounted while closed (callers hide it via CSS). */
  readonly forceMount?: boolean;
};

/** The bordered, rounded container; the headless context lives above it. */
function CollapsibleRoot({ children, ...rest }: CollapsibleRootProps) {
  return (
    <HeadlessCollapsible.Root {...rest}>
      <Box
        display="flex"
        flexDirection="column"
        borderWidth="$borderWidths.thin"
        borderColor="$colors.border.default"
        borderRadius="$radii.lg"
        overflow="hidden"
      >
        {children}
      </Box>
    </HeadlessCollapsible.Root>
  );
}

/**
 * The clickable header. The headless `Collapsible.Trigger` clones the disclosure
 * semantics - `aria-expanded`, `aria-controls`, `id`, the toggle handler - onto
 * this themed `Box as="button"`, which then recolours and flips its chevron from
 * its own `aria-expanded` via the `_expanded` pseudo (pure CSS, no JS reads the
 * open state).
 */
function CollapsibleTrigger({ children }: CollapsibleTriggerProps) {
  const trigger = (
    <Pressable
      width="100%"
      textAlign="left"
      px="$space.4"
      py="$space.3"
      pr="$space.10"
      bg="transparent"
      color="$colors.text.default"
      fontSize="$fontSizes.md"
      fontWeight={500}
      borderWidth={0}
      cursor="pointer"
      backgroundImage={CHEVRON_DOWN}
      backgroundRepeat="no-repeat"
      backgroundPosition="right 16px center"
      transition="color 120ms ease, background-color 120ms ease"
      _hover={TRIGGER_HOVER}
      _expanded={TRIGGER_EXPANDED}
    >
      {platformText(children, TRIGGER_TEXT)}
    </Pressable>
  );
  // Box types its element props for a generic HTMLElement; present the child as
  // the element type the headless Trigger expects.
  return (
    <HeadlessCollapsible.Trigger>
      {trigger as Parameters<typeof HeadlessCollapsible.Trigger>[0]['children']}
    </HeadlessCollapsible.Trigger>
  );
}

/** The collapsible panel - themed content region; headless owns its visibility. */
function CollapsibleContent({ children, forceMount }: CollapsibleContentProps) {
  return (
    <HeadlessCollapsible.Content {...(forceMount !== undefined ? { forceMount } : {})}>
      <Box
        px="$space.4"
        py="$space.3"
        borderTopWidth="$borderWidths.thin"
        borderTopColor="$colors.border.default"
        color="$colors.text.muted"
        fontSize="$fontSizes.sm"
      >
        {platformText(children, CONTENT_TEXT)}
      </Box>
    </HeadlessCollapsible.Content>
  );
}

/**
 * Themed single-disclosure collapsible over the accessible headless
 * `Collapsible` (controlled or uncontrolled). The trigger colours itself and
 * flips its chevron from `aria-expanded` via the `_expanded` pseudo-state, so
 * the open affordance is pure CSS. For many linked disclosures use `Accordion`.
 *
 * ```tsx
 * <Collapsible.Root defaultOpen>
 *   <Collapsible.Trigger>Advanced options</Collapsible.Trigger>
 *   <Collapsible.Content>...rarely-needed settings...</Collapsible.Content>
 * </Collapsible.Root>
 * ```
 */
/**
 * Parts exported flat so `*.namespace.ts` can assemble the namespace in the
 * server graph. Internal: the barrel does not re-export these by name.
 */
export { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger };
