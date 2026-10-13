export function pageWindow(
  page: number,
  total: number,
  siblings: number,
): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: Array<number | 'ellipsis'> = [1];
  const startWindow = Math.max(2, page - siblings);
  const endWindow = Math.min(total - 1, page + siblings);
  if (startWindow > 2) out.push('ellipsis');
  for (let i = startWindow; i <= endWindow; i++) out.push(i);
  if (endWindow < total - 1) out.push('ellipsis');
  out.push(total);
  return out;
}
