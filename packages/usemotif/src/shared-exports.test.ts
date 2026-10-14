/**
 * Every name both platform packages export must reach consumers through both
 * `usemotif` entries, or code written against `usemotif` breaks on one
 * platform. Reads the entry files' export lists with the TypeScript parser, so
 * types count too and React Native never has to load.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/** Shared names an entry leaves out on purpose, each with its reason. */
const DELIBERATELY_OMITTED: ReadonlySet<string> = new Set([]);

function exportedNames(relative: string): Set<string> {
  const path = fileURLToPath(new URL(relative, import.meta.url));
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest);
  const names = new Set<string>();
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      // `export *` would hide names from this check; the entries never use it.
      if (statement.exportClause === undefined) throw new Error(`export * in ${relative}`);
      if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) names.add(element.name.text);
      }
    } else if (ts.canHaveModifiers(statement)) {
      const exported = ts
        .getModifiers(statement)
        ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (!exported) continue;
      if (ts.isVariableStatement(statement)) {
        for (const d of statement.declarationList.declarations) {
          if (ts.isIdentifier(d.name)) names.add(d.name.text);
        }
      } else if ('name' in statement && statement.name && ts.isIdentifier(statement.name)) {
        names.add(statement.name.text);
      }
    }
  }
  return names;
}

const web = exportedNames('../../react/src/index.ts');
const native = exportedNames('../../react-native/src/index.ts');
const shared = [...web].filter((name) => native.has(name) && !DELIBERATELY_OMITTED.has(name));

describe('usemotif re-exports everything both platforms share', () => {
  it('finds a shared surface to check', () => {
    expect(shared.length).toBeGreaterThan(100);
  });

  it.each([
    ['web', './index.ts'],
    ['native', './index.native.ts'],
  ])('%s entry', (_platform, entry) => {
    const exported = exportedNames(entry);
    expect(shared.filter((name) => !exported.has(name))).toEqual([]);
  });
});
