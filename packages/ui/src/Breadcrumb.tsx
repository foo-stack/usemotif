'use client';

import { Breadcrumb as HeadlessBreadcrumb, Menu as HeadlessMenu } from '@usemotif/headless';
import {
  Children,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Box, type BoxProps } from 'usemotif';
import { MenuContent, MenuItem } from './Menu.js';

const NAV_STYLE: CSSProperties = { fontSize: 14 };
const LINK_HOVER = { color: '$colors.text.default' } as const;

// A themed chevron between items (the headless wraps it in an aria-hidden span).
const SEPARATOR = (
  <Box as="span" px="$space.1" color="$colors.text.muted">
    ›
  </Box>
);

export interface BreadcrumbProps {
  readonly 'aria-label'?: string;
  /** Override the separator between items. Defaults to a muted chevron. */
  readonly separator?: ReactNode;
  /**
   * The most crumbs shown. Past it, the first crumb stays, the middle ones fold
   * into a `...` button that opens a menu of them, and the last `maxItems - 1`
   * stay. At least 2.
   */
  readonly maxItems?: number;
  /**
   * Follows a folded crumb chosen from the menu. Defaults to
   * `location.assign(href)`; pass your router's navigate for client-side routing.
   */
  readonly onNavigate?: (href: string) => void;
  readonly children?: ReactNode;
}

export interface BreadcrumbItemProps {
  /** Render the crumb as a link. Omit for the current (last) crumb. */
  readonly href?: string;
  readonly children?: ReactNode;
}

/** A crumb - a muted link when `href` is set, or emphasized current-page text. */
function BreadcrumbItem({ href, children }: BreadcrumbItemProps) {
  if (href === undefined) {
    return (
      <Box as="span" color="$colors.text.default" fontWeight={500}>
        {children}
      </Box>
    );
  }
  return (
    <Box
      as="a"
      color="$colors.text.muted"
      cursor="pointer"
      _hover={LINK_HOVER}
      // `href` goes to the underlying <a>; Box's element typing is generic
      // HTMLElement, so cast past it.
      {...({ href, style: { textDecoration: 'none' } } as unknown as BoxProps)}
    >
      {children}
    </Box>
  );
}

/**
 * Themed breadcrumb trail over the accessible headless `Breadcrumb` (a `nav`
 * landmark + ordered list, `aria-current="page"` on the last crumb). Use
 * `Breadcrumb.Item` for each crumb.
 *
 * ```tsx
 * <Breadcrumb>
 *   <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
 *   <Breadcrumb.Item href="/library">Library</Breadcrumb.Item>
 *   <Breadcrumb.Item>Data</Breadcrumb.Item>
 * </Breadcrumb>
 * ```
 */
function BreadcrumbRoot({
  separator = SEPARATOR,
  maxItems,
  onNavigate = assignLocation,
  children,
  ...rest
}: BreadcrumbProps) {
  const items = Children.toArray(children).filter(isValidElement);
  const keep = maxItems === undefined ? items.length : Math.max(2, maxItems);
  const crumbs =
    items.length > keep
      ? [
          items[0],
          <FoldedCrumbs
            key="folded"
            items={items.slice(1, items.length - keep + 1)}
            onNavigate={onNavigate}
          />,
          ...items.slice(items.length - keep + 1),
        ]
      : children;
  return (
    <HeadlessBreadcrumb
      separator={separator}
      style={NAV_STYLE}
      {...(rest['aria-label'] !== undefined ? { 'aria-label': rest['aria-label'] } : {})}
    >
      {crumbs}
    </HeadlessBreadcrumb>
  );
}

function assignLocation(href: string): void {
  window.location.assign(href);
}

const FOLD_HOVER = { bg: '$colors.surface.interactive', color: '$colors.text.default' } as const;

/** The `...` button standing in for the middle crumbs, opening a menu of them. */
function FoldedCrumbs({
  items,
  onNavigate,
}: {
  items: ReadonlyArray<ReactElement>;
  onNavigate: (href: string) => void;
}): ReactElement {
  return (
    <HeadlessMenu.Root>
      <HeadlessMenu.Trigger>
        <Box
          as="button"
          px="$space.1"
          borderWidth={0}
          borderRadius="$radii.sm"
          bg="transparent"
          color="$colors.text.muted"
          cursor="pointer"
          _hover={FOLD_HOVER}
          {...({ type: 'button', 'aria-label': 'Show hidden breadcrumbs' } as unknown as BoxProps)}
        >
          ...
        </Box>
      </HeadlessMenu.Trigger>
      <MenuContent>
        {items.map((item, i) => {
          const { href, children } = item.props as BreadcrumbItemProps;
          return (
            <MenuItem
              key={item.key ?? i}
              {...(href !== undefined ? { onSelect: () => onNavigate(href) } : { disabled: true })}
            >
              {children}
            </MenuItem>
          );
        })}
      </MenuContent>
    </HeadlessMenu.Root>
  );
}

/** Parts exported flat for the namespace module. Internal. */
export { BreadcrumbItem, BreadcrumbRoot };
