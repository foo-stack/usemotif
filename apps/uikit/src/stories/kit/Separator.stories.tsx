import type { Meta, StoryObj } from '@storybook/react';
import { HStack, Text, VStack } from 'usemotif';
import { Separator } from '@usemotif/ui';

/** Separator - a thin rule between content, horizontal or vertical. */
const meta = {
  title: 'Kit/Separator',
  component: Separator,
  tags: ['autodocs'],
  argTypes: { orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] } },
  args: { orientation: 'horizontal' },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Between stacked blocks. */
export const Horizontal: Story = {
  render: () => (
    <VStack gap="$3" maxWidth={320}>
      <Text>Above</Text>
      <Separator />
      <Text>Below</Text>
    </VStack>
  ),
};

/** Between inline items. */
export const Vertical: Story = {
  render: () => (
    <HStack gap="$3" height={24} alignItems="center">
      <Text>Docs</Text>
      <Separator orientation="vertical" />
      <Text>Blog</Text>
      <Separator orientation="vertical" />
      <Text>About</Text>
    </HStack>
  ),
};
