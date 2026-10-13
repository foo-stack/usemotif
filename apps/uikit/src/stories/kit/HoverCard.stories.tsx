import type { Meta, StoryObj } from '@storybook/react';
import { Button, HStack, Text, VStack } from 'usemotif';
import { HoverCard } from '@usemotif/ui';

/**
 * HoverCard - the kit's themed preview card, opened by hovering or focusing
 * the trigger. `Root` takes `openDelay`, `closeDelay` and `placement`.
 */
const meta = {
  title: 'Kit/HoverCard',
  component: HoverCard.Root,
  tags: ['autodocs'],
  argTypes: {
    placement: { control: 'inline-radio', options: ['top', 'bottom', 'left', 'right'] },
    openDelay: { control: 'number' },
    closeDelay: { control: 'number' },
  },
  args: { placement: 'bottom', openDelay: 150, closeDelay: 200 },
} satisfies Meta<typeof HoverCard.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Hover or focus the trigger to open the card. `HoverCard.Root` has no
 * `defaultOpen`, so the snapshot shows the closed trigger only.
 */
export const Playground: Story = {
  render: (args) => (
    <HoverCard.Root {...args}>
      <HoverCard.Trigger>
        <Button variant="ghost">@ada</Button>
      </HoverCard.Trigger>
      <HoverCard.Content>
        <VStack gap="$1" alignItems="flex-start">
          <Text fontWeight="$fontWeights.semibold">Ada Lovelace</Text>
          <Text fontSize="$fontSizes.sm" color="$colors.text.muted">
            Writes the analytical engine notes. Joined in 1843.
          </Text>
        </VStack>
      </HoverCard.Content>
    </HoverCard.Root>
  ),
};

/** One trigger per placement. Closed in the snapshot, as above. */
export const Placements: Story = {
  render: () => (
    <HStack gap="$3">
      {(['top', 'bottom', 'left', 'right'] as const).map((placement) => (
        <HoverCard.Root key={placement} placement={placement} openDelay={150}>
          <HoverCard.Trigger>
            <Button variant="outline">{placement}</Button>
          </HoverCard.Trigger>
          <HoverCard.Content>
            <Text fontSize="$fontSizes.sm">Opens on the {placement} side.</Text>
          </HoverCard.Content>
        </HoverCard.Root>
      ))}
    </HStack>
  ),
};
