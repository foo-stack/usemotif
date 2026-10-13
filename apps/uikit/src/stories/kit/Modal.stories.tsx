import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button, HStack } from 'usemotif';
import { Modal } from '@usemotif/ui';

/**
 * Modal - the kit's themed dialog. Raised surface, title, description and
 * enter motion over the headless Dialog; adapts to a bottom sheet below `sm`.
 */
const meta = {
  title: 'Kit/Modal',
  component: Modal.Root,
  tags: ['autodocs'],
} satisfies Meta<typeof Modal.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

function ModalBody() {
  return (
    <Modal.Content>
      <Modal.Title>Invite teammates</Modal.Title>
      <Modal.Description>
        New members get read access to every project in this workspace.
      </Modal.Description>
      <HStack gap="$2" justifyContent="flex-end">
        <Modal.Close>
          <Button variant="outline" intent="neutral">
            Cancel
          </Button>
        </Modal.Close>
        <Modal.Close>
          <Button>Send invites</Button>
        </Modal.Close>
      </HStack>
    </Modal.Content>
  );
}

/** Click the trigger to open the modal. */
export const Playground: Story = {
  render: () => (
    <Modal.Root>
      <Modal.Trigger>
        <Button>Open modal</Button>
      </Modal.Trigger>
      <ModalBody />
    </Modal.Root>
  ),
};

/** Open on mount via `defaultOpen`. */
export const DefaultOpen: Story = {
  render: () => (
    <Box pb={260}>
      <Modal.Root defaultOpen>
        <Modal.Trigger>
          <Button>Open modal</Button>
        </Modal.Trigger>
        <ModalBody />
      </Modal.Root>
    </Box>
  ),
};
