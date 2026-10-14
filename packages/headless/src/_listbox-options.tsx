'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import type { ComboboxOption } from './combobox.js';

export interface ListboxOptionsProps<T> {
  readonly options: ReadonlyArray<ComboboxOption<T>>;
  /** Prefix for each option's id: `${idPrefix}-option-${index}`. */
  readonly idPrefix: string;
  readonly highlightedIndex: number;
  readonly onHighlight: (index: number) => void;
  readonly isSelected: (value: T) => boolean;
  /** Called with an enabled option the pointer picked. */
  readonly onPick: (option: ComboboxOption<T>) => void;
  readonly renderOption?:
    | ((
        option: ComboboxOption<T>,
        info: { highlighted: boolean; selected: boolean; index: number },
      ) => ReactNode)
    | undefined;
  /** The scrolling element around the rows; long lists window against it. */
  readonly scrollRef: RefObject<HTMLElement | null>;
  /** Fixed row height in px. Omitted, it is measured from the first row. */
  readonly itemHeight?: number | undefined;
}

/** Lists this long render only the rows in view. */
const WINDOW_THRESHOLD = 50;
/** Rows rendered beyond each edge of the view, and before a row is measured. */
const OVERSCAN = 8;

/** The id `ListboxOptions` gives the option at `index`. */
export function optionId(idPrefix: string, index: number): string {
  return `${idPrefix}-option-${index}`;
}

/**
 * The `role="option"` rows of a listbox, shared by the Combobox family's popups
 * and the standalone Listbox. Picking happens on mousedown, with its default
 * prevented, so focus stays wherever the list's keyboard handling lives.
 *
 * From 50 options the rows window themselves against `scrollRef`, which assumes
 * uniform row heights. A highlight change scrolls its row into view, so the
 * `aria-activedescendant` target is always rendered.
 */
export function ListboxOptions<T>({
  options,
  idPrefix,
  highlightedIndex,
  onHighlight,
  isSelected,
  onPick,
  renderOption,
  scrollRef,
  itemHeight,
}: ListboxOptionsProps<T>): ReactElement {
  const windowed = options.length >= WINDOW_THRESHOLD;
  // 0 until the first row is measured; -1 when it can't be (no layout).
  const [measured, setMeasured] = useState(0);
  const rowHeight = itemHeight ?? Math.max(measured, 0);
  const [view, setView] = useState({ top: 0, height: 0 });

  const sync = useCallback(() => {
    const el = scrollRef.current;
    if (el !== null) setView({ top: el.scrollTop, height: el.clientHeight });
  }, [scrollRef]);

  // Passive, not layout: the container's ref is attached after its children's
  // layout effects run on the first commit.
  useEffect(() => {
    const el = scrollRef.current;
    if (!windowed || el === null) return;
    if (itemHeight === undefined) {
      const row = el.querySelector<HTMLElement>('[role="option"]');
      setMeasured(row !== null && row.offsetHeight > 0 ? row.offsetHeight : -1);
    }
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    return () => el.removeEventListener('scroll', sync);
  }, [windowed, itemHeight, scrollRef, sync]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!windowed || rowHeight === 0 || el === null || highlightedIndex < 0) return;
    const top = highlightedIndex * rowHeight;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + rowHeight > el.scrollTop + el.clientHeight) {
      el.scrollTop = top + rowHeight - el.clientHeight;
    } else return;
    sync();
  }, [windowed, rowHeight, highlightedIndex, scrollRef, sync]);

  // Before the first row is measured, render a few to measure; when nothing
  // can be (no layout, as in a test DOM), render every row.
  let start = 0;
  let end = options.length;
  if (windowed && rowHeight > 0) {
    start = Math.max(0, Math.floor(view.top / rowHeight) - OVERSCAN);
    end = Math.min(options.length, Math.ceil((view.top + view.height) / rowHeight) + OVERSCAN);
  } else if (windowed && measured === 0) {
    end = OVERSCAN;
  }

  return (
    <>
      {start > 0 && <div aria-hidden="true" style={{ height: start * rowHeight }} />}
      {options.slice(start, end).map((opt, offset) => {
        const i = start + offset;
        const id = optionId(idPrefix, i);
        const highlighted = highlightedIndex === i;
        const selected = isSelected(opt.value);
        return (
          <div
            key={id}
            id={id}
            role="option"
            aria-selected={selected}
            aria-disabled={opt.disabled || undefined}
            aria-setsize={windowed ? options.length : undefined}
            aria-posinset={windowed ? i + 1 : undefined}
            onMouseDown={(e) => {
              e.preventDefault();
              if (opt.disabled !== true) onPick(opt);
            }}
            onMouseEnter={() => onHighlight(i)}
          >
            {renderOption !== undefined
              ? renderOption(opt, { highlighted, selected, index: i })
              : opt.label}
          </div>
        );
      })}
      {end < options.length && (
        <div aria-hidden="true" style={{ height: (options.length - end) * rowHeight }} />
      )}
    </>
  );
}
