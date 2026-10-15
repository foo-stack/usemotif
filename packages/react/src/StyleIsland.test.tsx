/** @vitest-environment node */
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Box } from './Box.js';
import { StyleIsland } from './StyleIsland.js';

describe('StyleIsland', () => {
  it('server-renders its content with its own CSS, with no collector set up around it', () => {
    const html = renderToString(
      <StyleIsland>
        <Box id="card" _hover={{ opacity: 0.5 }} />
      </StyleIsland>,
    );
    const cls = /id="card" class="(m-[a-z0-9]+)"/.exec(html)![1]!;
    expect(html).toMatch(/^<style data-precedence="motif" data-href="motif-[a-z0-9]+">/);
    expect(html).toContain(`.${cls}:hover { opacity: 0.5; }`);
    expect(html.indexOf('<style')).toBeLessThan(html.indexOf('id="card"'));
  });

  it('keys each island by its CSS, so islands with different styles both keep theirs', () => {
    const island = (opacity: number): string =>
      renderToString(
        <StyleIsland>
          <Box _hover={{ opacity }} />
        </StyleIsland>,
      );
    const href = (html: string): string => /data-href="([^"]+)"/.exec(html)![1]!;
    expect(href(island(0.5))).not.toBe(href(island(0.6)));
  });
});
