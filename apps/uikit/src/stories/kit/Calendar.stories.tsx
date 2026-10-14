import type { Meta, StoryObj } from '@storybook/react';
import { Calendar } from '@usemotif/ui';

const SELECTED = new Date(2026, 0, 15);
const RANGE = { start: new Date(2026, 0, 12), end: new Date(2026, 0, 16) };

/** Calendar - the kit's themed month grid with keyboard navigation. */
const meta = {
  title: 'Kit/Calendar',
  component: Calendar,
  tags: ['autodocs'],
  argTypes: {
    weekStartsOn: { control: 'inline-radio', options: [0, 1] },
    locale: { control: 'text' },
  },
  args: { defaultValue: SELECTED, weekStartsOn: 0 },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Weekends disabled, weeks starting on Monday. */
export const DisabledWeekends: Story = {
  args: {
    weekStartsOn: 1,
    isDisabled: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
  },
};

/** `mode="range"`: the ends paint as selected and the days between take a tint. */
export const Range: Story = {
  render: () => <Calendar mode="range" defaultValue={RANGE} />,
};
