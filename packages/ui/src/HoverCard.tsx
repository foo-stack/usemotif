'use client';

import {
  HoverCard as HeadlessHoverCard,
  type FloatingArrowProps,
  type HoverCardContentProps,
} from '@usemotif/headless';
import { Box } from 'usemotif';

/**
 * Themed hover card - the accessible headless `HoverCard` (opens on hover or
 * focus after a grace delay, a hover-bridge keepalive so the cursor can travel
 * trigger → card, Escape to dismiss, non-modal `role="dialog"`) wrapped around a
 * themed floating surface. Use it for interactive preview content - profile
 * cards, link previews - where a `Tooltip` (non-interactive) wouldn't do.
 *
 * `Root` and `Trigger` are the headless parts unchanged; `Content` wraps the
 * positioned headless boundary around a themed `surface.raised` `Box`. Pass
 * `aria-label` so screen readers announce the card.
 *
 * ```tsx
 * <HoverCard.Root>
 *   <HoverCard.Trigger><a href="/u/jane">@jane</a></HoverCard.Trigger>
 *   <HoverCard.Content aria-label="Jane's profile">
 *     <Profile id="jane" />
 *   </HoverCard.Content>
 * </HoverCard.Root>
 * ```
 */
function HoverCardContent({ children, ...rest }: HoverCardContentProps) {
  return (
    <HeadlessHoverCard.Content {...rest}>
      <Box
        bg="$colors.surface.raised"
        color="$colors.text.default"
        borderWidth="$borderWidths.thin"
        borderColor="$colors.border.default"
        borderRadius="$radii.lg"
        p="$space.4"
        minWidth={240}
        maxWidth={360}
        boxShadow="0 8px 24px rgba(0, 0, 0, 0.18)"
      >
        {children}
      </Box>
    </HeadlessHoverCard.Content>
  );
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph. Internal: the barrel does not re-export these by name.
 */
/** The themed arrow: the surface's colour, with its border. Put it first inside `HoverCard.Content`. */
function HoverCardArrow({ style, ...rest }: FloatingArrowProps) {
  return (
    <HeadlessHoverCard.Arrow
      size={10}
      borderColor="var(--colors-border-default, #d1d5db)"
      {...rest}
      style={{ background: 'var(--colors-surface-raised, #fff)', ...style }}
    />
  );
}

export { HoverCardArrow, HoverCardContent };
