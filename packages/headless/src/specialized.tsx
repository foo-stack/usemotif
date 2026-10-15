'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  parseColor,
  formatColor,
  clamp01,
  clampHue,
  type ColorFormat,
  type HSVColor,
} from './_color.js';
import { useControllableState } from './use-controllable-state.js';
import { sortFiles, type FileFacts, type FileRejection } from './_file-rules.js';

export type { FileRejection, FileRejectionReason } from './_file-rules.js';
export { formatColor, parseColor } from './_color.js';
export type { ColorFormat } from './_color.js';

/**
 * Specialized - ColorPicker, FileUpload, TreeView.
 *
 * - ColorPicker: full HSV picker with saturation×value plane, hue slider,
 *   optional alpha slider, format toggle (hex / rgb / hsl). Keyboard +
 *   pointer driven; headless wiring (ARIA + state), no built-in styling
 *   beyond the minimum geometry needed for the drag surfaces.
 * - FileUpload wraps `<input type="file">` with a drag-drop region.
 * - TreeView is a real implementation: nested items, ARIA tree
 *   pattern (role="tree", role="treeitem", aria-expanded /
 *   aria-selected), arrow-key navigation.
 */

// ─────────── ColorPicker - HSV ────────────────────────────────────

export interface ColorPickerProps {
  /** Current colour as a CSS string. Format follows `format`. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (next: string) => void;
  /** Output format. Defaults to `'hex'`. */
  format?: ColorFormat;
  onFormatChange?: (next: ColorFormat) => void;
  /** When true (and format != 'hex'), render an alpha slider. */
  allowAlpha?: boolean;
  /** Format options shown in the toggle. Pass `[]` to hide. */
  formats?: ReadonlyArray<ColorFormat>;
  disabled?: boolean;
  /** Inline style for the picker root. */
  style?: CSSProperties;
  /** Inline style for the saturation×value plane wrapper. */
  saturationValueStyle?: CSSProperties;
  /** Inline style for the SV thumb. */
  saturationValueThumbStyle?: CSSProperties;
  /** Inline style for the hue slider track. */
  hueSliderStyle?: CSSProperties;
  /** Inline style for the alpha slider track. */
  alphaSliderStyle?: CSSProperties;
  /** Preset colours offered as a radio group under the picker. */
  swatches?: ReadonlyArray<string>;
  /** Inline style for each swatch; its `background` is the colour. */
  swatchStyle?: CSSProperties;
  /** Adds a button that picks a colour from anywhere on screen, where the
   * browser has the EyeDropper API. */
  eyeDropper?: boolean;
  /** Content of the eyedropper button. Defaults to "Pick". */
  eyeDropperLabel?: ReactNode;
  /** Inline style for the eyedropper button. */
  eyeDropperStyle?: CSSProperties;
}

/**
 * Headless HSV colour picker.
 *
 * Drag the saturation×value plane to pick chroma + brightness, the hue
 * slider for hue, and the alpha slider for transparency (when enabled
 * and the format isn't `hex`). The format toggle round-trips the value
 * through `parseColor` / `formatColor` so callers can swap between
 * `hex`, `rgb`, and `hsl` representations of the same colour.
 *
 * Keyboard: arrow keys on the SV plane move the thumb; Shift+arrow takes
 * larger steps. Sliders use the standard slider keys (Arrow / Home / End
 * / PageUp / PageDown).
 *
 * ```tsx
 * const [value, setValue] = useState('#3b82f6');
 * <ColorPicker value={value} onValueChange={setValue} format="rgb" allowAlpha />
 * ```
 */
export function ColorPicker({
  value: controlled,
  defaultValue = '#000000',
  onValueChange,
  format: controlledFormat,
  onFormatChange,
  allowAlpha = false,
  formats = ['hex', 'rgb', 'hsl'],
  disabled = false,
  style,
  saturationValueStyle,
  saturationValueThumbStyle,
  hueSliderStyle,
  alphaSliderStyle,
  swatches,
  swatchStyle,
  eyeDropper = false,
  eyeDropperLabel = 'Pick',
  eyeDropperStyle,
}: ColorPickerProps): ReactElement {
  const [format, commitFormat] = useControllableState<ColorFormat>({
    value: controlledFormat,
    defaultValue: 'hex',
    onChange: onFormatChange,
  });

  // Keep an internal HSV state so dragging in low-saturation / zero-value
  // regions doesn't lose hue information that doesn't survive the round-
  // trip through RGB.
  const [hsv, setHsv] = useState<HSVColor>(() => parseColor(controlled ?? defaultValue));
  const isControlled = controlled !== undefined;

  // Track the most recent value we emitted, so externally-changed
  // `value` updates re-parse but our own emissions don't loop.
  const lastEmittedRef = useRef<string | null>(controlled ?? null);

  useEffect(() => {
    if (!isControlled || controlled === undefined) return;
    if (controlled === lastEmittedRef.current) return;
    lastEmittedRef.current = controlled;
    setHsv(parseColor(controlled));
  }, [controlled, isControlled]);

  const commit = useCallback(
    (next: HSVColor) => {
      setHsv(next);
      const formatted = formatColor(next, format);
      lastEmittedRef.current = formatted;
      onValueChange?.(formatted);
    },
    [onValueChange, format],
  );

  const setFormat = useCallback(
    (next: ColorFormat) => {
      commitFormat(next);
      // Re-emit the current colour in the new format so consumers see
      // the updated string immediately.
      const formatted = formatColor(hsv, next);
      lastEmittedRef.current = formatted;
      onValueChange?.(formatted);
    },
    [commitFormat, onValueChange, hsv],
  );

  const setSV = useCallback(
    (s: number, v: number) => commit({ ...hsv, s: clamp01(s), v: clamp01(v) }),
    [hsv, commit],
  );
  const setHue = useCallback((h: number) => commit({ ...hsv, h: clampHue(h) }), [hsv, commit]);
  const setAlpha = useCallback((a: number) => commit({ ...hsv, a: clamp01(a) }), [hsv, commit]);

  const showAlpha = allowAlpha && format !== 'hex';

  // Detected after mount, so the server render and the first client render agree.
  const [canPickFromScreen, setCanPickFromScreen] = useState(false);
  useEffect(() => setCanPickFromScreen('EyeDropper' in window), []);
  const pickFromScreen = useCallback(async () => {
    const Dropper = (window as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } })
      .EyeDropper;
    if (Dropper === undefined) return;
    try {
      commit({ ...parseColor((await new Dropper().open()).sRGBHex), a: hsv.a });
    } catch {
      // The user dismissed the eyedropper (Escape): keep the colour.
    }
  }, [commit, hsv.a]);

  return (
    <div role="group" aria-label="Colour picker" style={{ display: 'inline-block', ...style }}>
      <SaturationValuePlane
        hsv={hsv}
        disabled={disabled}
        onChange={setSV}
        style={saturationValueStyle}
        thumbStyle={saturationValueThumbStyle}
      />
      <HueSlider hue={hsv.h} disabled={disabled} onChange={setHue} style={hueSliderStyle} />
      {showAlpha ? (
        <AlphaSlider hsv={hsv} disabled={disabled} onChange={setAlpha} style={alphaSliderStyle} />
      ) : null}
      {formats.length > 0 ? (
        <FormatToggle format={format} options={formats} onChange={setFormat} />
      ) : null}
      {swatches !== undefined && swatches.length > 0 ? (
        <Swatches
          colors={swatches}
          current={formatColor(hsv, 'hex')}
          disabled={disabled}
          onPick={(c) => commit({ ...parseColor(c), a: hsv.a })}
          swatchStyle={swatchStyle}
        />
      ) : null}
      {eyeDropper && canPickFromScreen ? (
        <button
          type="button"
          disabled={disabled}
          aria-label="Pick a colour from the screen"
          onClick={() => void pickFromScreen()}
          style={eyeDropperStyle}
        >
          {eyeDropperLabel}
        </button>
      ) : null}
    </div>
  );
}

const SWATCH: CSSProperties = { width: 20, height: 20, cursor: 'pointer' };

/**
 * The preset colours as a radio group: one tab stop, the arrow keys move and
 * select, Home and End jump to the ends, and the swatch matching the current
 * colour is checked.
 */
function Swatches({
  colors,
  current,
  disabled,
  onPick,
  swatchStyle,
}: {
  colors: ReadonlyArray<string>;
  current: string;
  disabled: boolean;
  onPick: (color: string) => void;
  swatchStyle: CSSProperties | undefined;
}): ReactElement {
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const checked = colors.findIndex((c) => formatColor(parseColor(c), 'hex') === current);
  const tabStop = checked === -1 ? 0 : checked;
  function go(i: number): void {
    const n = (i + colors.length) % colors.length;
    refs.current[n]?.focus();
    onPick(colors[n]!);
  }
  return (
    <div
      role="radiogroup"
      aria-label="Swatches"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
    >
      {colors.map((c, i) => (
        <div
          key={`${c}-${i}`}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="radio"
          aria-checked={i === checked}
          aria-label={c}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : i === tabStop ? 0 : -1}
          onClick={() => {
            if (!disabled) onPick(c);
          }}
          onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
            if (disabled) return;
            const to =
              e.key === 'ArrowRight' || e.key === 'ArrowDown'
                ? i + 1
                : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                  ? i - 1
                  : e.key === 'Home'
                    ? 0
                    : e.key === 'End'
                      ? colors.length - 1
                      : undefined;
            if (to !== undefined) {
              e.preventDefault();
              go(to);
            } else if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onPick(c);
            }
          }}
          style={{ ...SWATCH, background: c, ...swatchStyle }}
        />
      ))}
    </div>
  );
}

function SaturationValuePlane({
  hsv,
  disabled,
  onChange,
  style,
  thumbStyle,
}: {
  hsv: HSVColor;
  disabled: boolean;
  onChange: (s: number, v: number) => void;
  style?: CSSProperties | undefined;
  thumbStyle?: CSSProperties | undefined;
}): ReactElement {
  const planeRef = useRef<HTMLDivElement | null>(null);
  // Tear down an in-flight drag on unmount so a closing ColorPicker doesn't
  // leak the pointermove/pointerup listeners or fire onChange after unmount.
  const dragCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => dragCleanupRef.current?.(), []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    if (disabled) return;
    const plane = planeRef.current;
    if (plane === null) return;
    plane.setPointerCapture(e.pointerId);
    const update = (clientX: number, clientY: number): void => {
      const rect = plane.getBoundingClientRect();
      const s = clamp01((clientX - rect.left) / rect.width);
      const v = 1 - clamp01((clientY - rect.top) / rect.height);
      onChange(s, v);
    };
    update(e.clientX, e.clientY);
    const onMove = (mv: globalThis.PointerEvent): void => update(mv.clientX, mv.clientY);
    const cleanup = (): void => {
      plane.removeEventListener('pointermove', onMove);
      plane.removeEventListener('pointerup', onUp);
      plane.removeEventListener('pointercancel', onUp);
      dragCleanupRef.current = null;
    };
    const onUp = (): void => cleanup();
    plane.addEventListener('pointermove', onMove);
    plane.addEventListener('pointerup', onUp);
    plane.addEventListener('pointercancel', onUp);
    dragCleanupRef.current = cleanup;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (disabled) return;
    const step = e.shiftKey ? 0.1 : 0.01;
    let s = hsv.s;
    let v = hsv.v;
    switch (e.key) {
      case 'ArrowLeft':
        s -= step;
        break;
      case 'ArrowRight':
        s += step;
        break;
      case 'ArrowUp':
        v += step;
        break;
      case 'ArrowDown':
        v -= step;
        break;
      case 'Home':
        s = 0;
        v = 1;
        break;
      case 'End':
        s = 1;
        v = 0;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(s, v);
  };

  return (
    <div
      ref={planeRef}
      // A 2D saturation/value control. `role="application"` suppressed
      // browse-mode for the whole subtree; `role="slider"` with an
      // `aria-valuetext` describing both axes is the safer model - it announces
      // the current position without trapping the reader in application mode.
      role="slider"
      aria-label="Saturation and value selector"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(hsv.s * 100)}
      aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, value ${Math.round(hsv.v * 100)}%`}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      style={{
        position: 'relative',
        userSelect: 'none',
        touchAction: 'none',
        outline: 'none',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: `${hsv.s * 100}%`,
          top: `${(1 - hsv.v) * 100}%`,
          ...thumbStyle,
        }}
      />
    </div>
  );
}

function HueSlider({
  hue,
  disabled,
  onChange,
  style,
}: {
  hue: number;
  disabled: boolean;
  onChange: (next: number) => void;
  style?: CSSProperties | undefined;
}): ReactElement {
  return (
    <ScalarSlider
      ariaLabel="Hue"
      min={0}
      // 359, not 360: hue is cyclic so 360 ≡ 0, and `clampHue(360)` maps to 0
      // - with max=360 pressing End teleported the thumb from 100% to 0% and
      // reported aria-valuenow=0. Capping at 359 keeps the top of the track a
      // distinct, reachable value.
      max={359}
      step={1}
      value={hue}
      disabled={disabled}
      onChange={onChange}
      style={style}
    />
  );
}

function AlphaSlider({
  hsv,
  disabled,
  onChange,
  style,
}: {
  hsv: HSVColor;
  disabled: boolean;
  onChange: (next: number) => void;
  style?: CSSProperties | undefined;
}): ReactElement {
  return (
    <ScalarSlider
      ariaLabel="Alpha"
      min={0}
      max={1}
      step={0.01}
      value={hsv.a}
      disabled={disabled}
      onChange={onChange}
      style={style}
    />
  );
}

function ScalarSlider({
  ariaLabel,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
  style,
}: {
  ariaLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled: boolean;
  onChange: (next: number) => void;
  style?: CSSProperties | undefined;
}): ReactElement {
  const trackRef = useRef<HTMLDivElement | null>(null);
  // Tear down an in-flight drag on unmount (leak / setState-after-unmount guard).
  const dragCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => dragCleanupRef.current?.(), []);
  const setValue = useCallback(
    (n: number) => {
      onChange(Math.max(min, Math.min(max, n)));
    },
    [onChange, min, max],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (disabled) return;
    const big = step * 10;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        setValue(value + step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        setValue(value - step);
        break;
      case 'PageUp':
        setValue(value + big);
        break;
      case 'PageDown':
        setValue(value - big);
        break;
      case 'Home':
        setValue(min);
        break;
      case 'End':
        setValue(max);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    if (disabled) return;
    const track = trackRef.current;
    if (track === null) return;
    track.setPointerCapture(e.pointerId);
    const update = (clientX: number): void => {
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setValue(min + ratio * (max - min));
    };
    update(e.clientX);
    const onMove = (mv: globalThis.PointerEvent): void => update(mv.clientX);
    const cleanup = (): void => {
      track.removeEventListener('pointermove', onMove);
      track.removeEventListener('pointerup', onUp);
      track.removeEventListener('pointercancel', onUp);
      dragCleanupRef.current = null;
    };
    const onUp = (): void => cleanup();
    track.addEventListener('pointermove', onMove);
    track.addEventListener('pointerup', onUp);
    track.addEventListener('pointercancel', onUp);
    dragCleanupRef.current = cleanup;
  };

  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      style={{
        position: 'relative',
        userSelect: 'none',
        touchAction: 'none',
        outline: 'none',
        ...style,
      }}
    >
      <div style={{ position: 'absolute', left: `${percent}%`, top: 0, bottom: 0 }} />
    </div>
  );
}

function FormatToggle({
  format,
  options,
  onChange,
}: {
  format: ColorFormat;
  options: ReadonlyArray<ColorFormat>;
  onChange: (next: ColorFormat) => void;
}): ReactElement {
  const groupId = useId();
  // APG radiogroup: a single tab stop (roving tabindex) plus arrow-key
  // movement, not every radio tabbable with no keyboard navigation.
  const selectedIdx = Math.max(0, options.indexOf(format));

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number): void => {
    let nextIdx: number;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIdx = (idx + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIdx = (idx - 1 + options.length) % options.length;
    } else {
      return;
    }
    e.preventDefault();
    onChange(options[nextIdx]!);
    // Move focus to follow selection (radios select on arrow per APG).
    const radios = document
      .getElementById(groupId)
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    radios?.[nextIdx]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Colour format" id={groupId}>
      {options.map((opt, idx) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={opt === format}
          tabIndex={idx === selectedIdx ? 0 : -1}
          onKeyDown={(e) => onKeyDown(e, idx)}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─────────── FileUpload ───────────────────────────────────────────

function fileFacts(file: File): FileFacts {
  return { name: file.name, type: file.type, size: file.size };
}

export interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Largest file accepted, in bytes. */
  maxSize?: number;
  /** Most files taken from one pick or drop, with `multiple`. Without it, one. */
  maxFiles?: number;
  /** Called with the files that pass every rule. */
  onFiles?: (files: File[]) => void;
  /** Called with every refused file from a pick or drop, and why: `type`,
   * `size`, or `count`. */
  onReject?: (rejections: FileRejection<File>[]) => void;
  /** Render fn for the drop zone. Receives `{ isDragging,
   * openPicker }`. */
  children: (info: { isDragging: boolean; openPicker: () => void }) => ReactNode;
  style?: CSSProperties;
}
export function FileUpload({
  accept,
  multiple = false,
  disabled = false,
  maxSize,
  maxFiles,
  onFiles,
  onReject,
  children,
  style,
}: FileUploadProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Depth counter: dragenter/dragleave both bubble from descendants, so a
  // plain boolean flickered off every time the pointer crossed between
  // child elements of the drop zone. Every dragenter pairs with a
  // dragleave, so the count only reaches 0 when the pointer truly leaves.
  const dragDepthRef = useRef(0);
  const id = useId();

  const handleFiles = useCallback(
    (list: FileList | null): void => {
      if (list === null || list.length === 0) return;
      // The same rules for a drop as for a pick: the picker's hidden <input>
      // only filters what the dialog offers, never what is dropped.
      const { accepted, rejected } = sortFiles(Array.from(list), fileFacts, {
        accept,
        maxSize,
        maxFiles: multiple ? maxFiles : 1,
      });
      if (rejected.length > 0) onReject?.(rejected);
      if (accepted.length > 0) onFiles?.(accepted);
    },
    [onFiles, onReject, accept, multiple, maxSize, maxFiles],
  );

  function onDragEnter(e: DragEvent<HTMLDivElement>): void {
    if (disabled) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }
  function onDragOver(e: DragEvent<HTMLDivElement>): void {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }
  function onDragLeave(): void {
    if (disabled) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  }
  function onDrop(e: DragEvent<HTMLDivElement>): void {
    if (disabled) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }
  function openPicker(): void {
    if (!disabled) inputRef.current?.click();
  }

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={style}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
      />
      {children({ isDragging, openPicker })}
    </div>
  );
}

// ─────────── TreeView ─────────────────────────────────────────────

export interface TreeNode<T = unknown> {
  readonly id: string;
  readonly label: ReactNode;
  readonly data?: T;
  readonly children?: ReadonlyArray<TreeNode<T>>;
  /** A branch whose `children` are not loaded yet: expanding it calls
   * `loadChildren`. */
  readonly hasChildren?: boolean;
  readonly disabled?: boolean;
}

/** What `renderNode` is told about one node. */
export interface TreeNodeInfo<T = unknown> {
  node: TreeNode<T>;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isFocused: boolean;
  /** Its children are being loaded by `loadChildren`. */
  isLoading: boolean;
  toggle: () => void;
  select: () => void;
}

/** Props both selection modes share. */
export interface TreeViewBaseProps<T = unknown> {
  data: ReadonlyArray<TreeNode<T>>;
  /** Initially-expanded ids. */
  defaultExpanded?: ReadonlyArray<string>;
  /**
   * Loads the children of a node marked `hasChildren` the first time it is
   * expanded; add them to `data` when they arrive. While the promise is
   * pending the node reports `isLoading` and `aria-busy`. A rejection
   * collapses the node so expanding it again retries.
   */
  loadChildren?: (node: TreeNode<T>) => void | Promise<void>;
  /** Render fn for each node. */
  renderNode: (info: TreeNodeInfo<T>) => ReactElement;
  style?: CSSProperties;
  'aria-label'?: string;
}

export interface TreeViewProps<T = unknown> extends TreeViewBaseProps<T> {
  /** One selected node. The default. */
  selectionMode?: 'single';
  /** Currently-selected node id. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (next: string) => void;
}

/** Several selected nodes: activating a node toggles it in or out. */
export interface MultiTreeViewProps<T = unknown> extends TreeViewBaseProps<T> {
  selectionMode: 'multiple';
  value?: ReadonlyArray<string>;
  defaultValue?: ReadonlyArray<string>;
  onValueChange?: (next: ReadonlyArray<string>) => void;
}

interface FlatNode<T> {
  readonly node: TreeNode<T>;
  readonly depth: number;
}

function flatten<T>(
  nodes: ReadonlyArray<TreeNode<T>>,
  expanded: ReadonlySet<string>,
  depth = 0,
): FlatNode<T>[] {
  const out: FlatNode<T>[] = [];
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.children !== undefined && expanded.has(n.id)) {
      out.push(...flatten(n.children, expanded, depth + 1));
    }
  }
  return out;
}

function isBranch(node: TreeNode<unknown>): boolean {
  return node.children !== undefined || node.hasChildren === true;
}

const NO_IDS: ReadonlyArray<string> = [];

/**
 * An accessible tree: arrow keys move and expand, Enter or Space selects.
 * Pass `selectionMode="multiple"` to select several nodes, and
 * `loadChildren` to load branches on demand.
 */
export function TreeView<T>(props: TreeViewProps<T> | MultiTreeViewProps<T>): ReactElement {
  return props.selectionMode === 'multiple' ? <MultiTree {...props} /> : <SingleTree {...props} />;
}

function SingleTree<T>(props: TreeViewProps<T>): ReactElement {
  const { value, defaultValue, onValueChange, selectionMode: _mode, ...base } = props;
  // Prop-presence detection: a controlled tree cleared to `value={undefined}`
  // must stay controlled-and-empty, not fall back to stale internal state.
  const [selected, setSelected] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
    controlled: 'value' in props,
  });
  return (
    <TreeBody
      {...base}
      initialFocus={selected}
      multiselectable={false}
      isSelected={(id) => selected === id}
      activate={setSelected}
    />
  );
}

function MultiTree<T>(props: MultiTreeViewProps<T>): ReactElement {
  const { value, defaultValue = NO_IDS, onValueChange, selectionMode: _mode, ...base } = props;
  const [selected, setSelected] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
    controlled: 'value' in props,
  });
  const current = selected ?? NO_IDS;
  return (
    <TreeBody
      {...base}
      initialFocus={current[0]}
      multiselectable
      isSelected={(id) => current.includes(id)}
      activate={(id) =>
        setSelected(current.includes(id) ? current.filter((x) => x !== id) : [...current, id])
      }
    />
  );
}

interface TreeBodyProps<T> extends TreeViewBaseProps<T> {
  initialFocus: string | undefined;
  multiselectable: boolean;
  isSelected: (id: string) => boolean;
  activate: (id: string) => void;
}

function TreeBody<T>({
  data,
  defaultExpanded = [],
  loadChildren,
  renderNode,
  style,
  initialFocus,
  multiselectable,
  isSelected,
  activate,
  ...aria
}: TreeBodyProps<T>): ReactElement {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(defaultExpanded));
  const [loading, setLoading] = useState<ReadonlySet<string>>(() => new Set());
  const setIn = (set: ReadonlySet<string>, id: string, on: boolean): ReadonlySet<string> => {
    if (set.has(id) === on) return set;
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  };

  const toggle = (node: TreeNode<T>): void => {
    const opening = !expanded.has(node.id);
    setExpanded((prev) => setIn(prev, node.id, opening));
    if (!opening || node.children !== undefined || node.hasChildren !== true) return;
    if (loadChildren === undefined || loading.has(node.id)) return;
    setLoading((prev) => setIn(prev, node.id, true));
    Promise.resolve()
      .then(() => loadChildren(node))
      .then(
        () => setLoading((prev) => setIn(prev, node.id, false)),
        () => {
          setLoading((prev) => setIn(prev, node.id, false));
          setExpanded((prev) => setIn(prev, node.id, false));
        },
      );
  };

  const [focusedId, setFocusedId] = useState<string | undefined>(initialFocus);
  const flat = useMemo(() => flatten(data, expanded), [data, expanded]);
  const focusedIndex = flat.findIndex((f) => f.node.id === focusedId);

  // Roving focus + tab stop. When nothing is focused yet, the first item is
  // the single tab stop so the tree is reachable; tabbing in (onFocus) seeds
  // `focusedId`. When `focusedId` changes via the arrow keys we move real
  // DOM focus to that item - but only while focus is already inside the tree
  // - otherwise arrow keys merely update state and assistive tech never
  // announces the active node (the container kept focus).
  const treeRef = useRef<HTMLDivElement>(null);
  const focusedItemRef = useRef<HTMLDivElement>(null);
  const tabbableId = focusedIndex >= 0 ? focusedId : flat[0]?.node.id;
  useEffect(() => {
    if (focusedId !== undefined && treeRef.current?.contains(document.activeElement)) {
      focusedItemRef.current?.focus();
    }
  }, [focusedId]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (focusedIndex === -1) return;
    const current = flat[focusedIndex]!;
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = flat[focusedIndex + 1];
        if (next !== undefined) setFocusedId(next.node.id);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = flat[focusedIndex - 1];
        if (prev !== undefined) setFocusedId(prev.node.id);
        break;
      }
      case 'ArrowRight':
        e.preventDefault();
        if (isBranch(current.node) && !expanded.has(current.node.id)) toggle(current.node);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (isBranch(current.node) && expanded.has(current.node.id)) {
          // Expanded parent → collapse it.
          toggle(current.node);
        } else {
          // Collapsed node or leaf → move focus to the parent (the nearest
          // preceding item at a shallower depth), per the APG tree pattern.
          // Without this, ArrowLeft on a leaf is a dead end - you can descend
          // but never climb back out with the keyboard.
          for (let i = focusedIndex - 1; i >= 0; i--) {
            if (flat[i]!.depth < current.depth) {
              setFocusedId(flat[i]!.node.id);
              break;
            }
          }
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        // Don't select a disabled node - it advertises aria-disabled, so
        // firing selection would contradict what AT announces (native guards
        // this too).
        if (current.node.disabled !== true) activate(current.node.id);
        break;
    }
  }

  return (
    <div
      ref={treeRef}
      role="tree"
      aria-multiselectable={multiselectable || undefined}
      onKeyDown={onKeyDown}
      style={style}
      {...aria}
    >
      {flat.map(({ node, depth }) => {
        const isExpanded = expanded.has(node.id);
        const selected = isSelected(node.id);
        const isFocused = focusedId === node.id;
        const isLoading = loading.has(node.id);
        return (
          <div
            key={node.id}
            ref={isFocused ? focusedItemRef : undefined}
            role="treeitem"
            aria-level={depth + 1}
            aria-expanded={isBranch(node) ? isExpanded : undefined}
            aria-selected={selected}
            aria-busy={isLoading || undefined}
            aria-disabled={node.disabled || undefined}
            tabIndex={node.id === tabbableId ? 0 : -1}
            onFocus={() => setFocusedId(node.id)}
          >
            {renderNode({
              node,
              depth,
              isExpanded,
              isSelected: selected,
              isFocused,
              isLoading,
              toggle: () => toggle(node),
              select: () => {
                if (node.disabled !== true) activate(node.id);
              },
            })}
          </div>
        );
      })}
    </div>
  );
}
