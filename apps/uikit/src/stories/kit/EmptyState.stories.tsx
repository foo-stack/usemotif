import type { Meta, StoryObj } from '@storybook/react';
import { Button } from 'usemotif';
import { EmptyState } from '@usemotif/ui';
import { Inbox } from '@usemotif/icons';

/**
 * EmptyState - the placeholder for a list or view with nothing in it: an
 * icon, a title, an optional description, and an optional action.
 */
const meta = {
  title: 'Kit/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    icon: { control: false },
    action: { control: false },
  },
  args: {
    title: 'No messages',
    description: 'New messages will show up here.',
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** All slots filled. */
export const Complete: Story = {
  args: {
    icon: <Inbox size="xl" />,
    title: 'Your inbox is empty',
    description: 'When someone sends you a message it will appear here.',
    action: <Button size="sm">Compose</Button>,
  },
};

/** Title only. */
export const TitleOnly: Story = {
  args: { title: 'Nothing here yet', description: undefined },
};
