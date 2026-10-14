import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { Alert, type AlertIntent } from '@usemotif/ui';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from '@usemotif/icons';

const INTENTS: readonly AlertIntent[] = ['neutral', 'info', 'success', 'warning', 'danger'];

/**
 * Alert - a themed message box tinted by `intent`, with an optional title and
 * leading icon. Announced with `role="alert"`.
 */
const meta = {
  title: 'Kit/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    intent: { control: 'inline-radio', options: INTENTS },
    title: { control: 'text' },
    icon: { control: false },
    children: { control: 'text' },
  },
  args: {
    intent: 'info',
    title: 'Heads up',
    children: 'Your trial ends in three days.',
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Every intent, with and without an icon. */
export const Intents: Story = {
  render: () => (
    <VStack gap="$3" maxWidth={480}>
      {INTENTS.map((intent) => (
        <Alert key={intent} intent={intent} title={`${intent} alert`}>
          Body copy for the {intent} intent.
        </Alert>
      ))}
      <Alert intent="info" icon={<Info size="sm" />} title="With icon">
        Icons inherit the intent colour.
      </Alert>
      <Alert intent="success" icon={<CircleCheck size="sm" />} title="Saved" />
      <Alert intent="warning" icon={<TriangleAlert size="sm" />}>
        A warning with no title.
      </Alert>
      <Alert intent="danger" icon={<CircleAlert size="sm" />} title="Payment failed">
        Update your card and try again.
      </Alert>
    </VStack>
  ),
};
