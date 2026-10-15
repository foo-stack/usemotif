/** Follow a link the way the platform does: a page load on web. `_navigate.native.ts` opens it with `Linking`. */
export function navigate(href: string): void {
  window.location.assign(href);
}
