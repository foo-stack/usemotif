import type { Rule } from 'eslint';
import { distance, scaleOf, splitRef, themeFrom, tokenFor } from './tokens.js';

/** Values that mean the same thing on every theme, so a token would only obscure them. */
const NEUTRAL = new Set([
  '0',
  'auto',
  'none',
  'inherit',
  'initial',
  'transparent',
  'currentcolor',
  '100%',
]);

interface JSXAttributeNode {
  name: { type: string; name: string };
  value:
    | { type: 'Literal'; value: unknown; range?: [number, number] }
    | { type: 'JSXExpressionContainer'; expression: { type: string; value?: unknown } }
    | null;
}

/** A style prop's literal value, if the attribute holds one. */
function literalOf(attr: JSXAttributeNode): string | number | undefined {
  const v = attr.value;
  if (v === null) return undefined;
  const raw =
    v.type === 'Literal'
      ? v.value
      : v.expression.type === 'Literal'
        ? v.expression.value
        : undefined;
  return typeof raw === 'string' || typeof raw === 'number' ? raw : undefined;
}

export const preferTokens: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: { description: 'Use the theme token instead of a raw value the theme already defines.' },
    messages: {
      useToken:
        "'{{value}}' is the token {{token}}. Use the token, so the value follows the theme.",
      replace: 'Use {{token}}.',
    },
    schema: [],
  },
  create(context) {
    const theme = themeFrom(context.settings as never, context.cwd);
    return {
      JSXAttribute(node: Rule.Node) {
        const attr = node as unknown as JSXAttributeNode;
        if (attr.name.type !== 'JSXIdentifier') return;
        const scale = scaleOf(attr.name.name);
        const value = literalOf(attr);
        if (scale === undefined || value === undefined) return;
        if (typeof value === 'string' && value.startsWith('$')) return;
        if (NEUTRAL.has(String(value).trim().toLowerCase())) return;
        const path = tokenFor(theme, scale, value);
        if (path === undefined) return;
        const token = `$${scale}.${path}`;
        context.report({
          node: (attr.value ?? node) as Rule.Node,
          messageId: 'useToken',
          data: { value: String(value), token },
          suggest: [
            {
              messageId: 'replace',
              data: { token },
              fix: (fixer) => fixer.replaceText(attr.value as unknown as Rule.Node, `"${token}"`),
            },
          ],
        });
      },
    };
  },
};

export const validTokenPaths: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Report $-references the theme does not define.' },
    messages: {
      unknown: '{{ref}} is not a token in this theme.{{hint}}',
    },
    schema: [],
  },
  create(context) {
    const theme = themeFrom(context.settings as never, context.cwd);
    return {
      JSXAttribute(node: Rule.Node) {
        const attr = node as unknown as JSXAttributeNode;
        if (attr.name.type !== 'JSXIdentifier') return;
        const value = literalOf(attr);
        if (typeof value !== 'string' || !/^\$[A-Za-z0-9_]/.test(value)) return;
        const scale = scaleOf(attr.name.name);
        const ref = splitRef(value, scale);
        if (ref === undefined) return;
        const tokens = theme.scales.get(ref.scale);
        if (tokens?.has(ref.path) === true) return;
        const nearest =
          tokens === undefined
            ? undefined
            : [...tokens.keys()].sort((a, b) => distance(ref.path, a) - distance(ref.path, b))[0];
        context.report({
          node: (attr.value ?? node) as Rule.Node,
          messageId: 'unknown',
          data: {
            ref: value,
            hint: nearest === undefined ? '' : ` Did you mean $${ref.scale}.${nearest}?`,
          },
        });
      },
    };
  },
};

const PLATFORM_FILE = /\.(native|ios|android|web|windows|macos)\.[cm]?[jt]sx?$/;

export const noPlatformBranching: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Keep shared components free of platform checks; split them into .native files.',
    },
    messages: {
      branch:
        "{{what}} branches on the platform in a shared file. Split the difference into {{file}} instead, so each platform's bundle carries only its own code.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (PLATFORM_FILE.test(filename)) return {};
    const file = (filename.split('/').pop() ?? 'Component.tsx').replace(
      /\.([cm]?[jt]sx?)$/,
      '.native.$1',
    );
    const report = (node: Rule.Node, what: string): void =>
      context.report({ node, messageId: 'branch', data: { what, file } });
    return {
      MemberExpression(node: Rule.Node) {
        const n = node as unknown as {
          object: { type: string; name?: string };
          property: { type: string; name?: string };
        };
        if (
          n.object.type === 'Identifier' &&
          n.object.name === 'Platform' &&
          n.property.type === 'Identifier'
        ) {
          if (n.property.name === 'OS' || n.property.name === 'select')
            report(node, `Platform.${n.property.name}`);
        }
      },
      UnaryExpression(node: Rule.Node) {
        const n = node as unknown as {
          operator: string;
          argument: { type: string; name?: string };
        };
        if (
          n.operator === 'typeof' &&
          n.argument.type === 'Identifier' &&
          (n.argument.name === 'window' || n.argument.name === 'document')
        ) {
          report(node, `typeof ${n.argument.name}`);
        }
      },
    };
  },
};
