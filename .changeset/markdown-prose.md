---
'@usemotif/core': minor
'@usemotif/react': minor
'@usemotif/react-native': minor
'usemotif': minor
---

`<Prose markdown>` renders Markdown on web and React Native: headings, paragraphs, nested lists, quotes, fenced code, rules and GFM tables, with emphasis, code, links and images inline. Web renders plain elements that Prose styles; native renders motif `Text`, `Box` and `Image`, with links opening through `Linking`. HTML in the source stays text, and links with a scheme other than http, https, mailto or tel are dropped. The parser is exported from `@usemotif/core` as `parseMarkdown`, and `Prose` is now exported from `usemotif` on both platforms.
