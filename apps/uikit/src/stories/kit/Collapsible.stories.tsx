import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { Collapsible } from '@usemotif/ui';

/**
 * Collapsible - the kit's themed single disclosure: a bordered trigger with a
 * chevron that reveals one region of content.
 */
const meta: Meta<typeof Collapsible.Root> = {
  title: 'Kit/Collapsible',
  component: Collapsible.Root,
  tags: ['autodocs'],
  argTypes: { defaultOpen: { control: 'boolean' } },
  args: { defaultOpen: false },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Click the trigger to toggle the content. */
export const Playground: Story = {
  render: (args) => (
    <VStack maxWidth={480} alignItems="stretch">
      <Collapsible.Root {...args}>
        <Collapsible.Trigger>Advanced options</Collapsible.Trigger>
        <Collapsible.Content>Cache size, retry count and request timeout.</Collapsible.Content>
      </Collapsible.Root>
    </VStack>
  ),
};

/** Closed, and open via `defaultOpen`. */
export const States: Story = {
  render: () => (
    <VStack gap="$3" maxWidth={480} alignItems="stretch">
      <Collapsible.Root>
        <Collapsible.Trigger>Closed</Collapsible.Trigger>
        <Collapsible.Content>Hidden until opened.</Collapsible.Content>
      </Collapsible.Root>
      <Collapsible.Root defaultOpen>
        <Collapsible.Trigger>Open</Collapsible.Trigger>
        <Collapsible.Content>Visible on mount via defaultOpen.</Collapsible.Content>
      </Collapsible.Root>
    </VStack>
  ),
};
