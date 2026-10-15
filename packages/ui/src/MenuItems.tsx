'use client';

import {
  Menu as HeadlessMenu,
  useControllableState,
  type MenuCheckboxItemProps,
  type MenuLabelProps,
  type MenuRadioGroupProps,
  type MenuRadioItemProps,
} from '@usemotif/headless';
import { createContext, useContext, type ReactNode } from 'react';
import { Box, type BoxProps } from 'usemotif';
import { platformText } from './_platform-text.js';

// Hoisted so the bag props are stable references (lint: no-new-object).
const ITEM_HOVER = { bg: '$colors.surface.interactive' } as const;
const ITEM_FOCUS = { bg: '$colors.surface.interactive' } as const;

export type MenuCheckboxItemPropsThemed = Omit<MenuCheckboxItemProps, 'style' | 'asChild'>;
export type MenuRadioItemPropsThemed = Omit<MenuRadioItemProps, 'style' | 'asChild'>;

/**
 * A menu row with a fixed-width indicator column, so labels line up checked or
 * not. The headless item projects its role, handlers and ref onto this row
 * through `asChild`, so everything else passes through to the Box.
 */
const MARK_TEXT = { color: '$colors.action.primary.bg' } as const;
const LABEL_TEXT = { fontSize: '$fontSizes.xs', color: '$colors.text.muted' } as const;

function Row({
  mark,
  disabled,
  children,
  ...itemProps
}: {
  mark: string | null;
  disabled: boolean | undefined;
  children: ReactNode;
} & Omit<BoxProps, 'children'>) {
  return (
    <Box
      {...itemProps}
      display="flex"
      alignItems="center"
      gap="$space.2"
      px="$space.3"
      py="$space.2"
      borderRadius="$radii.md"
      fontSize="$fontSizes.sm"
      color={disabled === true ? '$colors.text.muted' : '$colors.text.default'}
      _hover={ITEM_HOVER}
      _focus={ITEM_FOCUS}
    >
      <Box as="span" aria-hidden width={14} textAlign="center" color="$colors.action.primary.bg">
        {platformText(mark, MARK_TEXT)}
      </Box>
      {platformText(children, {
        fontSize: '$fontSizes.sm',
        color: disabled === true ? '$colors.text.muted' : '$colors.text.default',
      })}
    </Box>
  );
}

/** A themed checkbox row with a check mark. Shared by the kit's Menu and ContextMenu. */
export function MenuCheckboxItem({
  checked: controlled,
  defaultChecked = false,
  onCheckedChange,
  children,
  ...rest
}: MenuCheckboxItemPropsThemed) {
  // Held here as well, so the row can draw its own mark.
  const [checked, setChecked] = useControllableState({
    value: controlled,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
  });
  return (
    <HeadlessMenu.CheckboxItem asChild {...rest} checked={checked} onCheckedChange={setChecked}>
      <Row mark={checked ? '✓' : null} disabled={rest.disabled}>
        {children}
      </Row>
    </HeadlessMenu.CheckboxItem>
  );
}

const RadioValueContext = createContext<string | undefined>(undefined);

/** A themed radio group; its items draw a dot on the selected one. */
export function MenuRadioGroup({
  value: controlled,
  defaultValue,
  onValueChange,
  ...rest
}: MenuRadioGroupProps) {
  const [value, setValue] = useControllableState<string | undefined>({
    value: controlled,
    defaultValue,
    onChange: onValueChange as ((next: string | undefined) => void) | undefined,
  });
  return (
    <RadioValueContext.Provider value={value}>
      <HeadlessMenu.RadioGroup
        {...rest}
        {...(value !== undefined ? { value } : {})}
        onValueChange={setValue}
      />
    </RadioValueContext.Provider>
  );
}

/** A themed radio row. */
export function MenuRadioItem({ children, ...rest }: MenuRadioItemPropsThemed) {
  const selected = useContext(RadioValueContext) === rest.value;
  return (
    <HeadlessMenu.RadioItem asChild {...rest}>
      <Row mark={selected ? '●' : null} disabled={rest.disabled}>
        {children}
      </Row>
    </HeadlessMenu.RadioItem>
  );
}

/** A small heading inside a menu, skipped by the arrow keys. */
export function MenuLabel({ children }: Omit<MenuLabelProps, 'style'>) {
  return (
    <HeadlessMenu.Label>
      <Box
        px="$space.3"
        pt="$space.2"
        pb="$space.1"
        fontSize="$fontSizes.xs"
        color="$colors.text.muted"
      >
        {platformText(children, LABEL_TEXT)}
      </Box>
    </HeadlessMenu.Label>
  );
}
