# @usemotif/mcp

An [MCP](https://modelcontextprotocol.io) server that gives coding agents what they need to write motif code: your theme's tokens, a check for `$` token paths, and the motif docs.

> Not published yet. It is built and tested in this repository and is marked `private` until its npm package and trusted publisher are set up.

## Use

```sh
usemotif-mcp --theme ./src/theme.js
```

`--theme` takes a module that exports your themes (`createTheme` or `extendTheme` results), as `.js`, `.mjs` or `.json`, or `.ts` on a Node that runs TypeScript. Every export shaped like a theme is served, by name. Without it, the default light and dark presets are served.

It runs on stdio. In an agent's MCP config:

```json
{
  "mcpServers": {
    "usemotif": { "command": "npx", "args": ["usemotif-mcp", "--theme", "./src/theme.js"] }
  }
}
```

## Tools

| Tool                | What it does                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `list_tokens`       | Every token as a `$` path with its value, optionally under a prefix such as `$colors.action`.      |
| `resolve_token`     | Follows a path through its references to the literal it ends at.                                   |
| `check_token_paths` | Finds every `$` reference in a snippet of code and flags unknown ones with the nearest real paths. |
| `search_docs`       | Searches the motif docs and returns matching pages.                                                |
| `get_doc`           | Reads one docs page as markdown.                                                                   |
| `component_api`     | The API section of the page that documents a component or hook.                                    |

Each token tool takes an optional `theme` name. The docs are bundled at build time from the docs site's content, so they match the version you run and work offline.
