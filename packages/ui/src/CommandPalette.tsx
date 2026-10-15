'use client';

import {
  CommandPalette as HeadlessCommandPalette,
  useCommandPaletteShortcut,
  type Command,
  type CommandPaletteListProps,
  type CommandPaletteRootProps,
} from '@usemotif/headless';
import type { ReactNode } from 'react';
import { Box, Pressable } from 'usemotif';
import { ThemedInput } from './_themed-input.js';
import { platformText } from './_platform-text.js';
import { usePlatformStyle } from './_platform-style.js';

export type { Command };
export { useCommandPaletteShortcut };

export interface CommandPaletteProps extends Omit<CommandPaletteRootProps, 'children'> {
  /** Placeholder for the search input. Defaults to `'Type a command...'`. */
  readonly placeholder?: string;
  /** What to show when the filter matches nothing. */
  readonly emptyMessage?: ReactNode;
  /** Override how each command row renders. */
  readonly renderItem?: CommandPaletteListProps['renderItem'];
}

// Hoisted so the motion props are stable references across renders.
const PALETTE_ENTER = { opacity: 0, transform: 'translateY(-8px) scale(0.98)' } as const;
const PALETTE_TRANSITION = { duration: '$durations.2' } as const;

// The themed search input projected into the headless Input (which clones the
// combobox role / value / onChange / keyboard handlers onto it). Borderless -
// it's the panel's top row, with a hairline beneath it.
function themedInput(placeholder: string) {
  return (
    <ThemedInput
      width="100%"
      px="$space.4"
      py="$space.3"
      borderWidth={0}
      borderBottomWidth="$borderWidths.thin"
      borderBottomColor="$colors.border.default"
      bg="transparent"
      color="$colors.text.default"
      fontSize="$fontSizes.md"
      type="text"
      placeholder={placeholder}
    />
  );
}

const CRUMB_TEXT = { color: '$colors.text.muted', fontSize: '$fontSizes.sm' } as const;
const CURRENT_CRUMB_TEXT = {
  color: '$colors.text.default',
  fontSize: '$fontSizes.sm',
  fontWeight: '$fontWeights.semibold',
} as const;
const CRUMB_SEPARATOR = (
  <Box as="span" mr="$space.1" color="$colors.text.muted" fontSize="$fontSizes.sm">
    {platformText('/', CRUMB_TEXT)}
  </Box>
);
const CRUMBS_STYLE = { padding: '8px 16px 0' } as const;
const CRUMB_HOVER = { color: '$colors.text.default' } as const;

// Module-scoped so it's a stable `renderCrumb` reference. Earlier pages are
// buttons back to them; the current one is plain text.
function renderThemedCrumb(
  label: string,
  info: { current: boolean; depth: number; onSelect: () => void },
): ReactNode {
  if (info.current) {
    return (
      <Box
        as="span"
        fontSize="$fontSizes.sm"
        color="$colors.text.default"
        fontWeight="$fontWeights.semibold"
      >
        {platformText(label, CURRENT_CRUMB_TEXT)}
      </Box>
    );
  }
  return (
    <Pressable
      fontSize="$fontSizes.sm"
      color="$colors.text.muted"
      bg="transparent"
      borderWidth={0}
      p={0}
      mr="$space.1"
      _hover={CRUMB_HOVER}
      onPress={info.onSelect}
    >
      {platformText(label, CRUMB_TEXT)}
    </Pressable>
  );
}

// Module-scoped so it's a stable `renderItem` reference (lint: no-new-fn-as-prop).
// The headless List owns the role=option wrapper + activation; the kit paints the
// row (highlight, icon, label, shortcut hint).
function renderThemedCommand(
  command: Command,
  info: { highlighted: boolean; isRecent: boolean; index: number },
): ReactNode {
  const disabled = command.disabled === true;
  return (
    <Box
      display="flex"
      alignItems="center"
      gap="$space.3"
      px="$space.3"
      py="$space.2"
      m="$space.1"
      borderRadius="$radii.md"
      fontSize="$fontSizes.sm"
      bg={info.highlighted ? '$colors.surface.interactive' : 'transparent'}
      color={disabled ? '$colors.text.muted' : '$colors.text.default'}
      cursor={disabled ? 'not-allowed' : 'pointer'}
    >
      {command.icon !== undefined ? (
        <Box as="span" display="inline-flex" alignItems="center">
          {command.icon}
        </Box>
      ) : null}
      <Box as="span" flexGrow={1}>
        {platformText(command.label, {
          fontSize: '$fontSizes.sm',
          color: disabled ? '$colors.text.muted' : '$colors.text.default',
        })}
      </Box>
      {command.shortcut !== undefined ? (
        <Box as="span" color="$colors.text.muted" fontSize="$fontSizes.sm">
          {platformText(command.shortcut.join(' '), CRUMB_TEXT)}
        </Box>
      ) : null}
    </Box>
  );
}

/**
 * Themed command palette over the accessible headless `CommandPalette` - a
 * `⌘K`-style overlay (fuzzy filter, grouped sections, recents, full keyboard
 * nav, `role="combobox"` + `role="listbox"`) rendered inside the headless
 * `Dialog` (focus trap, scrim, Escape). The kit supplies the themed panel
 * surface, search input, and command rows; pass `renderItem` to fully own a row.
 *
 * Drive `open` yourself - `useCommandPaletteShortcut('mod+k', toggle)` (re-exported
 * here) wires the shortcut:
 *
 * ```tsx
 * const [open, setOpen] = useState(false);
 * useCommandPaletteShortcut('mod+k', () => setOpen((v) => !v));
 * <CommandPalette commands={commands} open={open} onOpenChange={setOpen} />
 * ```
 */
export function CommandPalette({
  placeholder = 'Type a command...',
  emptyMessage = 'No matching commands',
  renderItem,
  ...rootProps
}: CommandPaletteProps) {
  const platformStyle = usePlatformStyle();
  return (
    <HeadlessCommandPalette.Root {...rootProps}>
      <Box
        display="flex"
        flexDirection="column"
        width={560}
        maxWidth="92vw"
        maxHeight="70vh"
        overflow="hidden"
        bg="$colors.surface.raised"
        color="$colors.text.default"
        borderWidth="$borderWidths.thin"
        borderColor="$colors.border.default"
        borderRadius="$radii.lg"
        boxShadow="0 16px 48px rgba(0, 0, 0, 0.32)"
        enterStyle={PALETTE_ENTER}
        transition={PALETTE_TRANSITION}
      >
        <HeadlessCommandPalette.Breadcrumb
          renderCrumb={renderThemedCrumb}
          separator={CRUMB_SEPARATOR}
          style={platformStyle(CRUMBS_STYLE)}
        />
        <HeadlessCommandPalette.Input>
          {
            themedInput(placeholder) as NonNullable<
              Parameters<typeof HeadlessCommandPalette.Input>[0]['children']
            >
          }
        </HeadlessCommandPalette.Input>
        <Box overflow="auto" p="$space.1">
          <HeadlessCommandPalette.List
            renderItem={renderItem ?? renderThemedCommand}
            emptyMessage={emptyMessage}
          />
        </Box>
      </Box>
    </HeadlessCommandPalette.Root>
  );
}
