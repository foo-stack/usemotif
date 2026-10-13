import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { DatePicker } from '@usemotif/ui';

/** DatePicker - the kit's themed trigger that opens a Calendar in a popover. */
const meta = {
  title: 'Kit/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  argTypes: { placeholder: { control: 'text' } },
  args: { placeholder: 'Pick a date' },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Empty, and with a date chosen. */
export const States: Story = {
  render: () => (
    <VStack gap="$3" alignItems="flex-start">
      <DatePicker placeholder="Pick a date" />
      <DatePicker defaultValue={new Date(2026, 0, 15)} />
    </VStack>
  ),
};
