import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { MultiSelect } from '@usemotif/ui';
import { FRUITS } from './_options.js';

/** MultiSelect - the kit's themed multi-choice picker with removable tags. */
const meta = {
  title: 'Kit/MultiSelect',
  component: MultiSelect,
  tags: ['autodocs'],
  argTypes: { options: { control: false }, maxSelections: { control: 'number' } },
  args: { options: FRUITS, placeholder: 'Pick fruits' },
} satisfies Meta<typeof MultiSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Empty, with selections, and capped at two. */
export const States: Story = {
  render: () => (
    <VStack gap="$3" alignItems="flex-start">
      <MultiSelect options={FRUITS} placeholder="Pick fruits" />
      <MultiSelect options={FRUITS} defaultValue={['apple', 'cherry']} />
      <MultiSelect options={FRUITS} defaultValue={['banana', 'elderberry']} maxSelections={2} />
    </VStack>
  ),
};
