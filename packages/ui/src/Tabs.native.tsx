import { Tabs as HeadlessTabs, useControllableState } from '@usemotif/headless';
import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import { Box } from 'usemotif';
import type { TabsListProps, TabsPanelPropsThemed, TabsTabPropsThemed } from './Tabs.js';
import { nativeText } from './_native-text.js';

export type { TabsListProps, TabsPanelPropsThemed, TabsTabPropsThemed };

// The web tab styles itself from `aria-selected` in CSS. Native has no such
// selector, so the root holds the selected value for each tab to read.
const Selected = createContext<string | undefined>(undefined);

export interface TabsRootProps {
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly children?: ReactNode;
}

/** Native Tabs.Root: the headless root, with the selection shared for styling. */
export function TabsRoot({
  value,
  defaultValue,
  onValueChange,
  children,
  ...rest
}: TabsRootProps): ReactElement {
  const [selected, setSelected] = useControllableState<string | undefined>({
    value,
    defaultValue,
    onChange: onValueChange as ((next: string | undefined) => void) | undefined,
  });
  return (
    <Selected.Provider value={selected}>
      <HeadlessTabs.Root
        {...(selected !== undefined && { value: selected })}
        onValueChange={setSelected}
        {...rest}
      >
        {children}
      </HeadlessTabs.Root>
    </Selected.Provider>
  );
}

/** The tablist: a bottom-bordered row. */
export function TabsList({ children }: TabsListProps): ReactElement {
  return (
    <HeadlessTabs.List>
      <Box
        flexDirection="row"
        gap="$space.1"
        borderBottomWidth="$borderWidths.thin"
        borderBottomColor="$colors.border.default"
      >
        {children}
      </Box>
    </HeadlessTabs.List>
  );
}

/** One tab: the primary colour and underline when selected. */
export function TabsTab({ value, disabled, children }: TabsTabPropsThemed): ReactElement {
  const active = useContext(Selected) === value;
  return (
    <HeadlessTabs.Tab value={value} {...(disabled !== undefined ? { disabled } : {})}>
      <Box
        px="$space.4"
        py="$space.3"
        borderBottomWidth="$borderWidths.thick"
        borderBottomColor={active ? '$colors.action.primary.bg' : 'transparent'}
      >
        {nativeText(children, {
          color: active ? '$colors.action.primary.bg' : '$colors.text.muted',
          fontSize: '$fontSizes.md',
          fontWeight: 500,
        })}
      </Box>
    </HeadlessTabs.Tab>
  );
}

/** A tab panel. */
export function TabsPanel({ value, forceMount, children }: TabsPanelPropsThemed): ReactElement {
  return (
    <HeadlessTabs.Panel value={value} {...(forceMount !== undefined ? { forceMount } : {})}>
      <Box pt="$space.4">{nativeText(children, { color: '$colors.text.default' })}</Box>
    </HeadlessTabs.Panel>
  );
}
