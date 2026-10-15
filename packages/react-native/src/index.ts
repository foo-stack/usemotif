/**
 * @usemotif/react-native - React Native implementations of motif-js
 * primitives. Same prop schema as `@usemotif/react`; resolves
 * styles to literal values via JS-context theming (no CSS variables).
 */

export const PACKAGE_NAME = '@usemotif/react-native';

export { configureBreakpoints, createTheme, extendTheme, getBreakpoints } from '@usemotif/core';
export type {
  BreakpointName,
  MotifComponent,
  MotifCustomTheme,
  MotifTokens,
  MotifTypeOptions,
  StrictTokens,
} from '@usemotif/core';

export { Box } from './Box.js';
export type { BoxProps } from './Box.js';

export { Button } from './Button.js';
export type { ButtonIntent, ButtonProps, ButtonSize, ButtonVariant } from './Button.js';

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

export { NATIVE_SVG_COMPONENT, SVG_PRIMITIVES, Svg } from './Svg.js';
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
export type {
  MotifScrollViewRef,
  ScrollPublisher,
  ScrollState,
  ScrollViewProps,
  StickyProps,
  VirtualListImpl,
  VirtualListProps,
} from './scroll.js';

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
export type { ContainerProps, ContainerStyle } from './Container.js';

export { ContainerContext, useContainerInfo } from './container-context.js';
export type { ContainerContextValue } from './container-context.js';

export { HStack, Stack, VStack } from './Stack.js';
export type { StackProps } from './Stack.js';

export { Text } from './Text.js';
export type { TextProps } from './Text.js';

export { Pressable } from './Pressable.js';
export type { PressableProps } from './Pressable.js';

export { Image } from './Image.js';
export type { ImageProps } from './Image.js';

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

export { createAsyncStorageAdapter } from './asyncStorageAdapter.js';
export type {
  AsyncStorageAdapter,
  AsyncStorageLike,
  CreateAsyncStorageAdapterOptions,
} from './asyncStorageAdapter.js';

export {
  animatedDriver,
  getMotionDriver,
  noopDriver,
  registerMotionDriver,
} from './_animation/index.js';

export {
  PresenceContext,
  useExitTransitionNative,
  usePresence,
} from './_animation/presence-context.js';
export type {
  MotionPhase,
  PresenceContextValue,
  UseExitTransitionNativeResult,
} from './_animation/presence-context.js';
export { Presence, type PresenceProps } from './Presence.js';
export type {
  MotionDriver,
  MotionDriverEntryOptions,
  MotionValueDriverBinding,
  MotionValueDriverResult,
} from './_animation/types.js';

export { styled } from './styled.js';
export type { CompoundVariant, StyledComponent, StyledConfig, VariantProps } from './styled.js';
export { createStyledContext } from './styled-context.js';
export type { StyledContext, VariantContext } from './styled-context.js';
export { TitleBar, type TitleBarProps } from './TitleBar.js';
export {
  styledSlots,
  type SlotComponents,
  type SlotRecipeConfig,
  type SlotStyles,
  type SlotVariants,
  type SlotVariantsOf,
} from './styled-slots.js';
