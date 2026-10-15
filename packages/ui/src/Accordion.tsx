'use client';

import {
  Accordion as HeadlessAccordion,
  type AccordionItemProps as HeadlessAccordionItemProps,
  type AccordionRootProps,
} from '@usemotif/headless';
import type { ReactNode } from 'react';
import { Box } from 'usemotif';

// A chevron drawn as a right-aligned background image (theme-neutral grey), so
// it costs no extra DOM. The open state swaps the down chevron for an up one
// purely through the `_expanded` pseudo (`[aria-expanded="true"]`) the headless
// trigger sets on this element - no JS reads the open state.
const CHEVRON_DOWN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")";
const CHEVRON_UP =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 10l4-4 4 4'/%3E%3C/svg%3E\")";

// Hoisted so the bag props are stable references (lint: no-new-object).
const TRIGGER_HOVER = { bg: '$colors.surface.interactive' } as const;
const TRIGGER_EXPANDED = {
  color: '$colors.action.primary.bg',
  backgroundImage: CHEVRON_UP,
} as const;
// The open item of a non-collapsible accordion: its trigger can't close it.
const TRIGGER_LOCKED = { cursor: 'default' } as const;

export type AccordionRootPropsThemed = AccordionRootProps;
export type AccordionItemPropsThemed = HeadlessAccordionItemProps;
export type AccordionTriggerProps = { readonly children?: ReactNode };
export type AccordionContentProps = {
  readonly children?: ReactNode;
  /** Keep the panel mounted while closed (callers hide it via CSS). */
  readonly forceMount?: boolean;
};

/** The bordered, rounded container; the headless context lives above it. */
function AccordionRoot({ children, ...rest }: AccordionRootProps) {
  return (
    <HeadlessAccordion.Root {...rest}>
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
    </HeadlessAccordion.Root>
  );
}

/** One item - a row separated from the next by a hairline. */
function AccordionItem({ value, children }: HeadlessAccordionItemProps) {
  return (
    <HeadlessAccordion.Item value={value}>
      <Box borderBottomWidth="$borderWidths.thin" borderBottomColor="$colors.border.default">
        {children}
      </Box>
    </HeadlessAccordion.Item>
  );
}

/**
 * The clickable header. The headless `Accordion.Trigger` (a `Collapsible.Trigger`)
 * clones the disclosure semantics - `aria-expanded`, `aria-controls`, the toggle
 * handler - onto this themed `Box as="button"`, which then recolours and flips
 * its chevron from its own `aria-expanded` via the `_expanded` pseudo (pure CSS).
 */
function AccordionTrigger({ children }: AccordionTriggerProps) {
  // The headless Trigger clones the disclosure semantics (`aria-expanded`,
  // `aria-controls`, `id`, the toggle handler) onto its single child. Box
  // forwards them to the underlying <button> at runtime; its element-prop typing
  // is for a generic HTMLElement, so present the child as the element type the
  // headless Trigger expects.
  const trigger = (
    <Box
      as="button"
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
      _disabled={TRIGGER_LOCKED}
    >
      {children}
    </Box>
  );
  return (
    <HeadlessAccordion.Trigger>
      {trigger as Parameters<typeof HeadlessAccordion.Trigger>[0]['children']}
    </HeadlessAccordion.Trigger>
  );
}

/** The collapsible panel - themed content region; headless owns its visibility. */
function AccordionContent({ children, forceMount }: AccordionContentProps) {
  return (
    <HeadlessAccordion.Content {...(forceMount !== undefined ? { forceMount } : {})}>
      <Box px="$space.4" py="$space.3" color="$colors.text.muted" fontSize="$fontSizes.sm">
        {children}
      </Box>
    </HeadlessAccordion.Content>
  );
}

/**
 * Themed accordion over the accessible headless `Accordion` (single/multiple
 * open, controlled or uncontrolled). Each trigger colours itself and flips its
 * chevron from `aria-expanded` via the `_expanded` pseudo-state, so the open
 * affordance is pure CSS.
 *
 * ```tsx
 * <Accordion.Root type="single" defaultValue={['a']}>
 *   <Accordion.Item value="a">
 *     <Accordion.Trigger>Shipping</Accordion.Trigger>
 *     <Accordion.Content>Ships in 2-3 days.</Accordion.Content>
 *   </Accordion.Item>
 * </Accordion.Root>
 * ```
 */
/**
 * Parts exported flat so `*.namespace.ts` can assemble the namespace in the
 * server graph. Internal: the barrel does not re-export these by name.
 */
export { AccordionContent, AccordionItem, AccordionRoot, AccordionTrigger };
