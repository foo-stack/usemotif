import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { FileUpload } from '@usemotif/ui';

/** FileUpload - the kit's themed drop zone with a browse button. */
const meta = {
  title: 'Kit/FileUpload',
  component: FileUpload,
  tags: ['autodocs'],
  argTypes: {
    accept: { control: 'text' },
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: { accept: 'image/*', multiple: true, label: 'Drop images or browse' },
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Default label, a custom label, and disabled. */
export const States: Story = {
  render: () => (
    <VStack gap="$3" maxWidth={420}>
      <FileUpload />
      <FileUpload label="Drop a PDF here" accept="application/pdf" />
      <FileUpload disabled label="Uploads are disabled" />
    </VStack>
  ),
};
