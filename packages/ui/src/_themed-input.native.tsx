import type { ReactElement } from 'react';
import { Input } from 'usemotif';

// What a TextInput understands of what the kit and the headless parts pass:
// the cloned value and text handlers, focus and key events, and accessibility.
// The web style props are left behind; the platform Input themes itself.
const PASSED =
  /^(value|defaultValue|placeholder|onChangeText|onKeyPress|onSubmitEditing|onFocus|onBlur|editable|ref|nativeID|testID|accessibility.*|aria-.*|role)$/;

/** React Native: the platform `Input`, carrying the props a TextInput understands. */
export function ThemedInput(props: Record<string, unknown>): ReactElement {
  const passed: Record<string, unknown> = {};
  for (const key in props) if (PASSED.test(key)) passed[key] = props[key];
  return <Input {...passed} />;
}
