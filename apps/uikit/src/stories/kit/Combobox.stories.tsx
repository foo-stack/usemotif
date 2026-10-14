import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { Combobox, Search } from '@usemotif/ui';
import { FRUITS } from './_options.js';

/**
 * Combobox and Search - the kit's themed type-to-filter inputs. Search is the
 * same list with a search affordance.
 */
const meta = {
  title: 'Kit/Combobox',
  component: Combobox,
  tags: ['autodocs'],
  argTypes: { options: { control: false }, placeholder: { control: 'text' } },
  args: { options: FRUITS, placeholder: 'Find a fruit' },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Combobox empty and with a value, and Search. */
export const Variants: Story = {
  render: () => (
    <VStack gap="$3" alignItems="flex-start">
      <Combobox options={FRUITS} placeholder="Find a fruit" />
      <Combobox options={FRUITS} defaultValue="banana" />
      <Search options={FRUITS} placeholder="Search fruits" />
    </VStack>
  ),
};
