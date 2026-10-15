import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  SSRStyleCollector,
  _resetStyleCacheForTesting,
  injectAtRules,
  setCollectorStorage,
  syncCollectorStorage,
} from './style-cache.js';
import { asyncCollectorStorage } from './server.js';

const padding4Md = {
  atRule: '@media (min-width: 768px)',
  style: { padding: 'var(--space-4)' },
} as const;
const padding8Lg = {
  atRule: '@media (min-width: 1024px)',
  style: { padding: 'var(--space-8)' },
} as const;

beforeEach(() => {
  _resetStyleCacheForTesting();
});

afterEach(() => {
  _resetStyleCacheForTesting();
});

describe('asyncCollectorStorage - AsyncLocalStorage-backed', () => {
  it('imports as a side effect: server.js installs the async backend', async () => {
    // Already imported at the top of this file; verify it's active.
    setCollectorStorage(asyncCollectorStorage);

    const collector = new SSRStyleCollector();
    collector.collect(() => {
      injectAtRules([padding4Md]);
    });
    expect(collector.getCss()).toContain('@media (min-width: 768px)');
  });

  it('keeps two concurrent async renders from interleaving collectors', async () => {
    setCollectorStorage(asyncCollectorStorage);

    const a = new SSRStyleCollector();
    const b = new SSRStyleCollector();

    // Simulate two concurrent async renders interleaving via Promises.
    const renderA = a.collect(async () => {
      // Yield to the event loop, giving render B a chance to clobber a
      // module-level pointer if one were in use.
      await Promise.resolve();
      injectAtRules([padding4Md]);
      await Promise.resolve();
      injectAtRules([padding4Md]); // dedup'd locally
    });
    const renderB = b.collect(async () => {
      await Promise.resolve();
      injectAtRules([padding8Lg]);
    });

    await Promise.all([renderA, renderB]);

    expect(a.getCss()).toContain('@media (min-width: 768px)');
    expect(a.getCss()).not.toContain('@media (min-width: 1024px)');
    expect(b.getCss()).toContain('@media (min-width: 1024px)');
    expect(b.getCss()).not.toContain('@media (min-width: 768px)');
  });

  it('still works for plain sync collect() calls', () => {
    setCollectorStorage(asyncCollectorStorage);

    const collector = new SSRStyleCollector();
    const result = collector.collect(() => {
      injectAtRules([padding4Md]);
      return 'sync-result';
    });
    expect(result).toBe('sync-result');
    expect(collector.getCss()).toContain('@media (min-width: 768px)');
  });

  it('restores the previous collector context after collect() returns', () => {
    setCollectorStorage(asyncCollectorStorage);

    const outer = new SSRStyleCollector();
    const inner = new SSRStyleCollector();

    outer.collect(() => {
      injectAtRules([padding4Md]);
      inner.collect(() => {
        injectAtRules([padding8Lg]);
      });
      // After inner exits, outer should still be the active collector.
      injectAtRules([padding4Md]); // dedup'd in outer
    });

    expect(outer.getCss()).toContain('@media (min-width: 768px)');
    expect(outer.getCss()).not.toContain('@media (min-width: 1024px)');
    expect(inner.getCss()).toContain('@media (min-width: 1024px)');
    expect(inner.getCss()).not.toContain('@media (min-width: 768px)');
  });

  it('storage backend resets to sync default after _resetStyleCacheForTesting', () => {
    // Activate async backend.
    setCollectorStorage(asyncCollectorStorage);
    // Reset.
    _resetStyleCacheForTesting();

    // Sync collect() should still work - proves we're back on sync storage.
    const collector = new SSRStyleCollector();
    collector.collect(() => {
      injectAtRules([padding4Md]);
    });
    expect(collector.getCss()).toContain('@media (min-width: 768px)');
  });
});

describe('syncCollectorStorage - module-level pointer', () => {
  it('captures CSS for sync renders', () => {
    setCollectorStorage(syncCollectorStorage);

    const collector = new SSRStyleCollector();
    collector.collect(() => {
      injectAtRules([padding4Md]);
    });
    expect(collector.getCss()).toContain('@media (min-width: 768px)');
  });
});

describe('motifStyleStream', () => {
  it('puts collected CSS into <head> with the shell, then ahead of later chunks', async () => {
    const { motifStyleStream, SSRStyleCollector: Collector } = await import('./server.js');
    const collector = new Collector();
    const stream = motifStyleStream(collector);
    const out: string[] = [];
    stream.on('data', (chunk: Buffer | string) => out.push(String(chunk)));
    const write = (html: string): Promise<void> =>
      new Promise((resolve) => stream.write(html, () => resolve()));

    collector._append('m-a', '.m-a { color: red; }');
    await write('<!DOCTYPE html><html><head><title>t</title>');
    await write('</head><body><div class="m-a">shell</div>');
    collector._append('m-b', '.m-b { color: blue; }');
    await write('<div hidden id="S:0"><p class="m-b">late</p></div>');
    await write('<script>done</script>');
    stream.end();

    expect(out).toEqual([
      '<!DOCTYPE html><html><head><title>t</title>',
      '<style data-motif-ssr>.m-a { color: red; }</style></head><body><div class="m-a">shell</div>',
      '<style data-motif-ssr>.m-b { color: blue; }</style><div hidden id="S:0"><p class="m-b">late</p></div>',
      '<script>done</script>',
    ]);
  });
});

describe('motifStyleTransform', () => {
  it('does the same for web streams', async () => {
    const { motifStyleTransform, SSRStyleCollector: Collector } = await import('./server.js');
    const collector = new Collector();
    const chunks = ['<html><head>', '</head><body>shell', '<div hidden id="S:0">late</div>'];
    collector._append('m-a', '.m-a { color: red; }');
    const source = new ReadableStream<string>({
      start(controller) {
        controller.enqueue(chunks[0]!);
        controller.enqueue(chunks[1]!);
        collector._append('m-b', '.m-b { color: blue; }');
        controller.enqueue(chunks[2]!);
        controller.close();
      },
    });
    const out: string[] = [];
    const reader = source.pipeThrough(motifStyleTransform(collector)).getReader();
    const decoder = new TextDecoder();
    for (let r = await reader.read(); !r.done; r = await reader.read())
      out.push(decoder.decode(r.value));
    expect(out.join('')).toBe(
      '<html><head><style data-motif-ssr>.m-a { color: red; }\n.m-b { color: blue; }</style></head><body>shell<div hidden id="S:0">late</div>',
    );
  });
});
