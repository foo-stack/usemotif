import {
  isResponsiveObject,
  parseResponsiveDSL,
  parseResponsiveKey,
  RESPONSIVE_ARRAY_SLOTS,
  responsiveArrayToObject,
} from './breakpoints.js';
import { isStyleProp, PSEUDO_STATE_PROPS } from './style-props.js';

/** Media slots in cascade order: a slot inherits the nearest one before it. */
const MEDIA_SLOTS: readonly string[] = RESPONSIVE_ARRAY_SLOTS;

/** A value in responsive form (object, array, or DSL) as an object, or `null`. */
function asResponsive(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return responsiveArrayToObject(value);
  if (isResponsiveObject(value)) return value;
  if (typeof value === 'string') return parseResponsiveDSL(value);
  return null;
}

/**
 * `value` at one slot. A media slot inherits the nearest media slot before it;
 * a container slot falls back to the base value.
 */
function valueAt(value: unknown, slot: string): unknown {
  const r = asResponsive(value);
  if (r === null) return value;
  if (Object.hasOwn(r, slot)) return r[slot];
  const end = MEDIA_SLOTS.indexOf(slot);
  for (let i = (end === -1 ? 0 : end) - 1; i >= 0; i--) {
    if (Object.hasOwn(r, MEDIA_SLOTS[i]!)) return r[MEDIA_SLOTS[i]!];
  }
  return end === -1 ? valueAt(r, 'base') : undefined;
}

function addSlots(value: unknown, into: Set<string>): void {
  const r = asResponsive(value);
  if (r === null) return;
  for (const key in r) if (parseResponsiveKey(key) !== null) into.add(key);
}

/** Folds one bag per slot into one bag whose style props are responsive. */
function fold(bags: ReadonlyMap<string, Record<string, unknown>>): Record<string, unknown> {
  const base = bags.get('base') ?? {};
  const keys = new Set<string>();
  for (const bag of bags.values()) for (const key in bag) keys.add(key);
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (PSEUDO_STATE_PROPS.has(key)) {
      const nested = new Map<string, Record<string, unknown>>();
      for (const [slot, bag] of bags) {
        const v = bag[key];
        if (typeof v === 'object' && v !== null) nested.set(slot, v as Record<string, unknown>);
      }
      if (nested.size > 0) out[key] = fold(nested);
      continue;
    }
    if (!isStyleProp(key)) {
      if (Object.hasOwn(base, key)) out[key] = base[key];
      continue;
    }
    const perSlot: Record<string, unknown> = {};
    let first: unknown;
    let varies = false;
    let seen = false;
    for (const [slot, bag] of bags) {
      const v = valueAt(bag[key], slot);
      if (v === undefined) continue;
      perSlot[slot] = v;
      if (!seen) {
        first = v;
        seen = true;
      } else if (v !== first) varies = true;
    }
    if (!seen) continue;
    out[key] = varies || !Object.hasOwn(perSlot, 'base') ? perSlot : first;
  }
  return out;
}

/**
 * Resolve variant values that may be responsive (`size={{ base: 'sm', md: 'lg' }}`,
 * `size={['sm', null, 'lg']}`, or `size="base:sm md:lg"`) into one style bag.
 *
 * `build` turns plain variant values into the merged bag (base, variants,
 * compound variants). It runs once per breakpoint slot, so compound variants
 * match per breakpoint, and the slot bags fold into responsive style props:
 * `px` becomes `{ base: 2, md: 4 }`. State bags fold the same way one level
 * down. Other keys, such as `transition`, come from the base slot. With no
 * responsive value, this is just `build(values)`.
 */
export function resolveResponsiveVariants(
  values: Readonly<Record<string, unknown>>,
  build: (values: Record<string, unknown>) => Record<string, unknown>,
): Record<string, unknown> {
  const slots = new Set<string>(['base']);
  let responsive = false;
  for (const key in values) {
    if (asResponsive(values[key]) !== null) {
      responsive = true;
      addSlots(values[key], slots);
    }
  }
  if (!responsive) return build({ ...values });

  const at = (slot: string): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const key in values) out[key] = valueAt(values[key], slot);
    return build(out);
  };
  const bags = new Map<string, Record<string, unknown>>();
  for (const slot of slots) bags.set(slot, at(slot));
  // A responsive value inside a variant's own styles adds its slots too.
  for (const bag of bags.values()) {
    for (const key in bag) {
      const v = bag[key];
      if (PSEUDO_STATE_PROPS.has(key) && typeof v === 'object' && v !== null) {
        for (const inner in v as Record<string, unknown>) {
          addSlots((v as Record<string, unknown>)[inner], slots);
        }
      } else if (isStyleProp(key)) addSlots(v, slots);
    }
  }
  for (const slot of slots) if (!bags.has(slot)) bags.set(slot, at(slot));
  return fold(bags);
}
