# motif universal app template

One screen tree, two routers.

| Package                     | What it is                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `examples/universal-shared` | The screens (`HomeScreen`, `SettingsScreen`), built from `usemotif`, `@usemotif/headless` and the `@usemotif/ui` kit. |
| `examples/universal-next`   | Next.js App Router: `app/page.tsx` and `app/settings/page.tsx` each render a shared screen.                           |
| `examples/universal-expo`   | Expo Router: `app/index.tsx` and `app/settings.tsx` render the same screens.                                          |

The screens never import a router. A screen links with `ScreenLink href="/settings"`, and each app passes its router's `Link` to `NavProvider` (see `universal-next/app/providers.tsx` and `universal-expo/app/_layout.tsx`). To add a screen, write it in `universal-shared`, add `'/your-route'` to `Route`, and add one route file to each app.

The shared screens stick to components whose props match on both platforms. The kit's `Switch`, `Checkbox` and `Radio` take different props on web and native, so a screen that needs one keeps that control in a platform file.

```sh
yarn workspace @usemotif/example-universal-next dev     # http://localhost:4100
yarn workspace @usemotif/example-universal-expo start
```
