'use client';

import {
  Popover as HeadlessPopover,
  type FloatingArrowProps,
  type PopoverContentProps,
} from '@usemotif/headless';
import { Box } from 'usemotif';

/**
 * Themed popover - the accessible headless `Popover` (trigger `aria-expanded`
 * wiring, floating positioning, Escape + click-outside dismissal) with a themed
 * floating surface.
 *
 * `Root`, `Trigger`, and `Close` are the headless parts unchanged; `Content`
 * wraps the positioned headless boundary around a themed `surface.raised` `Box`.
 *
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger><Button>Filters</Button></Popover.Trigger>
 *   <Popover.Content>
 *     ...controls...
 *     <Popover.Close><Button>Done</Button></Popover.Close>
 *   </Popover.Content>
 * </Popover.Root>
 * ```
 */
function PopoverContent({ children, ...rest }: PopoverContentProps) {
  return (
    <HeadlessPopover.Content {...rest}>
      <Box
        bg="$colors.surface.raised"
        color="$colors.text.default"
        borderWidth="$borderWidths.thin"
        borderColor="$colors.border.default"
        borderRadius="$radii.lg"
        p="$space.4"
        minWidth={200}
        maxWidth={320}
        boxShadow="0 8px 24px rgba(0, 0, 0, 0.18)"
      >
        {children}
      </Box>
    </HeadlessPopover.Content>
  );
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph. Internal: the barrel does not re-export these by name.
 */
/** The themed arrow: the surface's colour, with its border. Put it first inside `Popover.Content`. */
function PopoverArrow({ style, ...rest }: FloatingArrowProps) {
  return (
    <HeadlessPopover.Arrow
      size={10}
      borderColor="var(--colors-border-default, #d1d5db)"
      {...rest}
      style={{ background: 'var(--colors-surface-raised, #fff)', ...style }}
    />
  );
}

export { PopoverArrow, PopoverContent };
