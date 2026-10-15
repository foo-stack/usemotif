import { Switch as WebTypedSwitch } from '@usemotif/headless';
import type { ComponentType, ReactElement } from 'react';

export interface SwitchProps {
  readonly value?: boolean;
  readonly defaultValue?: boolean;
  readonly onValueChange?: (next: boolean) => void;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly accessibilityLabel?: string;
}

// Typed against headless's web declarations, where Switch is a DOM input; the
// native build resolves the platform switch.
const HeadlessSwitch = WebTypedSwitch as unknown as ComponentType<SwitchProps>;

/**
 * Native Switch: the platform switch through headless, which looks and feels
 * native. It takes the headless API (`value`, `onValueChange`) rather than the
 * web input's `checked` and `onChange`.
 */
export function Switch(props: SwitchProps): ReactElement {
  return <HeadlessSwitch {...props} />;
}
