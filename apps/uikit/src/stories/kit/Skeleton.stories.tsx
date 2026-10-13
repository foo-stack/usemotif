import type { Meta, StoryObj } from '@storybook/react';
import { HStack, VStack } from 'usemotif';
import { Skeleton } from '@usemotif/ui';

/**
 * Skeleton - a pulsing placeholder block, or a circle with `circle`. The pulse
 * honours reduced motion.
 */
const meta = {
  title: 'Kit/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    width: { control: 'text' },
    height: { control: 'text' },
    circle: { control: 'boolean' },
  },
  args: { width: 240, height: 16, circle: false },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** A typical loading card: avatar circle beside text lines. */
export const Composition: Story = {
  render: () => (
    <HStack gap="$3" alignItems="flex-start">
      <Skeleton circle width={48} height={48} />
      <VStack gap="$2">
        <Skeleton width={220} height={14} />
        <Skeleton width={180} height={14} />
        <Skeleton width={120} height={14} />
      </VStack>
    </HStack>
  ),
};
