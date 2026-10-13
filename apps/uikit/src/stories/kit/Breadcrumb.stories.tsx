import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { Breadcrumb } from '@usemotif/ui';

/**
 * Breadcrumb - the kit's themed trail. Items with an `href` are muted links;
 * the last item, with no `href`, is the current page.
 */
const meta: Meta<typeof Breadcrumb> = {
  title: 'Kit/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  argTypes: { separator: { control: 'text' }, children: { control: false } },
  args: { 'aria-label': 'Breadcrumb' },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** A three-level trail with the default chevron separator. */
export const Playground: Story = {
  render: (args) => (
    <Breadcrumb {...args}>
      <Breadcrumb.Item href="#">Home</Breadcrumb.Item>
      <Breadcrumb.Item href="#">Projects</Breadcrumb.Item>
      <Breadcrumb.Item>Motif</Breadcrumb.Item>
    </Breadcrumb>
  ),
};

/** Default separator, a custom separator, and a single item. */
export const Variants: Story = {
  render: () => (
    <VStack gap="$3" alignItems="flex-start">
      <Breadcrumb aria-label="Default">
        <Breadcrumb.Item href="#">Home</Breadcrumb.Item>
        <Breadcrumb.Item href="#">Settings</Breadcrumb.Item>
        <Breadcrumb.Item href="#">Team</Breadcrumb.Item>
        <Breadcrumb.Item>Members</Breadcrumb.Item>
      </Breadcrumb>
      <Breadcrumb aria-label="Slash separator" separator="/">
        <Breadcrumb.Item href="#">Docs</Breadcrumb.Item>
        <Breadcrumb.Item href="#">Guides</Breadcrumb.Item>
        <Breadcrumb.Item>Theming</Breadcrumb.Item>
      </Breadcrumb>
      <Breadcrumb aria-label="Single">
        <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
      </Breadcrumb>
    </VStack>
  ),
};
