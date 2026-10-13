import type { Meta, StoryObj } from '@storybook/react';
import { Input, VStack } from 'usemotif';
import { FormField } from '@usemotif/ui';

/**
 * FormField - a label, control, help text, and error message wired together
 * with `aria-describedby`, `aria-invalid`, and `aria-required`.
 */
const meta = {
  title: 'Kit/FormField',
  component: FormField,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    help: { control: 'text' },
    error: { control: 'text' },
    required: { control: 'boolean' },
    children: { control: false },
  },
  args: {
    label: 'Email',
    help: 'We never share it.',
    required: false,
    children: <Input placeholder="you@example.com" />,
  },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Help, error, and required states side by side. */
export const States: Story = {
  render: () => (
    <VStack gap="$4" maxWidth={360}>
      <FormField label="Name">
        <Input placeholder="Plain field" />
      </FormField>
      <FormField label="Email" help="We never share it.">
        <Input placeholder="you@example.com" />
      </FormField>
      <FormField label="Password" required error="Must be at least 12 characters.">
        <Input type="password" defaultValue="short" />
      </FormField>
    </VStack>
  ),
};
