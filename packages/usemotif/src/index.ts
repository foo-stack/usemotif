/**
 * usemotif - cross-platform React styling.
 *
 * This file is the web entry. The package's `react-native` exports
 * condition routes Metro to `./index.native.js`, so a single
 * `usemotif` install works on both platforms.
 *
 * For web-only / tree-shake-sensitive builds, install
 * `@usemotif/react` directly - that's the DOM bindings this file
 * re-exports. For native-only builds, install `@usemotif/react-native`.
 *
 * (Renamed from `@usemotif/react` in v2.0.0. The npm name
 * `@usemotif/react` now refers to the DOM bindings package, which was
 * `@usemotif/react-web` in v1. The unscoped `motif-js` name was the
 * original v2 plan; npm blocked it at publish time - too similar to
 * an existing `motif.js` package - so v2's meta package ships as
 * `usemotif`, aligning with the docs domain at <usemotif.dev>.)
 */

export const PACKAGE_NAME = 'usemotif';

export { configureBreakpoints, createTheme, extendTheme, getBreakpoints } from '@usemotif/core';
export type {
  AnimationObject,
  AnimationValue,
  BreakpointName,
  FontFace,
  FontSource,
  FontVariationAxisSettings,
  MediaState,
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

export { keyframes } from '@usemotif/react';
export type { Keyframe, KeyframeDef } from '@usemotif/react';

export {
  AspectRatio,
  Box,
  Button,
  Center,
  CollectorContext,
  Container,
  Flex,
  Grid,
  HStack,
  Image,
  Presence,
  Pressable,
  Prose,
  SSRStyleCollector,
  SafeArea,
  Spacer,
  Stack,
  Text,
  TitleBar,
  Theme,
  ThemeContext,
  ThemeProvider,
  VStack,
  Wrap,
  ZStack,
  createMotionValue,
  isMotionValue,
  motionValueBrand,
  useActiveCollector,
  useAnimate,
  useBreakpoint,
  useContainerInfo,
  useDrag,
  useGesture,
  useLayoutAnimation,
  useMedia,
  useMotionValue,
  useSpring,
  useTheme,
  useThemeChain,
  useThemeName,
  useTransform,
} from '@usemotif/react';
export type {
  AnimateFn,
  AnimateTarget,
  AnimationControls,
  AnimationOptions,
  AnimationScope,
  ColorSpace,
  DragAxis,
  DragConstraints,
  DragInfo,
  GestureHandlers,
  GestureOptions,
  LayoutAnimationKind,
  MotionValue,
  PinchInfo,
  PresenceProps,
  SpringConfig,
  SwipeDirection,
  SwipeInfo,
  UseDragOptions,
  UseDragResult,
  UseGestureResult,
  UseLayoutAnimationOptions,
  UseTransformOptions,
} from '@usemotif/react';
export type {
  AspectRatioProps,
  BoxProps,
  ButtonIntent,
  ButtonProps,
  ButtonSize,
  ButtonVariant,
  CenterProps,
  ContainerContextValue,
  ContainerProps,
  FlexProps,
  GridProps,
  ImageProps,
  PressableProps,
  ProseProps,
  SafeAreaProps,
  SpacerProps,
  StackProps,
  TextProps,
  TitleBarProps,
  ThemeProps,
  ThemeProviderProps,
  WrapProps,
  ZStackProps,
} from '@usemotif/react';

export { Blockquote, Code, Heading, Kbd, Paragraph } from '@usemotif/react';
export type {
  BlockquoteProps,
  CodeProps,
  HeadingProps,
  KbdProps,
  ParagraphProps,
} from '@usemotif/react';

export { IconButton, Link } from '@usemotif/react';
export type {
  IconButtonIntent,
  IconButtonProps,
  IconButtonSize,
  IconButtonVariant,
  LinkProps,
} from '@usemotif/react';

export { Avatar, Icon, IconProvider, Path, Svg } from '@usemotif/react';
export type {
  AvatarProps,
  AvatarSize,
  IconProps,
  IconProviderProps,
  PathProps,
  SvgProps,
} from '@usemotif/react';

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
} from '@usemotif/react';
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
} from '@usemotif/react';

export { ScrollView, Sticky, VirtualList, useScroll, useScrollTarget } from '@usemotif/react';
export type {
  ScrollOffsetEdge,
  ScrollOffsetEntry,
  ScrollOffsetPair,
  ScrollTargetHandle,
  ScrollViewProps,
  StickyProps,
  UseScrollOptions,
  UseScrollResult,
  VirtualListProps,
} from '@usemotif/react';

export {
  FocusScope,
  Hide,
  LiveRegion,
  Overlay,
  Portal,
  Show,
  VisuallyHidden,
} from '@usemotif/react';
export type {
  FocusScopeProps,
  LiveRegionProps,
  OverlayProps,
  PortalProps,
  ShowHideProps,
  VisuallyHiddenProps,
} from '@usemotif/react';

export { createStyledContext, styled } from '@usemotif/react';
export {
  styledSlots,
  type SlotComponents,
  type SlotRecipeConfig,
  type SlotStyles,
  type SlotVariants,
  type SlotVariantsOf,
} from '@usemotif/react';
export type {
  CompoundVariant,
  StyledComponent,
  StyledConfig,
  StyledContext,
  VariantContext,
  VariantProps,
} from '@usemotif/react';

export {
  Direction,
  DirectionContext,
  getMotionDriver,
  PresenceContext,
  registerMotionDriver,
  registerVirtualListImpl,
  SVG_PRIMITIVES,
  useBreakpointWidths,
  useDirection,
  usePresence,
  useThemeSetting,
} from '@usemotif/react';
export type {
  DirectionProps,
  MotionPhase,
  MotionValueWidenedProp,
  MotionValueWideningOf,
  PresenceContextValue,
  ResolvedTheme,
  SvgPrimitives,
  SyncStorage,
  ThemeContextValue,
  ThemeMode,
  UseThemeSettingOptions,
  UseThemeSettingResult,
  VirtualListImpl,
} from '@usemotif/react';
export {
  MessagesProvider,
  useMessages,
  type MessagesProviderProps,
  type MotifMessages,
} from '@usemotif/react';
