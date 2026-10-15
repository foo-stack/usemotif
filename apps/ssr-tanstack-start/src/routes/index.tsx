import { Await, createFileRoute } from '@tanstack/react-router';
import { Box, Text } from '@usemotif/react';
import { Suspense } from 'react';

export const Route = createFileRoute('/')({
  loader: () => ({
    // Resolves after the shell has streamed, so its styles arrive in a later chunk.
    late: new Promise<string>((resolve) => setTimeout(() => resolve('Streamed in later'), 300)),
  }),
  component: Home,
});

function Home() {
  const { late } = Route.useLoaderData();
  return (
    <Box id="shell" p="$space.6" bg="$colors.surface.raised" _hover={{ opacity: 0.9 }}>
      <Text as="h1" fontSize="$fontSizes.2xl">
        motif on TanStack Start
      </Text>
      <Suspense fallback={<Text id="fallback">Loading</Text>}>
        <Await promise={late}>
          {(message) => (
            <Box
              id="late"
              mt="$space.4"
              p="$space.3"
              borderRadius="$radii.md"
              _hover={{ bg: '$colors.surface.muted' }}
            >
              {message}
            </Box>
          )}
        </Await>
      </Suspense>
    </Box>
  );
}
