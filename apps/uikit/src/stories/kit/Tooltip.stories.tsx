import type { Meta, StoryObj } from '@storybook/react';
import { Button, HStack } from 'usemotif';
import { Tooltip } from '@usemotif/ui';

/**
 * Tooltip - the kit's themed hint bubble on the inverse surface, opened by
 * hovering or focusing the trigger. `Root` takes `openDelay`, `closeDelay`
 * and `placement`.
 */
const meta = {
  title: 'Kit/Tooltip',
  component: Tooltip.Root,
  tags: ['autodocs'],
  argTypes: {
    placement: { control: 'inline-radio', options: ['top', 'bottom', 'left', 'right'] },
    openDelay: { control: 'number' },
    closeDelay: { control: 'number' },
  },
  args: { placement: 'top', openDelay: 150, closeDelay: 200 },
} satisfies Meta<typeof Tooltip.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Hover or focus the button to show the tooltip. `Tooltip.Root` has no
 * `defaultOpen`, so the snapshot shows the closed trigger only.
 */
export const Playground: Story = {
  render: (args) => (
    <Tooltip.Root {...args}>
      <Tooltip.Trigger>
        <Button variant="outline">Save</Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Save changes (Mod S)</Tooltip.Content>
    </Tooltip.Root>
  ),
};

/** One trigger per placement. Closed in the snapshot, as above. */
export const Placements: Story = {
  render: () => (
    <HStack gap="$3">
      {(['top', 'bottom', 'left', 'right'] as const).map((placement) => (
        <Tooltip.Root key={placement} placement={placement} openDelay={150}>
          <Tooltip.Trigger>
            <Button variant="outline">{placement}</Button>
          </Tooltip.Trigger>
          <Tooltip.Content>Shown on the {placement}</Tooltip.Content>
        </Tooltip.Root>
      ))}
    </HStack>
  ),
};
