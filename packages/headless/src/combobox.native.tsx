import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { nativeText } from './_native-text.js';
import { defaultFilter } from './_combobox-filter.js';
import { useControllableState } from './use-controllable-state.js';

/**
 * Native Combobox / Select / Search / MultiSelect.
 *
 * The web variants float a positioned listbox under an inline
 * input. On native, that doesn't work well - small screens, no
 * cursor, no keyboard nav. The platform-correct affordance is a
 * bottom-sheet (Modal) that takes over the lower half of the screen
 * when the user activates the trigger; the user picks via tap.
 *
 * The composition mirrors the web exports: Root / Input / List for
 * Combobox & Search; Root / Trigger / List for Select; and Root /
 * Input / Chips / List / SelectAll for MultiSelect.
 */

// Stable empty selection for a controlled MultiSelect whose `value` is
// `undefined` (controlled, empty). A fresh `[]` each render would change
// identity and re-run dependent hooks; this shared frozen array keeps it
// stable. Mirrors the web combobox.
const EMPTY_VALUES: readonly never[] = [];

// ─────────── Combobox ─────────────────────────────────────────────

export interface ComboboxOption<T = string> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
  /** A heading the option is listed under, shown above the first of a run. */
  readonly group?: string;
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
  readonly listboxId: string;
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

  // Detect controlled-ness by prop presence so `value={undefined}` stays
  // "controlled, empty" instead of falling back to stale internal state -
  // mirroring the web combobox.
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

  const reactId = useId();

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
          listboxId: `${reactId}-listbox`,
        } satisfies ComboboxContextValue<unknown>
      }
    >
      {children}
    </ComboboxContext.Provider>
  );
}

interface ComboboxInputChildProps extends Partial<TextInputProps> {
  ref?: React.Ref<TextInput>;
}
function ComboboxInput<T>({
  children,
  placeholder,
}: {
  children?: ReactElement<ComboboxInputChildProps>;
  placeholder?: string;
}): ReactElement {
  const ctx = useComboboxContext<T>('Combobox.Input');
  const sharedProps: ComboboxInputChildProps = {
    accessibilityRole: 'search',
    accessibilityHint: ctx.listboxId,
    value: ctx.inputValue,
    onChangeText: (text: string) => {
      ctx.setInputValue(text);
      if (!ctx.open) ctx.setOpen(true);
    },
    onFocus: () => ctx.setOpen(true),
  };
  if (children !== undefined && isValidElement(children)) {
    return cloneElement(children, sharedProps);
  }
  return <TextInput placeholder={placeholder} {...sharedProps} />;
}

/** A heading row where a group starts: the native sheets' version of the web
 * listbox's labelled groups. */
function groupHeader<T>(options: ReadonlyArray<ComboboxOption<T>>, i: number): ReactNode {
  const group = options[i]?.group;
  if (group === undefined || options[i - 1]?.group === group) return null;
  return <View accessibilityRole="header">{nativeText(group)}</View>;
}

function ComboboxList<T>({
  style,
  renderOption,
  emptyMessage = 'No options',
  loadingMessage = 'Loading...',
}: {
  style?: ViewStyle;
  renderOption?: (
    option: ComboboxOption<T>,
    info: { selected: boolean; index: number },
  ) => ReactNode;
  emptyMessage?: ReactNode;
  /** Shown in place of `emptyMessage` while the root is `loading`. */
  loadingMessage?: ReactNode;
}): ReactElement | null {
  const ctx = useComboboxContext<T>('Combobox.List');
  if (!ctx.open) return null;
  return (
    <Modal transparent visible animationType="slide" onRequestClose={() => ctx.setOpen(false)}>
      <Pressable
        onPress={() => ctx.setOpen(false)}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <Pressable onPress={(e) => e.stopPropagation?.()} style={style}>
          <View
            nativeID={ctx.listboxId}
            accessibilityRole="list"
            accessibilityState={{ busy: ctx.loading }}
            style={{ maxHeight: '60%' }}
          >
            <FlatList
              data={ctx.options}
              keyExtractor={(_, i) => `${ctx.listboxId}-option-${i}`}
              ListEmptyComponent={
                <View accessibilityRole="text">
                  {nativeText(ctx.loading ? loadingMessage : emptyMessage)}
                </View>
              }
              renderItem={({ item: opt, index: i }) => {
                const optionId = `${ctx.listboxId}-option-${i}`;
                const selected = ctx.value === opt.value;
                return (
                  <>
                    {groupHeader(ctx.options, i)}
                    <Pressable
                      nativeID={optionId}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: opt.disabled === true }}
                      disabled={opt.disabled}
                      onPress={() => {
                        if (opt.disabled === true) return;
                        ctx.setValue(opt.value);
                        ctx.setInputValue(opt.label);
                        ctx.setOpen(false);
                      }}
                    >
                      {renderOption !== undefined
                        ? renderOption(opt, { selected, index: i })
                        : nativeText(opt.label)}
                    </Pressable>
                  </>
                );
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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

export interface SelectRootProps<T = string> extends Omit<
  ComboboxRootProps<T>,
  'inputValue' | 'onInputValueChange' | 'filter'
> {
  placeholder?: string;
}
function SelectRoot<T>(props: SelectRootProps<T>): ReactElement {
  return <ComboboxRoot {...props} />;
}

interface SelectTriggerChildProps {
  onPress?: () => void;
  accessibilityState?: { expanded?: boolean };
  ref?: React.Ref<unknown>;
}
function SelectTrigger<T>({
  children,
}: {
  children: ReactElement<SelectTriggerChildProps>;
}): ReactElement {
  const ctx = useComboboxContext<T>('Select.Trigger');
  if (!isValidElement(children)) throw new Error('Select.Trigger expects a single element.');
  const childOnPress = children.props.onPress;
  return cloneElement(children, {
    accessibilityState: { expanded: ctx.open },
    onPress: () => {
      childOnPress?.();
      ctx.setOpen(!ctx.open);
    },
  });
}

// ─────────── Search ───────────────────────────────────────────────

function SearchRoot<T>({ children, ...rest }: ComboboxRootProps<T>): ReactElement {
  return (
    <View accessibilityRole="search">
      <ComboboxRoot {...rest}>{children}</ComboboxRoot>
    </View>
  );
}

// ─────────── MultiSelect ──────────────────────────────────────────

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
  readonly listboxId: string;
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
  value?: ReadonlyArray<T>;
  defaultValue?: ReadonlyArray<T>;
  onValueChange?: (next: ReadonlyArray<T>) => void;
  inputValue?: string;
  onInputValueChange?: (next: string) => void;
  filter?: (option: ComboboxOption<T>, input: string) => boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  maxSelections?: number;
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
  // Prop-presence detection so a controlled MultiSelect cleared to
  // `value={undefined}` stays controlled-and-empty (stable EMPTY_VALUES
  // identity), instead of resurrecting stale toggled chips. Mirrors web.
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
  const reactId = useId();

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
          listboxId: `${reactId}-multilistbox`,
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
  const sharedProps: ComboboxInputChildProps = {
    accessibilityHint: ctx.listboxId,
    value: ctx.inputValue,
    onChangeText: (text: string) => {
      ctx.setInputValue(text);
      if (!ctx.open) ctx.setOpen(true);
    },
    onFocus: () => ctx.setOpen(true),
  };
  if (children !== undefined && isValidElement(children)) {
    return cloneElement(children, sharedProps);
  }
  return <TextInput placeholder={placeholder} {...sharedProps} />;
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
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {ctx.values.map((v, i) => {
        const opt = lookup.get(v) ?? ({ value: v, label: String(v) } as ComboboxOption<T>);
        return (
          <View key={`${i}-${String(v)}`}>
            {renderChip(opt, { remove: () => ctx.removeValue(v), index: i })}
          </View>
        );
      })}
    </View>
  );
}

function MultiSelectList<T>({
  style,
  renderOption,
  emptyMessage = 'No options',
}: {
  style?: ViewStyle;
  renderOption?: (
    option: ComboboxOption<T>,
    info: { selected: boolean; index: number },
  ) => ReactNode;
  emptyMessage?: ReactNode;
}): ReactElement | null {
  const ctx = useMultiSelectContext<T>('MultiSelect.List');
  if (!ctx.open) return null;
  return (
    <Modal transparent visible animationType="slide" onRequestClose={() => ctx.setOpen(false)}>
      <Pressable
        onPress={() => ctx.setOpen(false)}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <Pressable onPress={(e) => e.stopPropagation?.()} style={style}>
          <View
            nativeID={ctx.listboxId}
            accessibilityRole="list"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...({ 'aria-multiselectable': true } as any)}
            style={{ maxHeight: '60%' }}
          >
            <FlatList
              data={ctx.filteredOptions}
              keyExtractor={(_, i) => `${ctx.listboxId}-option-${i}`}
              ListEmptyComponent={<View accessibilityRole="text">{nativeText(emptyMessage)}</View>}
              renderItem={({ item: opt, index: i }) => {
                const optionId = `${ctx.listboxId}-option-${i}`;
                const selected = ctx.isSelected(opt.value);
                return (
                  <>
                    {groupHeader(ctx.filteredOptions, i)}
                    <Pressable
                      nativeID={optionId}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected, disabled: opt.disabled === true }}
                      disabled={opt.disabled}
                      onPress={() => {
                        if (opt.disabled === true) return;
                        ctx.toggleValue(opt.value);
                      }}
                    >
                      {renderOption !== undefined
                        ? renderOption(opt, { selected, index: i })
                        : nativeText(opt.label)}
                    </Pressable>
                  </>
                );
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface MultiSelectSelectAllChildProps {
  onPress?: () => void;
  accessibilityState?: { checked?: boolean | 'mixed' };
}
function MultiSelectSelectAll<T>({
  children,
}: {
  children: ReactElement<MultiSelectSelectAllChildProps>;
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
  const checked: boolean | 'mixed' = allSelected ? true : someSelected ? 'mixed' : false;
  const childOnPress = children.props.onPress;
  return cloneElement(children, {
    accessibilityState: { checked },
    onPress: () => {
      childOnPress?.();
      ctx.selectAllFiltered();
    },
  });
}
