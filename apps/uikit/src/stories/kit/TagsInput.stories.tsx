import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { TagsInput } from '@usemotif/ui';

const TOPICS = ['react', 'react-native', 'typescript', 'vite', 'vue'];
const PICKED = ['react', 'typescript'];

/**
 * TagsInput - entries become removable chips. Enter or a comma adds what was
 * typed, a paste adds every entry, Backspace removes the last chip.
 */
const meta = {
  title: 'Kit/TagsInput',
  component: TagsInput,
  tags: ['autodocs'],
  args: { 'aria-label': 'Topics', placeholder: 'Add a topic' },
} satisfies Meta<typeof TagsInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { args: { suggestions: TOPICS } };

/** Empty, filled, and disabled. */
export const States: Story = {
  render: () => (
    <VStack gap="$4" alignItems="flex-start">
      <TagsInput aria-label="Empty" placeholder="Add a topic" />
      <TagsInput aria-label="Filled" defaultValue={PICKED} placeholder="Add a topic" />
      <TagsInput aria-label="Disabled" defaultValue={PICKED} disabled />
    </VStack>
  ),
};
