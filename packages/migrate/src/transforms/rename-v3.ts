/**
 * `rename-v3` codemod: rewrite v1 or v2 motif-js import specifiers to
 * their v3 (`@usemotif/*`) names in a single pass.
 *
 * | From (v1 or v2)                              | To (v3)                  |
 * |----------------------------------------------|--------------------------|
 * | `@motif-js/react-web` (v1 DOM bindings)      | `@usemotif/react`        |
 * | `@motif-js/react` (v1 aggregator OR v2 DOM)  | `@usemotif/react` ⚠      |
 * | `@motif-js/react-native`                     | `@usemotif/react-native` |
 * | `@motif-js/core`                             | `@usemotif/core`         |
 * | `@motif-js/compiler-swc` (retired alias)     | `@usemotif/compiler-web` |
 * | any other `@motif-js/<name>`                 | `@usemotif/<name>`       |
 * | `usemotif` (the meta package)                | (unchanged)              |
 * | `@usemotif/*` (already on v3)                | (unchanged)              |
 *
 * ## ⚠ The `@motif-js/react` ambiguity
 *
 * `@motif-js/react` meant two different things across the v1 and v2
 * epochs:
 *
 * - **v1** - the cross-platform aggregator, re-exporting from
 *   `@motif-js/react-web` on web and `@motif-js/react-native` on
 *   native via the `react-native` exports condition.
 * - **v2** - the DOM bindings package (renamed from
 *   `@motif-js/react-web`).
 *
 * Source alone can't distinguish the two; the same `import { Box }
 * from '@motif-js/react'` is valid in both v1 and v2 code. This
 * transform always treats `@motif-js/react` as the v2 DOM bindings
 * and maps it to `@usemotif/react`. For consumers still on v1
 * cross-platform code, that lands on the wrong package (DOM-only
 * instead of the aggregator that handles native too) - but v1-era
 * cross-platform holdouts are vanishingly rare a year+ post-v2, and
 * the v3 migration guide documents the workaround:
 *
 * > Still on v1? Run `rename-v2` first to land on stable v2 names,
 * > then `rename-v3` to land on v3.
 *
 * ## Regex shape
 *
 *   /@motif-js\/react-web|@motif-js\/([\w-]+)/g
 *
 * The alternation tries `@motif-js/react-web` first because the
 * suffix capture `[\w-]+` would otherwise greedily match
 * `react-web` and route it to the generic suffix branch (which
 * would yield `@usemotif/react-web`, a package that doesn't
 * exist). Anchoring the special case first ensures it wins.
 *
 * The generic branch's `[\w-]+` stops at the next `/`, so subpath
 * imports like `@motif-js/react/server` match
 * `@motif-js/react` and leave the trailing `/server` intact.
 */

const SOURCE_PATTERN = /@motif-js\/react-web|@motif-js\/([\w-]+)/g;

function replaceSource(match: string, suffix: string | undefined): string {
  if (match === '@motif-js/react-web') return '@usemotif/react';
  // The bundler plugin was published as `compiler-swc` through v1.1 and
  // kept on as an alias until it was removed; the live package is
  // `compiler-web`. A 1:1 scope swap here would land the caller on a
  // name that no longer receives releases, so redirect it. Safe as a
  // whole-specifier remap: neither package ever exposed a subpath.
  if (suffix === 'compiler-swc') return '@usemotif/compiler-web';
  // suffix is everything after `@motif-js/` - e.g. `react`, `core`,
  // `compiler-babel`. All map 1:1 to the new scope. The trailing
  // subpath (`/server`, `/tanstack-virtual`) was never consumed by
  // the regex, so it survives in the surrounding `.replace()` call.
  return `@usemotif/${suffix}`;
}

/**
 * Apply the rename-v3 transform to a source string. The matching is
 * applied to the **entire** text - appropriate for source and `.json`
 * files (e.g. the `dependencies` keys of `package.json`). The CLI scopes
 * `.md` / `.mdx` files to code regions only (fenced blocks + inline code,
 * via {@link applyWithinMarkdownCode}) so prose mentions of the old
 * specifier - changelog entries, migration notes - aren't rewritten.
 *
 * Subpath imports (`@motif-js/react/server`,
 * `@motif-js/react/tanstack-virtual`) survive - the renamed DOM
 * bindings package owns those exports under `@usemotif/react`.
 */
export function applyRenameV3(source: string): string {
  return source.replace(SOURCE_PATTERN, replaceSource);
}

/**
 * Convenience predicate: does the source contain anything the
 * transform would change? Used to skip the write step for unaffected
 * files (saves filesystem churn + leaves mtimes alone).
 */
export function needsRenameV3(source: string): boolean {
  // SOURCE_PATTERN is `g`-flagged, so `.test()` on it would mutate
  // `.lastIndex` and corrupt later calls. Build a fresh non-global
  // regex per check.
  return new RegExp(SOURCE_PATTERN.source).test(source);
}
