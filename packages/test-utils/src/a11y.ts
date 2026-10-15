/**
 * A rendered React Native element, as `@testing-library/react-native` and `react-test-renderer`
 * return it: its props, and its children as instances or strings.
 */
export interface NativeTestInstance {
  readonly props: Readonly<Record<string, unknown>>;
  readonly children?: readonly (NativeTestInstance | string)[];
}

const isElement = (value: unknown): value is Element =>
  typeof value === 'object' && value !== null && 'getAttribute' in value && 'tagName' in value;

const isNative = (value: unknown): value is NativeTestInstance =>
  typeof value === 'object' && value !== null && 'props' in value && !isElement(value);

const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

const HEADINGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
const IMPLICIT: Readonly<Record<string, string>> = {
  BUTTON: 'button',
  NAV: 'navigation',
  MAIN: 'main',
  DIALOG: 'dialog',
  UL: 'list',
  OL: 'list',
  LI: 'listitem',
  TABLE: 'table',
  TR: 'row',
  TD: 'cell',
  TH: 'columnheader',
  FORM: 'form',
  PROGRESS: 'progressbar',
  HR: 'separator',
  TEXTAREA: 'textbox',
  ARTICLE: 'article',
  ASIDE: 'complementary',
};
const INPUT_ROLES: Readonly<Record<string, string>> = {
  checkbox: 'checkbox',
  radio: 'radio',
  range: 'slider',
  button: 'button',
  submit: 'button',
  reset: 'button',
  search: 'searchbox',
};
// React Native's older `accessibilityRole` names, as the ARIA roles they mean.
const NATIVE_ROLES: Readonly<Record<string, string>> = {
  header: 'heading',
  image: 'img',
  imagebutton: 'button',
  adjustable: 'slider',
  search: 'searchbox',
  summary: 'region',
};

function domRole(el: Element): string {
  const explicit = el.getAttribute('role');
  if (explicit !== null && explicit.trim() !== '') return explicit.trim().split(/\s+/)[0]!;
  const tag = el.tagName.toUpperCase();
  if (HEADINGS.has(tag)) return 'heading';
  if (tag === 'A') return el.hasAttribute('href') ? 'link' : 'generic';
  if (tag === 'IMG') return el.getAttribute('alt') === '' ? 'presentation' : 'img';
  if (tag === 'INPUT')
    return INPUT_ROLES[(el.getAttribute('type') ?? 'text').toLowerCase()] ?? 'textbox';
  if (tag === 'SELECT') return el.hasAttribute('multiple') ? 'listbox' : 'combobox';
  return IMPLICIT[tag] ?? 'generic';
}

function domName(el: Element): string {
  const doc = el.ownerDocument;
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy !== null) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => doc.getElementById(id)?.textContent ?? '')
      .join(' ');
    if (squash(text) !== '') return squash(text);
  }
  const label = el.getAttribute('aria-label');
  if (label !== null && squash(label) !== '') return squash(label);
  if (el.tagName === 'IMG') return squash(el.getAttribute('alt') ?? '');
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
    const id = el.getAttribute('id');
    const forLabel =
      id === null
        ? undefined
        : Array.from(doc.querySelectorAll('label')).find((l) => l.getAttribute('for') === id);
    const wrapping = el.closest('label');
    return squash((forLabel ?? wrapping)?.textContent ?? el.getAttribute('title') ?? '');
  }
  return squash(el.textContent ?? '') || squash(el.getAttribute('title') ?? '');
}

function nativeText(node: NativeTestInstance | string): string {
  if (typeof node === 'string') return node;
  const fromChildren = (node.children ?? []).map(nativeText).join('');
  if (fromChildren !== '') return fromChildren;
  // Host-less instances can keep their text in `props.children`.
  const own = node.props.children;
  return typeof own === 'string' || typeof own === 'number' ? String(own) : '';
}

function nativeRole(node: NativeTestInstance): string {
  const role = node.props.role ?? node.props.accessibilityRole;
  if (typeof role !== 'string' || role === '') return 'generic';
  return NATIVE_ROLES[role] ?? role;
}

function nativeName(node: NativeTestInstance): string {
  const label = node.props.accessibilityLabel ?? node.props['aria-label'];
  if (typeof label === 'string' && squash(label) !== '') return squash(label);
  return squash(nativeText(node));
}

function nativeExpanded(node: NativeTestInstance): boolean | undefined {
  const state = node.props.accessibilityState as { expanded?: boolean } | undefined;
  const value = node.props['aria-expanded'] ?? state?.expanded;
  return typeof value === 'boolean' ? value : undefined;
}

function domExpanded(el: Element): boolean | undefined {
  const value = el.getAttribute('aria-expanded');
  return value === null ? undefined : value === 'true';
}

/** What assistive technology is told about an element, on either platform. */
export interface AccessibleFacts {
  readonly role: string;
  readonly name: string;
  readonly expanded: boolean | undefined;
}

/**
 * The role, accessible name and expanded state of a web DOM element or a rendered React Native
 * instance, in ARIA's terms on both. The name follows the common cases of the accessible-name
 * rules: `aria-labelledby`, `aria-label`, `alt`, a form control's label, then text content.
 */
export function accessibleFacts(target: unknown): AccessibleFacts {
  if (isElement(target)) {
    return { role: domRole(target), name: domName(target), expanded: domExpanded(target) };
  }
  if (isNative(target)) {
    return { role: nativeRole(target), name: nativeName(target), expanded: nativeExpanded(target) };
  }
  throw new TypeError(
    `Expected a DOM element or a React Native test instance, received ${typeof target}`,
  );
}
