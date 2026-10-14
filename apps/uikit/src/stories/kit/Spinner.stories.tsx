import type { Meta, StoryObj } from '@storybook/react';
import { HStack } from 'usemotif';
import { Spinner } from '@usemotif/ui';

const SIZES = [12, 16, 24, 32, 48] as const;

/**
 * Spinner - an indeterminate loading indicator sized in pixels. The rotation
 * honours reduced motion.
 */
const meta = {
  title: 'Kit/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  argTypes: { size: { control: { type: 'range', min: 8, max: 64, step: 4 } } },
  args: { size: 24 },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** A range of sizes. */
export const Sizes: Story = {
  render: () => (
    <HStack gap="$4" alignItems="center">
      {SIZES.map((size) => (
        <Spinner key={size} size={size} />
      ))}
    </HStack>
  ),
};
