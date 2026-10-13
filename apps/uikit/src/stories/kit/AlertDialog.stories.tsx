import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button, HStack } from 'usemotif';
import { AlertDialog } from '@usemotif/ui';

/**
 * AlertDialog - the kit's themed confirmation dialog. `role="alertdialog"`,
 * and a scrim click does not dismiss it, so the user must confirm or cancel.
 */
const meta = {
  title: 'Kit/AlertDialog',
  component: AlertDialog.Root,
  tags: ['autodocs'],
} satisfies Meta<typeof AlertDialog.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

function AlertDialogBody() {
  return (
    <AlertDialog.Content>
      <AlertDialog.Title>Delete project?</AlertDialog.Title>
      <AlertDialog.Description>
        This removes the project and its history. It cannot be undone.
      </AlertDialog.Description>
      <HStack gap="$2" justifyContent="flex-end">
        <AlertDialog.Close>
          <Button variant="outline" intent="neutral">
            Cancel
          </Button>
        </AlertDialog.Close>
        <AlertDialog.Close>
          <Button intent="danger">Delete</Button>
        </AlertDialog.Close>
      </HStack>
    </AlertDialog.Content>
  );
}

/** Click the trigger to open the confirmation. */
export const Playground: Story = {
  render: () => (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Button intent="danger">Delete project</Button>
      </AlertDialog.Trigger>
      <AlertDialogBody />
    </AlertDialog.Root>
  ),
};

/** Open on mount via `defaultOpen`. */
export const DefaultOpen: Story = {
  render: () => (
    <Box pb={260}>
      <AlertDialog.Root defaultOpen>
        <AlertDialog.Trigger>
          <Button intent="danger">Delete project</Button>
        </AlertDialog.Trigger>
        <AlertDialogBody />
      </AlertDialog.Root>
    </Box>
  ),
};
