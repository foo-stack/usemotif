/**
 * Per-primitive metadata used by the wrapper-stripping pass.
 *
 * The compiler can replace a fully-static motif primitive call with the
 * underlying lowercase HTML element when:
 *  - the primitive is `strippable`,
 *  - the user didn't pass `as` (or a non-strippable `as` value),
 *  - none of the prop names in `nonStrippableProps` are present,
 *  - every style prop is compile-time literal (classification === 'static').
 *
 * For primitives that synthesize style props at runtime (Stack's
 * `display: 'flex'`, HStack's `flexDirection: 'row'`, etc.), the synthesized
 * values are folded into the extracted static set so the resulting
 * inline-style matches what the wrapper would have rendered.
 *
 * Primitives that own runtime logic (Pressable's pseudo-state injection,
 * Image's overlay state machine) sit at `strippable: false` until that
 * behaviour is folded into the compiler too.
 */
export interface PrimitiveInfo {
  /** Default lowercase HTML tag this primitive renders as. */
  readonly defaultTag: string;
  /** Style props the primitive applies internally; user values win. */
  readonly synthesizedStyleProps: Readonly<Record<string, string | number>>;
  /**
   * Non-style attribute names that the primitive consumes and renames to
   * a style prop (e.g. Stack's `direction` → `flexDirection`). The
   * `defaultValue`, when present, is applied as a synthesized static prop
   * if the user didn't pass the alias.
   */
  readonly aliasedStyleProps: Readonly<
    Record<string, { readonly mapsTo: string; readonly defaultValue?: string | number }>
  >;
  /**
   * Source attribute names whose presence (with any value) forces the
   * wrapper to stay in place. Used by Pressable to gate stripping on
   * pseudo-state and click-handling props that the runtime owns.
   */
  readonly nonStrippableProps: ReadonlySet<string>;
  /**
   * True when the wrapper can ever be stripped at all. False for
   * primitives whose runtime logic isn't yet replicated in the compiler.
   */
  readonly strippable: boolean;
}

/**
 * Motion props that block wrapper-stripping when present. `enterStyle` is
 * a first-paint overlay the runtime flips off via React state - the
 * lowercase HTML element has no equivalent lifecycle, so the wrapper has
 * to stay. `layout` and `layoutTransition` drive a FLIP hook the runtime
 * runs; stripped, they would land on the element as attributes and do
 * nothing. `transition`, `animation`, `animateOnly`, and `exitStyle` are
 * fine after extraction (they reduce to plain inline `transition` / a
 * pseudo CSS rule keyed on `[data-motif-state="exiting"]`, both of
 * which work on any element).
 */
const MOTION_NON_STRIPPABLE: readonly string[] = ['enterStyle', 'layout', 'layoutTransition'];

/**
 * `group` renders the marker attribute the `_group*` states key on. The
 * stripped element would carry `group` itself instead, so keep the wrapper.
 */
const GROUP_NON_STRIPPABLE: readonly string[] = ['group'];

/**
 * Block-strip set shared by every strippable primitive. `_before` and
 * `_after` are not in it: a literal bag is extracted to a `::before` /
 * `::after` rule, and a dynamic one makes the element non-static, which
 * keeps the wrapper by itself.
 */
const BASE_NON_STRIPPABLE: ReadonlySet<string> = new Set([
  ...MOTION_NON_STRIPPABLE,
  ...GROUP_NON_STRIPPABLE,
]);
/** Text adds `lines`; the Stack family adds `stagger` and `staggerFrom`. Each is a single
 * shared instance (read-only - only `.has()` is called) so the three Stack
 * variants don't allocate three identical sets. */
const TEXT_NON_STRIPPABLE: ReadonlySet<string> = new Set([...BASE_NON_STRIPPABLE, 'lines']);
const STACK_NON_STRIPPABLE: ReadonlySet<string> = new Set([
  ...BASE_NON_STRIPPABLE,
  'stagger',
  'staggerFrom',
]);

export const PRIMITIVE_INFO: Readonly<Record<string, PrimitiveInfo>> = {
  Box: {
    defaultTag: 'div',
    synthesizedStyleProps: {},
    aliasedStyleProps: {},
    nonStrippableProps: BASE_NON_STRIPPABLE,
    strippable: true,
  },
  Text: {
    defaultTag: 'span',
    synthesizedStyleProps: {},
    aliasedStyleProps: {},
    // `lines` drives the line-clamp inline styles the runtime injects; the
    // compiler doesn't synthesize them yet, so keep the wrapper.
    nonStrippableProps: TEXT_NON_STRIPPABLE,
    strippable: true,
  },
  Stack: {
    defaultTag: 'div',
    synthesizedStyleProps: { display: 'flex' },
    aliasedStyleProps: {
      direction: { mapsTo: 'flexDirection', defaultValue: 'column' },
    },
    // `stagger` wraps each child in a delayed entry box at runtime - pure
    // runtime behaviour the compiler can't replicate, so keep the wrapper.
    nonStrippableProps: STACK_NON_STRIPPABLE,
    strippable: true,
  },
  HStack: {
    defaultTag: 'div',
    synthesizedStyleProps: { display: 'flex', flexDirection: 'row' },
    aliasedStyleProps: {},
    nonStrippableProps: STACK_NON_STRIPPABLE,
    strippable: true,
  },
  VStack: {
    defaultTag: 'div',
    synthesizedStyleProps: { display: 'flex', flexDirection: 'column' },
    aliasedStyleProps: {},
    nonStrippableProps: STACK_NON_STRIPPABLE,
    strippable: true,
  },
  Pressable: {
    defaultTag: 'button',
    synthesizedStyleProps: {},
    aliasedStyleProps: {},
    // Pseudo-state extraction (compiler-core) and onPress/disabled rewrite
    // are both follow-ups; until those land Pressable can never be stripped.
    nonStrippableProps: new Set([
      '_hover',
      '_focus',
      '_active',
      '_disabled',
      '_checked',
      '_selected',
      '_expanded',
      '_invalid',
      '_pressed',
      '_focusWithin',
      '_readOnly',
      '_groupHover',
      '_groupFocus',
      '_groupActive',
      'group',
      'onPress',
      'disabled',
    ]),
    strippable: false,
  },
  Image: {
    defaultTag: 'img',
    synthesizedStyleProps: {},
    aliasedStyleProps: {},
    // Image owns load/error state and an overlay tree - not strippable.
    nonStrippableProps: new Set(),
    strippable: false,
  },
};

export function getPrimitiveInfo(importedName: string): PrimitiveInfo | undefined {
  return PRIMITIVE_INFO[importedName];
}
