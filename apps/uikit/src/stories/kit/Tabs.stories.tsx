import type { Meta, StoryObj } from '@storybook/react';
import { Text, VStack } from 'usemotif';
import { Tabs } from '@usemotif/ui';

/**
 * Tabs - the kit's themed tab list. The active tab takes the primary colour
 * and underline from `aria-selected`; arrow keys move between tabs.
 */
const meta = {
  title: 'Kit/Tabs',
  component: Tabs.Root,
  tags: ['autodocs'],
  args: { defaultValue: 'overview' },
} satisfies Meta<typeof Tabs.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three tabs, the first selected. */
export const Playground: Story = {
  render: (args) => (
    <Tabs.Root {...args}>
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="activity">Activity</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview">
        <Text>Project summary and recent highlights.</Text>
      </Tabs.Panel>
      <Tabs.Panel value="activity">
        <Text>Every change, newest first.</Text>
      </Tabs.Panel>
      <Tabs.Panel value="settings">
        <Text>Name, visibility and members.</Text>
      </Tabs.Panel>
    </Tabs.Root>
  ),
};

/** A middle tab selected, and a disabled tab. */
export const States: Story = {
  render: () => (
    <VStack gap="$6" alignItems="stretch" maxWidth={520}>
      <Tabs.Root defaultValue="activity">
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="activity">Activity</Tabs.Tab>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview">
          <Text>Project summary.</Text>
        </Tabs.Panel>
        <Tabs.Panel value="activity">
          <Text>Activity is selected.</Text>
        </Tabs.Panel>
        <Tabs.Panel value="settings">
          <Text>Settings.</Text>
        </Tabs.Panel>
      </Tabs.Root>
      <Tabs.Root defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="billing" disabled>
            Billing
          </Tabs.Tab>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview">
          <Text>Billing is disabled.</Text>
        </Tabs.Panel>
        <Tabs.Panel value="billing">
          <Text>Billing.</Text>
        </Tabs.Panel>
        <Tabs.Panel value="settings">
          <Text>Settings.</Text>
        </Tabs.Panel>
      </Tabs.Root>
    </VStack>
  ),
};
