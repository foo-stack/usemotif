import { badgeRecipe } from '@usemotif/recipes';
import type { ReactElement } from 'react';
import { Box, styled } from 'usemotif';

const StyledBadge = /* @__PURE__ */ styled(Box, badgeRecipe);

export type BadgeProps = Omit<Parameters<typeof StyledBadge>[0], 'dot'> & {
  /** Shows this number. Above `max` it reads as `max+`, for example "99+". */
  readonly count?: number;
  /** The largest `count` shown in full. Defaults to 99. */
  readonly max?: number;
  /** A bare status dot instead of a pill. Give it a `label`. */
  readonly dot?: boolean;
  /** The accessible name, announced in place of the badge's content. A dot needs one. */
  readonly label?: string;
};

/**
 * Themed status pill. `intent` (`neutral` · `primary` · `danger` · `success`)
 * × `size` (`sm` · `md`). `count` shows a number with overflow past `max`, and
 * `dot` shrinks it to a labelled status dot.
 *
 * ```tsx
 * <Badge intent="success">Active</Badge>
 * <Badge intent="danger" count={unread} label={`${unread} unread`} />
 * <Badge intent="success" dot label="Online" />
 * ```
 */
export function Badge({
  count,
  max = 99,
  dot,
  label,
  children,
  ...rest
}: BadgeProps): ReactElement {
  const content =
    dot === true
      ? null
      : count !== undefined
        ? count > max
          ? `${max}+`
          : String(count)
        : children;
  return (
    <StyledBadge
      {...(count !== undefined && { justifyContent: 'center', fontVariantNumeric: 'tabular-nums' })}
      {...(dot === true && { dot: true })}
      {...(label !== undefined && { role: 'img', 'aria-label': label })}
      {...rest}
    >
      {content}
    </StyledBadge>
  );
}
