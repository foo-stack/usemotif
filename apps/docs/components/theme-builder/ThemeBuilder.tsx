// The island wrapper authors import; ThemeBuilder.client.tsx holds the interactive builder.
import { Island } from '@vorge/core/islands';
import { Box } from '@usemotif/react';

export function ThemeBuilder() {
  return (
    <Island
      client="load"
      load={() => import('./ThemeBuilder.client.js')}
      props={{}}
      fallback={
        <Box
          minH={480}
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="$colors.fg.faint"
        >
          Loading the theme builder...
        </Box>
      }
    />
  );
}
