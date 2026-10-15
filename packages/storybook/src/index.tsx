import type { Decorator, Preview } from '@storybook/react';
import { createElement } from 'react';
import { Direction, getBreakpoints, ThemeProvider, type BreakpointName } from 'usemotif';

type ThemeLike = Parameters<typeof ThemeProvider>[0]['themes'][number];

export interface MotifPreviewOptions {
  /** The themes the toolbar switches between. The first is the default unless `defaultTheme` says otherwise. */
  readonly themes: readonly ThemeLike[];
  /** The theme stories open in. */
  readonly defaultTheme?: string;
  /** Viewport widths for the breakpoint presets. Default: motif's configured breakpoints. */
  readonly breakpoints?: Readonly<Partial<Record<BreakpointName, number>>>;
}

/**
 * Storybook preview annotations for a motif project: a toolbar to switch theme and writing
 * direction, viewport presets at each motif breakpoint, and a decorator that wraps every story in
 * `ThemeProvider` and `Direction`. Spread the result into `.storybook/preview`.
 *
 * @example
 * ```ts
 * // .storybook/preview.ts
 * import { motifPreview } from '@usemotif/storybook';
 * import { darkTheme, lightTheme } from '@usemotif/tokens';
 *
 * export default { ...motifPreview({ themes: [lightTheme, darkTheme] }) };
 * ```
 */
export function motifPreview({
  themes,
  defaultTheme = themes[0]?.name ?? 'light',
  breakpoints = getBreakpoints(),
}: MotifPreviewOptions): Pick<
  Preview,
  'decorators' | 'globalTypes' | 'initialGlobals' | 'parameters'
> {
  const withMotif: Decorator = (Story, context) => {
    const active =
      typeof context.globals.motifTheme === 'string' ? context.globals.motifTheme : defaultTheme;
    const dir = context.globals.motifDirection === 'rtl' ? 'rtl' : 'ltr';
    return createElement(
      ThemeProvider,
      { themes, active },
      createElement(Direction, { value: dir }, createElement(Story)),
    );
  };

  const widths = Object.entries(breakpoints).filter(
    (e): e is [string, number] => typeof e[1] === 'number',
  );
  return {
    decorators: [withMotif],
    globalTypes: {
      motifTheme: {
        description: 'motif theme',
        toolbar: {
          title: 'Theme',
          icon: 'paintbrush',
          items: themes.map((t) => ({ value: t.name, title: t.name })),
          dynamicTitle: true,
        },
      },
      motifDirection: {
        description: 'Writing direction',
        toolbar: {
          title: 'Direction',
          icon: 'transfer',
          items: [
            { value: 'ltr', title: 'Left to right' },
            { value: 'rtl', title: 'Right to left' },
          ],
          dynamicTitle: true,
        },
      },
    },
    initialGlobals: { motifTheme: defaultTheme, motifDirection: 'ltr' },
    parameters: {
      viewport: {
        options: Object.fromEntries(
          widths.map(([name, width]) => [
            `motif-${name}`,
            {
              name: `motif ${name} (${width}px)`,
              styles: { width: `${width}px`, height: '100%' },
              type: width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop',
            },
          ]),
        ),
      },
    },
  };
}
