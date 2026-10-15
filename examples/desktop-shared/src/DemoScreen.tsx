import { useCallback, useState } from 'react';
import { Box, Button, HStack, Text, ThemeProvider, TitleBar, VStack } from 'usemotif';
import { darkTheme, lightTheme } from '@usemotif/tokens';

/**
 * The single source of truth for every desktop target. It uses only the
 * primitives that are byte-for-byte the same on web and native - `Box`,
 * `Stack`, `Text`, `Button`, tokens, and `ThemeProvider` - so the very same
 * file renders in a browser, in an Electron / Tauri window (via the web
 * bundle), and in react-native-windows / -macos (via the native bundle). The
 * bundler picks web vs native through motif's export conditions; the component
 * never branches on platform.
 *
 * Keeping it self-contained (its own `ThemeProvider`, its own state) means a
 * target only has to `render(<DemoScreen />)` - no per-target wiring to drift.
 */

const THEMES = [lightTheme, darkTheme];

const FEATURES: readonly string[] = [
  'One component, every platform',
  'Themed tokens resolve identically',
  'Rendered by the same bundle the web ships',
];

export function DemoScreen(): React.ReactElement {
  const [active, setActive] = useState<'light' | 'dark'>('light');
  const [count, setCount] = useState(0);

  const toggleTheme = useCallback(() => setActive((t) => (t === 'light' ? 'dark' : 'light')), []);
  const bumpCount = useCallback(() => setCount((c) => c + 1), []);

  return (
    <ThemeProvider themes={THEMES} active={active}>
      <Box bg="$colors.surface.base">
        <TitleBar
          title="motif desktop demo"
          px="$3"
          bg="$colors.surface.muted"
          trailing={
            <Text fontSize="$xs" color="$colors.text.muted">
              {active}
            </Text>
          }
        />
        <VStack gap="$5" p="$6">
          <VStack gap="$2">
            <Text fontSize="$xl" fontWeight="$bold" color="$colors.text.default">
              motif on the desktop
            </Text>
            <Text fontSize="$md" color="$colors.text.muted">
              One shared component, resolved per platform by the bundler - here rendered by
              motif&rsquo;s web bundle inside a desktop window.
            </Text>
          </VStack>

          <VStack gap="$2" bg="$colors.surface.muted" p="$4" borderRadius="$lg">
            {FEATURES.map((feature) => (
              <Text key={feature} fontSize="$sm" color="$colors.text.default">
                • {feature}
              </Text>
            ))}
          </VStack>

          <HStack gap="$3">
            <Button onPress={toggleTheme}>Toggle theme · {active}</Button>
            <Button variant="outline" onPress={bumpCount}>
              Pressed {count}×
            </Button>
          </HStack>
        </VStack>
      </Box>
    </ThemeProvider>
  );
}
