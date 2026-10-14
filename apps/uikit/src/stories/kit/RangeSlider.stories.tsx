import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
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
