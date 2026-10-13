import type { Meta, StoryObj } from '@storybook/react';
import { HStack, Label, VStack } from 'usemotif';
import { Checkbox } from '@usemotif/ui';

/** Checkbox - the kit's themed native checkbox, with an `invalid` state. */
const meta = {
  title: 'Kit/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    defaultChecked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
  args: { defaultChecked: true, disabled: false, invalid: false, 'aria-label': 'Accept' },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Unchecked, checked, disabled, and invalid. */
export const States: Story = {
  render: () => (
    <VStack gap="$2">
      {(
        [
          ['Unchecked', {}],
          ['Checked', { defaultChecked: true }],
          ['Disabled', { disabled: true }],
          ['Disabled and checked', { disabled: true, defaultChecked: true }],
          ['Invalid', { invalid: true }],
        ] as const
      ).map(([label, props]) => (
        <HStack key={label} gap="$2" alignItems="center">
          <Checkbox id={`cb-${label}`} {...props} />
          <Label htmlFor={`cb-${label}`}>{label}</Label>
        </HStack>
      ))}
    </VStack>
  ),
};
