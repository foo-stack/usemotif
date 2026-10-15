/** Why a file was refused: its type, its size, or one too many. */
export type FileRejectionReason = 'type' | 'size' | 'count';

/** A refused file and every rule it broke. */
export interface FileRejection<F> {
  readonly file: F;
  readonly reasons: ReadonlyArray<FileRejectionReason>;
}

/** The limits a FileUpload applies to each selection. */
export interface FileRules {
  /** The picker's `accept` grammar: MIME types, `type/*` wildcards, `.ext`. */
  readonly accept?: string | undefined;
  /** Largest allowed size in bytes. */
  readonly maxSize?: number | undefined;
  /** Most files taken from one selection. */
  readonly maxFiles?: number | undefined;
}

/** What the rules read off a file; `size` is unknown on some native pickers. */
export interface FileFacts {
  readonly name: string;
  readonly type: string;
  readonly size: number | undefined;
}

/**
 * Whether a file satisfies an `accept` string - the same grammar the native
 * file picker uses: a comma-separated list of MIME types (`image/png`), MIME
 * wildcards (`image/*`), or filename extensions (`.pdf`). Any one token
 * accepts the file.
 */
export function matchesAccept(facts: FileFacts, accept: string): boolean {
  const tokens = accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const type = facts.type.toLowerCase();
  const name = facts.name.toLowerCase();
  return tokens.some((token) => {
    if (token === '*/*' || token === '*') return true;
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

/**
 * Splits one selection into the files to keep and the ones refused, with every
 * reason each was refused for. A file is counted against `maxFiles` only once
 * it passes the type and size rules, so a bad file never takes a good one's
 * place.
 */
export function sortFiles<F>(
  files: ReadonlyArray<F>,
  facts: (file: F) => FileFacts,
  rules: FileRules,
): { accepted: F[]; rejected: FileRejection<F>[] } {
  const accepted: F[] = [];
  const rejected: FileRejection<F>[] = [];
  const max = rules.maxFiles ?? Infinity;
  for (const file of files) {
    const f = facts(file);
    const reasons: FileRejectionReason[] = [];
    if (rules.accept !== undefined && !matchesAccept(f, rules.accept)) reasons.push('type');
    if (rules.maxSize !== undefined && f.size !== undefined && f.size > rules.maxSize) {
      reasons.push('size');
    }
    if (reasons.length === 0 && accepted.length >= max) reasons.push('count');
    if (reasons.length === 0) accepted.push(file);
    else rejected.push({ file, reasons });
  }
  return { accepted, rejected };
}
