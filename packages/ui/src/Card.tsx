import { cardRecipe } from '@usemotif/recipes';
import type { ReactElement } from 'react';
import { Box, styled, type BoxProps } from 'usemotif';

/**
 * Themed surface container. `elevation` (`flat` · `raised`) ×
 * `padding` (`none` · `sm` · `md` · `lg`), and `interactive` for a card that
 * is itself a link or button. Install-and-go - the recipe is already applied,
 * so you don't call `styled()` yourself.
 *
 * ```tsx
 * <Card elevation="raised" padding="lg">...</Card>
 * <Card as="a" href="/plans/pro" interactive>...</Card>
 * ```
 */
export const CardRoot = /* @__PURE__ */ styled(Box, cardRecipe);

// Each part pads itself, so compose them in a `padding="none"` card. Media
// runs edge to edge.
const PART_X = '$space.4';

/** The card's top row: a title, and anything beside it. */
export function CardHeader(props: BoxProps): ReactElement {
  return (
    <Box
      display="flex"
      alignItems="center"
      gap="$space.3"
      px={PART_X}
      pt="$space.4"
      fontWeight="$fontWeights.semibold"
      {...props}
    />
  );
}

/** The card's main content. Grows to fill the card's height. */
export function CardBody(props: BoxProps): ReactElement {
  return (
    <Box display="flex" flexDirection="column" gap="$space.2" flexGrow={1} p={PART_X} {...props} />
  );
}

/** The card's bottom row, for actions. Aligned to the end. */
export function CardFooter(props: BoxProps): ReactElement {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="flex-end"
      gap="$space.2"
      px={PART_X}
      pb="$space.4"
      {...props}
    />
  );
}

/** Edge-to-edge media, such as an image. Give the Card `overflow="hidden"` to clip its corners. */
export function CardMedia(props: BoxProps): ReactElement {
  return <Box display="block" overflow="hidden" {...props} />;
}
