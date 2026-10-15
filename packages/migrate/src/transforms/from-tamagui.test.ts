import { describe, expect, it } from 'vitest';
import { applyFromTamagui, needsFromTamagui } from './from-tamagui.js';

describe('applyFromTamagui', () => {
  it('moves mapped imports to usemotif and renames their uses', () => {
    const out = applyFromTamagui(`import { XStack, YStack, Text } from 'tamagui';

export function Row() {
  return (
    <XStack gap="$2" hoverStyle={{ opacity: 0.8 }}>
      <YStack pressStyle={{ scale: 0.98 }}>
        <Text>Hi</Text>
      </YStack>
    </XStack>
  );
}
`);
    expect(out).toBe(`import { HStack, VStack, Text } from 'usemotif';

export function Row() {
  return (
    <HStack gap="$2" _hover={{ opacity: 0.8 }}>
      <VStack _active={{ scale: 0.98 }}>
        <Text>Hi</Text>
      </VStack>
    </HStack>
  );
}
`);
  });

  it('restructures a styled() config into base and keeps variants', () => {
    const out = applyFromTamagui(`import { styled, Stack } from 'tamagui';

const Card = styled(Stack, {
  name: 'Card',
  padding: '$4',
  hoverStyle: { bg: '$background' },
  variants: { size: { lg: { padding: '$6', pressStyle: { opacity: 0.5 } } } },
});
`);
    expect(out).toBe(`import { styled, Box } from 'usemotif';

// usemotif-migrate: styled() name name: 'Card' dropped: motif has no named component themes
const Card = styled(Box, { base: { padding: '$4', _hover: { bg: '$background' } }, variants: { size: { lg: { padding: '$6', _active: { opacity: 0.5 } } } } });
`);
  });

  it('keeps and marks what has no counterpart, and media props', () => {
    const out = applyFromTamagui(`import { Stack, Sheet, createTamagui } from 'tamagui';
import { Box } from './box';

const a = <Stack $gtSm={{ padding: 8 }} />;
`);
    expect(out).toBe(`import { Box as Stack } from 'usemotif';
// usemotif-migrate: no motif counterpart, finish by hand: Sheet, createTamagui
import { Sheet, createTamagui } from 'tamagui';
import { Box } from './box';

// usemotif-migrate: media prop $gtSm: use a responsive object instead
const a = <Stack $gtSm={{ padding: 8 }} />;
`);
    expect(applyFromTamagui(out)).toBe(out);
  });

  it('marks the nearest statement, inside a function body too', () => {
    const out = applyFromTamagui(
      `import { Stack } from 'tamagui';\nfunction A() {\n  return <Stack $sm={{ p: 1 }} />;\n}\n`,
    );
    expect(out).toBe(
      `import { Box } from 'usemotif';\nfunction A() {\n  // usemotif-migrate: media prop $sm: use a responsive object instead\n  return <Box $sm={{ p: 1 }} />;\n}\n`,
    );
  });

  it('renames references but not property names or member accesses', () => {
    const out = applyFromTamagui(
      `import { YStack } from '@tamagui/stacks';\nconst x = { YStack: 1 }.YStack;\nconst C = YStack;\n`,
    );
    expect(out).toBe(
      `import { VStack } from 'usemotif';\nconst x = { YStack: 1 }.YStack;\nconst C = VStack;\n`,
    );
  });

  it('only runs on files that import Tamagui', () => {
    expect(needsFromTamagui(`import { Box } from 'usemotif';`)).toBe(false);
    expect(needsFromTamagui(`import { Stack } from "@tamagui/core";`)).toBe(true);
  });
});
