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

describe('usemotif-migrate from-*', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'usemotif-migrate-'));
    writeFileSync(
      join(dir, 'a.tsx'),
      `import styled from 'styled-components';\nconst A = styled.a\`color: red;\`;\nconst B = styled.b\`color: \${(p) => p.c};\`;\n`,
    );
    writeFileSync(join(dir, 'package.json'), `{ "dependencies": { "styled-components": "6" } }\n`);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('rewrites code files only and reports what it left', async () => {
    expect(await run('from-styled-components', dir)).toBe(0);
    expect(io.out).toBe('changed: a.tsx (1 left to finish by hand)\nchanged 1 file.\n');
    expect(readFileSync(join(dir, 'a.tsx'), 'utf8')).toContain(`motifStyled('a'`);
  });

  it('reports a file it cannot parse and exits 1', async () => {
    writeFileSync(join(dir, 'c.ts'), `import { Stack } from 'tamagui';\nconst = ;\n`);
    expect(await run('from-tamagui', dir)).toBe(1);
    expect(io.err).toContain('failed: c.ts');
  });
});

describe('usemotif-migrate import-tokens', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'usemotif-migrate-'));
    writeFileSync(
      join(dir, 'brand.tokens.json'),
      JSON.stringify({
        color: { $type: 'color', blue: { $value: '#00f' } },
        type: { h1: { $type: 'typography', $value: {} } },
      }),
    );
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('writes a theme module named after the file and reports what it skipped', async () => {
    const out = join(dir, 'theme.ts');
    expect(await run('import-tokens', join(dir, 'brand.tokens.json'), '--out', out)).toBe(0);
    expect(io.out).toBe(`wrote ${out} (1 scale).\n`);
    expect(io.err).toBe('type.h1: no motif scale for a typography token; skipped\n');
    const module = readFileSync(out, 'utf8');
    expect(module).toContain(`export const brandTheme = createTheme({\n  name: 'brand',`);
    expect(module).toContain(`blue: '#00f'`);
  });

  it('needs a file, and fails on one that is not JSON', async () => {
    expect(await run('import-tokens')).toBe(2);
    writeFileSync(join(dir, 'bad.json'), '{');
    expect(await run('import-tokens', join(dir, 'bad.json'))).toBe(1);
    expect(io.err).toContain('failed:');
  });
});
