import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';
import { nativeStubWarn } from './_native-stub.js';
import {
  parseColor,
  formatColor,
  hsvToRgb,
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
 * Native specialized family - ColorPicker / FileUpload / TreeView.
 *
 * `parseColor` and `formatColor` are pure JS and work identically on
 * web and native, so they're re-exported here so cross-platform
 * theming code keeps working.
 *
 * - ColorPicker - full HSV picker driven by PanResponder. Gradients
 *   on the saturation/value plane and the hue / alpha sliders are
 *   rendered via `react-native-svg` when that peer dep is installed;
 *   without it, the picker degrades to plain colour blocks (still
 *   draggable, just no gradient hinting).
 * - FileUpload - wraps `expo-document-picker` when present; in bare
 *   RN (no Expo) renders an instructional fallback that warns once.
 * - TreeView - direct port via Pressable + recursive layout.
 */

// ─── ColorPicker ────────────────────────────────────────────────────

/**
 * Optional `react-native-svg` primitives, fetched at module load. The
 * picker renders gradient backgrounds (saturation/value plane, hue
 * slider, alpha slider) via these components when the peer is
 * installed. Without them, the picker still works - gradient
 * backgrounds degrade to solid pure-hue / alpha-step blocks.
 */
interface SvgGradientPrimitives {
  readonly Svg: ComponentType<Record<string, unknown>>;
  readonly Defs: ComponentType<Record<string, unknown>>;
  readonly LinearGradient: ComponentType<Record<string, unknown>>;
  readonly Stop: ComponentType<Record<string, unknown>>;
  readonly Rect: ComponentType<Record<string, unknown>>;
}

interface ReactNativeSvgModule {
  readonly default?: ComponentType<Record<string, unknown>>;
  readonly Svg?: ComponentType<Record<string, unknown>>;
  readonly Defs: ComponentType<Record<string, unknown>>;
  readonly LinearGradient: ComponentType<Record<string, unknown>>;
  readonly Stop: ComponentType<Record<string, unknown>>;
  readonly Rect: ComponentType<Record<string, unknown>>;
}

/**
 * Best-effort optional require - the same shape used by
 * `@usemotif/react-native`'s `Svg.tsx`. Returns `null` when the peer
 * dep isn't installed or when the bundler doesn't expose `require`
 * (pure-ESM environments).
 */
function tryRequire<T>(id: string): T | null {
  try {
    const r =
      typeof globalThis !== 'undefined' &&
      typeof (globalThis as { require?: (id: string) => unknown }).require === 'function'
        ? (globalThis as { require: (id: string) => unknown }).require
        : typeof require !== 'undefined'
          ? require
          : null;
    if (r === null) return null;
    return r(id) as T;
  } catch {
    return null;
  }
}

const SVG_GRADIENT_PRIMS: SvgGradientPrimitives | null = (() => {
  const mod = tryRequire<ReactNativeSvgModule>('react-native-svg');
  if (mod === null) return null;
  const Svg = mod.default ?? mod.Svg;
  if (Svg === undefined) return null;
  return {
    Svg,
    Defs: mod.Defs,
    LinearGradient: mod.LinearGradient,
    Stop: mod.Stop,
    Rect: mod.Rect,
  };
})();

/** True when `react-native-svg` is present - exposed for tests / docs. */
export const NATIVE_COLOR_PICKER_HAS_SVG: boolean = SVG_GRADIENT_PRIMS !== null;

function pureHueRgb(h: number): string {
  const { r, g, b } = hsvToRgb(h, 1, 1);
  return `rgb(${r}, ${g}, ${b})`;
}

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
  /** Edge length for the saturation/value plane. Defaults to 200. */
  size?: number;
  /** Style applied to the picker root (a `View`). */
  style?: ViewStyle;
  /** Style applied to the saturation/value plane wrapper. */
  saturationValueStyle?: ViewStyle;
  /** Style applied to the SV thumb. */
  saturationValueThumbStyle?: ViewStyle;
  /** Style applied to the hue slider track. */
  hueSliderStyle?: ViewStyle;
  /** Style applied to the alpha slider track. */
  alphaSliderStyle?: ViewStyle;
}

/**
 * Native HSV colour picker. Drag the saturation/value plane to pick
 * chroma + brightness, the hue slider for hue, and the alpha slider
 * for transparency (when enabled and format isn't `hex`).
 *
 * Mirrors the web ColorPicker API; differences from web:
 *
 * - **Touch only.** No keyboard navigation - RN doesn't have a focus
 *   ring story for non-form inputs that's worth shipping in v1.
 *   Voice-over reads the role + current value.
 * - **Gradient backgrounds via `react-native-svg`** (optional peer).
 *   Without the peer, the SV plane shows the pure-hue background and
 *   the sliders show flat blocks; the picker still functions, it
 *   just lacks gradient hinting.
 * - **Format toggle** uses `Pressable` rather than `<button>`.
 *
 * ```tsx
 * const [v, setV] = useState('#3b82f6');
 * <ColorPicker value={v} onValueChange={setV} format="rgb" allowAlpha />
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
  size = 200,
  style,
  saturationValueStyle,
  saturationValueThumbStyle,
  hueSliderStyle,
  alphaSliderStyle,
}: ColorPickerProps): ReactElement {
  const [format, commitFormat] = useControllableState<ColorFormat>({
    value: controlledFormat,
    defaultValue: 'hex',
    onChange: onFormatChange,
  });

  // Internal HSV state preserves hue across zero-saturation / zero-value
  // regions where the RGB round-trip would otherwise drop the hue.
  const [hsv, setHsv] = useState<HSVColor>(() => parseColor(controlled ?? defaultValue));
  const isControlled = controlled !== undefined;
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
    [format, onValueChange],
  );

  const setFormat = useCallback(
    (next: ColorFormat) => {
      commitFormat(next);
      const formatted = formatColor(hsv, next);
      lastEmittedRef.current = formatted;
      onValueChange?.(formatted);
    },
    [hsv, commitFormat, onValueChange],
  );

  const setSV = useCallback(
    (s: number, v: number) => commit({ ...hsv, s: clamp01(s), v: clamp01(v) }),
    [commit, hsv],
  );
  const setHue = useCallback((h: number) => commit({ ...hsv, h: clampHue(h) }), [commit, hsv]);
  const setAlpha = useCallback((a: number) => commit({ ...hsv, a: clamp01(a) }), [commit, hsv]);

  const showAlpha = allowAlpha && format !== 'hex';

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Colour picker"
      accessibilityState={{ disabled }}
      style={style}
    >
      <SaturationValuePlane
        hsv={hsv}
        size={size}
        disabled={disabled}
        onChange={setSV}
        style={saturationValueStyle}
        thumbStyle={saturationValueThumbStyle}
      />
      <HueSlider
        hue={hsv.h}
        width={size}
        disabled={disabled}
        onChange={setHue}
        style={hueSliderStyle}
      />
      {showAlpha ? (
        <AlphaSlider
          hsv={hsv}
          width={size}
          disabled={disabled}
          onChange={setAlpha}
          style={alphaSliderStyle}
        />
      ) : null}
      {formats.length > 0 ? (
        <FormatToggle format={format} options={formats} disabled={disabled} onChange={setFormat} />
      ) : null}
    </View>
  );
}

const SV_THUMB_SIZE = 14;

function SaturationValuePlane({
  hsv,
  size,
  disabled,
  onChange,
  style,
  thumbStyle,
}: {
  hsv: HSVColor;
  size: number;
  disabled: boolean;
  onChange: (s: number, v: number) => void;
  style?: ViewStyle | undefined;
  thumbStyle?: ViewStyle | undefined;
}): ReactElement {
  const layoutRef = useRef<{ width: number; height: number }>({ width: size, height: size });

  const update = useCallback(
    (e: GestureResponderEvent) => {
      if (disabled) return;
      const { locationX, locationY } = e.nativeEvent;
      const { width, height } = layoutRef.current;
      if (width <= 0 || height <= 0) return;
      const s = clamp01(locationX / width);
      const v = 1 - clamp01(locationY / height);
      onChange(s, v);
    },
    [disabled, onChange],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: update,
        onPanResponderMove: update,
      }),
    [disabled, update],
  );

  const hueColor = pureHueRgb(hsv.h);

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Saturation and value selector"
      accessibilityState={{ disabled }}
      onLayout={(e) => {
        layoutRef.current = {
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        };
      }}
      {...responder.panHandlers}
      style={[
        { width: size, height: size, position: 'relative', backgroundColor: hueColor },
        style,
      ]}
    >
      {SVG_GRADIENT_PRIMS !== null ? (
        <SvPlaneGradient hue={hsv.h} width={size} height={size} />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: hsv.s * size - SV_THUMB_SIZE / 2,
            top: (1 - hsv.v) * size - SV_THUMB_SIZE / 2,
            width: SV_THUMB_SIZE,
            height: SV_THUMB_SIZE,
            borderRadius: SV_THUMB_SIZE / 2,
            borderWidth: 2,
            borderColor: 'white',
          },
          thumbStyle,
        ]}
      />
    </View>
  );
}

function SvPlaneGradient({
  hue,
  width,
  height,
}: {
  hue: number;
  width: number;
  height: number;
}): ReactElement | null {
  const prims = SVG_GRADIENT_PRIMS;
  if (prims === null) return null;
  const { Svg, Defs, LinearGradient, Stop, Rect } = prims;
  const hueColor = pureHueRgb(hue);
  // SVG gradients are pointer-transparent by default (the parent
  // View receives the touch). `pointerEvents="none"` belt-and-braces.
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="motif-sv-sat" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <Stop offset="100%" stopColor={hueColor} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="motif-sv-val" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#000" stopOpacity="0" />
            <Stop offset="100%" stopColor="#000" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#motif-sv-sat)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#motif-sv-val)" />
      </Svg>
    </View>
  );
}

const SLIDER_HEIGHT = 16;
const SLIDER_THUMB_SIZE = 18;

function HueSlider({
  hue,
  width,
  disabled,
  onChange,
  style,
}: {
  hue: number;
  width: number;
  disabled: boolean;
  onChange: (h: number) => void;
  style?: ViewStyle | undefined;
}): ReactElement {
  return (
    <ScalarSlider
      ariaLabel="Hue"
      min={0}
      // 359, not 360: hue is cyclic (360 ≡ 0) and clampHue(360) → 0, so a
      // full-right drag would snap the thumb back to the left. Mirrors web.
      max={359}
      width={width}
      value={hue}
      disabled={disabled}
      onChange={onChange}
      style={style}
      gradient={SVG_GRADIENT_PRIMS === null ? undefined : { kind: 'hue' }}
    />
  );
}

function AlphaSlider({
  hsv,
  width,
  disabled,
  onChange,
  style,
}: {
  hsv: HSVColor;
  width: number;
  disabled: boolean;
  onChange: (a: number) => void;
  style?: ViewStyle | undefined;
}): ReactElement {
  return (
    <ScalarSlider
      ariaLabel="Alpha"
      min={0}
      max={1}
      width={width}
      value={hsv.a}
      disabled={disabled}
      onChange={onChange}
      style={style}
      gradient={
        SVG_GRADIENT_PRIMS === null ? undefined : { kind: 'alpha', baseColor: pureHueRgb(hsv.h) }
      }
    />
  );
}

type SliderGradient = { kind: 'hue' } | { kind: 'alpha'; baseColor: string };

function ScalarSlider({
  ariaLabel,
  min,
  max,
  width,
  value,
  disabled,
  onChange,
  style,
  gradient,
}: {
  ariaLabel: string;
  min: number;
  max: number;
  width: number;
  value: number;
  disabled: boolean;
  onChange: (next: number) => void;
  style?: ViewStyle | undefined;
  gradient?: SliderGradient | undefined;
}): ReactElement {
  const layoutRef = useRef<number>(width);

  const update = useCallback(
    (e: GestureResponderEvent) => {
      if (disabled) return;
      const w = layoutRef.current;
      if (w <= 0) return;
      const ratio = clamp01(e.nativeEvent.locationX / w);
      onChange(min + ratio * (max - min));
    },
    [disabled, max, min, onChange],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: update,
        onPanResponderMove: update,
      }),
    [disabled, update],
  );

  const ratio = (value - min) / (max - min);
  const fallbackBg =
    gradient === undefined
      ? '#ccc'
      : gradient.kind === 'hue'
        ? pureHueRgb(value)
        : gradient.baseColor;

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={ariaLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityState={{ disabled }}
      onLayout={(e) => {
        layoutRef.current = e.nativeEvent.layout.width;
      }}
      {...responder.panHandlers}
      style={[
        {
          marginTop: 12,
          width,
          height: SLIDER_HEIGHT,
          position: 'relative',
          backgroundColor: fallbackBg,
        },
        style,
      ]}
    >
      {gradient !== undefined && SVG_GRADIENT_PRIMS !== null ? (
        <SliderGradientLayer width={width} gradient={gradient} />
      ) : null}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: ratio * width - SLIDER_THUMB_SIZE / 2,
          top: (SLIDER_HEIGHT - SLIDER_THUMB_SIZE) / 2,
          width: SLIDER_THUMB_SIZE,
          height: SLIDER_THUMB_SIZE,
          borderRadius: SLIDER_THUMB_SIZE / 2,
          borderWidth: 2,
          borderColor: 'white',
          backgroundColor: 'rgba(0,0,0,0.15)',
        }}
      />
    </View>
  );
}

function SliderGradientLayer({
  width,
  gradient,
}: {
  width: number;
  gradient: SliderGradient;
}): ReactElement | null {
  const prims = SVG_GRADIENT_PRIMS;
  if (prims === null) return null;
  const { Svg, Defs, LinearGradient, Stop, Rect } = prims;
  const id = gradient.kind === 'hue' ? 'motif-hue-grad' : 'motif-alpha-grad';
  const stops =
    gradient.kind === 'hue'
      ? HUE_STOPS
      : ([
          { offset: '0%', color: gradient.baseColor, opacity: '0' },
          { offset: '100%', color: gradient.baseColor, opacity: '1' },
        ] as const);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      <Svg width={width} height={SLIDER_HEIGHT}>
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
            {stops.map((stop) => (
              <Stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={SLIDER_HEIGHT} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const HUE_STOPS = [
  { offset: '0%', color: 'rgb(255, 0, 0)', opacity: '1' },
  { offset: '17%', color: 'rgb(255, 255, 0)', opacity: '1' },
  { offset: '33%', color: 'rgb(0, 255, 0)', opacity: '1' },
  { offset: '50%', color: 'rgb(0, 255, 255)', opacity: '1' },
  { offset: '67%', color: 'rgb(0, 0, 255)', opacity: '1' },
  { offset: '83%', color: 'rgb(255, 0, 255)', opacity: '1' },
  { offset: '100%', color: 'rgb(255, 0, 0)', opacity: '1' },
] as const;

function FormatToggle({
  format,
  options,
  disabled,
  onChange,
}: {
  format: ColorFormat;
  options: ReadonlyArray<ColorFormat>;
  disabled: boolean;
  onChange: (next: ColorFormat) => void;
}): ReactElement {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Colour format"
      style={{ flexDirection: 'row', marginTop: 12 }}
    >
      {options.map((opt) => (
        <Pressable
          key={opt}
          accessibilityRole="radio"
          accessibilityState={{ selected: opt === format, disabled }}
          disabled={disabled}
          onPress={() => onChange(opt)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginRight: 4,
            borderRadius: 4,
            backgroundColor: opt === format ? '#dbeafe' : 'transparent',
            borderWidth: 1,
            borderColor: opt === format ? '#3b82f6' : '#cbd5e1',
          }}
        >
          <Text>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── FileUpload ────────────────────────────────────────────────────

/**
 * Subset of the `expo-document-picker` shape motif consumes. Kept
 * narrow so we don't drag in the whole package's types as a hard
 * dependency.
 */
interface DocumentPickerAsset {
  readonly uri: string;
  readonly name?: string;
  readonly mimeType?: string;
  readonly size?: number;
}
interface DocumentPickerResult {
  readonly canceled: boolean;
  readonly assets?: ReadonlyArray<DocumentPickerAsset>;
}
interface DocumentPickerModule {
  readonly getDocumentAsync: (options?: {
    type?: string;
    multiple?: boolean;
    copyToCacheDirectory?: boolean;
  }) => Promise<DocumentPickerResult>;
}

const DOCUMENT_PICKER: DocumentPickerModule | null =
  tryRequire<DocumentPickerModule>('expo-document-picker');

function assetFacts(asset: DocumentPickerAsset): FileFacts {
  return { name: asset.name ?? '', type: asset.mimeType ?? '', size: asset.size };
}

/** True when `expo-document-picker` is present - exposed for tests / docs. */
export const NATIVE_FILE_UPLOAD_HAS_PICKER: boolean = DOCUMENT_PICKER !== null;

export interface FileUploadProps {
  /** MIME-type hint passed to the picker (`'image/*'`, `'application/pdf'`). */
  accept?: string;
  /** Allow selecting multiple documents in one picker session. */
  multiple?: boolean;
  /** Disables `openPicker`; the render fn still renders. */
  disabled?: boolean;
  /**
   * Called with the picked assets. On native each entry is a
   * document-picker asset (`{ uri, name?, mimeType?, size? }`) - the
   * web version receives `File[]`. Apps that need cross-platform
   * support should branch on Platform.OS or accept `unknown[]`.
   */
  onFiles?: (files: ReadonlyArray<DocumentPickerAsset>) => void;
  /** Largest file accepted, in bytes. A picker that reports no size passes. */
  maxSize?: number;
  /** Most files taken from one pick, with `multiple`. Without it, one. */
  maxFiles?: number;
  /** Called with every refused file from a pick, and why: `type`, `size`, or `count`. */
  onReject?: (rejections: FileRejection<DocumentPickerAsset>[]) => void;
  /** Render-prop. Same shape as web - `{ isDragging, openPicker }`.
   * `isDragging` is always `false` on native (no drag-drop on
   * mobile); the prop stays for cross-platform parity. */
  children: (info: { isDragging: boolean; openPicker: () => void }) => ReactNode;
  /** Style applied to the root `View`. */
  style?: ViewStyle;
}

/**
 * Native FileUpload. Wraps `expo-document-picker` when present; in
 * bare RN (no Expo) the render fn still runs with a no-op
 * `openPicker` and a one-time console warning so the dev knows the
 * peer is missing.
 *
 * ```tsx
 * <FileUpload accept="image/*" onFiles={setFiles}>
 *   {({ openPicker }) => (
 *     <Pressable onPress={openPicker}>
 *       <Text>Pick a file</Text>
 *     </Pressable>
 *   )}
 * </FileUpload>
 * ```
 */
export function FileUpload({
  accept,
  multiple = false,
  disabled = false,
  onFiles,
  maxSize,
  maxFiles,
  onReject,
  children,
  style,
}: FileUploadProps): ReactElement {
  const openPicker = useCallback(() => {
    if (disabled) return;
    if (DOCUMENT_PICKER === null) {
      nativeStubWarn('FileUpload (peer dep `expo-document-picker` not installed)');
      return;
    }
    void DOCUMENT_PICKER.getDocumentAsync({
      ...(accept !== undefined ? { type: accept } : {}),
      multiple,
      copyToCacheDirectory: true,
    })
      .then((result) => {
        if (result.canceled) return;
        const { accepted, rejected } = sortFiles(result.assets ?? [], assetFacts, {
          accept,
          maxSize,
          maxFiles: multiple ? maxFiles : 1,
        });
        if (rejected.length > 0) onReject?.(rejected);
        if (accepted.length > 0) onFiles?.(accepted);
      })
      .catch((err: unknown) => {
        // A picker failure (denied permission, picker already open on
        // Android, ...) would otherwise surface as an unhandled rejection.
        nativeStubWarn(`FileUpload picker failed: ${String(err)}`);
      });
  }, [accept, disabled, multiple, onFiles, maxSize, maxFiles, onReject]);

  return (
    <View style={style} accessibilityLabel="File upload">
      {children({ isDragging: false, openPicker })}
    </View>
  );
}

export interface TreeNode<T = unknown> {
  readonly id: string;
  readonly label: ReactNode;
  readonly data?: T;
  readonly children?: ReadonlyArray<TreeNode<T>>;
  /** A branch whose `children` are not loaded yet: expanding it calls `loadChildren`. */
  readonly hasChildren?: boolean;
  readonly disabled?: boolean;
}

export interface TreeNodeInfo<T = unknown> {
  node: TreeNode<T>;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isFocused: boolean;
  isLoading: boolean;
  toggle: () => void;
  select: () => void;
}

export interface TreeViewBaseProps<T = unknown> {
  data: ReadonlyArray<TreeNode<T>>;
  defaultExpanded?: ReadonlyArray<string>;
  /** Loads a `hasChildren` node's children on first expand; see the web TreeView. */
  loadChildren?: (node: TreeNode<T>) => void | Promise<void>;
  renderNode: (info: TreeNodeInfo<T>) => ReactElement;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export interface TreeViewProps<T = unknown> extends TreeViewBaseProps<T> {
  selectionMode?: 'single';
  value?: string;
  defaultValue?: string;
  onValueChange?: (next: string) => void;
}

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
  depth: number,
  out: FlatNode<T>[],
): void {
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.children !== undefined && expanded.has(n.id)) {
      flatten(n.children, expanded, depth + 1, out);
    }
  }
}

const NO_IDS: ReadonlyArray<string> = [];

export function TreeView<T>(props: TreeViewProps<T> | MultiTreeViewProps<T>): ReactElement {
  return props.selectionMode === 'multiple' ? <MultiTree {...props} /> : <SingleTree {...props} />;
}

function SingleTree<T>(props: TreeViewProps<T>): ReactElement {
  const { value, defaultValue, onValueChange, selectionMode: _mode, ...base } = props;
  // Prop-presence detection so a controlled tree cleared to `value={undefined}`
  // stays controlled-and-empty, mirroring the web TreeView/combobox family.
  const [selected, setSelected] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
    controlled: 'value' in props,
  });
  return <TreeBody {...base} isSelected={(id) => selected === id} activate={setSelected} />;
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
      isSelected={(id) => current.includes(id)}
      activate={(id) =>
        setSelected(current.includes(id) ? current.filter((x) => x !== id) : [...current, id])
      }
    />
  );
}

function TreeBody<T>({
  data,
  defaultExpanded = [],
  loadChildren,
  renderNode,
  accessibilityLabel,
  style,
  isSelected,
  activate,
}: TreeViewBaseProps<T> & {
  isSelected: (id: string) => boolean;
  activate: (id: string) => void;
}): ReactElement {
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

  const flat = useMemo<FlatNode<T>[]>(() => {
    const out: FlatNode<T>[] = [];
    flatten(data, expanded, 0, out);
    return out;
  }, [data, expanded]);

  return (
    <ScrollView accessibilityRole="list" accessibilityLabel={accessibilityLabel} style={style}>
      <View accessibilityRole="list">
        {flat.map(({ node, depth }) => {
          const isExpanded = expanded.has(node.id);
          const selected = isSelected(node.id);
          const isLoading = loading.has(node.id);
          return (
            <View
              key={node.id}
              accessibilityState={{ expanded: isExpanded, selected, busy: isLoading }}
            >
              {renderNode({
                node,
                depth,
                isExpanded,
                isSelected: selected,
                isFocused: selected,
                isLoading,
                toggle: () => toggle(node),
                select: () => {
                  if (node.disabled === true) return;
                  activate(node.id);
                },
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
