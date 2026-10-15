// Serves the built app and checks streamed SSR end to end: each React island's CSS arrives with
// the island, ahead of its content, the island inside an async component streams in a later
// chunk, and the page hydrates in Chromium with the styles applied and no errors.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

const PORT = 4175;
const URL = `http://localhost:${PORT}/`;
const fail = (message) => {
  console.error(`smoke: ${message}`);
  process.exitCode = 1;
};

const server = spawn(process.execPath, ['./dist/server/entry.mjs'], {
  env: { ...process.env, PORT: String(PORT), HOST: 'localhost' },
  stdio: 'ignore',
});
try {
  for (let tries = 0; ; tries++) {
    try {
      await fetch(URL, { method: 'HEAD' });
      break;
    } catch (error) {
      if (tries > 100) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  const response = await fetch(URL);
  const decoder = new TextDecoder();
  const chunks = [];
  for await (const chunk of response.body) chunks.push(decoder.decode(chunk, { stream: true }));
  const html = chunks.join('');

  for (const id of ['shell', 'late']) {
    const content = html.indexOf(`id="${id}"`);
    const style = html.lastIndexOf('<style data-precedence="motif"', content);
    const previous = id === 'late' ? html.indexOf('id="shell"') : -1;
    if (content === -1) fail(`the ${id} island never rendered`);
    else if (style === -1 || style < previous) fail(`the ${id} island has no styles ahead of it`);
  }
  const lateChunk = chunks.findIndex((c) => c.includes('id="late"'));
  const shellChunk = chunks.findIndex((c) => c.includes('id="shell"'));
  if (lateChunk <= shellChunk) fail(`expected the late island in a later chunk than the first`);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
  const padding = await page.evaluate(() =>
    ['#shell', '#late'].map((s) => getComputedStyle(document.querySelector(s)).padding),
  );
  await browser.close();
  if (padding.join() !== '24px,12px')
    fail(`computed padding ${padding.join()}, expected 24px,12px`);
  if (errors.length > 0) fail(`browser messages: ${errors.join(' | ')}`);
  if (process.exitCode !== 1) {
    console.log(
      `smoke: ok - ${chunks.length} chunks, island styles ahead of each island, hydrated cleanly`,
    );
  }
} finally {
  server.kill();
  await once(server, 'exit');
}
