import type { ReactNode } from 'react';
import { Box, Text } from 'usemotif';

export type TimelineStatus = 'default' | 'success' | 'warning' | 'danger';

export interface TimelineItem {
  readonly id: string;
  /** Event headline. */
  readonly title: ReactNode;
  /** Supporting detail under the title. */
  readonly description?: ReactNode;
  /** Timestamp / meta shown beside the title. */
  readonly time?: ReactNode;
  /** Marker tone - `default` uses the primary accent; the rest use status tokens. */
  readonly status?: TimelineStatus;
  /** Shown in a ring in place of the marker dot, in the marker's colour. */
  readonly icon?: ReactNode;
}

export interface TimelineProps {
  readonly items: ReadonlyArray<TimelineItem>;
  /**
   * `single` (the default) keeps every event to the right of the line.
   * `alternate` puts them on either side from the `md` breakpoint up, and falls
   * back to one column below it.
   */
  readonly layout?: 'single' | 'alternate';
}

// Alternate rows are a grid: marker then content below `md`, and content,
// marker, content from `md` up, with each event in one of the side columns.
const ALTERNATE_COLUMNS = { base: 'auto 1fr', md: '1fr auto 1fr' } as const;
const MARKER_COLUMN = { base: '1', md: '2' } as const;
const LEFT_COLUMN = { base: '2', md: '1' } as const;
const RIGHT_COLUMN = { base: '2', md: '3' } as const;
const LEFT_ALIGN = { base: 'flex-start', md: 'flex-end' } as const;
const LEFT_TEXT = { base: 'start', md: 'end' } as const;

/**
 * A themed vertical timeline - a marker dot + connector line per event, with a
 * title, optional timestamp, and detail. Pure presentational (Box + Text, no
 * headless), so it hugs the display floor.
 *
 * ```tsx
 * <Timeline
 *   items={[
 *     { id: 'a', title: 'Order placed', time: '09:30', status: 'success' },
 *     { id: 'b', title: 'Out for delivery', time: '14:10' },
 *   ]}
 * />
 * <Timeline layout="alternate" items={releases} />
 * ```
 */
export function Timeline({ items, layout = 'single' }: TimelineProps) {
  const alternate = layout === 'alternate';
  return (
    <Box display="flex" flexDirection="column">
      {items.map((item, i) => {
        const left = alternate && i % 2 === 0;
        const last = i === items.length - 1;
        const dotColor =
          item.status !== undefined && item.status !== 'default'
            ? `$colors.status.${item.status}.fg`
            : '$colors.action.primary.bg';
        return (
          <Box
            key={item.id}
            columnGap="$space.3"
            {...(alternate
              ? { display: 'grid', gridTemplateColumns: ALTERNATE_COLUMNS }
              : { display: 'flex', flexDirection: 'row' })}
          >
            {/* Marker column: a dot (or the item's icon), then a connector to the next event. */}
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              {...(alternate && { gridColumn: MARKER_COLUMN, gridRow: '1' })}
            >
              {item.icon !== undefined ? (
                <Box
                  width={24}
                  height={24}
                  flexShrink={0}
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="$radii.full"
                  borderWidth={2}
                  borderStyle="solid"
                  borderColor={dotColor}
                  color={dotColor}
                >
                  {item.icon}
                </Box>
              ) : (
                <Box
                  width={12}
                  height={12}
                  mt={4}
                  flexShrink={0}
                  borderRadius="$radii.full"
                  bg={dotColor}
                />
              )}
              {!last ? (
                <Box width={2} flexGrow={1} minHeight={16} mt={2} bg="$colors.border.default" />
              ) : null}
            </Box>
            <Box
              display="flex"
              flexDirection="column"
              gap="$space.1"
              pb={last ? 0 : '$space.4'}
              {...(alternate && {
                gridColumn: left ? LEFT_COLUMN : RIGHT_COLUMN,
                gridRow: '1',
                ...(left && { alignItems: LEFT_ALIGN, textAlign: LEFT_TEXT }),
              })}
            >
              <Box display="flex" flexDirection="row" alignItems="baseline" gap="$space.2">
                <Text fontWeight="$fontWeights.semibold" color="$colors.text.default">
                  {item.title}
                </Text>
                {item.time !== undefined ? (
                  <Text fontSize="$fontSizes.sm" color="$colors.text.muted">
                    {item.time}
                  </Text>
                ) : null}
              </Box>
              {item.description !== undefined ? (
                <Text fontSize="$fontSizes.sm" color="$colors.text.muted">
                  {item.description}
                </Text>
              ) : null}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
