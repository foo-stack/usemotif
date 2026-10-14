import type { Meta, StoryObj } from '@storybook/react';
import { Box } from 'usemotif';
import { Accordion } from '@usemotif/ui';

const ITEMS = [
  {
    value: 'shipping',
    title: 'How long does shipping take?',
    body: 'Orders ship within two working days.',
  },
  { value: 'returns', title: 'Can I return an item?', body: 'Yes, within 30 days of delivery.' },
  {
    value: 'support',
    title: 'How do I reach support?',
    body: 'Email us any time and we reply within a day.',
  },
] as const;

const TWO_OPEN = ['shipping', 'support'];

/**
 * Accordion - the kit's themed stack of disclosures. The open trigger takes
 * the primary colour and flips its chevron; `type` picks single or multiple.
 */
const meta: Meta<typeof Accordion.Root> = {
  title: 'Kit/Accordion',
  component: Accordion.Root,
  tags: ['autodocs'],
  argTypes: { type: { control: 'inline-radio', options: ['single', 'multiple'] } },
  args: { type: 'single', defaultValue: ['shipping'] },
};

export default meta;
type Story = StoryObj<typeof meta>;

function Items() {
  return (
    <>
      {ITEMS.map((item) => (
        <Accordion.Item key={item.value} value={item.value}>
          <Accordion.Trigger>{item.title}</Accordion.Trigger>
          <Accordion.Content>{item.body}</Accordion.Content>
        </Accordion.Item>
      ))}
    </>
  );
}

/** Single mode with the first item open. */
export const Playground: Story = {
  render: (args) => (
    <Box maxWidth={480}>
      <Accordion.Root {...args}>
        <Items />
      </Accordion.Root>
    </Box>
  ),
};

/** Multiple mode with two items open. */
export const Multiple: Story = {
  render: () => (
    <Box maxWidth={480}>
      <Accordion.Root type="multiple" defaultValue={TWO_OPEN}>
        <Items />
      </Accordion.Root>
    </Box>
  ),
};
