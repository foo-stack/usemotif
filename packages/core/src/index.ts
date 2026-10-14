/**
 * @usemotif/core - engine.
 *
 * Tokens, themes, the style-prop schema, and the runtime resolvers.
 * Both renderers (web, native) and the compiler consume from here.
 */

export const PACKAGE_NAME = '@usemotif/core';

export type {
  AnimationToken,
  CSSValue,
  Direction,
  DragAxis,
  DragConstraints,
  DragInfo,
  DragSpringConfig,
  FontFace,
  FontSource,
  ReducedMotionMode,
  ResolvedStyle,
  ScaleName,
  SpringAnimationToken,
  SpringConfig,
  StyleValue,
  Theme,
  ThemeRootStyles,
  TimingAnimationToken,
  TokenMap,
  TokenNode,
  TokenRef,
  TokenScale,
  TokenValue,
  UseDragOptions,
} from './types.js';

export { isTokenRef, resolveOutputRangeTokens, resolveToken, resolveValue } from './token.js';
export type { ResolveTokenOptions } from './token.js';

export { createTheme } from './createTheme.js';

export type {
  KnownScaleName,
  MotifCustomTheme,
  MotifTokens,
  MotifTypeOptions,
  Paths,
  ScalePath,
  StrictTokens,
  TokensOf,
} from './token-path.js';

export {
  MOTION_PROP_NAMES,
  MOTION_PROPS,
  PSEUDO_ELEMENT_PROP_NAMES,
  PSEUDO_ELEMENT_PROPS,
  PSEUDO_ELEMENT_SELECTOR,
  PSEUDO_SELECTOR,
  PSEUDO_STATE_PROP_NAMES,
  PSEUDO_STATE_PROPS,
  STYLE_PROP_NAMES,
  TRANSFORM_AXIS_NAMES,
  TRANSFORM_AXIS_SET,
  isKeyframe,
  isMotionProp,
  isPseudoElementProp,
  isPseudoStateProp,
  isStyleProp,
  keyframeBrand,
  serializeFontVariationSettings,
  styleProps,
} from './style-props.js';
export type {
  AnimationObject,
  AnimationValue,
  ExitStyleBag,
  FontVariationAxisSettings,
  InvalidTokenPath,
  Keyframe,
  MotifComponent,
  MotionPropName,
  MotionStyleBag,
  MotionStyleProps,
  PseudoElementPropName,
  PseudoElementStyleBag,
  PseudoElementStyleProps,
  PseudoStatePropName,
  StateStyleBag,
  StateStyleProps,
  StyleBag,
  StylePropDefinition,
  StylePropName,
  StyleProps,
  TransformAxis,
  TransitionObject,
  TransitionValue,
  ValidateStyleProps,
  ValidateStylePropsFrom,
  ValidateTokenValue,
} from './style-props.js';

export { composeTransformAxesNative, composeTransformAxesWeb } from './transform-composer.js';
export type { NativeTransformEntry, TransformAxes } from './transform-composer.js';

export {
  buildAnimationCss,
  buildAnimationShorthand,
  extractKeyframeFromAnimation,
  resolveAnimationToken,
  resolveTransition,
  resolveTransitionToVars,
  springToCssTiming,
} from './motion.js';

export { createMotionValue, isMotionValue, motionValueBrand } from './motion-value.js';
export type { MotionValue, MotionValueWideningOf, MotionValueWidenedProp } from './motion-value.js';

export { classifyOutputRange, interpolateOutputs } from './output-interpolator.js';
export type { ColorSpace, OutputRangeKind } from './output-interpolator.js';
export { parseColor } from './color-spaces.js';
export type { ParsedColor } from './color-spaces.js';

export { keyframesToCss, makeKeyframe } from './keyframes.js';
export type { KeyframeDef } from './keyframes.js';

export {
  computeTargetScrollProgress,
  parseScrollOffset,
  parseScrollOffsetEdge,
} from './scroll-offset.js';
export type {
  ResolvedScrollOffsetEntry,
  ScrollOffsetEdge,
  ScrollOffsetEntry,
  ScrollOffsetPair,
} from './scroll-offset.js';

export {
  resolvePseudoElementBag,
  resolveResponsiveStylesToVars,
  resolveStyles,
  resolveStylesToVars,
} from './style.js';
export type {
  AtRule,
  ResolveResponsiveOptions,
  ResolveResponsiveResult,
  ResolveStylesResult,
} from './style.js';

export {
  BASE_BREAKPOINT_KEY,
  MEDIA_KEYS,
  RESPONSIVE_ARRAY_SLOTS,
  RESPONSIVE_KEYS,
  SSR_DEFAULT_VIEWPORT_WIDTH,
  activeBreakpoint,
  breakpointMatches,
  configureBreakpoints,
  containerQueryForBreakpoint,
  defaultBreakpoints,
  getBreakpoints,
  isResponsiveObject,
  mediaQueryForBreakpoint,
  parseResponsiveDSL,
  parseResponsiveKey,
  resolveBreakpoints,
  responsiveArrayToObject,
  sameMatches,
} from './breakpoints.js';
export type { BreakpointName, MediaState, ResponsiveKey } from './breakpoints.js';

export {
  themeToCssBlock,
  themeToCssVars,
  themesToCssBlock,
  tokenPathToCssVarName,
  tokenRefToCssVar,
} from './css-vars.js';

export {
  fontFacesToCss,
  reducedMotionGuardCss,
  rootResetsToCss,
  themesRuntimeCss,
} from './runtime-css.js';

export {
  buildAtRulesCss,
  buildPseudoCss,
  camelToKebab,
  hashAtRules,
  hashPseudoRules,
  hashString,
  liftPseudoOverriddenBaseProps,
  maybePx,
  stringifyDeclarations,
  wrapInLayer,
} from './css-emit.js';
export type { PseudoRule } from './css-emit.js';
