import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { Select } from '@usemotif/ui';
import { FRUITS } from './_options.js';

/** Select - the kit's themed single-choice dropdown. */
const meta = {
  title: 'Kit/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: { options: { control: false }, placeholder: { control: 'text' } },
  args: { options: FRUITS, placeholder: 'Pick a fruit' },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Placeholder only, and with a value chosen. */
export const States: Story = {
  render: () => (
    <VStack gap="$3" alignItems="flex-start">
      <Select options={FRUITS} placeholder="Pick a fruit" />
      <Select options={FRUITS} defaultValue="cherry" />
    </VStack>
  ),
};
