export function fuzzyScore(needle: string, hay: string): number | null {
  // Substring: high baseline, decay with offset.
  const idx = hay.indexOf(needle);
  if (idx !== -1) return 1000 - idx;

  // Characters-in-order match.
  let hi = 0;
  let matched = 0;
  for (const ch of needle) {
    let found = false;
    while (hi < hay.length) {
      if (hay[hi] === ch) {
        matched++;
        hi++;
        found = true;
        break;
      }
      hi++;
    }
    if (!found) return null;
  }
  return matched;
}
