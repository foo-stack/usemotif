import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { Progress } from '@usemotif/ui';

const VALUES = [0, 25, 50, 75, 100] as const;

/**
 * Progress - the kit's themed linear bar over the headless Progress. Pass
 * `value={null}` for an indeterminate sweep, which honours reduced motion.
 */
const meta = {
  title: 'Kit/Progress',
  component: Progress,
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 5 } },
    max: { control: 'number' },
  },
  args: { value: 60, max: 100, 'aria-label': 'Upload progress' },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Determinate values from empty to full, then indeterminate. */
export const Values: Story = {
  render: () => (
    <VStack gap="$3" maxWidth={320}>
      {VALUES.map((value) => (
        <Progress key={value} value={value} aria-label={`${value} percent`} />
      ))}
      <Progress value={null} aria-label="Loading" />
    </VStack>
  ),
};
