/** What a TagsInput accepts. */
export interface TagRules {
  /** Most tags kept; entries past it are dropped. */
  readonly max?: number;
  /** Keep an entry already present. Defaults to `false`. */
  readonly allowDuplicates?: boolean;
  /** Return `false` to reject an entry. */
  readonly validate?: (tag: string) => boolean;
}

/** Splits typed or pasted text into entries on the delimiters and on newlines. */
export function splitTags(text: string, delimiters: ReadonlyArray<string>): string[] {
  let parts = text.split(/\r?\n/);
  for (const d of delimiters) parts = parts.flatMap((p) => p.split(d));
  return parts;
}

/** `current` with the accepted `entries` appended. */
export function addTags(
  current: ReadonlyArray<string>,
  entries: ReadonlyArray<string>,
  { max = Infinity, allowDuplicates = false, validate }: TagRules = {},
): ReadonlyArray<string> {
  const next = [...current];
  for (const raw of entries) {
    const tag = raw.trim();
    if (tag === '' || next.length >= max) continue;
    if (!allowDuplicates && next.includes(tag)) continue;
    if (validate !== undefined && !validate(tag)) continue;
    next.push(tag);
  }
  return next.length === current.length ? current : next;
}
