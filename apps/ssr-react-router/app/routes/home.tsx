import { Box, Text } from '@usemotif/react';
import { Suspense } from 'react';
import { Await, useLoaderData } from 'react-router';

export function loader() {
  // Resolves after the shell has streamed, so its styles arrive in a later chunk.
  const late = new Promise<string>((resolve) =>
    setTimeout(() => resolve('Streamed in later'), 300),
  );
  return { late };
}

export default function Home() {
  const { late } = useLoaderData<typeof loader>();
  return (
    <Box id="shell" p="$space.6" bg="$colors.surface.raised" _hover={{ opacity: 0.9 }}>
      <Text as="h1" fontSize="$fontSizes.2xl">
        motif on React Router
      </Text>
      <Suspense fallback={<Text id="fallback">Loading</Text>}>
        <Await resolve={late}>
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
