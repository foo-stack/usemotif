import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button } from 'usemotif';
import { Menu } from '@usemotif/ui';

/**
 * Menu - the kit's themed action menu. Items highlight on hover and keyboard
 * focus; a disabled item is muted and skipped by arrow keys.
 */
const meta = {
  title: 'Kit/Menu',
  component: Menu.Root,
  tags: ['autodocs'],
} satisfies Meta<typeof Menu.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;

function MenuBody() {
  return (
    <Menu.Content>
      <Menu.Item onSelect={noop}>Rename</Menu.Item>
      <Menu.Item onSelect={noop}>Duplicate</Menu.Item>
      <Menu.Item onSelect={noop} disabled>
        Move to folder
      </Menu.Item>
      <Menu.Separator />
      <Menu.Item onSelect={noop}>Delete</Menu.Item>
    </Menu.Content>
  );
}

/** Click the trigger, then drive it with the keyboard. */
export const Playground: Story = {
  render: () => (
    <Menu.Root>
      <Menu.Trigger>
        <Button>Actions</Button>
      </Menu.Trigger>
      <MenuBody />
    </Menu.Root>
  ),
};

/** Open on mount via `defaultOpen`, with a disabled item and a separator. */
export const DefaultOpen: Story = {
  render: () => (
    <Box pb={260} display="flex" justifyContent="center">
      <Menu.Root defaultOpen>
        <Menu.Trigger>
          <Button>Actions</Button>
        </Menu.Trigger>
        <MenuBody />
      </Menu.Root>
    </Box>
  ),
};
