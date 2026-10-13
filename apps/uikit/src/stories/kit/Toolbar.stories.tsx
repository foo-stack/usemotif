import type { Meta, StoryObj } from '@storybook/react';
import { Button, HStack } from 'usemotif';
import { Toolbar } from '@usemotif/ui';
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline } from '@usemotif/icons';

/**
 * Toolbar - the kit's themed container for a row or column of controls, with
 * roving arrow-key focus across them.
 */
const meta = {
  title: 'Kit/Toolbar',
  component: Toolbar,
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    children: { control: false },
  },
  args: { orientation: 'horizontal', 'aria-label': 'Text formatting' },
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

function FormattingButtons() {
  return (
    <>
      <Button size="sm" variant="ghost" intent="neutral" aria-label="Bold">
        <Bold size="sm" />
      </Button>
      <Button size="sm" variant="ghost" intent="neutral" aria-label="Italic">
        <Italic size="sm" />
      </Button>
      <Button size="sm" variant="ghost" intent="neutral" aria-label="Underline">
        <Underline size="sm" />
      </Button>
    </>
  );
}

/** Text formatting buttons; arrow keys move focus. */
export const Playground: Story = {
  render: (args) => (
    <Toolbar {...args}>
      <FormattingButtons />
    </Toolbar>
  ),
};

/** Horizontal and vertical orientations. */
export const Orientations: Story = {
  render: () => (
    <HStack gap="$6" alignItems="flex-start">
      <Toolbar aria-label="Alignment">
        <Button size="sm" variant="ghost" intent="neutral" aria-label="Align left">
          <AlignLeft size="sm" />
        </Button>
        <Button size="sm" variant="ghost" intent="neutral" aria-label="Align center">
          <AlignCenter size="sm" />
        </Button>
        <Button size="sm" variant="ghost" intent="neutral" aria-label="Align right">
          <AlignRight size="sm" />
        </Button>
      </Toolbar>
      <Toolbar aria-label="Formatting" orientation="vertical">
        <FormattingButtons />
      </Toolbar>
    </HStack>
  ),
};
