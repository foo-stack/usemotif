export function defaultFilter(option: { readonly label: string }, input: string): boolean {
  if (input.length === 0) return true;
  return option.label.toLowerCase().includes(input.toLowerCase());
}
