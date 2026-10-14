import { resolveToken, type Theme, type TokenRef } from '@usemotif/core';
import { darkTheme, lightTheme } from '@usemotif/tokens';
import { Box } from 'usemotif';

interface Row {
  readonly path: string;
  readonly light: string;
  readonly dark: string;
}

type Scale = { readonly [key: string]: unknown };

function isRef(value: unknown): value is TokenRef {
  return typeof value === 'string' && value.startsWith('$');
}

/** The semantic colour groups: those whose leaves point at other tokens. */
function semanticGroups(theme: Theme): string[] {
  const colors = theme.tokens.colors as Scale;
  return Object.keys(colors).filter((key) => {
    const group = colors[key];
    return typeof group === 'object' && group !== null && JSON.stringify(group).includes('"$');
  });
}

function leafPaths(scale: Scale, prefix: string): string[] {
  return Object.entries(scale).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? leafPaths(value as Scale, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  );
}

function literal(theme: Theme, path: string): string {
  const resolved = resolveToken(`$colors.${path}`, theme);
  return typeof resolved === 'string' && !isRef(resolved) ? resolved : 'unset';
}

function rowsFor(group: string): Row[] {
  const scale = (lightTheme.tokens.colors as Scale)[group] as Scale;
  return leafPaths(scale, group).map((path) => ({
    path,
    light: literal(lightTheme, path),
    dark: literal(darkTheme, path),
  }));
}

function Swatch({ color }: { color: string }) {
  return (
    <Box display="flex" alignItems="center" gap="$space.2" minWidth={0}>
      <Box
        flexShrink={0}
        width={24}
        height={24}
        borderRadius="$radii.sm"
        borderWidth="$borderWidths.thin"
        borderStyle="solid"
        borderColor="$colors.border.default"
        bg={color}
      />
      <Box as="code" fontSize="$fontSizes.xs" color="$colors.text.muted">
        {color}
      </Box>
    </Box>
  );
}

/**
 * Every semantic colour of the default preset, light and dark side by side,
 * read from `@usemotif/tokens` at build time so the page cannot drift from
 * what ships. Swatches use the resolved literal, so both themes show whatever
 * theme the page itself is in.
 */
export function TokenSwatches() {
  return (
    <Box display="flex" flexDirection="column" gap="$space.6" my="$space.4">
      {semanticGroups(lightTheme).map((group) => (
        <Box key={group} as="section" display="flex" flexDirection="column" gap="$space.2">
          <Box as="h3" fontSize="$fontSizes.md" fontWeight="$fontWeights.semibold" m={0}>
            {group}
          </Box>
          <Box
            display="grid"
            gridTemplateColumns="minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)"
            columnGap="$space.3"
            rowGap="$space.2"
            alignItems="center"
            fontSize="$fontSizes.sm"
          >
            <Box color="$colors.text.muted">Token</Box>
            <Box color="$colors.text.muted">Light</Box>
            <Box color="$colors.text.muted">Dark</Box>
            {rowsFor(group).map((row) => [
              <Box
                key={`${row.path}-name`}
                as="code"
                fontSize="$fontSizes.xs"
                minWidth={0}
                // Long paths (`action.primary.hover`) would run into the swatch
                // column on a phone; let them break at any character instead.
                style={{ overflowWrap: 'anywhere' }}
              >
                {row.path}
              </Box>,
              <Swatch key={`${row.path}-light`} color={row.light} />,
              <Swatch key={`${row.path}-dark`} color={row.dark} />,
            ])}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
