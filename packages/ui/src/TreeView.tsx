'use client';

import {
  TreeView as HeadlessTreeView,
  type MultiTreeViewProps as HeadlessMultiTreeViewProps,
  type TreeNode,
  type TreeNodeInfo,
  type TreeViewProps as HeadlessTreeViewProps,
} from '@usemotif/headless';
import { useMemo, type CSSProperties, type ReactElement } from 'react';
import { Box, Pressable, useMessages } from 'usemotif';
import { platformText } from './_platform-text.js';
import { usePlatformStyle } from './_platform-style.js';

export type { TreeNode };
interface KitTreeOverrides<T> {
  /** Override how each node row renders. */
  readonly renderNode?: (info: TreeNodeInfo<T>) => ReactElement;
  readonly style?: CSSProperties;
}
export type TreeViewProps<T = unknown> = Omit<HeadlessTreeViewProps<T>, 'renderNode' | 'style'> &
  KitTreeOverrides<T>;
/** A kit tree that selects several nodes. */
export type MultiTreeViewProps<T = unknown> = Omit<
  HeadlessMultiTreeViewProps<T>,
  'renderNode' | 'style'
> &
  KitTreeOverrides<T>;

// The headless tree applies this `style` to its role="tree" container. Token CSS
// vars (hex fallbacks), like the other inline-themed surfaces.
const TREE_STYLE: CSSProperties = {
  padding: '4px',
  borderRadius: 'var(--radii-lg, 12px)',
  border: '1px solid var(--colors-border-default, #d1d5db)',
  background: 'var(--colors-surface-raised, #fff)',
  color: 'var(--colors-text-default, #111)',
  font: 'inherit',
};

// Module-scoped so it's a stable `renderNode` reference (lint: no-new-fn-as-prop).
// The headless tree owns role=treeitem / aria-expanded / aria-selected / roving
// focus + keyboard; the kit paints the row (depth indent, disclosure chevron,
// selected fill). `select` / `toggle` come from the headless info, so attaching
// them is not a fresh closure. Row click selects; the chevron only toggles.
function renderThemedNode(info: TreeNodeInfo): ReactElement {
  return <ThemedNode {...info} />;
}

function ThemedNode(info: TreeNodeInfo): ReactElement {
  const messages = useMessages();
  const { node, depth, isExpanded, isSelected, isLoading, toggle, select } = info;
  const hasChildren =
    (node.children !== undefined && node.children.length > 0) || node.hasChildren === true;
  const disabled = node.disabled === true;
  const color = isSelected
    ? '$colors.text.inverse'
    : disabled
      ? '$colors.text.muted'
      : '$colors.text.default';
  return (
    <Pressable
      // A div on web, as before: the headless treeitem is the focusable element.
      as="div"
      display="flex"
      alignItems="center"
      gap="$space.1"
      pr="$space.2"
      py="$space.1"
      pl={depth * 16 + 8}
      borderRadius="$radii.md"
      fontSize="$fontSizes.sm"
      bg={isSelected ? '$colors.action.primary.bg' : 'transparent'}
      color={color}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      onPress={select}
    >
      {hasChildren ? (
        <Pressable
          as="span"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          width={16}
          color={isSelected ? '$colors.text.inverse' : '$colors.text.muted'}
          // The row selects on click; stop here so toggling does not also select.
          onPress={(e?: { stopPropagation?: () => void }) => {
            e?.stopPropagation?.();
            toggle();
          }}
        >
          {platformText(isExpanded ? '▾' : '▸', {
            color: isSelected ? '$colors.text.inverse' : '$colors.text.muted',
          })}
        </Pressable>
      ) : (
        <Box as="span" width={16} />
      )}
      <Box as="span">{platformText(node.label, { color, fontSize: '$fontSizes.sm' })}</Box>
      {isLoading ? (
        <Box as="span" ml="$space.2" fontSize="$fontSizes.xs" color="$colors.text.muted">
          {platformText(messages.loading, {
            color: '$colors.text.muted',
            fontSize: '$fontSizes.xs',
          })}
        </Box>
      ) : null}
    </Pressable>
  );
}

/**
 * Themed tree over the accessible headless `TreeView` - the ARIA tree pattern
 * (`role="tree"` / `role="treeitem"`, `aria-expanded` / `aria-selected`, roving
 * focus, arrow-key expand/collapse + navigation). The kit themes the surface and
 * paints each row (depth indent, a disclosure chevron, the selected fill); pass
 * your own `renderNode` to fully own a row. Controlled (`value` + `onValueChange`)
 * or uncontrolled, with `defaultExpanded` ids. `selectionMode="multiple"` selects
 * several nodes; `loadChildren` loads a `hasChildren` branch when it first opens.
 *
 * ```tsx
 * <TreeView data={tree} defaultExpanded={['src']} onValueChange={openFile} />
 * <TreeView data={tree} selectionMode="multiple" onValueChange={setPicked} />
 * ```
 */
export function TreeView<T>({
  style,
  renderNode,
  ...rest
}: TreeViewProps<T> | MultiTreeViewProps<T>): ReactElement {
  const platformStyle = usePlatformStyle();
  const mergedStyle = useMemo<CSSProperties>(
    () => (style !== undefined ? { ...TREE_STYLE, ...style } : TREE_STYLE),
    [style],
  );
  return (
    <HeadlessTreeView<T>
      {...(rest as HeadlessTreeViewProps<T> | HeadlessMultiTreeViewProps<T>)}
      style={platformStyle(mergedStyle)}
      renderNode={renderNode ?? (renderThemedNode as (info: TreeNodeInfo<T>) => ReactElement)}
    />
  );
}
