/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import * as barrel from './index.js';
import * as client from './client.js';
// Read as text, not imported as modules: a type export does not survive to
// runtime, and source is the only place one still exists.
// oxlint's import plugin does not model Vite's `?raw` suffix, so it cannot see
// the default export the bundler provides.
// eslint-disable-next-line import/default
import barrelSource from './index.ts?raw';
// eslint-disable-next-line import/default
import clientSource from './client.ts?raw';

/**
 * The barrel re-exports from `./client.js` by name instead of with `export *`,
 * because `export *` would also republish the flattened compound parts and make
 * every one of them public API in a fixed-version package. The cost of listing
 * names is that a name can be added to the client chunk and never reach anyone,
 * or a part can be left wired to nothing. These tests turn both into failures.
 *
 * Nothing here is a hardcoded list of parts. The invariant is derived from the
 * namespaces the barrel actually builds, so converting another component keeps
 * it honest without anyone remembering to update a fixture.
 */

type Part = (...args: never[]) => unknown;

/** A namespace is a plain object whose every value is a component. */
function isNamespace(value: unknown): value is Record<string, Part> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).length > 0 &&
    Object.values(value).every((member) => typeof member === 'function')
  );
}

const namespaces = Object.entries(barrel).filter(([, value]) => isNamespace(value)) as [
  string,
  Record<string, Part>,
][];

/** Every function a namespace is built from, by identity rather than by name. */
const partValues = new Set(namespaces.flatMap(([, ns]) => Object.values(ns)));

/**
 * Type exports are erased before this test runs, so the two module namespaces
 * above cannot see them. They are 63 of the 109 names the package publishes,
 * and the barrel lists them by hand like everything else, so leaving them out
 * would mean the guard covered fewer than half of what it claims to. Read from
 * source instead, which is the only place a type export still exists.
 */
function typeExportsOf(source: string): Set<string> {
  const names = new Set<string>();
  for (const block of source.matchAll(/export\s+(type\s+)?\{([^}]*)\}/g)) {
    const isTypeBlock = block[1] !== undefined;
    for (const raw of (block[2] ?? '').split(',')) {
      const name = raw.trim();
      if (name === '') continue;
      if (name.startsWith('type ')) names.add(name.slice(5).trim());
      else if (isTypeBlock) names.add(name);
    }
  }
  return names;
}

describe('the barrel and the client chunk agree', () => {
  it('builds every compound component as a namespace', () => {
    expect(namespaces.map(([name]) => name).sort()).toEqual([
      'Accordion',
      'AlertDialog',
      'Collapsible',
      'Combobox',
      'CommandPalette',
      'ContextMenu',
      'Dialog',
      'Drawer',
      'HoverCard',
      'Menu',
      'MultiSelect',
      'Popover',
      'Search',
      'Select',
      'Sheet',
      'Tabs',
      'Tooltip',
    ]);
  });

  it('leaves no client export unreachable', () => {
    // Either the barrel re-exports it by name, or a namespace is built from it.
    // Anything else ships in the chunk and reaches nobody.
    const orphaned = Object.entries(client)
      .filter(([name, value]) => !(name in barrel) && !partValues.has(value as Part))
      .map(([name]) => name);
    expect(orphaned).toEqual([]);
  });

  it('keeps the flattened parts out of the public surface', () => {
    const leaked = Object.entries(client)
      .filter(([name, value]) => partValues.has(value as Part) && name in barrel)
      .map(([name]) => name);
    expect(leaked).toEqual([]);
  });

  it('builds each namespace out of the client chunk, not out of copies', () => {
    const clientValues = new Set<unknown>(Object.values(client));
    const foreign = namespaces.flatMap(([name, ns]) =>
      Object.entries(ns)
        .filter(([, member]) => !clientValues.has(member))
        .map(([key]) => `${name}.${key}`),
    );
    expect(foreign).toEqual([]);
  });

  it('re-exports every type the client chunk declares', () => {
    const declared = typeExportsOf(clientSource);
    const published = typeExportsOf(barrelSource);
    expect([...declared].filter((name) => !published.has(name))).toEqual([]);
  });

  it('reads a plausible number of type exports, so a broken parse fails loudly', () => {
    // A regex that stopped matching would make the test above pass on nothing.
    expect(typeExportsOf(clientSource).size).toBeGreaterThan(50);
  });

  it('never points a consumer at a flattened part in an error message', () => {
    // The guards name the public spelling, `Menu.Root`, because that is what a
    // consumer can write. The flattened parts are internal. A rewrite once
    // changed these messages along with the code and nothing noticed, because
    // the suite asserts that guards throw and never reads what they say.
    const partNames = new Set(
      Object.entries(client)
        .filter(([, value]) => partValues.has(value as Part))
        .map(([name]) => name),
    );
    const sources = import.meta.glob('./*.tsx', { query: '?raw', eager: true, import: 'default' });
    const offenders: string[] = [];
    for (const [file, source] of Object.entries(sources as Record<string, string>)) {
      if (file.includes('.test.')) continue;
      // Scan template literals rather than lines. A message long enough to wrap
      // would put the tag on a line with no `Error(` on it, and a check that
      // stops seeing what it was written for is worse than no check.
      for (const literal of source.matchAll(/`[^`]*`/g)) {
        for (const tag of (literal[0] as string).matchAll(/<([A-Z]\w*)>/g)) {
          if (partNames.has(tag[1] as string)) offenders.push(`${file}: <${tag[1]}>`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('shares one client reference where namespaces share a part', () => {
    // Reuse is resolved in the barrel, so a shared part must be the identical
    // reference. A copy would render, and would break identity checks and any
    // future per-component chunking.
    expect(barrel.AlertDialog.Trigger).toBe(barrel.Dialog.Trigger);
    expect(barrel.Drawer.Title).toBe(barrel.Dialog.Title);
    expect(barrel.Sheet.Root).toBe(barrel.Drawer.Root);
    expect(barrel.Accordion.Content).toBe(barrel.Collapsible.Content);
    expect(barrel.ContextMenu.Separator).toBe(barrel.Menu.Separator);
    expect(barrel.ContextMenu.Item).toBe(barrel.Menu.Item);
    expect(barrel.ContextMenu.Sub).toBe(barrel.Menu.Sub);
    expect(barrel.ContextMenu.SubTrigger).toBe(barrel.Menu.SubTrigger);
    expect(barrel.ContextMenu.SubContent).toBe(barrel.Menu.SubContent);
    expect(barrel.ContextMenu.CheckboxItem).toBe(barrel.Menu.CheckboxItem);
    expect(barrel.ContextMenu.RadioGroup).toBe(barrel.Menu.RadioGroup);
    expect(barrel.ContextMenu.RadioItem).toBe(barrel.Menu.RadioItem);
    expect(barrel.ContextMenu.Label).toBe(barrel.Menu.Label);
    expect(barrel.Select.List).toBe(barrel.Combobox.List);
    expect(barrel.Search.Input).toBe(barrel.Combobox.Input);
  });
});
