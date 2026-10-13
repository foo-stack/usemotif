import type { Meta, StoryObj } from '@storybook/react';
import { Button, VStack } from 'usemotif';
import { Banner, type BannerIntent } from '@usemotif/ui';
import { Info } from '@usemotif/icons';

const INTENTS: readonly BannerIntent[] = ['neutral', 'info', 'success', 'warning', 'danger'];

/**
 * Banner - a full-width notice with an optional action and a dismiss button
 * shown when `onDismiss` is passed.
 */
const meta = {
  title: 'Kit/Banner',
  component: Banner,
  tags: ['autodocs'],
  argTypes: {
    intent: { control: 'inline-radio', options: INTENTS },
    title: { control: 'text' },
    children: { control: 'text' },
    icon: { control: false },
    action: { control: false },
    onDismiss: { control: false },
  },
  args: {
    intent: 'info',
    title: 'Scheduled maintenance',
    children: 'The dashboard will be read-only on Sunday from 02:00 to 03:00 UTC.',
  },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Every intent, plus the icon, action, and dismiss slots. */
export const Intents: Story = {
  render: () => (
    <VStack gap="$3">
      {INTENTS.map((intent) => (
        <Banner key={intent} intent={intent} title={`${intent} banner`}>
          Body copy for the {intent} intent.
        </Banner>
      ))}
      <Banner
        intent="info"
        icon={<Info size="sm" />}
        title="New version available"
        action={
          <Button size="sm" variant="outline">
            Reload
          </Button>
        }
        onDismiss={() => {}}
      >
        Reload to get the latest changes.
      </Banner>
    </VStack>
  ),
};
