import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button, Text, VStack } from 'usemotif';
import { Popover } from '@usemotif/ui';

/**
 * Popover - the kit's themed floating panel, anchored to its trigger.
 * `Content` takes `placement`; Escape and an outside click dismiss it.
 */
const meta = {
  title: 'Kit/Popover',
  component: Popover.Root,
  tags: ['autodocs'],
} satisfies Meta<typeof Popover.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

function PopoverBody() {
  return (
    <Popover.Content placement="bottom">
      <VStack gap="$2" alignItems="flex-start">
        <Text fontWeight="$fontWeights.semibold">Storage</Text>
        <Text fontSize="$fontSizes.sm" color="$colors.text.muted">
          You have used 7.2 GB of your 10 GB plan.
        </Text>
        <Popover.Close>
          <Button size="sm" variant="outline" intent="neutral">
            Close
          </Button>
        </Popover.Close>
      </VStack>
    </Popover.Content>
  );
}

/** Click the trigger to open the panel. */
export const Playground: Story = {
  render: () => (
    <Popover.Root>
      <Popover.Trigger>
        <Button variant="outline">Storage</Button>
      </Popover.Trigger>
      <PopoverBody />
    </Popover.Root>
  ),
};

/** Open on mount via `defaultOpen`. */
export const DefaultOpen: Story = {
  render: () => (
    <Box pb={260} display="flex" justifyContent="center">
      <Popover.Root defaultOpen>
        <Popover.Trigger>
          <Button variant="outline">Storage</Button>
        </Popover.Trigger>
        <PopoverBody />
      </Popover.Root>
    </Box>
  ),
};
