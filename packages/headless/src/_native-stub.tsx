/**
 * One-time console warning for headless behaviour that is unavailable on
 * React Native, such as a missing optional peer dependency or a failed native
 * picker. Each message warns once, so the host app stays quiet and nothing
 * throws inside a render path. Web code never calls it.
 */
const warned = new Set<string>();

export function nativeStubWarn(component: string): void {
  if (warned.has(component)) return;
  warned.add(component);
  // eslint-disable-next-line no-console
  console.warn(
    `${component} is not yet implemented on React Native; it renders nothing on this platform. ` +
      `Track in @usemotif/headless v1.x. Use a platform branch for now.`,
  );
}
