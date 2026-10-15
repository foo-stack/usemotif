'use client';

import { Pagination as HeadlessPagination } from '@usemotif/headless';
import type { ChangeEvent, CSSProperties, ReactElement } from 'react';
import { Box, type BoxProps } from 'usemotif';

export interface PaginationProps {
  /** Current page (1-based). Controlled. */
  readonly page: number;
  /** Total page count. */
  readonly total: number;
  readonly onPageChange?: (next: number) => void;
  /** Sibling pages shown on each side of the current page. Default 1. */
  readonly siblings?: number;
  /** Pages always shown at each end. Default 1. */
  readonly boundaries?: number;
  /** Items per page. With `onPageSizeChange`, shows a page-size select after the controls. */
  readonly pageSize?: number;
  /** Sizes the select offers. Default `[10, 20, 50]`. */
  readonly pageSizeOptions?: readonly number[];
  /** Receives the chosen size and the page that keeps the current first item in view. */
  readonly onPageSizeChange?: (size: number, page: number) => void;
  readonly 'aria-label'?: string;
}

const DEFAULT_PAGE_SIZES: readonly number[] = [10, 20, 50];

const NAV_STYLE: CSSProperties = { display: 'flex', alignItems: 'center', gap: 4 };
const PAGE_HOVER = { bg: '$colors.surface.interactive' } as const;

interface PageItemInfo {
  readonly type: 'page' | 'previous' | 'next' | 'ellipsis';
  readonly page?: number;
  readonly disabled: boolean;
  readonly selected: boolean;
  readonly onClick: () => void;
}

// Module-scoped so it's a stable `renderItem` reference (lint: no-new-fn-as-prop).
// The headless Pagination computes the page window + each item's state and calls
// this for prev / next / ellipsis / page; the kit just paints them.
function renderThemedPageItem(info: PageItemInfo): ReactElement {
  if (info.type === 'ellipsis') {
    return (
      <Box
        as="span"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        minWidth={36}
        height={36}
        color="$colors.text.muted"
      >
        ...
      </Box>
    );
  }
  const label = info.type === 'previous' ? '‹' : info.type === 'next' ? '›' : String(info.page);
  return (
    <Box
      as="button"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      minWidth={36}
      height={36}
      px="$space.2"
      borderWidth={0}
      borderRadius="$radii.md"
      fontSize="$fontSizes.sm"
      cursor={info.disabled ? 'not-allowed' : 'pointer'}
      bg={info.selected ? '$colors.action.primary.bg' : 'transparent'}
      color={
        info.selected
          ? '$colors.text.inverse'
          : info.disabled
            ? '$colors.text.muted'
            : '$colors.text.default'
      }
      {...(info.selected || info.disabled ? {} : { _hover: PAGE_HOVER })}
      // `type`/`disabled`/`onClick`/`aria-current` go to the underlying <button>;
      // Box's element typing is for a generic HTMLElement, so cast past it.
      {...({
        type: 'button',
        disabled: info.disabled,
        onClick: info.onClick,
        ...(info.selected && info.type === 'page' ? { 'aria-current': 'page' } : {}),
      } as unknown as BoxProps)}
    >
      {label}
    </Box>
  );
}

interface PageSizeInfo {
  readonly pageSize: number;
  readonly options: readonly number[];
  readonly onChange: (size: number) => void;
}

function renderThemedPageSize(info: PageSizeInfo): ReactElement {
  return (
    <Box
      as="select"
      ml="$space.2"
      height={36}
      px="$space.2"
      borderWidth={1}
      borderStyle="solid"
      borderColor="$colors.border.default"
      borderRadius="$radii.md"
      bg="$colors.surface.raised"
      color="$colors.text.default"
      fontSize="$fontSizes.sm"
      {...({
        'aria-label': 'Items per page',
        value: info.pageSize,
        onChange: (e: ChangeEvent<HTMLSelectElement>) =>
          info.onChange(Number(e.currentTarget.value)),
      } as unknown as BoxProps)}
    >
      {info.options.map((n) => (
        <option key={n} value={n}>
          {n} / page
        </option>
      ))}
    </Box>
  );
}

/**
 * Themed pagination over the accessible headless `Pagination` (page-window math
 * with ellipses, prev/next, `aria-current="page"` on the active page). Controlled
 * via `page` + `onPageChange`.
 *
 * ```tsx
 * <Pagination page={page} total={20} onPageChange={setPage} />
 * ```
 */
export function Pagination({
  page,
  total,
  onPageChange,
  siblings = 1,
  boundaries = 1,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  onPageSizeChange,
  ...aria
}: PaginationProps) {
  const sizing =
    pageSize !== undefined && onPageSizeChange !== undefined
      ? { pageSize, pageSizeOptions, onPageSizeChange, renderPageSize: renderThemedPageSize }
      : {};
  return (
    <HeadlessPagination
      page={page}
      total={total}
      siblings={siblings}
      boundaries={boundaries}
      renderItem={renderThemedPageItem}
      {...sizing}
      style={NAV_STYLE}
      {...(onPageChange !== undefined ? { onPageChange } : {})}
      {...(aria['aria-label'] !== undefined ? { 'aria-label': aria['aria-label'] } : {})}
    />
  );
}
