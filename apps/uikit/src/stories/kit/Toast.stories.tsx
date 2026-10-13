import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useRef } from 'react';
import { Button, HStack } from 'usemotif';
import { Toaster, useToast } from '@usemotif/ui';

/**
 * Toast - the kit's themed notifications. Mount `<Toaster>` once, then call
 * `toast({...})` from `useToast()` anywhere inside it. Cards stack in the
 * bottom-right corner.
 */
const meta = {
  title: 'Kit/Toast',
  component: Toaster,
  tags: ['autodocs'],
  argTypes: { defaultDuration: { control: 'number' } },
  args: { defaultDuration: 5000 },
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

function ToastButtons() {
  const { toast } = useToast();
  return (
    <HStack gap="$3">
      <Button onClick={() => toast({ title: 'Saved', description: 'Your draft is up to date.' })}>
        Show toast
      </Button>
      <Button
        intent="danger"
        onClick={() =>
          toast({
            title: 'Upload failed',
            description: 'The file is over the 10 MB limit.',
            type: 'foreground',
          })
        }
      >
        Show error toast
      </Button>
    </HStack>
  );
}

/** Fires three toasts once on mount, so the stack is visible without a click. */
function MountToasts() {
  const { toast } = useToast();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    toast({ title: 'Saved', description: 'Your draft is up to date.' });
    toast({ title: 'Invite sent', description: 'Ada will get an email shortly.' });
    toast({
      title: 'Upload failed',
      description: 'The file is over the 10 MB limit.',
      type: 'foreground',
    });
  }, [toast]);
  return null;
}

/** Click a button to queue a toast. */
export const Playground: Story = {
  render: (args) => (
    <Toaster {...args}>
      <ToastButtons />
    </Toaster>
  ),
};

/** Three toasts stacked, with `defaultDuration={Infinity}` so none auto-dismiss. */
export const Stack: Story = {
  render: () => (
    <Toaster defaultDuration={Infinity}>
      <MountToasts />
    </Toaster>
  ),
};
