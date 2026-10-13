import type { Meta, StoryObj } from '@storybook/react';
import { HStack, Label, VStack } from 'usemotif';
import { Switch } from '@usemotif/ui';

/** Switch - the kit's themed toggle switch over a native checkbox. */
const meta = {
  title: 'Kit/Switch',
  component: Switch,
  tags: ['autodocs'],
  argTypes: {
    defaultChecked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
  args: { defaultChecked: false, disabled: false, invalid: false, 'aria-label': 'Notifications' },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Off, on, disabled, and invalid. */
export const States: Story = {
  render: () => (
    <VStack gap="$2">
      {(
        [
          ['Off', {}],
          ['On', { defaultChecked: true }],
          ['Disabled', { disabled: true }],
          ['Disabled and on', { disabled: true, defaultChecked: true }],
          ['Invalid', { invalid: true }],
        ] as const
      ).map(([label, props]) => (
        <HStack key={label} gap="$2" alignItems="center">
          <Switch id={`sw-${label}`} {...props} />
          <Label htmlFor={`sw-${label}`}>{label}</Label>
        </HStack>
      ))}
    </VStack>
  ),
};
