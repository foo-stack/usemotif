import { type MotifComponent, resolveStyles, type StyleProps } from '@usemotif/core';
import { useMessages } from './messages.js';
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  TextInput as RNTextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps as RNTextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Box, type BoxProps } from './Box.js';
import { useDirection } from './direction-context.js';
import { Pressable } from './Pressable.js';
import { Text, type TextProps } from './Text.js';
import { useTheme } from './theme-context.js';

interface FieldContextValue {
  readonly fieldId: string;
  readonly invalid: boolean;
  readonly disabled: boolean;
  readonly required: boolean;
}
const FieldContext = createContext<FieldContextValue | null>(null);
function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}

export interface FieldProps extends BoxProps {
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  children?: ReactNode;
}
export const Field: MotifComponent<FieldProps, ReactElement | null> = function ({
  invalid = false,
  disabled = false,
  required = false,
  id,
  children,
  ...rest
}: FieldProps): ReactElement {
  const reactId = useId();
  const fieldId = id ?? reactId;
  return (
    <FieldContext.Provider value={{ fieldId, invalid, disabled, required }}>
      <Box gap="$1.5" {...rest}>
        {children}
      </Box>
    </FieldContext.Provider>
  );
};

export interface LabelProps extends TextProps {}
export const Label: MotifComponent<LabelProps, ReactElement | null> = function ({
  children,
  ...rest
}: LabelProps): ReactElement {
  const ctx = useFieldContext();
  return (
    <Text fontSize="$sm" fontWeight="$semibold" color="$colors.text.default" {...rest}>
      {children}
      {ctx?.required === true ? <Text color="$colors.action.danger.bg">{' *'}</Text> : null}
    </Text>
  );
};

export interface FieldHelpProps extends TextProps {}
export const FieldHelp: MotifComponent<FieldHelpProps, ReactElement | null> = function ({
  children,
  ...rest
}: FieldHelpProps): ReactElement {
  return (
    <Text fontSize="$sm" color="$colors.text.muted" {...rest}>
      {children}
    </Text>
  );
};

export interface FieldErrorProps extends TextProps {}
export const FieldError: MotifComponent<FieldErrorProps, ReactElement | null> = function ({
  children,
  ...rest
}: FieldErrorProps): ReactElement {
  return (
    <Text
      accessibilityLiveRegion="polite"
      fontSize="$sm"
      color="$colors.action.danger.bg"
      {...rest}
    >
      {children}
    </Text>
  );
};

export interface FieldsetProps extends BoxProps {
  legend?: ReactNode;
  children?: ReactNode;
}
export const Fieldset: MotifComponent<FieldsetProps, ReactElement | null> = function ({
  legend,
  children,
  ...rest
}: FieldsetProps): ReactElement {
  return (
    <Box
      borderWidth={1}
      borderStyle="solid"
      borderColor="$colors.border.default"
      borderRadius="$md"
      p="$4"
      gap="$2"
      {...rest}
    >
      {legend !== undefined && legend !== null ? (
        <Text fontSize="$sm" fontWeight="$semibold">
          {legend}
        </Text>
      ) : null}
      {children}
    </Box>
  );
};

/**
 * Input - wraps RN's TextInput with motif's theme-resolved style
 * surface. Themed via the standard token references; the resolver
 * runs at render time (RN doesn't have CSS variables).
 */
export interface InputProps extends Omit<RNTextInputProps, 'editable' | 'style'> {
  invalid?: boolean;
  disabled?: boolean;
  /** Style override merged onto the resolved input surface. */
  style?: TextStyle | readonly TextStyle[];
  /** Shown inside the field before the text: an icon, a prefix, a button. */
  startElement?: ReactNode;
  /** Shown inside the field after the text. */
  endElement?: ReactNode;
}

// Moved to the row wrapping an adorned input, which carries the surface.
const SURFACE_KEYS = [
  'paddingInline',
  'borderWidth',
  'borderStyle',
  'borderColor',
  'borderRadius',
  'backgroundColor',
  'opacity',
  'direction',
] as const;

/** A bare string must sit in `<Text>` on native, or React Native throws. */
function adornment(node: ReactNode): ReactNode {
  return typeof node === 'string' || typeof node === 'number' ? <Text>{node}</Text> : node;
}

export const Input = /* @__PURE__ */ forwardRef(function Input(
  { invalid, disabled, style: userStyle, startElement, endElement, ...rest }: InputProps,
  ref: Ref<RNTextInput>,
): ReactElement {
  const ctx = useFieldContext();
  const isInvalid = invalid ?? ctx?.invalid ?? false;
  const isDisabled = disabled ?? ctx?.disabled ?? false;
  const theme = useTheme();
  const direction = useDirection();
  const propsBag: StyleProps = {
    px: '$3',
    py: '$2',
    fontSize: '$md',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: isInvalid ? '$colors.action.danger.bg' : '$colors.border.default',
    borderRadius: '$md',
    bg: '$colors.surface.base',
    color: '$colors.text.default',
    opacity: isDisabled ? 0.6 : 1,
  };
  const { style: resolved } = resolveStyles(propsBag as Record<string, unknown>, theme);
  // Inject the resolved writing direction so the input flows RTL under a
  // nested `<Direction>`, matching Box/Text/Pressable rather than only
  // following the global I18nManager.
  (resolved as Record<string, unknown>).direction = direction;
  const finalStyle: TextStyle[] =
    userStyle === undefined
      ? [resolved as TextStyle]
      : Array.isArray(userStyle)
        ? [resolved as TextStyle, ...(userStyle as TextStyle[])]
        : [resolved as TextStyle, userStyle as TextStyle];
  if (startElement === undefined && endElement === undefined) {
    return <RNTextInput ref={ref} editable={!isDisabled} style={finalStyle} {...rest} />;
  }
  // With an adornment, the field is a row: the wrapper carries the surface,
  // and the borderless input takes the width the adornments leave.
  const surface: Record<string, unknown> = { flexDirection: 'row', alignItems: 'center', gap: 8 };
  const field: Record<string, unknown> = { flex: 1 };
  for (const [key, value] of Object.entries(resolved as Record<string, unknown>)) {
    if ((SURFACE_KEYS as readonly string[]).includes(key)) surface[key] = value;
    else field[key] = value;
  }
  const inputStyle: TextStyle[] =
    userStyle === undefined
      ? [field as TextStyle]
      : [field as TextStyle, ...(Array.isArray(userStyle) ? userStyle : [userStyle as TextStyle])];
  return (
    <View style={surface as ViewStyle}>
      {adornment(startElement)}
      <RNTextInput ref={ref} editable={!isDisabled} style={inputStyle} {...rest} />
      {adornment(endElement)}
    </View>
  );
});

export interface TextAreaProps extends Omit<InputProps, 'multiline' | 'numberOfLines'> {
  /** Visible lines; with `autoResize`, the height it starts at. Defaults to 3. */
  rows?: number;
  /** Grow and shrink with the content, from `rows` lines up to `maxRows`. */
  autoResize?: boolean;
  /** With `autoResize`, the most lines shown before the text scrolls. */
  maxRows?: number;
}

/** The line height the TextArea's row counts are measured in, in px. */
const LINE = 24;

export const TextArea = /* @__PURE__ */ forwardRef(function TextArea(
  { rows = 3, autoResize = false, maxRows, style, onContentSizeChange, ...rest }: TextAreaProps,
  ref: Ref<RNTextInput>,
): ReactElement {
  const [content, setContent] = useState(0);
  const max = maxRows === undefined ? Infinity : maxRows * LINE;
  const height = autoResize ? Math.min(Math.max(content, rows * LINE), max) : undefined;
  const taStyle: TextStyle = {
    minHeight: rows * LINE,
    textAlignVertical: 'top',
    ...(height !== undefined ? { height } : {}),
  };
  const merged: TextStyle | readonly TextStyle[] =
    style === undefined
      ? taStyle
      : Array.isArray(style)
        ? [taStyle, ...(style as TextStyle[])]
        : [taStyle, style as TextStyle];
  return (
    <Input
      ref={ref}
      multiline
      numberOfLines={rows}
      style={merged as TextStyle}
      {...(autoResize ? { scrollEnabled: content > max } : {})}
      onContentSizeChange={(e) => {
        if (autoResize) setContent(e.nativeEvent.contentSize.height);
        onContentSizeChange?.(e);
      }}
      {...rest}
    />
  );
});

export interface NumberInputProps extends Omit<InputProps, 'keyboardType'> {
  keyboardType?: KeyboardTypeOptions;
}
export const NumberInput = /* @__PURE__ */ forwardRef(function NumberInput(
  { keyboardType = 'numeric', ...rest }: NumberInputProps,
  ref: Ref<RNTextInput>,
): ReactElement {
  return <Input ref={ref} keyboardType={keyboardType} {...rest} />;
});

export interface PasswordInputProps extends Omit<InputProps, 'secureTextEntry'> {
  togglable?: boolean;
}
export const PasswordInput = /* @__PURE__ */ forwardRef(function PasswordInput(
  { togglable = true, ...rest }: PasswordInputProps,
  ref: Ref<RNTextInput>,
): ReactElement {
  const messages = useMessages();
  const [visible, setVisible] = useState(false);
  if (!togglable) {
    return <Input ref={ref} secureTextEntry {...rest} />;
  }
  return (
    <Box flexDirection="row" alignItems="center">
      <Box flex={1}>
        <Input ref={ref} secureTextEntry={!visible} {...rest} />
      </Box>
      <Pressable
        accessibilityLabel={visible ? messages.hidePassword : messages.showPassword}
        onPress={() => setVisible((v) => !v)}
        px="$3"
      >
        <Text>{visible ? '🙈' : '👁'}</Text>
      </Pressable>
    </Box>
  );
});
