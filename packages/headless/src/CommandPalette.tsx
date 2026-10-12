'use client';

import { DialogContent, DialogRoot } from './Dialog.js';
import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { fuzzyScore } from './_fuzzy.js';
import { useControllableState } from './use-controllable-state.js';

/**
 * CommandPalette - a fuzzy-searchable command launcher (think ⌘K). The
 * headless composition layers Dialog (focus trap + scrim + portal) over
 * a flat list with section headings, fuzzy filtering, recent-item
 * tracking, and a keyboard-shortcut hook for global activation.
 *
 * ```tsx
 * const [open, setOpen] = useState(false);
 * useCommandPaletteShortcut('mod+k', () => setOpen(true));
 * return (
 *   <CommandPalette.Root open={open} onOpenChange={setOpen} commands={[
 *     { id: 'open', label: 'Open file', section: 'File',
 *       shortcut: ['Mod', 'O'], onSelect: openFile },
 *     { id: 'save', label: 'Save', section: 'File',
 *       shortcut: ['Mod', 'S'], onSelect: save },
 *   ]}>
 *     <CommandPalette.Input placeholder="Type a command..." />
 *     <CommandPalette.List
 *       renderItem={(cmd, { highlighted, isRecent }) => ...}
 *       renderSection={(name, items) => ...}
 *     />
 *   </CommandPalette.Root>
 * );
 * ```
 */

export interface Command {
  readonly id: string;
  readonly label: string;
  /** Optional section heading. Items without a section land in `'Commands'`. */
  readonly section?: string;
  /** Extra keywords to fuzzy-match against. */
  readonly keywords?: ReadonlyArray<string>;
  /** Hint badges (e.g. `['Mod', 'K']`); rendered however the caller wants. */
  readonly shortcut?: ReadonlyArray<string>;
  /** Optional icon node - passed through to the renderItem callback. */
  readonly icon?: ReactNode;
  readonly disabled?: boolean;
  readonly onSelect: () => void;
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
  readonly inputRef: React.RefObject<HTMLInputElement | null>;
  readonly listboxId: string;
  readonly activate: (command: Command) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);
function useCommandPaletteContext(component: string): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (ctx === null) throw new Error(`${component} must be inside <CommandPalette.Root>.`);
  return ctx;
}

/**
 * Default fuzzy matcher. Returns `null` for "no match", or a score where
 * higher = better. Substring matches beat scattered character matches;
 * earlier positions beat later ones.
 */
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
  /** Controlled recent-item ids. When omitted, an internal list is used. */
  recents?: ReadonlyArray<string>;
  onRecentsChange?: (next: ReadonlyArray<string>) => void;
  /** Cap on internal recents list. Defaults to 5. */
  maxRecents?: number;
  /** Override the fuzzy matcher. */
  matcher?: (input: string, command: Command) => number | null;
  /** Allow Escape to close the palette. Defaults to true. */
  dismissOnEscape?: boolean;
  /** Allow scrim (click-outside) to close the palette. Defaults to true. */
  dismissOnScrimClick?: boolean;
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
  dismissOnEscape = true,
  dismissOnScrimClick = true,
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
  const [rawHighlightedIndex, setHighlightedIndex] = useState(0);
  const reactId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset input + highlight when the palette closes; restore highlight
  // to the first row when it opens.
  useEffect(() => {
    if (open) {
      setHighlightedIndex(0);
    } else {
      setInputValue('');
    }
  }, [open]);

  const fn = matcher ?? defaultFuzzyMatch;

  // Filter + sort. With empty input we preserve the caller's command
  // order (with recents lifted to the top, in recents-order).
  const flatFiltered = useMemo<ReadonlyArray<Command>>(() => {
    if (inputValue.length === 0) {
      const recentSet = new Set(recents);
      const recentItems = recents
        .map((id) => commands.find((c) => c.id === id))
        .filter((c): c is Command => c !== undefined);
      const rest = commands.filter((c) => !recentSet.has(c.id));
      return [...recentItems, ...rest];
    }
    const scored: { command: Command; score: number }[] = [];
    for (const c of commands) {
      const score = fn(inputValue, c);
      if (score === null) continue;
      scored.push({ command: c, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.command);
  }, [commands, inputValue, recents, fn]);

  // Group by section, preserving the flat order so keyboard navigation
  // can use a single global index. With empty input + recents, the
  // first section becomes "Recent".
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
      command.onSelect();
      const next = [command.id, ...recents.filter((id) => id !== command.id)].slice(0, maxRecents);
      commitRecents(next);
      setOpen(false);
    },
    [recents, commitRecents, maxRecents, setOpen],
  );

  // Clamp the highlight during render so it never points past the end of
  // the current results - `highlightedIndex` is only reset on open and on
  // typing, so a programmatic `commands` change can leave it stale, and a
  // post-render effect clamps a render too late (one render with a dangling
  // aria-activedescendant). Deriving it here keeps the aria id, the List
  // highlight, and Enter selection consistent.
  const highlightedIndex =
    rawHighlightedIndex > flatFiltered.length - 1 ? flatFiltered.length - 1 : rawHighlightedIndex;

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
        inputRef,
        listboxId: `${reactId}-cmd-palette`,
        activate,
      }}
    >
      <DialogRoot open={open} onOpenChange={setOpen}>
        {/* Render the palette body inside DialogContent - not bare
            DialogRoot, which is only a context provider - so it actually
            gets the focus trap, scrim, Portal, Escape, and aria-modal the
            docstring promises. */}
        <DialogContent dismissOnEscape={dismissOnEscape} dismissOnScrimClick={dismissOnScrimClick}>
          {children}
        </DialogContent>
      </DialogRoot>
    </CommandPaletteContext.Provider>
  );
}

interface InputChildProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  ref?: React.Ref<HTMLInputElement>;
  role?: string;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  'aria-activedescendant'?: string;
  'aria-autocomplete'?: 'list' | 'inline' | 'both' | 'none';
}
function Input({
  children,
  placeholder,
}: {
  children?: ReactElement<InputChildProps>;
  placeholder?: string;
}): ReactElement {
  const ctx = useCommandPaletteContext('CommandPalette.Input');
  const max = ctx.flatFiltered.length - 1;
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        ctx.setHighlightedIndex(Math.min(max, ctx.highlightedIndex + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        ctx.setHighlightedIndex(Math.max(0, ctx.highlightedIndex - 1));
        break;
      case 'Home':
        e.preventDefault();
        ctx.setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        ctx.setHighlightedIndex(max);
        break;
      case 'Enter': {
        if (ctx.highlightedIndex < 0 || ctx.highlightedIndex > max) return;
        e.preventDefault();
        const command = ctx.flatFiltered[ctx.highlightedIndex];
        if (command !== undefined) ctx.activate(command);
        break;
      }
    }
  };

  const sharedProps = {
    ref: ctx.inputRef as React.Ref<HTMLInputElement>,
    role: 'combobox' as const,
    'aria-expanded': ctx.open,
    'aria-controls': ctx.listboxId,
    'aria-autocomplete': 'list' as const,
    ...(ctx.highlightedIndex >= 0 && ctx.flatFiltered[ctx.highlightedIndex] !== undefined
      ? {
          'aria-activedescendant': `${ctx.listboxId}-item-${ctx.highlightedIndex}`,
        }
      : {}),
    value: ctx.inputValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      ctx.setInputValue(e.target.value);
      ctx.setHighlightedIndex(0);
    },
    onKeyDown,
  };

  if (children !== undefined && isValidElement(children)) {
    return cloneElement(children, sharedProps);
  }
  return <input type="text" placeholder={placeholder} {...sharedProps} />;
}

export interface CommandPaletteListProps {
  /** Render each command. Receives the highlighted/recent flags. */
  renderItem: (
    command: Command,
    info: { highlighted: boolean; isRecent: boolean; index: number },
  ) => ReactNode;
  /** Render a section header. Defaults to a `<div>` with the section name. */
  renderSection?: (section: string) => ReactNode;
  /** What to render when the filter matches nothing. */
  emptyMessage?: ReactNode;
}
function List({
  renderItem,
  renderSection,
  emptyMessage = 'No matches',
}: CommandPaletteListProps): ReactElement {
  const ctx = useCommandPaletteContext('CommandPalette.List');
  if (ctx.flatFiltered.length === 0) {
    return (
      <div role="listbox" id={ctx.listboxId}>
        <div role="option" aria-disabled="true" aria-selected="false">
          {emptyMessage}
        </div>
      </div>
    );
  }
  return (
    <div role="listbox" id={ctx.listboxId}>
      {ctx.grouped.map(({ section, items }) => (
        <div key={section} role="group" aria-label={section}>
          {renderSection !== undefined ? renderSection(section) : <div>{section}</div>}
          {items.map(({ command, globalIndex }) => {
            const itemId = `${ctx.listboxId}-item-${globalIndex}`;
            const highlighted = ctx.highlightedIndex === globalIndex;
            const isRecent = section === RECENT_SECTION;
            return (
              <div
                key={command.id}
                id={itemId}
                role="option"
                aria-selected={highlighted}
                aria-disabled={command.disabled || undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  ctx.activate(command);
                }}
                onMouseEnter={() => ctx.setHighlightedIndex(globalIndex)}
              >
                {renderItem(command, { highlighted, isRecent, index: globalIndex })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph, where each one is already a client reference. Internal: the
 * barrel re-exports by name and does not list these.
 */
export { Root as CommandPaletteRoot, Input as CommandPaletteInput, List as CommandPaletteList };

/**
 * Register a global keyboard shortcut (e.g. `'mod+k'`) for opening the
 * palette. `mod` resolves to ⌘ on macOS and Ctrl elsewhere. The handler
 * is invoked on the matching keydown after `preventDefault()`.
 *
 * Bind a stable handler (memoized via `useCallback`) so the listener
 * isn't churning every render. Returns nothing; cleanup on unmount.
 */
export function useCommandPaletteShortcut(combo: string, handler: () => void): void {
  useEffect(() => {
    const matches = parseShortcut(combo);
    function onKeyDown(e: KeyboardEvent | globalThis.KeyboardEvent): void {
      if (matches(e)) {
        e.preventDefault();
        handler();
      }
    }
    if (typeof window === 'undefined') return undefined;
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [combo, handler]);
}

function parseShortcut(combo: string): (e: KeyboardEvent | globalThis.KeyboardEvent) => boolean {
  const parts = combo
    .toLowerCase()
    .split('+')
    .map((s) => s.trim());
  const key = parts[parts.length - 1] ?? '';
  const mods = new Set(parts.slice(0, -1));
  return (e) => {
    if (e.key.toLowerCase() !== key) return false;
    if (mods.has('mod')) {
      const isMac =
        typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      if (isMac && !e.metaKey) return false;
      if (!isMac && !e.ctrlKey) return false;
    }
    if (mods.has('ctrl') && !e.ctrlKey) return false;
    if (mods.has('cmd') && !e.metaKey) return false;
    if (mods.has('shift') && !e.shiftKey) return false;
    if (mods.has('alt') && !e.altKey) return false;
    return true;
  };
}
