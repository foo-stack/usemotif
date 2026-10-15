import type { CSSProperties } from 'react';

/**
 * The CSS for an N-line clamp. `lines<=1` emits the canonical single-
 * line ellipsis triplet; `lines>1` emits the `-webkit-line-clamp` set
 * (still the cross-browser truth for multi-line clamp - supported in
 * every evergreen browser despite the vendor prefix). All declarations
 * live in inline style so consumer `style` overrides take precedence.
 */
export function resolveLineClampStyle(lines: number): CSSProperties {
  if (lines <= 1) {
    return {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    };
  }
  return {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };
}
