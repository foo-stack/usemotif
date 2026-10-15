/**
 * `from-tamagui` codemod: rewrite Tamagui imports, props and `styled()` configs to motif.
 *
 * Converted:
 *
 * - Imports from `tamagui` and `@tamagui/*` with a motif counterpart move to `usemotif`, and
 *   the file's references follow the new name (`XStack` becomes `HStack`). When the new name is
 *   already taken in the file, the import is aliased instead (`HStack as XStack`).
 * - `hoverStyle`, `pressStyle`, `focusStyle`, `focusVisibleStyle` and `disabledStyle` become
 *   `_hover`, `_active`, `_focus`, `_focus` and `_disabled`, as JSX props and as keys in a
 *   `styled()` config.
 * - A `styled(Component, { ...styleProps, variants, defaultVariants })` config moves its style
 *   props into `base`, the shape motif's `styled()` takes.
 *
 * Left in place and marked with a `// usemotif-migrate:` comment: imports with no counterpart
 * (they stay on the Tamagui import), media props such as `$gtSm`, and a config's `name`.
 * Token paths are not rewritten: Tamagui's `$4` and `$color.background` name a different theme.
 * References are renamed by name, not by scope, so a local variable that shadows an imported
 * component would be renamed too.
 */
import { Edits, MARKER, parseModule, walk, type Node } from '../_ast.js';

const RENAMES: Readonly<Record<string, string>> = {
  AnimatePresence: 'Presence',
  Button: 'Button',
  Image: 'Image',
  Input: 'Input',
  Label: 'Label',
  Paragraph: 'Paragraph',
  ScrollView: 'ScrollView',
  SizableText: 'Text',
  Spacer: 'Spacer',
  Stack: 'Box',
  Text: 'Text',
  TextArea: 'TextArea',
  Theme: 'Theme',
  View: 'Box',
  XStack: 'HStack',
  YStack: 'VStack',
  ZStack: 'ZStack',
  styled: 'styled',
  useMedia: 'useMedia',
  useTheme: 'useTheme',
};

const STATE_PROPS: Readonly<Record<string, string>> = {
  hoverStyle: '_hover',
  pressStyle: '_active',
  focusStyle: '_focus',
  focusVisibleStyle: '_focus',
  disabledStyle: '_disabled',
};

const CONFIG_KEEP = new Set(['variants', 'defaultVariants']);

const isTamagui = (source: string): boolean =>
  source === 'tamagui' || source.startsWith('@tamagui/');

export function needsFromTamagui(source: string): boolean {
  return /from\s+['"](tamagui|@tamagui\/[\w-]+)['"]/.test(source);
}

interface Moved {
  imported: string;
  local: string;
  target: string;
}

export function applyFromTamagui(source: string): string {
  if (!needsFromTamagui(source)) return source;
  const program = parseModule(source);
  const edits = new Edits(source);
  const body = program.body as Node[];

  const imports = body.filter(
    (s) => s.type === 'ImportDeclaration' && isTamagui((s.source as { value: string }).value),
  );
  // Every name bound by an import outside Tamagui's, to avoid colliding with on a rename.
  const taken = new Set<string>();
  for (const s of body) {
    if (s.type !== 'ImportDeclaration' || imports.includes(s)) continue;
    for (const spec of s.specifiers as Node[]) taken.add((spec.local as { name: string }).name);
  }

  const moved: Moved[] = [];
  const keptByDecl = imports.map((decl) => {
    const kept: string[] = [];
    for (const spec of decl.specifiers as Node[]) {
      const local = (spec.local as { name: string }).name;
      const imported =
        spec.type === 'ImportSpecifier' ? (spec.imported as { name: string }).name : null;
      const target = imported === null ? undefined : RENAMES[imported];
      if (target === undefined || (spec as { importKind?: string }).importKind === 'type') {
        kept.push(source.slice(spec.start, spec.end));
      } else {
        moved.push({ imported: imported!, local, target });
      }
    }
    return kept;
  });

  // Rename a local binding to its motif name unless that would collide.
  const renames = new Map<string, string>();
  const specifiers = moved.map(({ imported, local, target }) => {
    if (local !== imported) return `${target} as ${local}`;
    if (target === local) return target;
    if (taken.has(target) || moved.some((m) => m.local === target)) return `${target} as ${local}`;
    renames.set(local, target);
    taken.add(target);
    return target;
  });

  imports.forEach((decl, index) => {
    const kept = keptByDecl[index]!;
    const lines: string[] = [];
    if (index === 0 && moved.length > 0) {
      lines.push(`import { ${[...new Set(specifiers)].join(', ')} } from 'usemotif';`);
    }
    if (kept.length > 0) {
      const reason = `no motif counterpart, finish by hand: ${kept.join(', ')}`;
      // The marker sits on the line above the Tamagui import, which is the new usemotif one
      // when this declaration also gained it.
      if (lines.length > 0) lines.push(`// ${MARKER} ${reason}`);
      else edits.mark([program], decl, reason);
      lines.push(
        `import { ${kept.join(', ')} } from '${(decl.source as { value: string }).value}';`,
      );
    }
    // A declaration left empty takes its line break with it.
    const end = lines.length === 0 && source[decl.end] === '\n' ? decl.end + 1 : decl.end;
    edits.replace({ start: decl.start, end }, lines.join('\n'));
  });

  const styledLocals = new Set(moved.filter((m) => m.imported === 'styled').map((m) => m.local));
  walk(program, (node, ancestors) => {
    const parent = ancestors[ancestors.length - 1];
    if (node.type === 'Identifier' && renames.has(node.name as string)) {
      if (isReference(node, parent)) edits.replace(node, renames.get(node.name as string)!);
    } else if (node.type === 'JSXIdentifier' && parent !== undefined) {
      const name = node.name as string;
      if (parent.type === 'JSXAttribute') {
        if (STATE_PROPS[name] !== undefined) edits.replace(node, STATE_PROPS[name]);
        else if (name.startsWith('$')) {
          edits.mark(ancestors, node, `media prop ${name}: use a responsive object instead`);
        }
      } else if (
        renames.has(name) &&
        (parent.type === 'JSXOpeningElement' || parent.type === 'JSXClosingElement')
      ) {
        edits.replace(node, renames.get(name)!);
      }
    } else if (
      node.type === 'CallExpression' &&
      (node.callee as Node).type === 'Identifier' &&
      styledLocals.has((node.callee as { name: string }).name)
    ) {
      const config = (node.arguments as Node[])[1];
      if (config?.type === 'ObjectExpression') restructure(config, source, edits, ancestors, node);
    }
  });

  return edits.apply();
}

function isReference(node: Node, parent: Node | undefined): boolean {
  if (parent === undefined) return true;
  if (parent.type === 'ImportSpecifier' || parent.type === 'ImportDefaultSpecifier') return false;
  if (
    (parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') &&
    parent.property === node &&
    parent.computed !== true
  )
    return false;
  if ((parent.type === 'ObjectProperty' || parent.type === 'ObjectMethod') && parent.key === node) {
    return parent.computed === true;
  }
  return true;
}

/** Move a Tamagui config's style props into `base`, renaming state keys throughout. */
function restructure(
  config: Node,
  source: string,
  edits: Edits,
  ancestors: readonly Node[],
  call: Node,
): void {
  const properties = config.properties as Node[];
  if (properties.some((p) => propName(p) === 'base')) return;
  const style: string[] = [];
  const kept: string[] = [];
  for (const prop of properties) {
    const name = propName(prop);
    if (name === 'name') {
      edits.mark(
        [...ancestors, call],
        config,
        `styled() name ${source.slice(prop.start, prop.end)} dropped: motif has no named component themes`,
      );
      continue;
    }
    (name !== null && CONFIG_KEEP.has(name) ? kept : style).push(renameStateKeys(prop, source));
  }
  const parts = [...(style.length > 0 ? [`base: { ${style.join(', ')} }`] : []), ...kept];
  edits.replace(config, `{ ${parts.join(', ')} }`);
}

function propName(prop: Node): string | null {
  if (prop.type !== 'ObjectProperty' || prop.computed === true) return null;
  const k = prop.key as Node;
  return k.type === 'Identifier'
    ? (k.name as string)
    : k.type === 'StringLiteral'
      ? (k.value as string)
      : null;
}

/** A property's source with every state key inside it renamed. */
function renameStateKeys(prop: Node, source: string): string {
  const inner = new Edits(source.slice(prop.start, prop.end));
  walk(prop, (node) => {
    const name = propName(node);
    if (name !== null && STATE_PROPS[name] !== undefined) {
      const k = node.key as Node;
      inner.replace({ start: k.start - prop.start, end: k.end - prop.start }, STATE_PROPS[name]);
    }
  });
  return inner.apply();
}
