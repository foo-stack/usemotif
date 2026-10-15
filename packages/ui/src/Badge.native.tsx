import { badgeRecipe } from '@usemotif/recipes';
import type { ReactElement } from 'react';
import { Box, styled } from 'usemotif';
import type { BadgeProps } from './Badge.js';
import { nativeText } from './_native-text.js';

export type { BadgeProps };

const StyledBadge = /* @__PURE__ */ styled(Box, badgeRecipe);

type Intent = keyof typeof badgeRecipe.variants.intent;
type Size = keyof typeof badgeRecipe.variants.size;

/** Native Badge: the web Badge, with its text in a `Text` that carries the recipe's colour and size. */
export function Badge({
  count,
  max = 99,
  dot,
  label,
  children,
  intent = 'neutral',
  size = 'sm',
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
  const tone =
    badgeRecipe.variants.intent[typeof intent === 'string' ? (intent as Intent) : 'neutral'];
  const scale = badgeRecipe.variants.size[typeof size === 'string' ? (size as Size) : 'sm'];
  return (
    <StyledBadge
      intent={intent}
      size={size}
      {...(count !== undefined && { justifyContent: 'center' })}
      {...(dot === true && { dot: true })}
      {...(label !== undefined && { role: 'img', 'aria-label': label })}
      {...rest}
    >
      {nativeText(content, {
        color: tone.color,
        fontSize: scale.fontSize,
        fontWeight: badgeRecipe.base.fontWeight,
      })}
    </StyledBadge>
  );
}
