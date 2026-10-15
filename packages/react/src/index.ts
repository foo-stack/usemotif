/**
 * @usemotif/react - DOM bindings for motif-js.
 *
 * Exports React components that render real DOM elements with theme-aware
 * style-prop resolution, plus the `styled()` factory and `keyframes` helper.
 *
 * For projects that target web + native from one import site, install
 * `motif-js` instead - it re-exports this package on web and
 * `@usemotif/react-native` on native via the `react-native` export
 * condition.
 *
 * (Renamed from `@usemotif/react-web` in v2.0.0. The previous
 * `@usemotif/react` was the cross-platform aggregator, which is now
 * the unscoped `motif-js` package.)
 */

export const PACKAGE_NAME = '@usemotif/react';

export { configureBreakpoints, createTheme, extendTheme, getBreakpoints } from '@usemotif/core';
export type {
  AnimationObject,
  AnimationValue,
  BreakpointName,
  FontFace,
  FontSource,
  FontVariationAxisSettings,
  MotifComponent,
  MotifCustomTheme,
  MotifTokens,
  MotifTypeOptions,
  PseudoElementStyleBag,
  PseudoElementStyleProps,
  ReducedMotionMode,
  StrictTokens,
  ThemeRootStyles,
  TokenMap,
} from '@usemotif/core';

export { keyframes } from './keyframes.js';
export type { Keyframe, KeyframeDef } from './keyframes.js';

export { Box } from './Box.js';
export { Button } from './Button.js';
export type { ButtonIntent, ButtonProps, ButtonSize, ButtonVariant } from './Button.js';
export type { BoxProps } from './Box.js';

export {
  AspectRatio,
  Center,
  Flex,
  Grid,
  SafeArea,
  Spacer,
  Wrap,
  ZStack,
} from './layout-extras.js';
export type {
  AspectRatioProps,
  CenterProps,
  FlexProps,
  GridProps,
  SafeAreaProps,
  SpacerProps,
  WrapProps,
  ZStackProps,
} from './layout-extras.js';

export { Blockquote, Code, Heading, Kbd, Paragraph } from './typography.js';
export type {
  BlockquoteProps,
  CodeProps,
  HeadingProps,
  KbdProps,
  ParagraphProps,
} from './typography.js';

export { IconButton } from './IconButton.js';
export type {
  IconButtonIntent,
  IconButtonProps,
  IconButtonSize,
  IconButtonVariant,
} from './IconButton.js';

export { Link } from './Link.js';
export type { LinkProps } from './Link.js';

export { Avatar } from './Avatar.js';
export type { AvatarProps, AvatarSize } from './Avatar.js';

export { Icon, IconProvider } from './Icon.js';
export type { IconProps, IconProviderProps } from './Icon.js';

export { SVG_PRIMITIVES, Svg } from './Svg.js';
export type { SvgPrimitives, SvgProps } from './Svg.js';
export { Path } from './Path.js';
export type { PathProps } from './Path.js';

export {
  Field,
  FieldError,
  FieldHelp,
  Fieldset,
  Input,
  Label,
  NumberInput,
  PasswordInput,
  TextArea,
} from './forms.js';
export type {
  FieldErrorProps,
  FieldHelpProps,
  FieldProps,
  FieldsetProps,
  InputProps,
  LabelProps,
  NumberInputProps,
  PasswordInputProps,
  TextAreaProps,
} from './forms.js';

export { ScrollView, Sticky, VirtualList, registerVirtualListImpl } from './scroll.js';
export type { ScrollViewProps, StickyProps, VirtualListImpl, VirtualListProps } from './scroll.js';

export { useScroll, useScrollTarget } from './use-scroll.js';
export { useBreakpoint, useMedia } from './use-media.js';
export type { ScrollTargetHandle, UseScrollOptions, UseScrollResult } from './use-scroll.js';
export type { ScrollOffsetEdge, ScrollOffsetEntry, ScrollOffsetPair } from '@usemotif/core';

export { FocusScope, Hide, LiveRegion, Overlay, Portal, Show, VisuallyHidden } from './overlay.js';
export type {
  FocusScopeProps,
  LiveRegionProps,
  OverlayProps,
  PortalProps,
  ShowHideProps,
  VisuallyHiddenProps,
} from './overlay.js';

export { Container } from './Container.js';
export type { ContainerProps } from './Container.js';
export { useContainerInfo } from './container-context.js';
export type { ContainerContextValue } from './container-context.js';

export { Image } from './Image.js';
export type { ImageProps } from './Image.js';

export { Pressable } from './Pressable.js';
export type { PressableProps } from './Pressable.js';

export { HStack, Stack, VStack } from './Stack.js';
export type { StackProps } from './Stack.js';

export { Text } from './Text.js';
export type { TextProps } from './Text.js';

export { Theme, ThemeProvider } from './Theme.js';
export type { ThemeProps, ThemeProviderProps } from './Theme.js';

export {
  ThemeContext,
  useBreakpointWidths,
  useTheme,
  useThemeChain,
  useThemeName,
} from './theme-context.js';
export type { ThemeContextValue } from './theme-context.js';

export { Direction } from './Direction.js';
export type { DirectionProps } from './Direction.js';
export { DirectionContext, useDirection } from './direction-context.js';

export { useMotionValue, useTransform } from './use-motion-value.js';
export type { UseTransformOptions } from './use-motion-value.js';
export type { ColorSpace } from '@usemotif/core';
export { useSpring } from './use-spring.js';
export type { SpringConfig } from './use-spring.js';
export { useAnimate } from './use-animate.js';
export type {
  AnimateFn,
  AnimateTarget,
  AnimationControls,
  AnimationOptions,
  AnimationScope,
} from './use-animate.js';
export { useDrag } from './use-drag.js';
export type {
  DragAxis,
  DragConstraints,
  DragInfo,
  UseDragOptions,
  UseDragResult,
} from './use-drag.js';
export { useLayoutAnimation } from './use-layout-animation.js';
export type { LayoutAnimationKind, UseLayoutAnimationOptions } from './use-layout-animation.js';
export { cssDriver, getMotionDriver, registerMotionDriver } from './_animation/index.js';
export { waapiDriver } from './_animation/waapi.js';
export type {
  WebEntryOptions,
  WebEntryState,
  WebExitOptions,
  WebMotionDriver,
} from './_animation/index.js';
export {
  PresenceContext,
  usePresence,
  useExitPresence,
  type MotionPhase,
  type PresenceContextValue,
  type UseExitPresenceResult,
} from './_animation/index.js';
export { Presence, type PresenceProps } from './Presence.js';
export {
  createMotionValue,
  isMotionValue,
  motionValueBrand,
  type MotionValue,
  type MotionValueWideningOf,
  type MotionValueWidenedProp,
} from '@usemotif/core';

export { useThemeSetting } from './useThemeSetting.js';
export type {
  ResolvedTheme,
  SyncStorage,
  ThemeMode,
  UseThemeSettingOptions,
  UseThemeSettingResult,
} from './useThemeSetting.js';

export {
  SSRStyleCollector,
  flushPendingCss,
  injectAtRules,
  injectPseudoRules,
} from './style-cache.js';
export type { AtRule, PseudoRule } from './style-cache.js';

export { CollectorContext, useActiveCollector } from './collector-context.js';

export { styled } from './styled.js';
export type { CompoundVariant, StyledComponent, StyledConfig, VariantProps } from './styled.js';
export { createStyledContext } from './styled-context.js';
export type { StyledContext, VariantContext } from './styled-context.js';
