# @usemotif/eslint-plugin

Lint rules for motif code, for ESLint 9+ and for oxlint through its JS plugins.

> Not published yet. It is built and tested in this repository and is marked `private` until its npm package and trusted publisher are set up.

| Rule                    | Recommended | What it reports                                                                                                                                                                                                   |
| ----------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prefer-tokens`         | warn        | A literal in a style prop (`bg="#2563eb"`, `p={16}`) that the theme already has a token for, with a suggestion to use the token. Neutral values (`0`, `auto`, `none`, `transparent`, `100%`, ...) are left alone. |
| `valid-token-paths`     | error       | A `$` reference the theme doesn't define, with the nearest real path. Scale-less references (`p="$4"`, `bg="$blue.500"`) are read against the prop's scale.                                                       |
| `no-platform-branching` | warn        | `Platform.OS`, `Platform.select` and `typeof window` / `typeof document` in a shared file. Files named `.native`, `.ios`, `.android`, `.web`, `.windows` or `.macos` are exempt.                                  |

## ESLint

```js
// eslint.config.js
import motif from '@usemotif/eslint-plugin';
import { lightTheme } from './src/theme.js';

export default [motif.configs.recommended, { settings: { motif: { tokens: lightTheme.tokens } } }];
```

## oxlint

oxlint's config is JSON, so point it at a JSON copy of your tokens:

```json
{
  "jsPlugins": ["@usemotif/eslint-plugin"],
  "settings": { "motif": { "tokensFile": "./tokens.json" } },
  "rules": {
    "@usemotif/prefer-tokens": "warn",
    "@usemotif/valid-token-paths": "error",
    "@usemotif/no-platform-branching": "warn"
  }
}
```

Without `tokens` or `tokensFile`, the rules check against the default light preset from `@usemotif/tokens`.
