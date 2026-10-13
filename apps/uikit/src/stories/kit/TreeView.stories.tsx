import type { Meta, StoryObj } from '@storybook/react';
import { Box } from 'usemotif';
import { TreeView, type TreeNode } from '@usemotif/ui';

const FILES: readonly TreeNode[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      {
        id: 'components',
        label: 'components',
        children: [
          { id: 'button', label: 'Button.tsx' },
          { id: 'card', label: 'Card.tsx' },
        ],
      },
      { id: 'index', label: 'index.ts' },
    ],
  },
  {
    id: 'docs',
    label: 'docs',
    children: [{ id: 'readme', label: 'README.md' }],
  },
  { id: 'lockfile', label: 'yarn.lock', disabled: true },
  { id: 'package', label: 'package.json' },
];

const ALL_BRANCHES = ['src', 'components', 'docs'];

/**
 * TreeView - the kit's themed hierarchical list. Rows indent by depth, the
 * chevron toggles a branch, and the selected row fills with the primary colour.
 */
const meta = {
  title: 'Kit/TreeView',
  component: TreeView,
  tags: ['autodocs'],
  argTypes: { data: { control: false } },
  args: { data: FILES, defaultExpanded: ['src'], 'aria-label': 'Files' },
} satisfies Meta<typeof TreeView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Box maxWidth={320}>
      <TreeView {...args} />
    </Box>
  ),
};

/** Fully expanded, with a selected row and a disabled row. */
export const States: Story = {
  render: () => (
    <Box maxWidth={320}>
      <TreeView
        data={FILES}
        defaultExpanded={ALL_BRANCHES}
        defaultValue="card"
        aria-label="Files"
      />
    </Box>
  ),
};
