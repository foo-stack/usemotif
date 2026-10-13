import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { SegmentedControl, type SegmentedControlOption } from '@usemotif/ui';

const VIEWS: readonly SegmentedControlOption[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

/** SegmentedControl - a single-choice row of segments. */
const meta = {
  title: 'Kit/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
  argTypes: { options: { control: false } },
  args: { options: VIEWS, defaultValue: 'week', 'aria-label': 'Calendar view' },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Each selection, and a disabled segment. */
export const States: Story = {
  render: () => (
    <VStack gap="$3" alignItems="flex-start">
      {VIEWS.map((v) => (
        <SegmentedControl
          key={v.value}
          options={VIEWS}
          defaultValue={v.value}
          aria-label={v.value}
        />
      ))}
      <SegmentedControl
        options={[...VIEWS, { value: 'year', label: 'Year', disabled: true }]}
        defaultValue="day"
        aria-label="With a disabled segment"
      />
    </VStack>
  ),
};
