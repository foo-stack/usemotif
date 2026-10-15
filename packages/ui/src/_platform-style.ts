/**
 * Raw CSS style objects the kit hands to headless parts (`style`, `thumbStyle`,
 * ...). On web they apply as written; `_platform-style.native.ts` converts them
 * for React Native.
 */
export function usePlatformStyle(): <T>(style: T) => T {
  return identity;
}

function identity<T>(style: T): T {
  return style;
}
