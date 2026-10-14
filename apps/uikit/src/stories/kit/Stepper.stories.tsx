import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { Stepper, type StepperStep } from '@usemotif/ui';

const STEPS: readonly StepperStep[] = [
  { id: 'account', label: 'Account' },
  { id: 'profile', label: 'Profile' },
  { id: 'billing', label: 'Billing' },
  { id: 'review', label: 'Review' },
];

const WITH_STATUS: readonly StepperStep[] = [
  { id: 'account', label: 'Account', status: 'complete' },
  { id: 'profile', label: 'Profile', status: 'complete' },
  { id: 'billing', label: 'Billing', status: 'error' },
  { id: 'review', label: 'Review', status: 'pending' },
];

/**
 * Stepper - the kit's themed progress through a sequence. Each circle
 * recolours by status: active, complete, error or pending.
 */
const meta = {
  title: 'Kit/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  argTypes: {
    steps: { control: false },
    current: { control: 'inline-radio', options: STEPS.map((s) => s.id) },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
  },
  args: { steps: STEPS, current: 'profile', orientation: 'horizontal' },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Per-step statuses horizontally, and the vertical orientation. */
export const States: Story = {
  render: () => (
    <VStack gap="$6" alignItems="flex-start">
      <Stepper steps={WITH_STATUS} />
      <Stepper steps={STEPS} current="billing" orientation="vertical" />
    </VStack>
  ),
};
