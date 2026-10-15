// Serves the built app and checks streamed SSR end to end: the shell's CSS is in <head>, the
// deferred section's CSS arrives in a later chunk ahead of the content it styles, and the page
// hydrates in Chromium with the styles applied and no errors.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';

const PORT = 4174;
const URL = `http://localhost:${PORT}/`;
const fail = (message) => {
  console.error(`smoke: ${message}`);
  process.exitCode = 1;
};

// A browser's user agent: the entry waits for everything before sending to a bot.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36';

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
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

  const response = await fetch(URL, { headers: { 'user-agent': BROWSER_UA } });
  const decoder = new TextDecoder();
  const chunks = [];
  for await (const chunk of response.body) chunks.push(decoder.decode(chunk, { stream: true }));
  const html = chunks.join('');
  const head = html.slice(0, html.indexOf('</head>'));
  const shellClass = /id="shell"[^>]*class="([^"]+)"|class="([^"]+)"[^>]*id="shell"/.exec(html);
  const lateIndex = html.indexOf('id="late"');
  const lateClass = /<div[^>]*id="late"[^>]*>|<div[^>]*class="([^"]+)"[^>]*id="late"/.exec(html);

  if (chunks.length < 2) fail(`expected a streamed response, got ${chunks.length} chunk`);
  if (!head.includes('<style data-motif-ssr>')) fail('no motif styles in <head>');
  const shellRule = (shellClass?.[1] ?? shellClass?.[2] ?? '')
    .split(' ')
    .find((c) => c.startsWith('m-'));
  if (shellRule === undefined || !head.includes(`.${shellRule}`))
    fail('the shell hover rule is not in <head>');
  const lateTag = lateClass?.[0] ?? '';
  const lateRule = /class="([^"]+)"/
    .exec(lateTag)?.[1]
    ?.split(' ')
    .find((c) => c.startsWith('m-'));
  const lateStyle = lateRule === undefined ? -1 : html.lastIndexOf(`.${lateRule}`, lateIndex);
  if (lateIndex === -1) fail('the deferred section never streamed');
  else if (lateStyle === -1 || lateStyle < html.indexOf('</head>')) {
    fail('the deferred section has no style streamed ahead of it');
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL);
  await page.waitForSelector('#late');
  await page.waitForLoadState('networkidle');
  const padding = await page.evaluate(() =>
    ['#shell', '#late'].map((s) => getComputedStyle(document.querySelector(s)).padding),
  );
  await browser.close();
  if (padding.join() !== '24px,12px')
    fail(`computed padding ${padding.join()}, expected 24px,12px`);
  if (errors.length > 0) fail(`browser errors: ${errors.join(' | ')}`);
  if (process.exitCode !== 1) {
    console.log(`smoke: ok - ${chunks.length} chunks, deferred styles streamed, hydrated cleanly`);
  }
} finally {
  server.kill();
  await once(server, 'exit');
}
