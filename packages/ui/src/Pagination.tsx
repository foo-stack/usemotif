'use client';

import { Pagination as HeadlessPagination } from '@usemotif/headless';
import type { ChangeEvent, CSSProperties, ReactElement } from 'react';
import { Box, type BoxProps, Pressable, useMessages } from 'usemotif';
import { isNative } from './_platform.js';
import { usePlatformStyle } from './_platform-style.js';
import { platformText } from './_platform-text.js';

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
const MUTED_TEXT = { color: '$colors.text.muted' } as const;
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
  return <ThemedPageItem {...info} />;
}

function ThemedPageItem(info: PageItemInfo): ReactElement {
  const messages = useMessages();
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
        {platformText('...', MUTED_TEXT)}
      </Box>
    );
  }
  const label = info.type === 'previous' ? '‹' : info.type === 'next' ? '›' : String(info.page);
  const color = info.selected
    ? '$colors.text.inverse'
    : info.disabled
      ? '$colors.text.muted'
      : '$colors.text.default';
  return (
    <Pressable
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
      color={color}
      {...(info.selected || info.disabled ? {} : { _hover: PAGE_HOVER })}
      disabled={info.disabled}
      onPress={info.onClick}
      {...(info.selected && info.type === 'page' ? { 'aria-current': 'page' as const } : {})}
      {...(info.type === 'previous'
        ? { 'aria-label': messages.previousPage }
        : info.type === 'next'
          ? { 'aria-label': messages.nextPage }
          : {})}
    >
      {platformText(label, { color, fontSize: '$fontSizes.sm' })}
    </Pressable>
  );
}

interface PageSizeInfo {
  readonly pageSize: number;
  readonly options: readonly number[];
  readonly onChange: (size: number) => void;
}

function renderThemedPageSize(info: PageSizeInfo): ReactElement {
  return <ThemedPageSize {...info} />;
}

function ThemedPageSize(info: PageSizeInfo): ReactElement {
  const messages = useMessages();
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
        'aria-label': messages.itemsPerPage,
        value: info.pageSize,
        onChange: (e: ChangeEvent<HTMLSelectElement>) =>
          info.onChange(Number(e.currentTarget.value)),
      } as unknown as BoxProps)}
    >
      {info.options.map((n) => (
        <option key={n} value={n}>
          {messages.perPage(n)}
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
  const platformStyle = usePlatformStyle();
  const sizing =
    pageSize !== undefined && onPageSizeChange !== undefined
      ? // The size picker is a web <select>; native gets the pages alone.
        isNative
        ? {}
        : { pageSize, pageSizeOptions, onPageSizeChange, renderPageSize: renderThemedPageSize }
      : {};
  return (
    <HeadlessPagination
      page={page}
      total={total}
      siblings={siblings}
      boundaries={boundaries}
      renderItem={renderThemedPageItem}
      {...sizing}
      style={platformStyle(NAV_STYLE)}
      {...(onPageChange !== undefined ? { onPageChange } : {})}
      {...(aria['aria-label'] !== undefined ? { 'aria-label': aria['aria-label'] } : {})}
    />
  );
}
