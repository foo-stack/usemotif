/** The index of the active step: the `current` id, else the step marked active. */
export function activeStepIndex(
  steps: ReadonlyArray<{ readonly id: string; readonly status?: string }>,
  current: string | undefined,
): number {
  return current !== undefined
    ? steps.findIndex((s) => s.id === current)
    : steps.findIndex((s) => s.status === 'active');
}

/**
 * Whether a step can be clicked to: any step, or in a `linear` stepper only
 * the ones before the active step, so the user can go back but not skip ahead.
 */
export function canSelectStep(index: number, active: number, linear: boolean): boolean {
  return !linear || index < active;
}
