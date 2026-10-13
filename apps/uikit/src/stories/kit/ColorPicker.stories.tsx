import type { Meta, StoryObj } from '@storybook/react';
import { HStack } from 'usemotif';
import { ColorPicker } from '@usemotif/ui';

/** ColorPicker - the kit's themed saturation, hue, and optional alpha picker. */
const meta = {
  title: 'Kit/ColorPicker',
  component: ColorPicker,
  tags: ['autodocs'],
  argTypes: {
    format: { control: 'inline-radio', options: ['hex', 'rgb', 'hsl'] },
    allowAlpha: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: { defaultValue: '#2563eb', format: 'hex', allowAlpha: false },
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** With alpha in rgb, and disabled. */
export const Variants: Story = {
  render: () => (
    <HStack gap="$6" alignItems="flex-start">
      <ColorPicker defaultValue="rgba(22, 163, 74, 0.6)" format="rgb" allowAlpha />
      <ColorPicker defaultValue="#dc2626" disabled />
    </HStack>
  ),
};
