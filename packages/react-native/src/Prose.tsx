import { type MdBlock, type MdInline, type MotifComponent, parseMarkdown } from '@usemotif/core';
import { useMemo, type ReactElement, type ReactNode } from 'react';
import { Linking } from 'react-native';
import { Box, type BoxProps } from './Box.js';
import { Image } from './Image.js';
import { Text } from './Text.js';

export interface ProseProps extends BoxProps {
  /**
   * Markdown to render with motif primitives: headings, paragraphs, lists, quotes, code, rules,
   * tables, emphasis, links and images. HTML in it stays text, and links with a scheme other
   * than http, https, mailto or tel are not pressable.
   */
  markdown?: string;
}

const TEXT = '$components.prose.color ?? $colors.text.default';
const MUTED = '$components.prose.muted ?? $colors.text.muted';
const LINK = '$components.prose.link ?? $colors.action.primary.bg';
const BORDER = '$components.prose.border ?? $colors.border.default';
const CODE_BG = '$components.prose.codeBg ?? $colors.surface.muted';
const PRE_BG = '$components.prose.preBg ?? $colors.surface.sunken';
const MONO = '$fontFamilies.mono';
const HEADING_SIZE = [32, 24, 20, 18, 16, 16] as const;

function inline(nodes: readonly MdInline[]): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text':
        return node.value;
      case 'strong':
        return (
          <Text key={i} fontWeight={700}>
            {inline(node.children)}
          </Text>
        );
      case 'em':
        return (
          <Text key={i} style={{ fontStyle: 'italic' }}>
            {inline(node.children)}
          </Text>
        );
      case 'code':
        return (
          <Text key={i} fontFamily={MONO} bg={CODE_BG}>
            {node.value}
          </Text>
        );
      case 'link':
        return node.href === '' ? (
          inline(node.children)
        ) : (
          <Text
            key={i}
            color={LINK}
            style={{ textDecorationLine: 'underline' }}
            accessibilityRole="link"
            onPress={() => void Linking.openURL(node.href)}
          >
            {inline(node.children)}
          </Text>
        );
      // An image inside running text reads as its description; a paragraph of only an
      // image renders it as a block, below.
      case 'image':
        return node.alt;
      case 'break':
        return '\n';
    }
  });
}

function paragraph(children: readonly MdInline[], key: number | string): ReactNode {
  const only = children.length === 1 ? children[0] : undefined;
  if (only?.type === 'image' && only.src !== '') {
    return (
      <Image
        key={key}
        src={only.src}
        alt={only.alt}
        style={{ width: '100%', aspectRatio: 16 / 9 }}
        resizeMode="contain"
      />
    );
  }
  return (
    <Text key={key} color={TEXT} lineHeight={24}>
      {inline(children)}
    </Text>
  );
}

function list(node: Extract<MdBlock, { type: 'list' }>, key: number): ReactNode {
  return (
    <Box key={key} gap={6}>
      {node.items.map((blocks, n) => (
        <Box key={n} flexDirection="row" gap={8}>
          <Text color={MUTED} lineHeight={24}>
            {node.ordered ? `${node.start + n}.` : '•'}
          </Text>
          <Box flex={1} gap={8}>
            {blocks.map(block)}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function block(node: MdBlock, i: number): ReactNode {
  switch (node.type) {
    case 'heading':
      return (
        <Text
          key={i}
          accessibilityRole="header"
          color={TEXT}
          fontSize={HEADING_SIZE[node.level - 1]!}
          fontWeight={700}
        >
          {inline(node.children)}
        </Text>
      );
    case 'paragraph':
      return paragraph(node.children, i);
    case 'list':
      return list(node, i);
    case 'blockquote':
      return (
        <Box key={i} borderLeftWidth={3} borderColor={BORDER} pl={12} gap={12}>
          {node.children.map(block)}
        </Box>
      );
    case 'code':
      return (
        <Box key={i} bg={PRE_BG} p={12} borderRadius={6}>
          <Text fontFamily={MONO} fontSize={14} color={TEXT}>
            {node.value}
          </Text>
        </Box>
      );
    case 'hr':
      return <Box key={i} height={1} bg={BORDER} />;
    case 'table': {
      const align = (n: number) => node.align[n] ?? 'left';
      const row = (cells: readonly (readonly MdInline[])[], header: boolean, key: number) => (
        <Box key={key} flexDirection="row" borderBottomWidth={1} borderColor={BORDER}>
          {cells.map((cell, n) => (
            <Text
              key={n}
              flex={1}
              p={8}
              color={TEXT}
              textAlign={align(n)}
              {...(header ? { fontWeight: 600 } : {})}
            >
              {inline(cell)}
            </Text>
          ))}
        </Box>
      );
      return (
        <Box key={i}>
          {row(node.header, true, -1)}
          {node.rows.map((cells, r) => row(cells, false, r))}
        </Box>
      );
    }
  }
}

/**
 * Prose - renders Markdown with motif primitives, so content written once in Markdown reads the
 * same on native as `Prose` does on web. Colours read `$components.prose.*` before the semantic
 * tokens, as on web.
 *
 * @example
 * ```tsx
 * <Prose markdown={post.body} />
 * ```
 */
export const Prose: MotifComponent<ProseProps, ReactElement | null> = function ({
  markdown,
  children,
  ...rest
}: ProseProps): ReactElement {
  const rendered = useMemo(
    () => (markdown === undefined ? undefined : parseMarkdown(markdown).map(block)),
    [markdown],
  );
  return (
    <Box gap={16} {...rest}>
      {rendered ?? children}
    </Box>
  );
};
