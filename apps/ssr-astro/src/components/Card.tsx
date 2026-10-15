import { Box, StyleIsland, Text, ThemeProvider } from '@usemotif/react';
import { lightTheme } from '@usemotif/tokens';

export default function Card({ id, title, pad }: { id: string; title: string; pad: string }) {
  return (
    <StyleIsland>
      <ThemeProvider themes={[lightTheme]} active="light">
        <Box
          id={id}
          p={pad}
          bg="$colors.surface.raised"
          _hover={{ opacity: 0.9 }}
          borderRadius="$radii.md"
        >
          <Text>{title}</Text>
        </Box>
      </ThemeProvider>
    </StyleIsland>
  );
}
