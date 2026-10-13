import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { RatingInput } from '@usemotif/ui';

/** RatingInput - the kit's themed star rating, with optional half steps. */
const meta = {
  title: 'Kit/RatingInput',
  component: RatingInput,
  tags: ['autodocs'],
  argTypes: {
    defaultValue: { control: { type: 'range', min: 0, max: 5, step: 0.5 } },
    count: { control: 'number' },
    allowHalf: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: { defaultValue: 3, count: 5, allowHalf: false, 'aria-label': 'Rating' },
} satisfies Meta<typeof RatingInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Empty, half step, ten stars, and disabled. */
export const Variants: Story = {
  render: () => (
    <VStack gap="$3" alignItems="flex-start">
      <RatingInput defaultValue={0} aria-label="Empty" />
      <RatingInput defaultValue={2.5} allowHalf aria-label="Half step" />
      <RatingInput defaultValue={7} count={10} aria-label="Ten stars" />
      <RatingInput defaultValue={4} disabled aria-label="Disabled" />
    </VStack>
  ),
};
