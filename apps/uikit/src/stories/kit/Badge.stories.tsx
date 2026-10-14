import type { Meta, StoryObj } from '@storybook/react';
import { HStack, VStack } from 'usemotif';
import { Badge } from '@usemotif/ui';

const INTENTS = ['neutral', 'primary', 'danger', 'success'] as const;
const SIZES = ['sm', 'md'] as const;

/**
 * Badge - a small status label, `styled(Box)` over `badgeRecipe`, with
 * `intent` and `size` variants.
 */
const meta = {
  title: 'Kit/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    intent: { control: 'inline-radio', options: INTENTS },
    size: { control: 'inline-radio', options: SIZES },
    children: { control: 'text' },
  },
  args: { intent: 'primary', size: 'md', children: 'New' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Every intent at both sizes. */
export const Variants: Story = {
  render: () => (
    <VStack gap="$3">
      {SIZES.map((size) => (
        <HStack key={size} gap="$2">
          {INTENTS.map((intent) => (
            <Badge key={intent} intent={intent} size={size}>
              {intent}
            </Badge>
          ))}
        </HStack>
      ))}
    </VStack>
  ),
};
