import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { AvatarGroup, type AvatarGroupItem } from '@usemotif/ui';

// Initials only: no network images, so the visual check stays deterministic.
const PEOPLE: readonly AvatarGroupItem[] = [
  { name: 'Ada Lovelace' },
  { name: 'Grace Hopper' },
  { name: 'Alan Turing' },
  { name: 'Katherine Johnson' },
  { name: 'Edsger Dijkstra' },
  { name: 'Barbara Liskov' },
];

const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

/**
 * AvatarGroup - overlapping avatars that collapse past `max` into a "+N"
 * counter. Avatars without `src` fall back to initials.
 */
const meta = {
  title: 'Kit/AvatarGroup',
  component: AvatarGroup,
  tags: ['autodocs'],
  argTypes: {
    avatars: { control: false },
    max: { control: { type: 'number', min: 1, max: 6 } },
    size: { control: 'inline-radio', options: SIZES },
  },
  args: { avatars: PEOPLE, max: 4, size: 'md' },
} satisfies Meta<typeof AvatarGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Every size, overflowing past three. */
export const Sizes: Story = {
  render: () => (
    <VStack gap="$3" alignItems="flex-start">
      {SIZES.map((size) => (
        <AvatarGroup key={size} avatars={PEOPLE} max={3} size={size} />
      ))}
    </VStack>
  ),
};

/** Fewer avatars than `max`, so no counter. */
export const NoOverflow: Story = {
  args: { avatars: PEOPLE.slice(0, 2), max: 4 },
};
