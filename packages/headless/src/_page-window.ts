export function pageWindow(
  page: number,
  total: number,
  siblings: number,
  boundaries = 1,
): Array<number | 'ellipsis'> {
  const edge = Math.max(0, boundaries);
  if (total <= 2 * edge + 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: Array<number | 'ellipsis'> = [];
  for (let i = 1; i <= edge; i++) out.push(i);
  const startWindow = Math.max(edge + 1, page - siblings);
  const endWindow = Math.min(total - edge, page + siblings);
  if (startWindow > edge + 1) out.push('ellipsis');
  for (let i = startWindow; i <= endWindow; i++) out.push(i);
  if (endWindow < total - edge) out.push('ellipsis');
  for (let i = total - edge + 1; i <= total; i++) out.push(i);
  return out;
}

/** The page that, at `nextSize` items per page, still shows the first item of `page` at `size`. */
export function pageForSize(page: number, size: number, nextSize: number): number {
  return Math.floor(((page - 1) * size) / nextSize) + 1;
}
