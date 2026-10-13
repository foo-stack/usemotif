import type { Meta, StoryObj } from '@storybook/react';
import { HStack, Label, VStack } from 'usemotif';
import { Radio, RadioGroup } from '@usemotif/ui';

const PLANS = ['Free', 'Pro', 'Team'] as const;

/** Radio and RadioGroup - themed native radios grouped by name. */
const meta = {
  title: 'Kit/Radio',
  component: RadioGroup,
  tags: ['autodocs'],
  args: { name: 'plan', defaultValue: 'Pro' },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A group with one option selected. */
export const Group: Story = {
  render: (args) => (
    <RadioGroup {...args}>
      <VStack gap="$2">
        {PLANS.map((plan) => (
          <HStack key={plan} gap="$2" alignItems="center">
            <Radio id={`plan-${plan}`} value={plan} />
            <Label htmlFor={`plan-${plan}`}>{plan}</Label>
          </HStack>
        ))}
      </VStack>
    </RadioGroup>
  ),
};

/** Disabled and invalid radios. */
export const States: Story = {
  render: () => (
    <HStack gap="$4">
      <HStack gap="$2" alignItems="center">
        <Radio id="r-disabled" name="states" disabled />
        <Label htmlFor="r-disabled">Disabled</Label>
      </HStack>
      <HStack gap="$2" alignItems="center">
        <Radio id="r-invalid" name="states" invalid />
        <Label htmlFor="r-invalid">Invalid</Label>
      </HStack>
    </HStack>
  ),
};
