import type { ConformanceCase } from './conformance.js';

/**
 * Cross-renderer conformance cases. Every motif renderer must pass all
 * of these. New rows go at the bottom of the appropriate section so
 * existing snapshots stay stable.
 *
 * The `expect*` fields describe the **resolved** style - token refs
 * already mapped to their concrete values via the test theme. Renderers
 * that emit `var(--...)` strings instead of literal values should
 * normalise to literals in their adapter (CSS-variable mode is a
 * delivery detail; conformance is about the resolved values).
 */
export const standardCases: readonly ConformanceCase[] = [
  // TitleBar: style props reach the bar itself, on both renderers.
  {
    name: 'TitleBar / literal padding reaches the bar',
    primitive: 'TitleBar',
    props: { p: 16 },
    expectStyle: { padding: 16 },
  },
  {
    name: 'TitleBar / token background reaches the bar',
    primitive: 'TitleBar',
    props: { bg: '$blue.500' },
    expectStyle: { backgroundColor: '#3b82f6' },
  },
  // ─── Box: literal styles ────────────────────────────────────────────
  {
    name: 'Box / literal padding (number)',
    primitive: 'Box',
    props: { p: 16 },
    expectStyle: { padding: 16 },
  },
  {
    name: 'Box / literal background color',
    primitive: 'Box',
    props: { bg: '#3b82f6' },
    expectStyle: { backgroundColor: '#3b82f6' },
  },

  // ─── Box: token references ──────────────────────────────────────────
  {
    name: 'Box / $space.4 token ref',
    primitive: 'Box',
    props: { p: '$4' },
    expectStyle: { padding: 16 },
  },
  {
    name: 'Box / $colors.blue.500 token ref',
    primitive: 'Box',
    props: { bg: '$blue.500' },
    expectStyle: { backgroundColor: '#3b82f6' },
  },
  {
    name: 'Box / explicit-scale ref ($space.4)',
    primitive: 'Box',
    props: { p: '$space.4' },
    expectStyle: { padding: 16 },
  },

  // ─── Box: shorthand expansion ───────────────────────────────────────
  {
    name: 'Box / px shorthand maps to logical paddingInline',
    primitive: 'Box',
    props: { px: '$4' },
    expectStyle: { paddingInline: 16 },
  },
  {
    name: 'Box / logical inset shorthands ps + pe',
    primitive: 'Box',
    props: { ps: '$2', pe: '$4' },
    expectStyle: { paddingInlineStart: 8, paddingInlineEnd: 16 },
  },
  {
    name: 'Box / my shorthand expands to T+B',
    primitive: 'Box',
    props: { my: '$2' },
    expectStyle: { marginTop: 8, marginBottom: 8 },
  },

  // ─── Box: responsive object syntax ──────────────────────────────────
  {
    name: 'Box / responsive object - base + md',
    primitive: 'Box',
    props: { p: { base: '$2', md: '$4' } },
    expectStyle: { padding: 8 },
    expectMediaRules: {
      '@media (min-width: 768px)': { padding: 16 },
    },
  },
  {
    name: 'Box / responsive object - full ladder',
    primitive: 'Box',
    props: { p: { base: '$1', sm: '$2', md: '$4', lg: '$6', xl: '$8' } },
    expectStyle: { padding: 4 },
    expectMediaRules: {
      '@media (min-width: 640px)': { padding: 8 },
      '@media (min-width: 768px)': { padding: 16 },
      '@media (min-width: 1024px)': { padding: 24 },
      '@media (min-width: 1280px)': { padding: 32 },
    },
  },

  // ─── Box: responsive array syntax ───────────────────────────────────
  {
    name: 'Box / responsive array',
    primitive: 'Box',
    props: { p: ['$2', '$4', '$6'] },
    expectStyle: { padding: 8 },
    expectMediaRules: {
      '@media (min-width: 640px)': { padding: 16 },
      '@media (min-width: 768px)': { padding: 24 },
    },
  },

  // ─── Box: responsive DSL ────────────────────────────────────────────
  {
    name: 'Box / responsive DSL - `base:$2 md:$4`',
    primitive: 'Box',
    props: { p: 'base:$2 md:$4' },
    expectStyle: { padding: 8 },
    expectMediaRules: {
      '@media (min-width: 768px)': { padding: 16 },
    },
  },

  // ─── Container queries ──────────────────────────────────────────────
  {
    name: 'Box / @container anonymous',
    primitive: 'Box',
    props: { p: { '@md': '$4' } },
    expectContainerRules: {
      '@container (min-width: 768px)': { padding: 16 },
    },
  },
  {
    name: 'Box / @container named',
    primitive: 'Box',
    props: { p: { '@card.lg': '$8' } },
    expectContainerRules: {
      '@container card (min-width: 1024px)': { padding: 32 },
    },
  },
  {
    name: 'Box / @container in DSL',
    primitive: 'Box',
    props: { p: '@card.md:$4' },
    expectContainerRules: {
      '@container card (min-width: 768px)': { padding: 16 },
    },
  },

  // ─── Pseudo-state styling (Pressable) ───────────────────────────────
  {
    name: 'Pressable / _hover',
    primitive: 'Pressable',
    props: { _hover: { opacity: 0.9 } },
    expectPseudoRules: {
      ':hover': { opacity: 0.9 },
    },
  },
  {
    name: 'Pressable / _focus → :focus-visible',
    primitive: 'Pressable',
    props: { _focus: { borderWidth: 2 } },
    expectPseudoRules: {
      ':focus-visible': { borderWidth: 2 },
    },
  },
  {
    name: 'Pressable / _active',
    primitive: 'Pressable',
    props: { _active: { opacity: 0.8 } },
    expectPseudoRules: {
      ':active': { opacity: 0.8 },
    },
  },

  // ─── Pseudo-state styling on Box (web only) ─────────────────────────
  // Box on native silently no-ops pseudo bags - RN <View> has no
  // pressed/hovered/focused state. These cases run on web only.
  {
    name: 'Box / _hover',
    primitive: 'Box',
    props: { _hover: { opacity: 0.9 } },
    expectPseudoRules: {
      ':hover': { opacity: 0.9 },
    },
    skipOnRenderer: ['react-native'],
  },
  {
    name: 'Box / _focus → :focus-visible',
    primitive: 'Box',
    props: { tabIndex: 0, _focus: { borderWidth: 2 } },
    expectPseudoRules: {
      ':focus-visible': { borderWidth: 2 },
    },
    skipOnRenderer: ['react-native'],
  },
  {
    name: 'Box / _active',
    primitive: 'Box',
    props: { _active: { opacity: 0.8 } },
    expectPseudoRules: {
      ':active': { opacity: 0.8 },
    },
    skipOnRenderer: ['react-native'],
  },

  // ─── Pass-through props ─────────────────────────────────────────────
  {
    name: 'Box / passes through non-style attrs',
    primitive: 'Box',
    props: { p: 4, id: 'demo' },
    expectStyle: { padding: 4 },
  },

  // ─── Transitions (web) ──────────────────────────────────────────────
  // Mount/unmount transitions land on web in T1.1; native (T1.2) is
  // tracked separately and these cases skip on the native renderer.
  // The compiler-side extraction of motion props landed in T3.6, so the
  // compiler differential pass runs these cases - runtime and compiled
  // output must agree byte-for-byte.
  {
    name: 'Box / transition - literal CSS string',
    primitive: 'Box',
    props: { transition: 'opacity 200ms ease' },
    expectStyle: { transition: 'opacity 200ms ease' },
    skipOnRenderer: ['react-native'],
  },
  {
    name: 'Box / transition - object form resolves with defaults',
    primitive: 'Box',
    props: { transition: { property: 'opacity' } },
    expectStyle: { transition: 'opacity 200ms ease' },
    skipOnRenderer: ['react-native'],
  },
  {
    name: 'Box / exitStyle - emits [data-motif-state="exiting"] CSS rule',
    primitive: 'Box',
    props: {
      exitStyle: { opacity: 0 },
      transition: { property: 'opacity', duration: '200ms' },
    },
    expectPseudoRules: {
      '[data-motif-state="exiting"]': { opacity: 0 },
    },
    skipOnRenderer: ['react-native'],
  },

  // ─── Transitions (native) ───────────────────────────────────────────
  // T1.2: enterStyle interpolates from the given values toward the
  // resolved base style on first mount. By the time these snapshots
  // settle (post-mount effect), the overlay has dropped and the
  // resolved base style applies in full. Web's `enterStyle` is a
  // first-paint overlay that's already been re-rendered away by the
  // time conformance reads the snapshot, so the assertion shape is
  // identical across both renderers - we just gate this on native.
  // The compiler treats `enterStyle` as a runtime-only motion prop
  // (extractor leaves it on the JSX) so the compiled output reduces to
  // the static `opacity: 1` - same shape as the post-mount native
  // snapshot. Both renderers run this case.
  {
    name: 'Box / enterStyle - settled style equals base after mount (native)',
    primitive: 'Box',
    props: {
      opacity: 1,
      enterStyle: { opacity: 0 },
    },
    expectStyle: { opacity: 1 },
    skipOnRenderer: ['react-web'],
  },

  // ─── animation prop (named-curve presets) ───────────────────────────
  // T2.2: `animation="bouncy"` looks up a registered animation token
  // on the active theme. On web, expands to a CSS transition string
  // built from `var(--motif-anim-<name>-{duration,easing})` refs. The
  // compiler runs the same `buildAnimationCss` helper, so both passes
  // emit the exact same transition string.
  {
    name: 'Box / animation - emits CSS transition with var(--motif-anim-*) refs (web)',
    primitive: 'Box',
    props: { animation: 'normal' },
    expectStyle: {
      transition: 'all var(--motif-anim-normal-duration) var(--motif-anim-normal-easing)',
    },
    skipOnRenderer: ['react-native'],
  },
  {
    name: 'Box / animateOnly - restricts the property list (web)',
    primitive: 'Box',
    props: { animation: 'normal', animateOnly: ['transform', 'opacity'] },
    expectStyle: {
      transition:
        'transform var(--motif-anim-normal-duration) var(--motif-anim-normal-easing), opacity var(--motif-anim-normal-duration) var(--motif-anim-normal-easing)',
    },
    skipOnRenderer: ['react-native'],
  },
];
