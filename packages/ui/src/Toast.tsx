'use client';

import {
  Toaster as HeadlessToaster,
  useToast,
  type ToastItem,
  type ToasterProps,
} from '@usemotif/headless';
import { Box, Text } from 'usemotif';

export { useToast };
export type { ToastItem };

/** One themed toast card. The headless default list wraps it in a `Toast`,
 * which supplies the `role` / live-region semantics, placement, pausing, and
 * swiping; the `Box` is the visible, re-themable surface. */
function renderThemedToast(item: ToastItem) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      gap="$space.1"
      minWidth={260}
      maxWidth={380}
      p="$space.4"
      bg="$colors.surface.raised"
      color="$colors.text.default"
      borderRadius="$radii.md"
      borderWidth="$borderWidths.thin"
      borderColor="$colors.border.muted"
      boxShadow="0 10px 30px rgba(0, 0, 0, 0.18)"
    >
      {item.title !== undefined && item.title !== null ? (
        <Text fontWeight="$fontWeights.semibold">{item.title}</Text>
      ) : null}
      {item.description !== undefined && item.description !== null ? (
        <Text fontSize="$fontSizes.sm" color="$colors.text.muted">
          {item.description}
        </Text>
      ) : null}
      {item.action ?? null}
    </Box>
  );
}

export interface ThemedToasterProps extends Omit<
  ToasterProps,
  'renderToasts' | 'renderToast' | 'style'
> {}

/**
 * A themed toaster. Mount it once near your app root, then push toasts from
 * anywhere with `useToast()`:
 *
 * ```tsx
 * <Toaster>
 *   <App />
 * </Toaster>
 *
 * // inside a component:
 * const { toast } = useToast();
 * <Button onPress={() => toast({ title: 'Saved' })}>Save</Button>;
 * ```
 *
 * Each toast is a themed `surface.raised` card; the headless layer keeps the
 * `role="alert"` / `role="status"` live-region semantics and auto-dismiss.
 */
export function Toaster(props: ThemedToasterProps) {
  return <HeadlessToaster {...props} renderToast={renderThemedToast} />;
}
