import { cardRecipe } from '@usemotif/recipes';
import type { ReactElement } from 'react';
import { Box, styled, type BoxProps } from 'usemotif';
import { nativeText } from './_native-text.js';

/** Native Card: the web Card's root and parts, with bare text wrapped in `Text`. */
export const CardRoot = /* @__PURE__ */ styled(Box, cardRecipe);

const PART_X = '$space.4';
const BODY_TEXT = { color: '$colors.text.default' } as const;
const HEADER_TEXT = { color: '$colors.text.default', fontWeight: '$fontWeights.semibold' } as const;

export function CardHeader({ children, ...props }: BoxProps): ReactElement {
  return (
    <Box
      display="flex"
      flexDirection="row"
      alignItems="center"
      gap="$space.3"
      px={PART_X}
      pt="$space.4"
      {...props}
    >
      {nativeText(children, HEADER_TEXT)}
    </Box>
  );
}

export function CardBody({ children, ...props }: BoxProps): ReactElement {
  return (
    <Box display="flex" flexDirection="column" gap="$space.2" flexGrow={1} p={PART_X} {...props}>
      {nativeText(children, BODY_TEXT)}
    </Box>
  );
}

export function CardFooter({ children, ...props }: BoxProps): ReactElement {
  return (
    <Box
      display="flex"
      flexDirection="row"
      alignItems="center"
      justifyContent="flex-end"
      gap="$space.2"
      px={PART_X}
      pb="$space.4"
      {...props}
    >
      {nativeText(children, BODY_TEXT)}
    </Box>
  );
}

export function CardMedia(props: BoxProps): ReactElement {
  return <Box overflow="hidden" {...props} />;
}
