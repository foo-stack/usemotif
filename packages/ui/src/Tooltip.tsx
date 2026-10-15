'use client';

import {
  Tooltip as HeadlessTooltip,
  type FloatingArrowProps,
  type TooltipContentProps,
} from '@usemotif/headless';
import { Box } from 'usemotif';
import { platformText } from './_platform-text.js';

/**
 * Themed tooltip - the accessible headless `Tooltip` (hover/focus open with
 * delays, `aria-describedby` wiring, portal positioning) with a themed bubble.
 *
 * `Root` and `Trigger` are the headless parts unchanged; `Content` wraps the
 * positioned headless boundary around a themed `Box` - an inverse-surface
 * bubble that re-themes in light and dark.
 *
 * ```tsx
 * <Tooltip.Root>
 *   <Tooltip.Trigger><Button>Hover me</Button></Tooltip.Trigger>
 *   <Tooltip.Content>Saved automatically</Tooltip.Content>
 * </Tooltip.Root>
 * ```
 */
const TOOLTIP_TEXT = { color: '$colors.text.inverse', fontSize: '$fontSizes.sm' } as const;

function TooltipContent({ children, ...rest }: TooltipContentProps) {
  return (
    <HeadlessTooltip.Content {...rest}>
      <Box
        bg="$colors.surface.inverse"
        color="$colors.text.inverse"
        px="$space.3"
        py="$space.2"
        borderRadius="$radii.md"
        fontSize="$fontSizes.sm"
        maxWidth={240}
        boxShadow="0 4px 12px rgba(0, 0, 0, 0.25)"
      >
        {platformText(children, TOOLTIP_TEXT)}
      </Box>
    </HeadlessTooltip.Content>
  );
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph. Internal: the barrel does not re-export these by name.
 */
/** The themed arrow: the surface's colour. Put it first inside `Tooltip.Content`. */
function TooltipArrow({ style, ...rest }: FloatingArrowProps) {
  return (
    <HeadlessTooltip.Arrow
      size={10}
      {...rest}
      style={{ background: 'var(--colors-surface-inverse, #111827)', ...style }}
    />
  );
}

export { TooltipArrow, TooltipContent };
