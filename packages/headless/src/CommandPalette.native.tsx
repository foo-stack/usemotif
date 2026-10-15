import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View, type ViewStyle } from 'react-native';
import { nativeText } from './_native-text.js';
import { fuzzyScore } from './_fuzzy.js';
import { useControllableState } from './use-controllable-state.js';

/**
 * Native CommandPalette - Dialog-presented searchable command list.
 * The activation hook is platform-correct: there's no global hardware
 * keyboard on touch devices, so `useCommandPaletteShortcut` is a
 * no-op on native (apps wire up their own button or gesture to open
 * the palette).
 */

export interface Command {
  readonly id: string;
  readonly label: string;
  readonly section?: string;
  readonly keywords?: ReadonlyArray<string>;
  readonly shortcut?: ReadonlyArray<string>;
  readonly icon?: ReactNode;
  readonly disabled?: boolean;
  /** Runs when the command is chosen. Not called for a command with `children`. */
  readonly onSelect?: () => void;
  /**
   * Choosing this command opens these as a page of their own, with its own
   * search. Backspace on an empty input or the Android back button goes back.
   */
  readonly children?: ReadonlyArray<Command>;
}

const DEFAULT_SECTION = 'Commands';
const RECENT_SECTION = 'Recent';

interface CommandPaletteContextValue {
  readonly commands: ReadonlyArray<Command>;
  readonly grouped: ReadonlyArray<{
    readonly section: string;
    readonly items: ReadonlyArray<{ readonly command: Command; readonly globalIndex: number }>;
  }>;
  readonly flatFiltered: ReadonlyArray<Command>;
  readonly inputValue: string;
  readonly setInputValue: (next: string) => void;
  readonly open: boolean;
  readonly setOpen: (next: boolean) => void;
  readonly highlightedIndex: number;
  readonly setHighlightedIndex: (i: number) => void;
  readonly recents: ReadonlyArray<string>;
  readonly listboxId: string;
  readonly activate: (command: Command) => void;
  readonly pages: ReadonlyArray<Command>;
  readonly goBack: (depth: number) => void;
}
const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);
function useCommandPaletteContext(component: string): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (ctx === null) throw new Error(`${component} must be inside <CommandPalette.Root>.`);
  return ctx;
}

export function defaultFuzzyMatch(input: string, command: Command): number | null {
  if (input.length === 0) return 1;
  const i = input.toLowerCase();
  const candidates = [command.label, ...(command.keywords ?? [])];
  let best: number | null = null;
  for (const c of candidates) {
    const score = fuzzyScore(i, c.toLowerCase());
    if (score === null) continue;
    if (best === null || score > best) best = score;
  }
  return best;
}

export interface CommandPaletteRootProps {
  commands: ReadonlyArray<Command>;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  recents?: ReadonlyArray<string>;
  onRecentsChange?: (next: ReadonlyArray<string>) => void;
  maxRecents?: number;
  matcher?: (input: string, command: Command) => number | null;
  children?: ReactNode;
}
function Root({
  commands,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  recents: controlledRecents,
  onRecentsChange,
  maxRecents = 5,
  matcher,
  children,
}: CommandPaletteRootProps): ReactElement {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [recents, commitRecents] = useControllableState<ReadonlyArray<string>>({
    value: controlledRecents,
    defaultValue: [],
    onChange: onRecentsChange,
  });
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [pages, setPages] = useState<ReadonlyArray<Command>>([]);
  const reactId = useRef(`cmd-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    if (open) setHighlightedIndex(0);
    else {
      setInputValue('');
      setPages([]);
    }
  }, [open]);

  const fn = matcher ?? defaultFuzzyMatch;
  const pageCommands = pages.at(-1)?.children ?? commands;

  const flatFiltered = useMemo<ReadonlyArray<Command>>(() => {
    if (inputValue.length === 0) {
      const recentSet = new Set(recents);
      const recentItems = recents
        .map((id) => pageCommands.find((c) => c.id === id))
        .filter((c): c is Command => c !== undefined);
      const rest = pageCommands.filter((c) => !recentSet.has(c.id));
      return [...recentItems, ...rest];
    }
    const scored: { command: Command; score: number }[] = [];
    for (const c of pageCommands) {
      const score = fn(inputValue, c);
      if (score === null) continue;
      scored.push({ command: c, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.command);
  }, [pageCommands, inputValue, recents, fn]);

  const grouped = useMemo<CommandPaletteContextValue['grouped']>(() => {
    const recentSet = inputValue.length === 0 ? new Set(recents) : new Set<string>();
    const sections = new Map<string, { command: Command; globalIndex: number }[]>();
    flatFiltered.forEach((command, globalIndex) => {
      const section =
        recentSet.has(command.id) && recentSet.size > 0
          ? RECENT_SECTION
          : (command.section ?? DEFAULT_SECTION);
      const arr = sections.get(section);
      if (arr === undefined) sections.set(section, [{ command, globalIndex }]);
      else arr.push({ command, globalIndex });
    });
    return Array.from(sections.entries()).map(([section, items]) => ({ section, items }));
  }, [flatFiltered, inputValue, recents]);

  const activate = useCallback(
    (command: Command) => {
      if (command.disabled === true) return;
      if (command.children !== undefined) {
        setPages((open) => [...open, command]);
        setInputValue('');
        setHighlightedIndex(0);
        return;
      }
      command.onSelect?.();
      const next = [command.id, ...recents.filter((id) => id !== command.id)].slice(0, maxRecents);
      commitRecents(next);
      setOpen(false);
    },
    [recents, commitRecents, maxRecents, setOpen],
  );

  const goBack = useCallback((depth: number) => {
    setPages((open) => open.slice(0, depth));
    setInputValue('');
    setHighlightedIndex(0);
  }, []);

  return (
    <CommandPaletteContext.Provider
      value={{
        commands,
        grouped,
        flatFiltered,
        inputValue,
        setInputValue,
        open,
        setOpen,
        highlightedIndex,
        setHighlightedIndex,
        recents,
        listboxId: reactId,
        activate,
        pages,
        goBack,
      }}
    >
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => (pages.length > 0 ? goBack(pages.length - 1) : setOpen(false))}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            justifyContent: 'flex-start',
            paddingTop: 80,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation?.()}>
            <View accessibilityViewIsModal>{children}</View>
          </Pressable>
        </Pressable>
      </Modal>
    </CommandPaletteContext.Provider>
  );
}

interface InputChildProps {
  value?: string;
  onChangeText?: (next: string) => void;
  onKeyPress?: (e: { nativeEvent: { key: string } }) => void;
  ref?: React.Ref<TextInput>;
  accessibilityRole?: 'search';
}
function Input({
  children,
  placeholder,
}: {
  children?: ReactElement<InputChildProps>;
  placeholder?: string;
}): ReactElement {
  const ctx = useCommandPaletteContext('CommandPalette.Input');
  const sharedProps: InputChildProps = {
    accessibilityRole: 'search',
    value: ctx.inputValue,
    onChangeText: (text: string) => {
      ctx.setInputValue(text);
      ctx.setHighlightedIndex(0);
    },
    onKeyPress: (e) => {
      if (e.nativeEvent.key === 'Backspace' && ctx.inputValue === '' && ctx.pages.length > 0) {
        ctx.goBack(ctx.pages.length - 1);
      }
    },
  };
  if (children !== undefined && isValidElement(children)) {
    return cloneElement(children, sharedProps);
  }
  return <TextInput placeholder={placeholder} {...sharedProps} />;
}

export interface CommandPaletteListProps {
  renderItem: (
    command: Command,
    info: { highlighted: boolean; isRecent: boolean; index: number },
  ) => ReactNode;
  renderSection?: (section: string) => ReactNode;
  emptyMessage?: ReactNode;
  style?: ViewStyle;
}
function List({
  renderItem,
  renderSection,
  emptyMessage = 'No matches',
  style,
}: CommandPaletteListProps): ReactElement {
  const ctx = useCommandPaletteContext('CommandPalette.List');
  if (ctx.flatFiltered.length === 0) {
    return (
      <View accessibilityRole="list" nativeID={ctx.listboxId} style={style}>
        <Pressable disabled accessibilityState={{ disabled: true }}>
          {nativeText(emptyMessage)}
        </Pressable>
      </View>
    );
  }
  return (
    <ScrollView
      accessibilityRole="list"
      nativeID={ctx.listboxId}
      style={[{ maxHeight: 400 }, style as ViewStyle]}
    >
      {ctx.grouped.map(({ section, items }) => (
        <View key={section} accessibilityRole="list" accessibilityLabel={section}>
          {renderSection !== undefined ? (
            renderSection(section)
          ) : (
            <View accessibilityRole="header">
              <Text>{section}</Text>
            </View>
          )}
          {items.map(({ command, globalIndex }) => {
            const itemId = `${ctx.listboxId}-item-${globalIndex}`;
            const highlighted = ctx.highlightedIndex === globalIndex;
            const isRecent = section === RECENT_SECTION;
            return (
              <Pressable
                key={command.id}
                nativeID={itemId}
                accessibilityRole="button"
                accessibilityState={{ selected: highlighted, disabled: command.disabled === true }}
                disabled={command.disabled}
                onPress={() => ctx.activate(command)}
              >
                {renderItem(command, { highlighted, isRecent, index: globalIndex })}
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

export interface CommandPaletteBreadcrumbProps {
  /** Label for the top level. Defaults to `'Commands'`. */
  rootLabel?: string;
  /** Shown between crumbs. Defaults to `'/'`. */
  separator?: ReactNode;
  /** Renders one crumb. Defaults to the label, pressable unless current. */
  renderCrumb?: (
    label: string,
    info: { current: boolean; depth: number; onSelect: () => void },
  ) => ReactNode;
  style?: ViewStyle;
}

/** The trail of open pages, each one a way back to it. Nothing on the top level. */
function Breadcrumb({
  rootLabel = 'Commands',
  separator = '/',
  renderCrumb,
  style,
}: CommandPaletteBreadcrumbProps): ReactElement | null {
  const ctx = useCommandPaletteContext('CommandPalette.Breadcrumb');
  if (ctx.pages.length === 0) return null;
  const labels = [rootLabel, ...ctx.pages.map((p) => p.label)];
  return (
    <View
      accessibilityLabel="Command pages"
      style={[{ flexDirection: 'row', alignItems: 'center' }, style as ViewStyle]}
    >
      {labels.map((label, depth) => {
        const current = depth === labels.length - 1;
        const onSelect = (): void => ctx.goBack(depth);
        return (
          <View key={depth} style={{ flexDirection: 'row', alignItems: 'center' }}>
            {renderCrumb !== undefined ? (
              renderCrumb(label, { current, depth, onSelect })
            ) : current ? (
              <Text accessibilityRole="header">{label}</Text>
            ) : (
              <Pressable accessibilityRole="button" onPress={onSelect}>
                <Text>{label}</Text>
              </Pressable>
            )}
            {current ? null : nativeText(separator)}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph, where each one is already a client reference. Internal: the
 * barrel re-exports by name and does not list these.
 */
export {
  Root as CommandPaletteRoot,
  Input as CommandPaletteInput,
  List as CommandPaletteList,
  Breadcrumb as CommandPaletteBreadcrumb,
};

/**
 * No-op on native - there's no global hardware keyboard on touch
 * devices. Apps should wire up a button or gesture to toggle the
 * palette open instead.
 */
export function useCommandPaletteShortcut(_combo: string, _handler: () => void): void {
  // intentionally empty - see jsdoc.
}
