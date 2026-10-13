import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { TimeInput } from '@usemotif/ui';

/** TimeInput - the kit's themed native time input, to the minute or second. */
const meta = {
  title: 'Kit/TimeInput',
  component: TimeInput,
  tags: ['autodocs'],
  argTypes: {
    precision: { control: 'inline-radio', options: ['minute', 'second'] },
    disabled: { control: 'boolean' },
  },
  args: { defaultValue: '09:30', precision: 'minute', 'aria-label': 'Start time' },
} satisfies Meta<typeof TimeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Minute and second precision, and disabled. */
export const States: Story = {
  render: () => (
    <VStack gap="$3" alignItems="flex-start">
      <TimeInput defaultValue="09:30" aria-label="Minutes" />
      <TimeInput defaultValue="09:30:15" precision="second" aria-label="Seconds" />
      <TimeInput defaultValue="18:00" disabled aria-label="Disabled" />
    </VStack>
  ),
};
