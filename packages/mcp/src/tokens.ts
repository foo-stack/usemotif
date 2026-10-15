import type { TokenMap } from '@usemotif/core';

/** One token: its `$` path, its value as written, and the literal it resolves to. */
export interface TokenEntry {
  readonly path: string;
  readonly value: string | number;
  readonly resolved: string | number | undefined;
}

/** Every leaf token of a theme, as `$scale.path` entries. `animations` presets are objects, not tokens. */
export function flattenTokens(tokens: TokenMap): TokenEntry[] {
  const out: { path: string; value: string | number }[] = [];
  const walk = (node: unknown, path: string): void => {
    if (typeof node === 'string' || typeof node === 'number') out.push({ path, value: node });
    else if (typeof node === 'object' && node !== null) {
      for (const [key, child] of Object.entries(node)) walk(child, `${path}.${key}`);
    }
  };
  for (const [scale, node] of Object.entries(tokens)) {
    if (scale !== 'animations') walk(node, `$${scale}`);
  }
  const byPath = new Map(out.map((t) => [t.path, t.value]));
  return out.map((t) => ({ ...t, resolved: resolve(byPath, t.value) }));
}

function resolve(
  byPath: ReadonlyMap<string, string | number>,
  value: string | number,
): string | number | undefined {
  let current: string | number | undefined = value;
  for (let hops = 0; typeof current === 'string' && current.startsWith('$'); hops++) {
    if (hops > 16) return undefined;
    current = byPath.get(current);
  }
  return current;
}

/** The chain a path resolves through, ending at its literal; empty when the path is unknown. */
export function resolveChain(entries: readonly TokenEntry[], path: string): (string | number)[] {
  const byPath = new Map(entries.map((t) => [t.path, t.value]));
  const chain: (string | number)[] = [];
  let current: string | number | undefined = canonical(entries, path);
  while (typeof current === 'string' && current.startsWith('$') && chain.length < 17) {
    const next = byPath.get(current);
    if (next === undefined) return chain.length === 0 ? [] : [...chain, current];
    chain.push(current);
    current = next;
  }
  return current === undefined ? chain : [...chain, current];
}

/**
 * The full path a reference means. A reference may leave out its scale (`$blue.500`, `$4`), in
 * which case it means the one token in any scale with that path; ambiguous or unknown short
 * references return themselves.
 */
export function canonical(entries: readonly TokenEntry[], ref: string): string {
  if (entries.some((t) => t.path === ref)) return ref;
  const tail = ref.slice(1);
  const matches = entries.filter((t) => t.path.slice(t.path.indexOf('.') + 1) === tail);
  return matches.length === 1 ? matches[0]!.path : ref;
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length]!;
}

export interface PathCheck {
  readonly ref: string;
  readonly known: boolean;
  readonly suggestions: readonly string[];
}

const REF = /\$[A-Za-z0-9_][\w.-]*/g;

/**
 * Every `$` token reference in a snippet of code, with whether the theme defines it and, when it
 * doesn't, the nearest paths it does define.
 */
export function checkTokenPaths(entries: readonly TokenEntry[], source: string): PathCheck[] {
  const refs = [...new Set(source.match(REF) ?? [])].map((r) => r.replace(/\.$/, ''));
  return refs.map((ref) => {
    const full = canonical(entries, ref);
    const known = entries.some((t) => t.path === full);
    const suggestions = known
      ? []
      : entries
          .map((t) => ({
            path: t.path,
            d: Math.min(
              distance(ref, t.path),
              distance(ref.slice(1), t.path.slice(t.path.indexOf('.') + 1)),
            ),
          }))
          .sort((x, y) => x.d - y.d)
          .slice(0, 3)
          .map((t) => t.path);
    return { ref, known, suggestions };
  });
}
