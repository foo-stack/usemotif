import type { Meta, StoryObj } from '@storybook/react';
import { Timeline, type TimelineItem } from '@usemotif/ui';

const ITEMS: readonly TimelineItem[] = [
  { id: 'created', title: 'Order placed', description: 'Paid by card.', time: '09:12' },
  { id: 'packed', title: 'Packed', time: '11:40', status: 'success' },
  {
    id: 'delayed',
    title: 'Courier delayed',
    description: 'Weather on route.',
    time: '14:05',
    status: 'warning',
  },
  { id: 'failed', title: 'Delivery attempt failed', time: '17:30', status: 'danger' },
];

/**
 * Timeline - a vertical list of events, each with an optional description,
 * time, and a `status` that colours its dot.
 */
const meta = {
  title: 'Kit/Timeline',
  component: Timeline,
  tags: ['autodocs'],
  argTypes: { items: { control: false } },
  args: { items: ITEMS },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One item per status. */
export const Statuses: Story = {};

/** Titles only, no descriptions or times. */
export const Minimal: Story = {
  args: {
    items: [
      { id: 'a', title: 'Draft' },
      { id: 'b', title: 'In review' },
      { id: 'c', title: 'Published', status: 'success' },
    ],
  },
};
