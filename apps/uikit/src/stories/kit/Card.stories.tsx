import type { Meta, StoryObj } from '@storybook/react';
import { HStack, Heading, Paragraph } from 'usemotif';
import { Card } from '@usemotif/ui';

const ELEVATIONS = ['flat', 'raised'] as const;
const PADDINGS = ['none', 'sm', 'md', 'lg'] as const;

/**
 * Card - a surface container, `styled(Box)` over `cardRecipe`, with
 * `elevation` and `padding` variants.
 */
const meta: Meta<typeof Card> = {
  title: 'Kit/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    elevation: { control: 'inline-radio', options: ELEVATIONS },
    padding: { control: 'inline-radio', options: PADDINGS },
  },
  args: { elevation: 'raised', padding: 'md' },
};

export default meta;
type Story = StoryObj<typeof meta>;

function Body({ label }: { label: string }) {
  return (
    <>
      <Heading level={4} mt={0} mb="$1">
        {label}
      </Heading>
      <Paragraph mt={0} mb={0}>
        Card body copy.
      </Paragraph>
    </>
  );
}

export const Playground: Story = {
  render: (args) => (
    <Card {...args} maxWidth={320}>
      <Body label="Card" />
    </Card>
  ),
};

/** Both elevations across every padding step. */
export const Variants: Story = {
  render: () => (
    <HStack gap="$3" flexWrap="wrap" alignItems="flex-start">
      {ELEVATIONS.flatMap((elevation) =>
        PADDINGS.map((padding) => (
          <Card key={`${elevation}-${padding}`} elevation={elevation} padding={padding} width={200}>
            <Body label={`${elevation} / ${padding}`} />
          </Card>
        )),
      )}
    </HStack>
  ),
};
