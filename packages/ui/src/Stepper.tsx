'use client';

import { Stepper as HeadlessStepper, type StepperStep } from '@usemotif/headless';
import type { CSSProperties, ReactElement } from 'react';
import { Box } from 'usemotif';
import { platformText } from './_platform-text.js';
import { usePlatformStyle } from './_platform-style.js';

export type { StepperStep };

export interface StepperProps {
  readonly steps: ReadonlyArray<StepperStep>;
  /** Active step id (overrides each step's own `status`). */
  readonly current?: string;
  readonly orientation?: 'horizontal' | 'vertical';
  /** Makes the steps clickable, reporting the id clicked. */
  readonly onStepChange?: (id: string) => void;
  /** With `onStepChange`, only steps before the active one can be clicked. */
  readonly linear?: boolean;
}

const STYLE_HORIZONTAL: CSSProperties = { gap: 24, alignItems: 'center' };
const STYLE_VERTICAL: CSSProperties = { gap: 16 };

interface StepInfo {
  readonly step: StepperStep;
  readonly index: number;
  readonly status: 'pending' | 'active' | 'complete' | 'error';
  readonly isLast: boolean;
  readonly selectable: boolean;
}

// Module-scoped so it's a stable `renderStep` reference (lint: no-new-fn-as-prop).
// The circle and label recolour by status from the palette + `status` tokens.
function renderThemedStep(info: StepInfo): ReactElement {
  const { step, index, status } = info;
  const complete = status === 'complete';
  const error = status === 'error';
  const active = status === 'active';
  const circleBg = active
    ? '$colors.action.primary.bg'
    : complete
      ? '$colors.status.success.tint'
      : error
        ? '$colors.status.danger.tint'
        : '$colors.surface.muted';
  const circleColor = active
    ? '$colors.text.inverse'
    : complete
      ? '$colors.status.success.fg'
      : error
        ? '$colors.status.danger.fg'
        : '$colors.text.muted';
  const mark = complete ? '✓' : error ? '!' : String(index + 1);
  return (
    <Box display="flex" alignItems="center" gap="$space.2">
      <Box
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        width={28}
        height={28}
        borderRadius="$radii.full"
        fontSize="$fontSizes.sm"
        fontWeight={600}
        bg={circleBg}
        color={circleColor}
      >
        {platformText(mark, { color: circleColor, fontSize: '$fontSizes.sm', fontWeight: 600 })}
      </Box>
      <Box
        as="span"
        fontSize="$fontSizes.sm"
        fontWeight={active ? 600 : 400}
        color={status === 'pending' ? '$colors.text.muted' : '$colors.text.default'}
      >
        {platformText(step.label, {
          fontSize: '$fontSizes.sm',
          fontWeight: active ? 600 : 400,
          color: status === 'pending' ? '$colors.text.muted' : '$colors.text.default',
        })}
      </Box>
    </Box>
  );
}

/**
 * Themed step indicator over the accessible headless `Stepper` (`aria-current="step"`
 * on the active step). Each step shows a status-coloured circle (number, ✓ when
 * complete, ! on error) and label.
 *
 * ```tsx
 * <Stepper
 *   current="ship"
 *   steps={[
 *     { id: 'cart', label: 'Cart', status: 'complete' },
 *     { id: 'ship', label: 'Shipping' },
 *     { id: 'pay', label: 'Payment' },
 *   ]}
 * />
 * ```
 */
export function Stepper({
  steps,
  current,
  orientation = 'horizontal',
  onStepChange,
  linear,
}: StepperProps) {
  const platformStyle = usePlatformStyle();
  return (
    <HeadlessStepper
      steps={steps}
      orientation={orientation}
      renderStep={renderThemedStep}
      style={platformStyle(orientation === 'vertical' ? STYLE_VERTICAL : STYLE_HORIZONTAL)}
      {...(current !== undefined ? { current } : {})}
      {...(onStepChange !== undefined ? { onStepChange } : {})}
      {...(linear !== undefined ? { linear } : {})}
    />
  );
}
