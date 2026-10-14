import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { NavigationMenu } from '@usemotif/ui';

/**
 * NavigationMenu - the kit's themed site navigation. The item matching
 * `current` takes the primary colour and `aria-current="page"`.
 */
const meta: Meta<typeof NavigationMenu> = {
  title: 'Kit/NavigationMenu',
  component: NavigationMenu,
  tags: ['autodocs'],
  argTypes: {
    current: { control: 'inline-radio', options: ['home', 'docs', 'blog', 'about'] },
    children: { control: false },
  },
  args: { current: 'docs', 'aria-label': 'Main' },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Link items, one current. */
export const Playground: Story = {
  render: (args) => (
    <NavigationMenu {...args}>
      <NavigationMenu.Item id="home" href="#">
        Home
      </NavigationMenu.Item>
      <NavigationMenu.Item id="docs" href="#">
        Docs
      </NavigationMenu.Item>
      <NavigationMenu.Item id="blog" href="#">
        Blog
      </NavigationMenu.Item>
      <NavigationMenu.Item id="about" href="#">
        About
      </NavigationMenu.Item>
    </NavigationMenu>
  ),
};

/** Links with a current item, button items, and no current item. */
export const Variants: Story = {
  render: () => (
    <VStack gap="$3" alignItems="flex-start">
      <NavigationMenu current="home" aria-label="Links">
        <NavigationMenu.Item id="home" href="#">
          Home
        </NavigationMenu.Item>
        <NavigationMenu.Item id="pricing" href="#">
          Pricing
        </NavigationMenu.Item>
        <NavigationMenu.Item id="contact" href="#">
          Contact
        </NavigationMenu.Item>
      </NavigationMenu>
      <NavigationMenu current="inbox" aria-label="Buttons">
        <NavigationMenu.Item id="inbox">Inbox</NavigationMenu.Item>
        <NavigationMenu.Item id="sent">Sent</NavigationMenu.Item>
        <NavigationMenu.Item id="archive">Archive</NavigationMenu.Item>
      </NavigationMenu>
      <NavigationMenu aria-label="No current">
        <NavigationMenu.Item id="a" href="#">
          Overview
        </NavigationMenu.Item>
        <NavigationMenu.Item id="b" href="#">
          Reports
        </NavigationMenu.Item>
      </NavigationMenu>
    </VStack>
  ),
};
