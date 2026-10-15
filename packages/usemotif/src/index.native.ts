/**
 * usemotif - cross-platform React styling.
 *
 * Native entry. Reached via the package's `react-native` exports
 * condition when bundled by Metro / Expo. The web counterpart at
 * `./index.ts` re-exports from `@usemotif/react` (the DOM bindings,
 * formerly `@usemotif/react-web`); this file re-exports the parallel
 * surface from `@usemotif/react-native`.
 *
 * (Renamed from `@usemotif/react` in v2.0.0. Was briefly planned as
 * the unscoped `motif-js` until npm blocked the name; ships as
 * `usemotif` to match the docs domain.)
 */

export const PACKAGE_NAME = 'usemotif';

export {
  configureBreakpoints,
  createTheme,
  extendTheme,
  getBreakpoints,
  makeKeyframe as keyframes,
} from '@usemotif/core';
export type {
  AnimationObject,
  AnimationValue,
  BreakpointName,
  FontFace,
  FontSource,
  FontVariationAxisSettings,
  Keyframe,
  KeyframeDef,
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

export {
  AspectRatio,
  Box,
  Button,
  Center,
  Container,
  Flex,
  Grid,
  HStack,
  Image,
  Presence,
  Pressable,
  Prose,
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
} from '@usemotif/react-native';
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
} from '@usemotif/react-native';
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
} from '@usemotif/react-native';

export { Blockquote, Code, Heading, Kbd, Paragraph } from '@usemotif/react-native';
export type {
  BlockquoteProps,
  CodeProps,
  HeadingProps,
  KbdProps,
  ParagraphProps,
} from '@usemotif/react-native';

export { IconButton, Link } from '@usemotif/react-native';
export type {
  IconButtonIntent,
  IconButtonProps,
  IconButtonSize,
  IconButtonVariant,
  LinkProps,
} from '@usemotif/react-native';

export { Avatar, Icon, IconProvider, Path, Svg } from '@usemotif/react-native';
export type {
  AvatarProps,
  AvatarSize,
  IconProps,
  IconProviderProps,
  PathProps,
  SvgProps,
} from '@usemotif/react-native';

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
} from '@usemotif/react-native';
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
} from '@usemotif/react-native';

export {
  ScrollView,
  Sticky,
  VirtualList,
  useScroll,
  useScrollTarget,
} from '@usemotif/react-native';
export type {
  MotifScrollViewRef,
  ScrollOffsetEdge,
  ScrollOffsetEntry,
  ScrollOffsetPair,
  ScrollPublisher,
  ScrollState,
  ScrollTargetHandle,
  ScrollViewProps,
  StickyProps,
  UseScrollOptions,
  UseScrollResult,
  VirtualListProps,
} from '@usemotif/react-native';

export {
  FocusScope,
  Hide,
  LiveRegion,
  Overlay,
  Portal,
  Show,
  VisuallyHidden,
} from '@usemotif/react-native';
export type {
  FocusScopeProps,
  LiveRegionProps,
  OverlayProps,
  PortalProps,
  ShowHideProps,
  VisuallyHiddenProps,
} from '@usemotif/react-native';

export { createStyledContext, styled } from '@usemotif/react-native';
export {
  styledSlots,
  type SlotComponents,
  type SlotRecipeConfig,
  type SlotStyles,
  type SlotVariants,
  type SlotVariantsOf,
} from '@usemotif/react-native';
export type {
  CompoundVariant,
  StyledComponent,
  StyledConfig,
  StyledContext,
  VariantContext,
  VariantProps,
} from '@usemotif/react-native';

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
} from '@usemotif/react-native';
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
} from '@usemotif/react-native';
export {
  MessagesProvider,
  useMessages,
  type MessagesProviderProps,
  type MotifMessages,
} from '@usemotif/react-native';
