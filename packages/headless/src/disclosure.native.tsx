import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useControllableState } from './use-controllable-state.js';

/**
 * Native disclosure family - Collapsible / Accordion / Tabs.
 *
 * The state machines and ARIA roles are identical to the web variants;
 * only the rendered host changes from `<div>` / `<button>` to `<View>`
 * / `<Pressable>`. RN's accessibilityRole / accessibilityState supply
 * the same screen-reader semantics that web ARIA does.
 *
 * Tabs uses a roving-tabIndex pattern via tracked refs rather than a
 * DOM walk (no querySelector on native). The active tab tracks itself
 * via the context's `register` callback.
 */

// ─────────── Collapsible ──────────────────────────────────────────

interface CollapsibleContextValue {
  readonly open: boolean;
  readonly setOpen: (next: boolean) => void;
  readonly contentId: string;
  readonly triggerId: string;
}
const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);
// Set by an Accordion item whose panel cannot be closed, so its trigger can
// say so (`accessibilityState.disabled`).
const CollapsibleLockedContext = createContext(false);

function useCollapsibleContext(component: string): CollapsibleContextValue {
  const ctx = useContext(CollapsibleContext);
  if (ctx === null) throw new Error(`${component} must be inside <Collapsible.Root>.`);
  return ctx;
}

export interface CollapsibleRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}
function CollapsibleRoot({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  children,
}: CollapsibleRootProps): ReactElement {
  const [open, setOpen] = useControllableState({
    value: controlled,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const id = useId();
  return (
    <CollapsibleContext.Provider
      value={{
        open,
        setOpen,
        contentId: `${id}-collapsible-content`,
        triggerId: `${id}-collapsible-trigger`,
      }}
    >
      {children}
    </CollapsibleContext.Provider>
  );
}

interface CollapsibleTriggerChildProps {
  onPress?: () => void;
  accessibilityState?: { expanded?: boolean; disabled?: boolean };
  nativeID?: string;
}
function CollapsibleTrigger({
  children,
}: {
  children: ReactElement<CollapsibleTriggerChildProps>;
}): ReactElement {
  const ctx = useCollapsibleContext('Collapsible.Trigger');
  const locked = useContext(CollapsibleLockedContext);
  if (!isValidElement(children)) throw new Error('Collapsible.Trigger expects a single element.');
  const childOnPress = children.props.onPress;
  return cloneElement(children, {
    nativeID: ctx.triggerId,
    accessibilityState: locked ? { expanded: ctx.open, disabled: true } : { expanded: ctx.open },
    onPress: () => {
      childOnPress?.();
      ctx.setOpen(!ctx.open);
    },
  });
}

function CollapsibleContent({
  children,
  forceMount = false,
  style,
}: {
  children?: ReactNode;
  forceMount?: boolean;
  style?: ViewStyle;
}): ReactElement | null {
  const ctx = useCollapsibleContext('Collapsible.Content');
  if (!ctx.open && !forceMount) return null;
  return (
    <View
      nativeID={ctx.contentId}
      accessibilityLabelledBy={ctx.triggerId}
      style={[{ display: ctx.open ? 'flex' : 'none' }, style as ViewStyle]}
    >
      {children}
    </View>
  );
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph, where each one is already a client reference. Internal: the
 * barrel re-exports by name and does not list these.
 */
export {
  CollapsibleRoot,
  CollapsibleTrigger,
  CollapsibleContent,
  AccordionRoot,
  AccordionItem,
  TabsRoot,
  TabsList,
  TabsTab,
  TabsPanel,
};

// ─────────── Accordion ────────────────────────────────────────────

interface AccordionContextValue {
  readonly type: 'single' | 'multiple';
  readonly value: string[];
  readonly toggle: (id: string) => void;
  readonly collapsible: boolean;
}
const AccordionContext = createContext<AccordionContextValue | null>(null);
function useAccordionContext(component: string): AccordionContextValue {
  const ctx = useContext(AccordionContext);
  if (ctx === null) throw new Error(`${component} must be inside <Accordion.Root>.`);
  return ctx;
}

export interface AccordionRootProps {
  type?: 'single' | 'multiple';
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /**
   * In `single` mode, `false` keeps one item always open: the open item's
   * trigger no longer closes it and is marked disabled. Defaults to `true`.
   */
  collapsible?: boolean;
  children?: ReactNode;
}
function AccordionRoot({
  type = 'single',
  value: controlled,
  defaultValue = [],
  onValueChange,
  collapsible = true,
  children,
}: AccordionRootProps): ReactElement {
  const [value, commit] = useControllableState<string[]>({
    value: controlled,
    defaultValue,
    onChange: onValueChange,
  });
  const toggle = useCallback(
    (id: string) => {
      const isOpen = value.includes(id);
      if (isOpen && type === 'single' && !collapsible) return;
      let next: string[];
      if (isOpen) next = value.filter((v) => v !== id);
      else if (type === 'single') next = [id];
      else next = [...value, id];
      commit(next);
    },
    [value, type, collapsible, commit],
  );
  return (
    <AccordionContext.Provider value={{ type, value, toggle, collapsible }}>
      {children}
    </AccordionContext.Provider>
  );
}

export interface AccordionItemProps {
  value: string;
  children?: ReactNode;
}
function AccordionItem({ value, children }: AccordionItemProps): ReactElement {
  const ctx = useAccordionContext('Accordion.Item');
  const open = ctx.value.includes(value);
  const locked = open && ctx.type === 'single' && !ctx.collapsible;
  return (
    <CollapsibleRoot open={open} onOpenChange={() => ctx.toggle(value)}>
      <CollapsibleLockedContext.Provider value={locked}>
        {children}
      </CollapsibleLockedContext.Provider>
    </CollapsibleRoot>
  );
}

// ─────────── Tabs ─────────────────────────────────────────────────

interface TabsContextValue {
  readonly value: string;
  readonly setValue: (v: string) => void;
  readonly idPrefix: string;
  readonly orientation: 'horizontal' | 'vertical';
}
const TabsContext = createContext<TabsContextValue | null>(null);
function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (ctx === null) throw new Error(`${component} must be inside <Tabs.Root>.`);
  return ctx;
}

export interface TabsRootProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  orientation?: 'horizontal' | 'vertical';
  /** Keyboard activation on web. Accepted for shared code; touch selects on press either way. */
  activationMode?: 'automatic' | 'manual';
  children?: ReactNode;
}
function TabsRoot({
  value: controlled,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  children,
}: TabsRootProps): ReactElement {
  const [rawValue, setValue] = useControllableState({
    value: controlled,
    defaultValue,
    onChange: onValueChange,
  });
  const value = rawValue ?? '';
  const idPrefix = useId();
  return (
    <TabsContext.Provider value={{ value, setValue, idPrefix, orientation }}>
      {children}
    </TabsContext.Provider>
  );
}

function TabsList({ children, style }: { children?: ReactNode; style?: ViewStyle }): ReactElement {
  const ctx = useTabsContext('Tabs.List');
  return (
    <View
      accessibilityRole="tablist"
      style={[
        { flexDirection: ctx.orientation === 'horizontal' ? 'row' : 'column' },
        style as ViewStyle,
      ]}
    >
      {children}
    </View>
  );
}

export interface TabsTabProps {
  value: string;
  disabled?: boolean;
  children?: ReactNode;
  style?: ViewStyle;
}
function TabsTab({ value, disabled = false, children, style }: TabsTabProps): ReactElement {
  const ctx = useTabsContext('Tabs.Tab');
  const selected = ctx.value === value;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected, disabled }}
      nativeID={`${ctx.idPrefix}-tab-${value}`}
      disabled={disabled}
      onPress={() => ctx.setValue(value)}
      style={style}
    >
      {children}
    </Pressable>
  );
}

export interface TabsPanelProps {
  value: string;
  forceMount?: boolean;
  children?: ReactNode;
  style?: ViewStyle;
}
function TabsPanel({
  value,
  forceMount = false,
  children,
  style,
}: TabsPanelProps): ReactElement | null {
  const ctx = useTabsContext('Tabs.Panel');
  const active = ctx.value === value;
  if (!active && !forceMount) return null;
  return (
    <View
      nativeID={`${ctx.idPrefix}-panel-${value}`}
      accessibilityLabelledBy={`${ctx.idPrefix}-tab-${value}`}
      style={[{ display: active ? 'flex' : 'none' }, style as ViewStyle]}
    >
      {children}
    </View>
  );
}
