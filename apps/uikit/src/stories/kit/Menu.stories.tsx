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

/** A submenu row: hover it, or focus it and press ArrowRight, to open the nested menu. */
export const WithSubmenu: Story = {
  render: () => (
    <Box pb={260} display="flex" justifyContent="center">
      <Menu.Root defaultOpen>
        <Menu.Trigger>
          <Button>Actions</Button>
        </Menu.Trigger>
        <Menu.Content>
          <Menu.Item onSelect={noop}>Rename</Menu.Item>
          <Menu.Sub>
            <Menu.SubTrigger>Share</Menu.SubTrigger>
            <Menu.SubContent>
              <Menu.Item onSelect={noop}>Email link</Menu.Item>
              <Menu.Item onSelect={noop}>Copy link</Menu.Item>
            </Menu.SubContent>
          </Menu.Sub>
          <Menu.Separator />
          <Menu.Item onSelect={noop}>Delete</Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </Box>
  ),
};

/** Checkbox and radio rows with a label: the check and dot mark what is on. */
export const WithCheckboxAndRadio: Story = {
  render: () => (
    <Box pb={260} display="flex" justifyContent="center">
      <Menu.Root defaultOpen>
        <Menu.Trigger>
          <Button>View</Button>
        </Menu.Trigger>
        <Menu.Content>
          <Menu.CheckboxItem defaultChecked closeOnSelect={false}>
            Word wrap
          </Menu.CheckboxItem>
          <Menu.CheckboxItem closeOnSelect={false}>Minimap</Menu.CheckboxItem>
          <Menu.Separator />
          <Menu.Label>Sort by</Menu.Label>
          <Menu.RadioGroup defaultValue="name">
            <Menu.RadioItem value="name" closeOnSelect={false}>
              Name
            </Menu.RadioItem>
            <Menu.RadioItem value="date" closeOnSelect={false}>
              Date modified
            </Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Root>
    </Box>
  ),
};
