/** One docs page, as markdown, with what it documents. */
export interface DocPage {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly covers: readonly string[];
  readonly markdown: string;
}

/** The pages that best match a query, by title, documented names, description and body. */
export function searchDocs(pages: readonly DocPage[], query: string, limit = 8): DocPage[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const score = (page: DocPage): number => {
    let total = 0;
    const title = page.title.toLowerCase();
    const covers = page.covers.map((c) => c.toLowerCase());
    const description = page.description.toLowerCase();
    const body = page.markdown.toLowerCase();
    for (const term of terms) {
      if (title === term || covers.includes(term)) total += 20;
      else if (title.includes(term)) total += 8;
      if (description.includes(term)) total += 3;
      total += Math.min(body.split(term).length - 1, 5);
    }
    return total;
  };
  return pages
    .map((page) => ({ page, s: score(page) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => r.page);
}

/**
 * The part of the page that documents `name`: its API section when the page has one, else the
 * whole page. `undefined` when no page documents the name.
 */
export function componentApi(
  pages: readonly DocPage[],
  name: string,
): { page: DocPage; section: string } | undefined {
  const page = pages.find((p) => p.covers.includes(name));
  if (page === undefined) return undefined;
  const match = /^## API\n[\s\S]*?(?=^## |(?![\s\S]))/m.exec(page.markdown);
  return { page, section: match?.[0].trim() ?? page.markdown };
}
