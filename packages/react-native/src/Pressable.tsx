import { resolveStyles, type StateStyleBag } from '@usemotif/core';
import { createElement, type ReactNode } from 'react';
import {
  Pressable as RNPressable,
  StyleSheet,
  type PressableProps as RNPressableProps,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';
import { useContainerInfo } from './container-context.js';
import { useDirection } from './direction-context.js';
import { sanitizeNativeStyle } from './_native-style.js';
import { resolveResponsivePropsAtViewportAndContainer, useViewportWidth } from './responsive.js';
import { useBreakpointWidths, useTheme } from './theme-context.js';

export interface PressableProps extends Omit<RNPressableProps, 'style' | 'onPress' | 'children'> {
  /**
   * Cross-platform alias for `onClick` / `onPress`. Suppressed when
   * `disabled` is `true`.
   */
  onPress?: ((event: GestureResponderEvent) => void) | null;
  /** Disables interaction. Sets `accessibilityState.disabled` so RN
   * applies the appropriate visual + a11y treatment. */
  disabled?: boolean;
  /** Hover-state style overrides. Applied when `hovered` is true on
   * platforms that support hover (web, desktop, mouse-connected
   * mobile). On touch-only mobile, hover never fires. */
  _hover?: StateStyleBag;
  /** Keyboard / accessibility focus state. */
  _focus?: StateStyleBag;
  /** Pressed-state style overrides (touch-down). */
  _active?: StateStyleBag;
  /** Disabled-state style overrides. */
  _disabled?: StateStyleBag;
  /** Style props at the React level. */
  style?: ViewStyle | readonly ViewStyle[];
  children?: ReactNode;
  /** Native-side: every Box style prop applies. */
  [styleProp: string]: unknown;
}

/**
 * Pressable surface for native - wraps RN's `Pressable` (which has
 * built-in `pressed` / `hovered` / `focused` state on the
 * children-as-function form). State styling props (`_hover`,
 * `_focus`, `_active`, `_disabled`) compose into the merged style on
 * the relevant state.
 *
 * Cross-platform alias `onPress` maps to RN's `onPress`. The web
 * renderer's Pressable also accepts `onPress` for parity, so users
 * write the same API on both platforms.
 *
 * @example
 *
 * ```tsx
 * <Pressable
 *   onPress={() => save()}
 *   bg="$colors.action.primary.bg"
 *   _hover={{ opacity: 0.9 }}
 *   _active={{ opacity: 0.8 }}
 *   _disabled={{ opacity: 0.5 }}
 * >
 *   <Text>Save</Text>
 * </Pressable>
 * ```
 */
export function Pressable(props: PressableProps) {
  const {
    onPress,
    disabled,
    _hover,
    _focus,
    _active,
    _disabled,
    style: userStyle,
    children,
    ...rest
  } = props;

  const theme = useTheme();
  const direction = useDirection();
  const width = useViewportWidth();
  const container = useContainerInfo();
  const breakpoints = useBreakpointWidths();
  const flattened = resolveResponsivePropsAtViewportAndContainer(
    rest,
    width,
    container,
    breakpoints,
  );
  const { style: resolvedBase, rest: passThrough } = resolveStyles(
    flattened as Record<string, unknown>,
    theme,
  );
  const baseStyle = sanitizeNativeStyle(resolvedBase as Record<string, unknown>);
  // Inject the resolved writing direction so logical props flip under a
  // nested `<Direction>`, matching Box/Text.
  baseStyle.direction = direction;

  // Resolve each pseudo-state bag at the current viewport and container, the
  // way the base props are, then against the same theme and through the same
  // native translation - otherwise a bag's `shadow`/`transform`/web-only keys
  // reach StyleSheet.create raw.
  const resolveBag = (bag: StateStyleBag | undefined): Record<string, unknown> | null =>
    bag === undefined
      ? null
      : sanitizeNativeStyle(
          resolveStyles(
            resolveResponsivePropsAtViewportAndContainer(
              bag as Record<string, unknown>,
              width,
              container,
              breakpoints,
            ) as Record<string, unknown>,
            theme,
          ).style,
        );
  const hoverStyle = resolveBag(_hover);
  const focusStyle = resolveBag(_focus);
  const activeStyle = resolveBag(_active);
  const disabledStyle = resolveBag(_disabled);

  const sheet = StyleSheet.create({
    base: baseStyle as ViewStyle,
    ...(hoverStyle === null ? {} : { hover: hoverStyle as ViewStyle }),
    ...(focusStyle === null ? {} : { focus: focusStyle as ViewStyle }),
    ...(activeStyle === null ? {} : { active: activeStyle as ViewStyle }),
    ...(disabledStyle === null ? {} : { disabled: disabledStyle as ViewStyle }),
  });

  const handlePress = (event: GestureResponderEvent): void => {
    if (disabled === true) return;
    onPress?.(event);
  };

  // RN's Pressable accepts a function-as-style: `(state) => style[]`.
  // We merge the base + active state-styles based on the state RN
  // gives us. `userStyle` (the literal escape hatch) layers last.
  const styleFn = (state: { pressed: boolean; hovered?: boolean; focused?: boolean }) => {
    const arr: ViewStyle[] = [sheet.base];
    if (hoverStyle !== null && state.hovered === true) arr.push(sheet.hover!);
    if (focusStyle !== null && state.focused === true) arr.push(sheet.focus!);
    if (activeStyle !== null && state.pressed === true) arr.push(sheet.active!);
    if (disabledStyle !== null && disabled === true) arr.push(sheet.disabled!);
    if (userStyle !== undefined) {
      if (Array.isArray(userStyle)) arr.push(...(userStyle as ViewStyle[]));
      else arr.push(userStyle as ViewStyle);
    }
    return arr;
  };

  return createElement(
    RNPressable,
    {
      ...(passThrough as RNPressableProps),
      onPress: handlePress,
      // Forward `disabled` to RN's Pressable so it suppresses the pressed
      // state and stops firing onPressIn/onPressOut/onLongPress - gating
      // `handlePress` alone leaves those pass-through callbacks live.
      ...(disabled === true
        ? {
            disabled: true,
            accessibilityState: { ...(rest['accessibilityState'] as object), disabled: true },
          }
        : {}),
      style: styleFn,
    },
    children,
  );
}
