import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Box, Button } from 'usemotif';
import { CommandPalette, type Command } from '@usemotif/ui';
import { File, Folder, Moon, Search, Settings, User } from '@usemotif/icons';

const noop = () => undefined;

const COMMANDS: readonly Command[] = [
  {
    id: 'new-file',
    label: 'New file',
    section: 'Files',
    icon: <File size="sm" />,
    shortcut: ['Mod', 'N'],
    onSelect: noop,
  },
  {
    id: 'open-folder',
    label: 'Open folder',
    section: 'Files',
    icon: <Folder size="sm" />,
    onSelect: noop,
  },
  {
    id: 'search',
    label: 'Search everywhere',
    section: 'Files',
    icon: <Search size="sm" />,
    shortcut: ['Mod', 'P'],
    onSelect: noop,
  },
  {
    id: 'theme',
    label: 'Toggle dark mode',
    section: 'Preferences',
    icon: <Moon size="sm" />,
    onSelect: noop,
  },
  {
    id: 'settings',
    label: 'Open settings',
    section: 'Preferences',
    icon: <Settings size="sm" />,
    shortcut: ['Mod', ','],
    onSelect: noop,
  },
  {
    id: 'profile',
    label: 'Edit profile',
    section: 'Preferences',
    icon: <User size="sm" />,
    disabled: true,
    onSelect: noop,
  },
];

/**
 * CommandPalette - the kit's themed fuzzy-search command list: a borderless
 * input over sectioned rows with icons and shortcut hints.
 */
const meta = {
  title: 'Kit/CommandPalette',
  component: CommandPalette,
  tags: ['autodocs'],
  argTypes: { commands: { control: false }, placeholder: { control: 'text' } },
  args: { commands: COMMANDS, placeholder: 'Type a command...' },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click the button to open the palette; Escape closes it. */
export const Playground: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    return (
      <Box>
        <Button onClick={() => setOpen(true)}>Open palette</Button>
        <CommandPalette {...args} open={open} onOpenChange={setOpen} />
      </Box>
    );
  },
};

/** Open on mount via `defaultOpen`, with sections, icons, shortcuts and a disabled row. */
export const DefaultOpen: Story = {
  render: (args) => (
    <Box pb={260}>
      <CommandPalette {...args} defaultOpen />
    </Box>
  ),
};
