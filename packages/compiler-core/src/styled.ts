import * as t from '@babel/types';
import { evaluateLiteral, type ScopeLike } from './literal.js';

/**
 * Compile-time mirror of the runtime `StyledConfig` shape (see
 * `packages/react/src/styled.tsx`). Stored as plain values the
 * resolver can interpret without re-importing the runtime types.
 *
 * - `base` - style props always applied.
 * - `variants` - flat map of variant prop name → either:
 *    - `{ kind: 'explicit', cases: { sm: {...}, md: {...} } }` for keyed records,
 *    - `{ kind: 'fallback' }` for `'...name'` function-form variants. Fallback
 *      bodies aren't statically resolvable without invoking the function, so
 *      the resolver bails when an active variant value falls through to the
 *      fallback.
 * - `compoundVariants` - array of matchers + style override.
 * - `defaultVariants` - explicit-only fallbacks for omitted call-site props.
 *
 * Built by {@link evaluateStyledConfig} from the AST passed to a
 * `styled()` call. When any branch of the config is dynamic (a function
 * fallback, a non-literal variant value, etc.) the corresponding entry
 * is marked dynamic and the resolver bails when that path is taken.
 */
export interface ResolvedStyledConfig {
  readonly base: Readonly<Record<string, unknown>>;
  readonly variants: Readonly<Record<string, ResolvedVariantEntry>>;
  readonly compoundVariants: ReadonlyArray<ResolvedCompoundVariant>;
  readonly defaultVariants: Readonly<Record<string, unknown>>;
  /** Names of every variant prop the config accepts (explicit + fallback). */
  readonly variantNames: ReadonlySet<string>;
}

export type ResolvedVariantEntry =
  | { readonly kind: 'explicit'; readonly cases: Readonly<Record<string, Record<string, unknown>>> }
  | { readonly kind: 'fallback' };

export interface ResolvedCompoundVariant {
  /** Variant prop matchers (`{ size: 'sm', intent: 'primary' }`). */
  readonly matchers: Readonly<Record<string, unknown>>;
  /** Style props applied when every matcher is satisfied. */
  readonly css: Readonly<Record<string, unknown>>;
}

/**
 * Evaluate the second argument of a `styled(Component, config)` call into
 * a `ResolvedStyledConfig`. Returns `null` when the config is
 * non-literal (variable reference, dynamic spread, etc.) - the call
 * site stays at runtime.
 *
 * Function-form variants (`'...size': (val) => ...`) are recognised and
 * stored as `kind: 'fallback'` markers; the body is opaque to the
 * compiler, so any active variant value that falls through to the
 * fallback forces the resolver to bail at the call site.
 */
export function evaluateStyledConfig(
  configNode: t.Node | null | undefined,
  scope?: ScopeLike,
): ResolvedStyledConfig | null {
  if (configNode === null || configNode === undefined) return null;
  if (!t.isObjectExpression(configNode)) {
    // Allow `styled(Box, BASE_CONFIG)` if BASE_CONFIG is a const-bound
    // literal in scope.
    if (t.isIdentifier(configNode) && scope !== undefined) {
      const lit = evaluateLiteral(configNode, scope);
      if (
        lit.ok &&
        typeof lit.value === 'object' &&
        lit.value !== null &&
        !Array.isArray(lit.value)
      ) {
        return resolveFromLiteralRecord(lit.value as Record<string, unknown>);
      }
    }
    return null;
  }

  let base: Record<string, unknown> = {};
  const variants: Record<string, ResolvedVariantEntry> = {};
  const variantNames = new Set<string>();
  let compoundVariants: ResolvedCompoundVariant[] = [];
  let defaultVariants: Record<string, unknown> = {};

  for (const prop of configNode.properties) {
    if (!t.isObjectProperty(prop) || prop.computed) return null;
    const key = prop.key;
    let keyName: string | null = null;
    if (t.isIdentifier(key)) keyName = key.name;
    else if (t.isStringLiteral(key)) keyName = key.value;
    if (keyName === null) return null;

    const value = prop.value;
    if (!t.isExpression(value)) return null;

    if (keyName === 'base') {
      const lit = evaluateLiteral(value, scope);
      if (!lit.ok || typeof lit.value !== 'object' || lit.value === null) return null;
      base = lit.value as Record<string, unknown>;
    } else if (keyName === 'variants') {
      const parsed = parseVariantsAst(value, scope, variantNames);
      if (parsed === null) return null;
      Object.assign(variants, parsed);
    } else if (keyName === 'compoundVariants') {
      const parsed = parseCompoundVariantsAst(value, scope);
      if (parsed === null) return null;
      compoundVariants = parsed;
    } else if (keyName === 'defaultVariants') {
      const lit = evaluateLiteral(value, scope);
      if (!lit.ok || typeof lit.value !== 'object' || lit.value === null) return null;
      defaultVariants = lit.value as Record<string, unknown>;
    } else {
      // Unknown config key - bail to avoid silently dropping it.
      return null;
    }
  }

  return { base, variants, compoundVariants, defaultVariants, variantNames };
}

/**
 * Merge `base` + active variants + matching compound variants into a
 * single style-props record, mirroring the runtime path in
 * `packages/react/src/styled.tsx`. Returns `null` when the call site
 * routes through a function-form variant (the compiler can't execute
 * the function), or when a literal call value doesn't match an
 * explicit case (the runtime would silently no-op; we leave it to the
 * runtime so the diagnostics stay consistent).
 *
 * `callValues` should already be filtered to the variant prop names
 * the config accepts; non-variant call-site props are pass-through and
 * not handled here.
 */
export function resolveStyledMergedProps(
  config: ResolvedStyledConfig,
  callValues: Readonly<Record<string, unknown>>,
): Record<string, unknown> | null {
  const effective: Record<string, unknown> = { ...config.defaultVariants, ...callValues };

  let merged: Record<string, unknown> = { ...config.base };

  for (const variantName of config.variantNames) {
    const value = effective[variantName];
    if (value === undefined) continue;
    const entry = config.variants[variantName];
    if (entry === undefined) continue;
    if (entry.kind === 'fallback') {
      // Function-form variant - opaque at compile time.
      return null;
    }
    const explicitKey = String(value);
    const fromExplicit = entry.cases[explicitKey];
    if (fromExplicit === undefined) {
      // Runtime would silently fall through to the fallback (none here)
      // and apply nothing; still a runtime concern. Bail so behaviour
      // matches across compiled / uncompiled call sites.
      return null;
    }
    merged = { ...merged, ...fromExplicit };
  }

  for (const compound of config.compoundVariants) {
    let allMatch = true;
    for (const matchKey in compound.matchers) {
      const expected = compound.matchers[matchKey];
      const actual = effective[matchKey];
      const actualKey = typeof actual === 'boolean' ? (actual ? 'true' : 'false') : actual;
      const expectedKey = typeof expected === 'boolean' ? (expected ? 'true' : 'false') : expected;
      if (actualKey !== expectedKey) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      merged = { ...merged, ...compound.css };
    }
  }

  return merged;
}

function parseVariantsAst(
  node: t.Expression,
  scope: ScopeLike | undefined,
  outNames: Set<string>,
): Record<string, ResolvedVariantEntry> | null {
  if (!t.isObjectExpression(node)) return null;
  const out: Record<string, ResolvedVariantEntry> = {};
  for (const prop of node.properties) {
    if (!t.isObjectProperty(prop) || prop.computed) return null;
    const key = prop.key;
    let keyName: string | null = null;
    if (t.isIdentifier(key)) keyName = key.name;
    else if (t.isStringLiteral(key)) keyName = key.value;
    if (keyName === null) return null;

    const isFallback = keyName.startsWith('...');
    const variantName = isFallback ? keyName.slice(3) : keyName;
    outNames.add(variantName);

    const value = prop.value;
    if (isFallback) {
      // Function bodies are opaque - record the marker and continue.
      out[variantName] = { kind: 'fallback' };
      continue;
    }

    if (!t.isExpression(value)) return null;
    const lit = evaluateLiteral(value, scope);
    if (!lit.ok) return null;
    const cases = toVariantCases(lit.value);
    if (cases === null) return null;
    out[variantName] = { kind: 'explicit', cases };
  }
  return out;
}

function parseCompoundVariantsAst(
  node: t.Expression,
  scope: ScopeLike | undefined,
): ResolvedCompoundVariant[] | null {
  if (!t.isArrayExpression(node)) return null;
  const out: ResolvedCompoundVariant[] = [];
  for (const el of node.elements) {
    if (el === null) return null;
    if (t.isSpreadElement(el)) return null;
    const lit = evaluateLiteral(el, scope);
    if (!lit.ok) return null;
    const compound = toCompoundVariant(lit.value);
    if (compound === null) return null;
    out.push(compound);
  }
  return out;
}

/** A variant's cases, or `null` unless every case is a style object. */
function toVariantCases(value: unknown): Record<string, Record<string, unknown>> | null {
  if (typeof value !== 'object' || value === null) return null;
  const cases: Record<string, Record<string, unknown>> = {};
  for (const [caseKey, caseValue] of Object.entries(value)) {
    if (typeof caseValue !== 'object' || caseValue === null) return null;
    cases[caseKey] = caseValue as Record<string, unknown>;
  }
  return cases;
}

/** Split a compound-variant entry into its matchers and `css`, or `null` without a `css` object. */
function toCompoundVariant(value: unknown): ResolvedCompoundVariant | null {
  if (typeof value !== 'object' || value === null) return null;
  const { css, ...matchers } = value as Record<string, unknown>;
  if (typeof css !== 'object' || css === null) return null;
  return { matchers, css: css as Record<string, unknown> };
}

/**
 * When the config was passed by identifier and resolved to a literal
 * record (no AST), reconstruct a `ResolvedStyledConfig` from the value.
 * This path doesn't see fallback-style variants (they'd be functions in
 * the source, which `evaluateLiteral` already rejects), so every
 * variant landing here is explicit.
 */
function resolveFromLiteralRecord(value: Record<string, unknown>): ResolvedStyledConfig | null {
  const base = (value['base'] as Record<string, unknown> | undefined) ?? {};
  const variantsRaw = value['variants'] as Record<string, unknown> | undefined;
  const compoundRaw = value['compoundVariants'] as ReadonlyArray<unknown> | undefined;
  const defaultsRaw = value['defaultVariants'] as Record<string, unknown> | undefined;

  const variants: Record<string, ResolvedVariantEntry> = {};
  const variantNames = new Set<string>();
  if (variantsRaw !== undefined) {
    for (const [k, v] of Object.entries(variantsRaw)) {
      const cases = toVariantCases(v);
      if (cases === null) return null;
      variants[k] = { kind: 'explicit', cases };
      variantNames.add(k);
    }
  }

  const compoundVariants: ResolvedCompoundVariant[] = [];
  if (compoundRaw !== undefined) {
    for (const entry of compoundRaw) {
      const compound = toCompoundVariant(entry);
      if (compound === null) return null;
      compoundVariants.push(compound);
    }
  }

  return {
    base,
    variants,
    compoundVariants,
    defaultVariants: defaultsRaw ?? {},
    variantNames,
  };
}
