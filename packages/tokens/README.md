# @usemotif/tokens

> Default opinionated token presets for motif-js - colors, spacing, typography, radii, shadows, plus light and dark themes built on top.

## Install

```sh
yarn add @usemotif/tokens
```

## Use

The pre-built themes:

```tsx
import { ThemeProvider } from 'usemotif';
import { lightTheme, darkTheme } from '@usemotif/tokens';

<ThemeProvider themes={[lightTheme, darkTheme]} active="light">
  ...
</ThemeProvider>;
```

High-contrast variants of both, held to WCAG AAA (7:1 text, 3:1 borders), ship beside them:

```tsx
import { highContrastDarkTheme, highContrastLightTheme } from '@usemotif/tokens';
```

Or extend them with your own brand:

```tsx
import { createTheme } from 'usemotif';
import { colors, space } from '@usemotif/tokens';

export const brand = createTheme({
  name: 'brand',
  tokens: {
    colors: { ...colors, accent: '#C2410C' },
    space,
  },
});
```

## Docs

<https://usemotif.dev>

## License

[MIT](../../LICENSE)
