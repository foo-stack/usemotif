import { Popover as Headless } from '@usemotif/headless';
import { PopoverArrow, PopoverContent } from './Popover.js';

/**
 * Namespace assembly, deliberately in its own module and deliberately without a
 * `'use client'` directive.
 *
 * Two constraints meet here. It must be in the server graph, so the object's
 * properties are client references rather than reads through a proxy. And it
 * must not sit in the barrel, because building an object out of property reads
 * on imported bindings is not something a bundler can drop as pure: putting it
 * there made every display component in the kit pay for `@usemotif/headless`.
 * A re-export from a module of its own shakes away when unused.
 */
export const Popover = {
  Root: Headless.Root,
  Trigger: Headless.Trigger,
  Content: PopoverContent,
  Arrow: PopoverArrow,
  Close: Headless.Close,
};
