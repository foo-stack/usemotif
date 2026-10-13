import type { Meta, StoryObj } from '@storybook/react';
import { Box, Text } from 'usemotif';
import { ContextMenu } from '@usemotif/ui';

/**
 * ContextMenu - the kit's themed right-click menu, opened at the pointer.
 * `ContextMenu.Root` has no `open` or `defaultOpen`, so the snapshot shows
 * the trigger region only.
 */
const meta = {
  title: 'Kit/ContextMenu',
  component: ContextMenu.Root,
  tags: ['autodocs'],
} satisfies Meta<typeof ContextMenu.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

/** Right-click the region to open the menu. */
export const Playground: Story = {
  render: () => (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <Box
          height={160}
          maxWidth={420}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="$colors.surface.muted"
          borderRadius="$radii.md"
          borderWidth={1}
          borderStyle="dashed"
          borderColor="$colors.border.default"
        >
          <Text color="$colors.text.muted">Right-click anywhere here</Text>
        </Box>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item onSelect={noop}>Cut</ContextMenu.Item>
        <ContextMenu.Item onSelect={noop}>Copy</ContextMenu.Item>
        <ContextMenu.Item onSelect={noop} disabled>
          Paste
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item onSelect={noop}>Delete</ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  ),
};
