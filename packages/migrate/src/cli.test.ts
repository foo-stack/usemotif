import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type * as NodeProcess from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The CLI writes through `stdout` / `stderr` and calls `exit` from `node:process`
// directly, so capture all three. `exit` throws to stop the run where the real
// process would end.
const io = vi.hoisted(() => {
  class ExitCalled extends Error {
    constructor(readonly code: number) {
      super(`exit ${code}`);
    }
  }
  return { out: '', err: '', ExitCalled };
});

vi.mock('node:process', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeProcess>();
  return {
    ...actual,
    stdout: { write: (s: string) => ((io.out += s), true) },
    stderr: { write: (s: string) => ((io.err += s), true) },
    exit: (code: number) => {
      throw new io.ExitCalled(code);
    },
  };
});

const { main } = await import('./cli.js');

async function run(...argv: string[]): Promise<number> {
  try {
    return await main(argv);
  } catch (err) {
    if (err instanceof io.ExitCalled) return err.code;
    throw err;
  }
}

beforeEach(() => {
  io.out = '';
  io.err = '';
});

describe('usemotif-migrate arguments', () => {
  it.each([['--help'], ['-h']])('%s prints help and exits 0', async (flag) => {
    expect(await run(flag)).toBe(0);
    expect(io.out).toContain('Usage:');
  });

  it('prints help and exits 0 with no command', async () => {
    expect(await run()).toBe(0);
    expect(io.out).toContain('Usage:');
  });

  it('rejects an unknown command with exit 2', async () => {
    expect(await run('rename-v9')).toBe(2);
    expect(io.err).toContain('unknown command: rename-v9');
  });

  it.each([['--nope'], ['--dry-run=x'], ['--']])(
    'rejects the flag %s with exit 2',
    async (flag) => {
      expect(await run('rename-v3', flag)).toBe(2);
      expect(io.err).toBe(`unknown flag: ${flag}\n`);
    },
  );

  it('rejects a third positional argument with exit 2', async () => {
    expect(await run('rename-v3', '.', 'extra')).toBe(2);
    expect(io.err).toBe('unexpected positional argument: extra\n');
  });
});

describe('usemotif-migrate --dry-run', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'usemotif-migrate-'));
    writeFileSync(join(dir, 'a.tsx'), `import { Box } from '@motif-js/react';\n`);
    writeFileSync(join(dir, 'b.tsx'), `import { Box } from '@usemotif/react';\n`);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it.each([
    ['flag last', (d: string) => ['rename-v3', d, '--dry-run']],
    ['flag first', (d: string) => ['--dry-run', 'rename-v3', d]],
  ])('reports without writing (%s)', async (_label, argv) => {
    expect(await run(...argv(dir))).toBe(0);
    expect(io.out).toBe('would change: a.tsx\nwould change 1 file.\n');
    expect(readFileSync(join(dir, 'a.tsx'), 'utf8')).toBe(
      `import { Box } from '@motif-js/react';\n`,
    );
  });
});
