import type { Meta, StoryObj } from '@storybook/react';
import { VStack } from 'usemotif';
import { Pagination } from '@usemotif/ui';

/**
 * Pagination - the kit's themed page picker. The current page fills with the
 * primary colour; the window collapses to an ellipsis past `siblings`.
 */
const meta = {
  title: 'Kit/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  argTypes: {
    page: { control: { type: 'number', min: 1 } },
    total: { control: { type: 'number', min: 1 } },
    siblings: { control: { type: 'number', min: 0 } },
  },
  args: { page: 4, total: 10, siblings: 1, 'aria-label': 'Pagination' },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** First, middle and last page, plus a short range with no ellipsis. */
export const States: Story = {
  render: () => (
    <VStack gap="$3" alignItems="flex-start">
      <Pagination page={1} total={10} aria-label="First page" />
      <Pagination page={5} total={10} aria-label="Middle page" />
      <Pagination page={10} total={10} aria-label="Last page" />
      <Pagination page={2} total={4} aria-label="Short range" />
    </VStack>
  ),
};
