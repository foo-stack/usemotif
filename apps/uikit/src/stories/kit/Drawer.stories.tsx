import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button, HStack } from 'usemotif';
import { Drawer, Sheet } from '@usemotif/ui';

/**
 * Drawer - the kit's themed side panel, anchored by `side` on `Content`.
 * Sheet is the same surface pinned to the bottom edge.
 */
const meta = {
  title: 'Kit/Drawer',
  component: Drawer.Root,
  tags: ['autodocs'],
} satisfies Meta<typeof Drawer.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click the trigger to open a right-anchored drawer. */
export const Playground: Story = {
  render: () => (
    <Drawer.Root>
      <Drawer.Trigger>
        <Button>Open drawer</Button>
      </Drawer.Trigger>
      <Drawer.Content side="right">
        <Drawer.Title>Filters</Drawer.Title>
        <Drawer.Description>Narrow the list by status and owner.</Drawer.Description>
        <HStack justifyContent="flex-end">
          <Drawer.Close>
            <Button variant="outline" intent="neutral">
              Done
            </Button>
          </Drawer.Close>
        </HStack>
      </Drawer.Content>
    </Drawer.Root>
  ),
};

/** Drawer open on mount via `defaultOpen`, anchored right. */
export const DefaultOpen: Story = {
  render: () => (
    <Box pb={260}>
      <Drawer.Root defaultOpen>
        <Drawer.Trigger>
          <Button>Open drawer</Button>
        </Drawer.Trigger>
        <Drawer.Content side="right">
          <Drawer.Title>Filters</Drawer.Title>
          <Drawer.Description>Narrow the list by status and owner.</Drawer.Description>
          <HStack justifyContent="flex-end">
            <Drawer.Close>
              <Button variant="outline" intent="neutral">
                Done
              </Button>
            </Drawer.Close>
          </HStack>
        </Drawer.Content>
      </Drawer.Root>
    </Box>
  ),
};

/** Sheet open on mount via `defaultOpen`, pinned to the bottom edge. */
export const SheetOpen: Story = {
  render: () => (
    <Box pb={260}>
      <Sheet.Root defaultOpen>
        <Sheet.Trigger>
          <Button>Open sheet</Button>
        </Sheet.Trigger>
        <Sheet.Content>
          <Sheet.Title>Share link</Sheet.Title>
          <Sheet.Description>Anyone with the link can view this board.</Sheet.Description>
          <HStack gap="$2" justifyContent="flex-end">
            <Sheet.Close>
              <Button variant="outline" intent="neutral">
                Cancel
              </Button>
            </Sheet.Close>
            <Sheet.Close>
              <Button>Copy link</Button>
            </Sheet.Close>
          </HStack>
        </Sheet.Content>
      </Sheet.Root>
    </Box>
  ),
};
