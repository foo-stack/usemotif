/**
 * `rename-v2` codemod: rewrite v1 motif-js import specifiers to their
 * v2 names.
 *
 * | v1                       | v2                  |
 * |--------------------------|---------------------|
 * | `@motif-js/react-web`    | `@motif-js/react`   |
 * | `@motif-js/react`        | `usemotif`          |
 * | `@motif-js/react-native` | `@motif-js/react-native` (unchanged) |
 *
 * (`usemotif` is the v2 meta package. The original plan published it
 * as the unscoped `motif-js`, but npm blocked that name as too
 * similar to an existing `motif.js` package; the rename landed on
 * `usemotif`, which mirrors the docs domain at <usemotif.dev>.)
 *
 * The rewrite is applied to the **entire** file text - appropriate for
 * source and `.json` files (import statements, `require()`, dynamic
 * `import()`, and the `dependencies` keys of `package.json`). It is a
 * whole-file string replace, NOT an import-scoped one, so any other
 * occurrence of the old specifier (a comment, a string literal used as
 * data) is rewritten too. The CLI scopes `.md` / `.mdx` files to code
 * regions only (fenced blocks + inline code) so prose mentions of the old
 * name - changelog entries, migration notes - aren't rewritten.
 *
 * ## Sequencing trap
 *
 * The two rewrites overlap. If we naively replace `@motif-js/react` →
 * `usemotif` first, then `@motif-js/react-web` → `@motif-js/react`,
 * the first pass already destroyed every `@motif-js/react` occurrence
 * - including the `@motif-js/react` part of `@motif-js/react-web`,
 * leaving garbage like `usemotif-web`.
 *
 * So we use a one-pass single regex with alternation that matches
 * whichever of the two source names appears at the call site:
 *
 *   /@motif-js\/react-web|@motif-js\/react(?![-\w/])/g
 *
 * - for each match, decide the replacement based on the matched text.
 * react-web → @motif-js/react, bare react → usemotif. The negative
 * lookahead `(?![-\w/])` on the bare-react branch ensures we don't
 * catch react-web / react-native / react-foo (the `-` exclusion) or
 * the `@motif-js/react/server` and `@motif-js/react/tanstack-virtual`
 * subpaths (the `/` exclusion). Those subpath exports still belong
 * to the renamed DOM bindings package and must survive untouched.
 *
 * ## Idempotency
 *
 * The two rewrites collide across runs: `@motif-js/react-web` →
 * `@motif-js/react` lands on a name that the *other* rule treats as a
 * v1 aggregator. So a second run would promote that just-renamed
 * `@motif-js/react` (now the v2 DOM bindings) all the way to
 * `usemotif` (the meta package) - silently corrupting it. `String`
 * alone can't distinguish "v1 aggregator" from "already-migrated v2
 * DOM bindings"; the same `@motif-js/react` text is valid in both.
 *
 * The guard: a bare `@motif-js/react` is only promoted to `usemotif`
 * when the file shows **no v2+ specifier** ({@link ALREADY_V2_MARKER}
 * - an unscoped `usemotif` import or any `@usemotif/*` v3 scope). Once
 * a file contains such a marker - which is exactly what this transform
 * itself emits when it rewrites a v1 aggregator import - any remaining
 * `@motif-js/react` is read as the v2 DOM bindings and left alone. So
 * `applyRenameV2(applyRenameV2(x)) === applyRenameV2(x)` for every file
 * that mixes aggregator and DOM-bindings imports (the realistic case),
 * and a whole-project rerun no longer corrupts.
 *
 * Residual: a file importing *only* `@motif-js/react-web` (and nothing
 * from the v2 meta package) carries no `usemotif` marker after the
 * first pass, so a second pass on that isolated file would still over-
 * migrate its now-bare `@motif-js/react`. Run the codemod once; the
 * `--dry-run` flag previews changes without writing.
 */

const SOURCE_PATTERN = /@motif-js\/react-web|@motif-js\/react(?![-\w/])/g;

/**
 * A specifier that only exists from v2 onward: the unscoped `usemotif`
 * meta package, or any `@usemotif/*` (v3) scope. Matched as a *quoted
 * module specifier* (or the `@usemotif/` scope prefix) so a prose
 * mention - "see usemotif.dev", a changelog line - doesn't trip the
 * guard and suppress a legitimate first-run rewrite.
 */
const ALREADY_V2_MARKER = /@usemotif\/|['"`]usemotif(?:\/[^'"`]*)?['"`]/;

/**
 * Does the source already contain a v2+ specifier? Used as the default
 * idempotency signal for {@link applyRenameV2}, and exported so callers
 * that want project-wide context can compute their own.
 */
export function hasV2Specifier(source: string): boolean {
  return ALREADY_V2_MARKER.test(source);
}

/**
 * Apply the rename-v2 transform to a source string. The matching is
 * applied to the **entire** text, regardless of file kind - that's
 * intentional. Import-specifier strings have a unique enough shape
 * (the leading `@motif-js/` namespace) that false positives in prose
 * are rare. For `.md` / `.mdx` / `.json` files this lets the same
 * transform handle install snippets, code fences, and the
 * `dependencies` keys of package.json without separate parsers.
 *
 * If the input is `package.json`, sub-path imports like
 * `@motif-js/react/server` survive (the lookahead spares them) - the
 * `/server` and `/tanstack-virtual` exports still belong to the
 * renamed DOM bindings package.
 *
 * @param alreadyV2 - When `true`, a bare `@motif-js/react` is treated
 *   as the v2 DOM-bindings package and left untouched (only
 *   `@motif-js/react-web` → `@motif-js/react` still applies). Defaults
 *   to whether the source itself already shows a v2+ specifier, which
 *   makes the transform idempotent on its own output. See the
 *   "Idempotency" note above.
 */
export function applyRenameV2(source: string, alreadyV2: boolean = hasV2Specifier(source)): string {
  return source.replace(SOURCE_PATTERN, (match) => {
    if (match === '@motif-js/react-web') return '@motif-js/react';
    // The other branch of the alternation: a bare `@motif-js/react`,
    // anchored by the negative lookahead so it can only be the aggregator
    // name. Promote it to the meta package only when nothing in the file
    // marks it as already-migrated v2 DOM bindings.
    return alreadyV2 ? match : 'usemotif';
  });
}

/**
 * Convenience predicate: does the source contain anything the
 * transform would change? Used to skip the write step for unaffected
 * files (saves filesystem churn + leaves mtimes alone).
 */
export function needsRenameV2(source: string): boolean {
  // `SOURCE_PATTERN` is `g`-flagged, so reuse via `.test()` would mutate
  // its `.lastIndex` and corrupt later calls. Build a fresh non-global
  // regex per check.
  return new RegExp(SOURCE_PATTERN.source).test(source);
}
