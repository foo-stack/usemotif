export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function snap(n: number, step: number, base = 0): number {
  // Quantize relative to `base` (the slider's min), not 0 - otherwise a `min`
  // that isn't a multiple of `step` (e.g. min=5, step=10) is unreachable and
  // the whole value lattice is offset, so Home reports the wrong value.
  return base + Math.round((n - base) / step) * step;
}
