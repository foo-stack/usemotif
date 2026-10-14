import type { Meta, StoryObj } from '@storybook/react';
import { HStack, VStack } from 'usemotif';
import { RangeSlider } from '@usemotif/ui';

/** RangeSlider - the kit's themed two-thumb slider for a range. */
const meta = {
  title: 'Kit/RangeSlider',
  component: RangeSlider,
  tags: ['autodocs'],
  argTypes: { disabled: { control: 'boolean' }, step: { control: 'number' } },
  args: { defaultValue: [20, 70], min: 0, max: 100, step: 1, 'aria-label': 'Price' },
} satisfies Meta<typeof RangeSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** A narrow range, a full range, and a disabled one. */
export const Values: Story = {
  render: () => (
    <VStack gap="$4">
      <RangeSlider defaultValue={[45, 55]} aria-label="Narrow" />
      <RangeSlider defaultValue={[0, 100]} aria-label="Full" />
      <RangeSlider defaultValue={[25, 75]} disabled aria-label="Disabled" />
    </VStack>
  ),
};

const PRICE_MARKS = [
  { value: 0, label: '$0' },
  { value: 50, label: '$50' },
  { value: 100, label: '$100' },
];

/** Upright tracks, one with labelled marks. */
export const Vertical: Story = {
  render: () => (
    <HStack gap="$8" alignItems="flex-start">
      <RangeSlider orientation="vertical" width={160} defaultValue={[20, 70]} aria-label="Level" />
      <RangeSlider
        orientation="vertical"
        width={160}
        defaultValue={[0, 50]}
        marks={PRICE_MARKS}
        aria-label="Price"
      />
    </HStack>
  ),
};
