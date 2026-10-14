'use client';

import { Portal } from '@usemotif/react';
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
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useClickOutside, useFloatingPosition, type Placement } from './positioning.js';
import { defaultFilter } from './_combobox-filter.js';
import { ListboxOptions } from './_listbox-options.js';
import { useControllableState } from './use-controllable-state.js';

// Stable empty selection for a controlled MultiSelect whose `value` is
// `undefined` (controlled, empty). A fresh `[]` each render would change
// identity and re-run every hook that lists `values` in its deps. `never[]` is
// assignable to any `ReadonlyArray<T>`.
const EMPTY_VALUES: readonly never[] = [];

/**
 * Form-input behavioral family - Combobox, Select, MultiSelect,
 * Search, CommandPalette.
 *
 * All share the listbox + option ARIA pattern (`role="combobox"`
 * on the input or button, `role="listbox"` on the popup, `role="option"`
 * on each item) and the standard keyboard navigation (ArrowDown /
 * ArrowUp to move highlight, Home / End to jump, Enter to select,
 * Escape to close).
 *
 * Combobox / Select / Search hold a single `value: T | undefined`;
 * MultiSelect holds `value: T[]` with chip rendering, max-selection
 * caps, and an optional select-all toggle. CommandPalette wraps
 * Combobox in a Dialog with section headings and ⌘K-style activation
 * shortcuts (see `command-palette.tsx`).
 */

// ─────────── Combobox ─────────────────────────────────────────────

export interface ComboboxOption<T = string> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
}

interface ComboboxContextValue<T = string> {
  readonly open: boolean;
  readonly setOpen: (next: boolean) => void;
  readonly value: T | undefined;
  readonly setValue: (next: T | undefined) => void;
  readonly inputValue: string;
  readonly setInputValue: (next: string) => void;
  readonly options: ReadonlyArray<ComboboxOption<T>>;
  readonly loading: boolean;
  readonly highlightedIndex: number;
  readonly setHighlightedIndex: (i: number) => void;
  readonly listboxId: string;
  readonly inputRef: React.RefObject<HTMLInputElement | null>;
}
const ComboboxContext = createContext<ComboboxContextValue<unknown> | null>(null);
function useComboboxContext<T>(component: string): ComboboxContextValue<T> {
  const ctx = useContext(ComboboxContext);
  if (ctx === null) throw new Error(`${component} must be inside <Combobox.Root>.`);
  return ctx as ComboboxContextValue<T>;
}

export interface ComboboxRootProps<T = string> {
  options: ReadonlyArray<ComboboxOption<T>>;
  value?: T;
  defaultValue?: T;
  onValueChange?: (next: T | undefined) => void;
  inputValue?: string;
  onInputValueChange?: (next: string) => void;
  /** Custom filter. Defaults to case-insensitive substring match
   * against `option.label`. `false` shows `options` exactly as given, for
   * results a server has already matched. */
  filter?: ((option: ComboboxOption<T>, input: string) => boolean) | false;
  /** Results are being fetched: the list shows `loadingMessage` while it has
   * no options. Pair with `onInputValueChange`, which fires on every
   * keystroke, to fetch as the user types. */
  loading?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}
function ComboboxRoot<T>(props: ComboboxRootProps<T>): ReactElement {
  const {
    options,
    value: controlledValue,
    defaultValue,
    onValueChange,
    inputValue: controlledInput,
    onInputValueChange,
    filter,
    loading = false,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    children,
  } = props;
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  // Detect controlled-ness by prop *presence*, not `!== undefined`: a
  // combobox/select can legitimately hold a cleared (`undefined`) value, so
  // `value={undefined}` must stay controlled-and-empty rather than silently
  // falling back to stale internal state. `'value' in props` is true
  // whenever the consumer wrote the prop (even as `undefined`) and false
  // when it was omitted.
  const [value, setValue] = useControllableState<T | undefined>({
    value: controlledValue,
    defaultValue,
    onChange: onValueChange,
    controlled: 'value' in props,
  });

  const [inputValue, setInputValue] = useControllableState({
    value: controlledInput,
    defaultValue: '',
    onChange: onInputValueChange,
  });

  const filtered = useMemo(() => {
    if (filter === false) return options;
    const fn = filter ?? defaultFilter;
    return options.filter((o) => fn(o, inputValue));
  }, [options, inputValue, filter]);

  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  // Clamp the highlight when the filtered list shrinks (e.g. while typing),
  // so it never points past the end - a stale index would dangle
  // aria-activedescendant and let Enter select the wrong / no option.
  useEffect(() => {
    setHighlightedIndex((i) => (i > filtered.length - 1 ? filtered.length - 1 : i));
  }, [filtered.length]);
  // Reset the highlight whenever the list closes, so a reopened (or
  // form-submit) Enter never acts on a stale highlight.
  useEffect(() => {
    if (!open) setHighlightedIndex(-1);
  }, [open]);
  const reactId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <ComboboxContext.Provider
      value={
        {
          open,
          setOpen,
          value: value as unknown,
          setValue: setValue as (next: unknown) => void,
          inputValue,
          setInputValue,
          options: filtered as ReadonlyArray<ComboboxOption<unknown>>,
          loading,
          highlightedIndex,
          setHighlightedIndex,
          listboxId: `${reactId}-listbox`,
          inputRef,
        } satisfies ComboboxContextValue<unknown>
      }
    >
      {children}
    </ComboboxContext.Provider>
  );
}

interface ComboboxInputChildProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  role?: string;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  'aria-activedescendant'?: string;
  'aria-autocomplete'?: 'list' | 'inline' | 'both' | 'none';
  ref?: React.Ref<HTMLInputElement>;
}
function ComboboxInput<T>({
  children,
  placeholder,
}: {
  children?: ReactElement<ComboboxInputChildProps>;
  placeholder?: string;
}): ReactElement {
  const ctx = useComboboxContext<T>('Combobox.Input');
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    const max = ctx.options.length - 1;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!ctx.open) ctx.setOpen(true);
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
      case 'Enter':
        // Only act on Enter while the list is open. Otherwise a stale
        // highlight selects silently and preventDefault()s a form submit
        // after the list was closed with Escape.
        if (ctx.open && ctx.highlightedIndex >= 0 && ctx.highlightedIndex <= max) {
          e.preventDefault();
          const opt = ctx.options[ctx.highlightedIndex]!;
          if (opt.disabled !== true) {
            ctx.setValue(opt.value);
            ctx.setInputValue(opt.label);
            ctx.setOpen(false);
          }
        }
        break;
      case 'Escape':
        if (ctx.open) {
          e.preventDefault();
          ctx.setOpen(false);
          ctx.setHighlightedIndex(-1);
        }
        break;
    }
  };

  const sharedProps = {
    ref: ctx.inputRef as React.Ref<HTMLInputElement>,
    role: 'combobox',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.listboxId,
    'aria-autocomplete': 'list' as const,
    ...(ctx.highlightedIndex >= 0 && ctx.options[ctx.highlightedIndex] !== undefined
      ? { 'aria-activedescendant': `${ctx.listboxId}-option-${ctx.highlightedIndex}` }
      : {}),
    value: ctx.inputValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      ctx.setInputValue(e.target.value);
      if (!ctx.open) ctx.setOpen(true);
    },
    onFocus: () => ctx.setOpen(true),
    onKeyDown,
  };

  if (children !== undefined && isValidElement(children)) {
    return cloneElement(children, sharedProps);
  }
  return <input type="text" placeholder={placeholder} {...sharedProps} />;
}

function ComboboxList<T>({
  placement = 'bottom',
  offset = 4,
  style,
  renderOption,
  emptyMessage = 'No options',
  loadingMessage = 'Loading...',
}: {
  placement?: Placement;
  offset?: number;
  style?: CSSProperties;
  /** Override how each option renders. */
  renderOption?: (
    option: ComboboxOption<T>,
    info: {
      highlighted: boolean;
      selected: boolean;
      index: number;
    },
  ) => ReactNode;
  emptyMessage?: ReactNode;
  /** Shown in place of `emptyMessage` while the root is `loading`. */
  loadingMessage?: ReactNode;
}): ReactElement | null {
  const ctx = useComboboxContext<T>('Combobox.List');
  const { position, floatingRef } = useFloatingPosition(
    ctx.inputRef as unknown as React.RefObject<HTMLElement | null>,
    ctx.open,
    placement,
    offset,
  );
  // Ignore the input/trigger (the floating anchor and the toggle share
  // `inputRef`): a click there should toggle via the trigger's own handler,
  // not be dismissed on mousedown and then reopened by the click.
  useClickOutside(
    ctx.open,
    floatingRef,
    () => ctx.setOpen(false),
    ctx.inputRef as unknown as React.RefObject<HTMLElement | null>,
  );
  if (!ctx.open) return null;

  return (
    <Portal>
      <div
        ref={floatingRef}
        id={ctx.listboxId}
        role="listbox"
        aria-busy={ctx.loading || undefined}
        style={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          zIndex: 1000,
          ...style,
        }}
      >
        {ctx.options.length === 0 ? (
          <div role="option" aria-disabled="true" aria-selected="false">
            {ctx.loading ? loadingMessage : emptyMessage}
          </div>
        ) : (
          <ListboxOptions
            options={ctx.options}
            idPrefix={ctx.listboxId}
            highlightedIndex={ctx.highlightedIndex}
            onHighlight={ctx.setHighlightedIndex}
            isSelected={(v) => ctx.value === v}
            onPick={(opt) => {
              ctx.setValue(opt.value);
              ctx.setInputValue(opt.label);
              ctx.setOpen(false);
            }}
            renderOption={renderOption}
          />
        )}
      </div>
    </Portal>
  );
}

/**
 * Parts exported flat so `src/index.ts` can assemble the namespace in the
 * server graph, where each one is already a client reference. Internal: the
 * barrel re-exports by name and does not list these.
 */
export {
  ComboboxRoot,
  ComboboxInput,
  ComboboxList,
  SelectRoot,
  SelectTrigger,
  SearchRoot,
  MultiSelectRoot,
  MultiSelectInput,
  MultiSelectChips,
  MultiSelectList,
  MultiSelectSelectAll,
};

// ─────────── Select ───────────────────────────────────────────────

/**
 * Select - button-triggered listbox. Composition is a thin wrapper
 * over Combobox: instead of a typeable input, a Trigger button
 * displays the current value and opens the list. Filtering /
 * type-ahead is intentionally NOT a feature here - for that, use
 * Combobox.
 */
export interface SelectRootProps<T = string> extends Omit<
  ComboboxRootProps<T>,
  'inputValue' | 'onInputValueChange' | 'filter'
> {
  /** Placeholder rendered when no value is selected. */
  placeholder?: string;
}
function SelectRoot<T>(props: SelectRootProps<T>): ReactElement {
  return <ComboboxRoot {...props} />;
}

interface SelectTriggerChildProps {
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
  'aria-haspopup'?: string;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  ref?: React.Ref<HTMLElement>;
}
function SelectTrigger<T>({
  children,
}: {
  children: ReactElement<SelectTriggerChildProps>;
}): ReactElement {
  const ctx = useComboboxContext<T>('Select.Trigger');
  if (!isValidElement(children)) throw new Error('Select.Trigger expects a single element.');
  const childOnClick = children.props.onClick;
  const childOnKeyDown = children.props.onKeyDown;

  // Seed the highlight to the currently-selected option (or the first) when
  // opening, so arrow keys start from a sensible place.
  const seedHighlight = (): void => {
    if (ctx.highlightedIndex >= 0) return;
    const curIdx = ctx.options.findIndex((o) => o.value === ctx.value);
    ctx.setHighlightedIndex(curIdx >= 0 ? curIdx : 0);
  };
  const commitHighlighted = (): void => {
    const max = ctx.options.length - 1;
    if (ctx.highlightedIndex < 0 || ctx.highlightedIndex > max) return;
    const opt = ctx.options[ctx.highlightedIndex]!;
    if (opt.disabled === true) return;
    ctx.setValue(opt.value);
    ctx.setInputValue(opt.label);
    ctx.setOpen(false);
  };

  return cloneElement(children, {
    ref: ctx.inputRef as unknown as React.Ref<HTMLElement>,
    'aria-haspopup': 'listbox',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.listboxId,
    // Track the active option for AT while the listbox is open.
    ...(ctx.open && ctx.highlightedIndex >= 0 && ctx.options[ctx.highlightedIndex] !== undefined
      ? { 'aria-activedescendant': `${ctx.listboxId}-option-${ctx.highlightedIndex}` }
      : {}),
    onClick: (e: MouseEvent<HTMLElement>) => {
      childOnClick?.(e);
      if (!e.defaultPrevented) ctx.setOpen(!ctx.open);
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      childOnKeyDown?.(e);
      if (e.defaultPrevented) return;
      const max = ctx.options.length - 1;
      // Closed: open on the standard listbox keys (and seed the highlight).
      if (!ctx.open) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          ctx.setOpen(true);
          seedHighlight();
        }
        return;
      }
      // Open: full listbox navigation - previously a dead end (arrows moved
      // nothing, Enter/Escape were swallowed).
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
        case 'Enter':
        case ' ':
          e.preventDefault();
          commitHighlighted();
          break;
        case 'Escape':
          e.preventDefault();
          ctx.setOpen(false);
          ctx.setHighlightedIndex(-1);
          break;
        case 'Tab':
          // Tabbing away closes without committing the highlight.
          ctx.setOpen(false);
          break;
      }
    },
  });
}

// ─────────── Search ───────────────────────────────────────────────

/**
 * Search - Combobox tuned for free-text input. Same prop surface;
 * the only difference is `aria-autocomplete="list"` is fixed (no
 * inline autocomplete) and a `role="search"` wrapper is rendered
 * around the trigger / list.
 */
function SearchRoot<T>({ children, ...rest }: ComboboxRootProps<T>): ReactElement {
  return (
    <div role="search">
      <ComboboxRoot {...rest}>{children}</ComboboxRoot>
    </div>
  );
}

// ─────────── MultiSelect ──────────────────────────────────────────

/**
 * MultiSelect - listbox-style picker that holds a `value: T[]` selection.
 * Selection is toggle-on-click rather than replace; clicking an already-
 * selected item removes it. Backspace inside an empty input pops the last
 * chip (standard chip-input affordance). `maxSelections` caps the array
 * length; further attempts to add are a no-op. `enableSelectAll` exposes
 * a `<MultiSelect.SelectAll>` control that toggles every non-disabled
 * option in the current filter.
 *
 * ```tsx
 * <MultiSelect.Root options={langs} value={value} onValueChange={setValue}>
 *   <MultiSelect.Chips renderChip={(opt, { remove }) => (
 *     <span>{opt.label}<button onClick={remove}>×</button></span>
 *   )} />
 *   <MultiSelect.Input placeholder="Type to filter..." />
 *   <MultiSelect.List />
 * </MultiSelect.Root>
 * ```
 */

interface MultiSelectContextValue<T = string> {
  readonly open: boolean;
  readonly setOpen: (next: boolean) => void;
  readonly values: ReadonlyArray<T>;
  readonly toggleValue: (v: T) => void;
  readonly removeValue: (v: T) => void;
  readonly clearValues: () => void;
  readonly selectAllFiltered: () => void;
  readonly isSelected: (v: T) => boolean;
  readonly inputValue: string;
  readonly setInputValue: (next: string) => void;
  readonly filteredOptions: ReadonlyArray<ComboboxOption<T>>;
  readonly allOptions: ReadonlyArray<ComboboxOption<T>>;
  readonly highlightedIndex: number;
  readonly setHighlightedIndex: (i: number) => void;
  readonly listboxId: string;
  readonly inputRef: React.RefObject<HTMLInputElement | null>;
  readonly maxSelections: number | undefined;
  readonly enableSelectAll: boolean;
}
const MultiSelectContext = createContext<MultiSelectContextValue<unknown> | null>(null);
function useMultiSelectContext<T>(component: string): MultiSelectContextValue<T> {
  const ctx = useContext(MultiSelectContext);
  if (ctx === null) throw new Error(`${component} must be inside <MultiSelect.Root>.`);
  return ctx as MultiSelectContextValue<T>;
}

export interface MultiSelectRootProps<T = string> {
  options: ReadonlyArray<ComboboxOption<T>>;
  /** Controlled selection. Pass `value={undefined}` to mean "controlled,
   * empty" - detected via `'value' in props`, so it stays controlled rather
   * than reverting to the uncontrolled `defaultValue`. */
  value?: ReadonlyArray<T> | undefined;
  defaultValue?: ReadonlyArray<T>;
  onValueChange?: (next: ReadonlyArray<T>) => void;
  inputValue?: string;
  onInputValueChange?: (next: string) => void;
  filter?: (option: ComboboxOption<T>, input: string) => boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Cap on how many items can be selected. Adding past the cap is a no-op. */
  maxSelections?: number;
  /** Surface a `<MultiSelect.SelectAll>` toggle. Off by default. */
  enableSelectAll?: boolean;
  children?: ReactNode;
}
function MultiSelectRoot<T>(props: MultiSelectRootProps<T>): ReactElement {
  const {
    options,
    value: controlledValue,
    defaultValue,
    onValueChange,
    inputValue: controlledInput,
    onInputValueChange,
    filter,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    maxSelections,
    enableSelectAll = false,
    children,
  } = props;
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  // `'value' in props`, not `controlledValue !== undefined`, so passing
  // `value={undefined}` to mean "controlled, empty" stays controlled instead
  // of silently falling back to stale uncontrolled state - matching Combobox.
  // `values` must stay an array, so a controlled-but-undefined value resolves
  // to a *stable* empty array (controlled, empty), never the uncontrolled
  // state. The shared EMPTY_VALUES keeps the identity stable across renders so
  // it can sit in hook dependency arrays without re-running every render.
  const [rawValues, commit] = useControllableState({
    value: controlledValue,
    defaultValue: defaultValue ?? [],
    onChange: onValueChange,
    controlled: 'value' in props,
  });
  const values: ReadonlyArray<T> = rawValues ?? EMPTY_VALUES;

  const [inputValue, setInputValue] = useControllableState({
    value: controlledInput,
    defaultValue: '',
    onChange: onInputValueChange,
  });

  const filteredOptions = useMemo(() => {
    const fn = filter ?? defaultFilter;
    return options.filter((o) => fn(o, inputValue));
  }, [options, inputValue, filter]);

  const isSelected = useCallback((v: T) => values.includes(v), [values]);

  const toggleValue = useCallback(
    (v: T) => {
      if (values.includes(v)) {
        commit(values.filter((x) => x !== v));
        return;
      }
      if (maxSelections !== undefined && values.length >= maxSelections) return;
      commit([...values, v]);
    },
    [values, commit, maxSelections],
  );

  const removeValue = useCallback(
    (v: T) => commit(values.filter((x) => x !== v)),
    [values, commit],
  );

  const clearValues = useCallback(() => commit([]), [commit]);

  const selectAllFiltered = useCallback(() => {
    const enabled = filteredOptions.filter((o) => o.disabled !== true).map((o) => o.value);
    const allSelected = enabled.every((v) => values.includes(v));
    if (allSelected) {
      // Deselect the filtered subset, leave the rest.
      commit(values.filter((v) => !enabled.includes(v)));
      return;
    }
    const merged: T[] = [...values];
    for (const v of enabled) {
      if (merged.includes(v)) continue;
      if (maxSelections !== undefined && merged.length >= maxSelections) break;
      merged.push(v);
    }
    commit(merged);
  }, [filteredOptions, values, commit, maxSelections]);

  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  // Clamp the highlight when the filtered list shrinks (see ComboboxRoot).
  useEffect(() => {
    setHighlightedIndex((i) => (i > filteredOptions.length - 1 ? filteredOptions.length - 1 : i));
  }, [filteredOptions.length]);
  // Reset the highlight whenever the popup closes (see ComboboxRoot) so a
  // closed-list Enter can't toggle a value against a stale highlight.
  useEffect(() => {
    if (!open) setHighlightedIndex(-1);
  }, [open]);
  const reactId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <MultiSelectContext.Provider
      value={
        {
          open,
          setOpen,
          values: values as ReadonlyArray<unknown>,
          toggleValue: toggleValue as (v: unknown) => void,
          removeValue: removeValue as (v: unknown) => void,
          clearValues,
          selectAllFiltered,
          isSelected: isSelected as (v: unknown) => boolean,
          inputValue,
          setInputValue,
          filteredOptions: filteredOptions as ReadonlyArray<ComboboxOption<unknown>>,
          allOptions: options as ReadonlyArray<ComboboxOption<unknown>>,
          highlightedIndex,
          setHighlightedIndex,
          listboxId: `${reactId}-multilistbox`,
          inputRef,
          maxSelections,
          enableSelectAll,
        } satisfies MultiSelectContextValue<unknown>
      }
    >
      {children}
    </MultiSelectContext.Provider>
  );
}

function MultiSelectInput<T>({
  children,
  placeholder,
}: {
  children?: ReactElement<ComboboxInputChildProps>;
  placeholder?: string;
}): ReactElement {
  const ctx = useMultiSelectContext<T>('MultiSelect.Input');
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    const max = ctx.filteredOptions.length - 1;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!ctx.open) ctx.setOpen(true);
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
        // Only act while open - otherwise Enter to submit a form silently
        // toggles a value against a stale highlight with the popup closed.
        if (!ctx.open || ctx.highlightedIndex < 0 || ctx.highlightedIndex > max) return;
        const opt = ctx.filteredOptions[ctx.highlightedIndex]!;
        if (opt.disabled === true) return;
        e.preventDefault();
        ctx.toggleValue(opt.value);
        // Don't close - multi-select stays open so the user can pick more.
        break;
      }
      case 'Escape':
        if (ctx.open) {
          e.preventDefault();
          ctx.setOpen(false);
          ctx.setHighlightedIndex(-1);
        }
        break;
      case 'Backspace': {
        // Pop the last chip on backspace at empty input - standard
        // chip-input affordance.
        if (ctx.inputValue.length === 0 && ctx.values.length > 0) {
          e.preventDefault();
          ctx.removeValue(ctx.values[ctx.values.length - 1]!);
        }
        break;
      }
    }
  };

  const sharedProps = {
    ref: ctx.inputRef as React.Ref<HTMLInputElement>,
    role: 'combobox',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.listboxId,
    'aria-autocomplete': 'list' as const,
    ...(ctx.highlightedIndex >= 0 && ctx.filteredOptions[ctx.highlightedIndex] !== undefined
      ? { 'aria-activedescendant': `${ctx.listboxId}-option-${ctx.highlightedIndex}` }
      : {}),
    value: ctx.inputValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      ctx.setInputValue(e.target.value);
      if (!ctx.open) ctx.setOpen(true);
    },
    onFocus: () => ctx.setOpen(true),
    onKeyDown,
  };

  if (children !== undefined && isValidElement(children)) {
    return cloneElement(children, sharedProps);
  }
  return <input type="text" placeholder={placeholder} {...sharedProps} />;
}

function MultiSelectChips<T>({
  renderChip,
}: {
  renderChip: (option: ComboboxOption<T>, info: { remove: () => void; index: number }) => ReactNode;
}): ReactElement {
  const ctx = useMultiSelectContext<T>('MultiSelect.Chips');
  const lookup = useMemo(() => {
    const map = new Map<T, ComboboxOption<T>>();
    for (const o of ctx.allOptions) map.set(o.value, o);
    return map;
  }, [ctx.allOptions]);

  return (
    <>
      {ctx.values.map((v, i) => {
        const opt = lookup.get(v) ?? ({ value: v, label: String(v) } as ComboboxOption<T>);
        return (
          <span key={`${i}-${String(v)}`}>
            {renderChip(opt, { remove: () => ctx.removeValue(v), index: i })}
          </span>
        );
      })}
    </>
  );
}

function MultiSelectList<T>({
  placement = 'bottom',
  offset = 4,
  style,
  renderOption,
  emptyMessage = 'No options',
}: {
  placement?: Placement;
  offset?: number;
  style?: CSSProperties;
  renderOption?: (
    option: ComboboxOption<T>,
    info: {
      highlighted: boolean;
      selected: boolean;
      index: number;
    },
  ) => ReactNode;
  emptyMessage?: ReactNode;
}): ReactElement | null {
  const ctx = useMultiSelectContext<T>('MultiSelect.List');
  const { position, floatingRef } = useFloatingPosition(
    ctx.inputRef as unknown as React.RefObject<HTMLElement | null>,
    ctx.open,
    placement,
    offset,
  );
  // Ignore the input/trigger (the floating anchor and the toggle share
  // `inputRef`): a click there should toggle via the trigger's own handler,
  // not be dismissed on mousedown and then reopened by the click.
  useClickOutside(
    ctx.open,
    floatingRef,
    () => ctx.setOpen(false),
    ctx.inputRef as unknown as React.RefObject<HTMLElement | null>,
  );
  if (!ctx.open) return null;

  return (
    <Portal>
      <div
        ref={floatingRef}
        id={ctx.listboxId}
        role="listbox"
        aria-multiselectable="true"
        style={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          zIndex: 1000,
          ...style,
        }}
      >
        {ctx.filteredOptions.length === 0 ? (
          <div role="option" aria-disabled="true" aria-selected="false">
            {emptyMessage}
          </div>
        ) : (
          ctx.filteredOptions.map((opt, i) => {
            const optionId = `${ctx.listboxId}-option-${i}`;
            const highlighted = ctx.highlightedIndex === i;
            const selected = ctx.isSelected(opt.value);
            const handleClick = (): void => {
              if (opt.disabled === true) return;
              ctx.toggleValue(opt.value);
            };
            return (
              <div
                key={optionId}
                id={optionId}
                role="option"
                aria-selected={selected}
                aria-disabled={opt.disabled || undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleClick();
                }}
                onMouseEnter={() => ctx.setHighlightedIndex(i)}
              >
                {renderOption !== undefined
                  ? renderOption(opt, { highlighted, selected, index: i })
                  : opt.label}
              </div>
            );
          })
        )}
      </div>
    </Portal>
  );
}

interface SelectAllChildProps {
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
  'aria-checked'?: boolean | 'mixed';
  role?: string;
  tabIndex?: number;
}
function MultiSelectSelectAll<T>({
  children,
}: {
  children: ReactElement<SelectAllChildProps>;
}): ReactElement {
  const ctx = useMultiSelectContext<T>('MultiSelect.SelectAll');
  if (!ctx.enableSelectAll) {
    throw new Error('Pass `enableSelectAll` on <MultiSelect.Root> to use <MultiSelect.SelectAll>.');
  }
  if (!isValidElement(children)) {
    throw new Error('MultiSelect.SelectAll expects a single element.');
  }
  const enabledFiltered = ctx.filteredOptions.filter((o) => o.disabled !== true);
  const allSelected =
    enabledFiltered.length > 0 && enabledFiltered.every((o) => ctx.isSelected(o.value));
  const someSelected = enabledFiltered.some((o) => ctx.isSelected(o.value)) && !allSelected;
  const ariaChecked: boolean | 'mixed' = allSelected ? true : someSelected ? 'mixed' : false;
  const childOnClick = children.props.onClick;
  const childOnKeyDown = children.props.onKeyDown;
  return cloneElement(children, {
    role: 'checkbox',
    'aria-checked': ariaChecked,
    // role="checkbox" announces an interactive control, so it must be
    // keyboard-operable (WCAG 2.1.1). The child type allows a non-button
    // (span/div), which wouldn't activate on Space/Enter without this -
    // and tabIndex makes it reachable.
    tabIndex: children.props.tabIndex ?? 0,
    onClick: (e: MouseEvent<HTMLElement>) => {
      childOnClick?.(e);
      if (!e.defaultPrevented) ctx.selectAllFiltered();
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      childOnKeyDown?.(e);
      if (!e.defaultPrevented && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        ctx.selectAllFiltered();
      }
    },
  });
}

// ─────────── CommandPalette ───────────────────────────────────────
// CommandPalette ships in `./CommandPalette.tsx`. Re-exported from
// `./index.ts`; kept out of this file to keep the form-input family
// from blowing past 800 LOC.
