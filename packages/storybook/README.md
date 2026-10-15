# @usemotif/storybook

Storybook preview helpers for motif projects: a toolbar to switch theme and writing direction, viewport presets at each motif breakpoint, and a decorator that wraps every story in `ThemeProvider` and `Direction`.

> Not published yet. It is built and tested in this repository and is marked `private` until its npm package and trusted publisher are set up.

## Use

```ts
// .storybook/preview.ts
import { motifPreview } from '@usemotif/storybook';
import { darkTheme, lightTheme } from '@usemotif/tokens';

export default { ...motifPreview({ themes: [lightTheme, darkTheme] }) };
```

| Option         | Default                        |                                                 |
| -------------- | ------------------------------ | ----------------------------------------------- |
| `themes`       |                                | The themes the toolbar switches between.        |
| `defaultTheme` | the first theme                | The theme stories open in.                      |
| `breakpoints`  | motif's configured breakpoints | Widths for the `motif-<name>` viewport presets. |

The toolbar values are Storybook globals, `motifTheme` and `motifDirection`, so a story can be opened in a given state by URL: `?globals=motifTheme:dark;motifDirection:rtl`.

To combine with your own preview, spread it first and merge your `decorators` and `parameters` on top.
