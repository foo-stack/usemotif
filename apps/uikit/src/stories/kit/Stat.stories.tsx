import type { Meta, StoryObj } from '@storybook/react';
import { HStack } from 'usemotif';
import { Stat, type StatTrend } from '@usemotif/ui';

const TRENDS: readonly StatTrend[] = ['up', 'down', 'neutral'];

/**
 * Stat - a labelled figure with an optional delta coloured by `trend` and a
 * line of help text.
 */
const meta = {
  title: 'Kit/Stat',
  component: Stat,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    delta: { control: 'text' },
    trend: { control: 'inline-radio', options: TRENDS },
    helpText: { control: 'text' },
  },
  args: {
    label: 'Revenue',
    value: '$48,200',
    delta: '12%',
    trend: 'up',
    helpText: 'vs. last month',
  },
} satisfies Meta<typeof Stat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Each trend, and a bare value with no delta. */
export const Trends: Story = {
  render: () => (
    <HStack gap="$6" flexWrap="wrap">
      {TRENDS.map((trend) => (
        <Stat key={trend} label={`Trend ${trend}`} value="1,284" delta="4.2%" trend={trend} />
      ))}
      <Stat label="Active users" value="312" helpText="right now" />
    </HStack>
  ),
};
