import { describe, expect, it } from 'vitest';
import { matchesAccept, sortFiles, type FileFacts } from './_file-rules.js';

const file = (name: string, type: string, size?: number): FileFacts => ({ name, type, size });
const same = (f: FileFacts): FileFacts => f;

describe('matchesAccept', () => {
  it('reads MIME types, wildcards and extensions', () => {
    const png = file('a.PNG', 'image/png');
    expect(matchesAccept(png, 'image/png')).toBe(true);
    expect(matchesAccept(png, 'image/*')).toBe(true);
    expect(matchesAccept(png, '.png, .jpg')).toBe(true);
    expect(matchesAccept(png, 'application/pdf')).toBe(false);
    expect(matchesAccept(png, ' , ')).toBe(true);
  });
});

describe('sortFiles', () => {
  it('reports every broken rule for each refused file', () => {
    const big = file('big.exe', 'application/x-msdownload', 900);
    const { accepted, rejected } = sortFiles([big], same, { accept: 'image/*', maxSize: 100 });
    expect(accepted).toEqual([]);
    expect(rejected).toEqual([{ file: big, reasons: ['type', 'size'] }]);
  });

  it("counts only files that pass, so a bad one never takes a good one's place", () => {
    const files = [
      file('x.pdf', 'application/pdf', 10),
      file('a.png', 'image/png', 10),
      file('b.png', 'image/png', 10),
      file('c.png', 'image/png', 10),
    ];
    const { accepted, rejected } = sortFiles(files, same, { accept: 'image/*', maxFiles: 2 });
    expect(accepted.map((f) => f.name)).toEqual(['a.png', 'b.png']);
    expect(rejected.map((r) => [r.file.name, r.reasons])).toEqual([
      ['x.pdf', ['type']],
      ['c.png', ['count']],
    ]);
  });

  it('passes a file of unknown size, and keeps everything with no rules', () => {
    const files = [file('a', 'text/plain'), file('b', 'text/plain', 5)];
    expect(sortFiles(files, same, { maxSize: 1 }).accepted.map((f) => f.name)).toEqual(['a']);
    expect(sortFiles(files, same, {}).accepted).toHaveLength(2);
  });
});
