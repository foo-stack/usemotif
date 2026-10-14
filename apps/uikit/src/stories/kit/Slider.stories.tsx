import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { Slider } from '@usemotif/ui';

/** Slider - the kit's themed single-thumb slider. */
const meta = {
  title: 'Kit/Slider',
  component: Slider,
  tags: ['autodocs'],
  argTypes: {
    defaultValue: { control: { type: 'range', min: 0, max: 100 } },
    step: { control: 'number' },
    disabled: { control: 'boolean' },
  },
  args: { defaultValue: 40, min: 0, max: 100, step: 1, 'aria-label': 'Volume' },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Empty, partway, full, and disabled. */
export const Values: Story = {
  render: () => (
    <VStack gap="$4">
      <Slider defaultValue={0} aria-label="Empty" />
      <Slider defaultValue={60} aria-label="Partway" />
      <Slider defaultValue={100} aria-label="Full" />
      <Slider defaultValue={30} disabled aria-label="Disabled" />
    </VStack>
  ),
};

const VOLUME_MARKS = [
  { value: 0, label: 'Mute' },
  { value: 25 },
  { value: 50, label: 'Half' },
  { value: 75 },
  { value: 100, label: 'Max' },
];

/** Ticks along the track, some labelled. */
export const WithMarks: Story = {
  render: () => <Slider defaultValue={50} marks={VOLUME_MARKS} aria-label="Volume" />,
};
