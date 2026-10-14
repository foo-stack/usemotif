import { Menu as Headless } from '@usemotif/headless';
import { MenuContent, MenuItem, MenuSeparator } from './Menu.js';
import { MenuCheckboxItem, MenuLabel, MenuRadioGroup, MenuRadioItem } from './MenuItems.js';
import { MenuSubContent, MenuSubTrigger } from './MenuSub.js';

/**
 * Namespace assembly, deliberately in its own module and deliberately without
 * a `'use client'` directive.
 *
 * It must be in the server graph, so the object's properties are client
 * references rather than reads through a proxy, and it must not sit in the
 * barrel, because an object built from property reads on imported bindings is
 * not something a bundler can drop as pure. See `Modal.namespace.ts`.
 */
export const Menu = {
  Root: Headless.Root,
  Trigger: Headless.Trigger,
  Content: MenuContent,
  Item: MenuItem,
  Separator: MenuSeparator,
  Sub: Headless.Sub,
  SubTrigger: MenuSubTrigger,
  SubContent: MenuSubContent,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  Label: MenuLabel,
};
