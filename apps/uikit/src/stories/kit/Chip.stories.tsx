import type { Meta, StoryObj } from '@storybook/react';
import { HStack } from 'usemotif';
import { Chip, type ChipIntent } from '@usemotif/ui';
import { Tag } from '@usemotif/icons';

const INTENTS: readonly ChipIntent[] = ['neutral', 'primary'];

/**
 * Chip - a compact pill with an optional leading icon and a remove button
 * shown when `onRemove` is passed.
 */
const meta = {
  title: 'Kit/Chip',
  component: Chip,
  tags: ['autodocs'],
  argTypes: {
    intent: { control: 'inline-radio', options: INTENTS },
    children: { control: 'text' },
    icon: { control: false },
    onRemove: { control: false },
  },
  args: { intent: 'neutral', children: 'design' },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Each intent, plain, with an icon, and removable. */
export const Variants: Story = {
  render: () => (
    <HStack gap="$2" flexWrap="wrap">
      {INTENTS.flatMap((intent) => [
        <Chip key={`${intent}-plain`} intent={intent}>
          {intent}
        </Chip>,
        <Chip key={`${intent}-icon`} intent={intent} icon={<Tag size="xs" />}>
          with icon
        </Chip>,
        <Chip key={`${intent}-remove`} intent={intent} onRemove={() => {}}>
          removable
        </Chip>,
      ])}
    </HStack>
  ),
};
