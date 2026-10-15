import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Theme } from '@usemotif/core';
import { describe, expect, it, vi } from 'vitest';
import { main } from './cli.js';
import { exportTheme } from './export.js';

const theme: Theme = {
  name: 'brand',
  tokens: {
    colors: { violet: { 600: '#7c3aed' }, text: { default: '$colors.violet.600' } },
    space: { 1.5: 6, 4: 16 },
    fontWeights: { bold: 700 },
    easings: { in: 'ease-in' },
    shadows: { sm: '0 1px 2px 0 rgb(0 0 0 / 0.05), inset 0 0 1px red' },
  },
};

describe('exportTheme', () => {
  it('writes CSS custom properties', () => {
    expect(exportTheme(theme, 'css')).toContain('--colors-text-default: var(--colors-violet-600);');
  });

  it('writes JSON with every reference resolved', () => {
    expect(JSON.parse(exportTheme(theme, 'json'))).toEqual({
      colors: { violet: { 600: '#7c3aed' }, text: { default: '#7c3aed' } },
      space: { 1.5: '6px', 4: '16px' },
      fontWeights: { bold: 700 },
      easings: { in: 'ease-in' },
      shadows: { sm: '0 1px 2px 0 rgb(0 0 0 / 0.05), inset 0 0 1px red' },
    });
  });

  it('writes W3C Design Tokens, keeping references as aliases', () => {
    const w3c = JSON.parse(exportTheme(theme, 'w3c'));
    expect(w3c.colors.text.default).toEqual({ $value: '{colors.violet.600}', $type: 'color' });
    expect(w3c.space['4']).toEqual({ $value: '16px', $type: 'dimension' });
    expect(w3c.fontWeights.bold).toEqual({ $value: 700, $type: 'fontWeight' });
    expect(w3c.easings.in).toEqual({ $value: [0.42, 0, 1, 1], $type: 'cubicBezier' });
    expect(w3c.shadows.sm).toEqual({
      $type: 'shadow',
      $value: [
        { color: 'rgb(0 0 0 / 0.05)', offsetX: '0px', offsetY: '1px', blur: '2px', spread: '0px' },
        { color: 'red', offsetX: '0px', offsetY: '0px', blur: '1px', spread: '0px', inset: true },
      ],
    });
    // W3C names may not contain `.`.
    expect(w3c.space['1_5']).toEqual({ $value: '6px', $type: 'dimension' });
  });

  it('writes Swift constants, escaping keywords and keeping decimal keys apart', () => {
    const swift = exportTheme(theme, 'swift');
    expect(swift).toContain('public enum BrandTokens {');
    expect(swift).toContain(
      'public static let textDefault = Color(red: 0.4863, green: 0.2275, blue: 0.9294, opacity: 1)',
    );
    expect(swift).toContain('public static let _1_5: CGFloat = 6');
    expect(swift).toContain('public static let `in` = "ease-in"');
  });

  it('writes Kotlin constants with Compose colours and units', () => {
    const kotlin = exportTheme(theme, 'kotlin', { name: 'Brand' });
    expect(kotlin).toContain('object Brand {');
    expect(kotlin).toContain('val TextDefault = Color(0xFF7C3AED)');
    expect(kotlin).toContain('val _4 = 16.dp');
    expect(kotlin).toContain('const val Bold = 700f');
  });
});

describe('usemotif-tokens', () => {
  it('exports a preset or a JSON theme file, to a file or stdout', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'motif-tokens-'));
    const input = join(dir, 'theme.json');
    const out = join(dir, 'Brand.kt');
    writeFileSync(input, JSON.stringify(theme));
    expect(await main(['export', input, '--format', 'kotlin', '--out', out])).toBe(0);
    expect(readFileSync(out, 'utf8')).toContain('object BrandTokens {');

    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    expect(await main(['export', 'dark', '--format', 'css'])).toBe(0);
    expect(String(write.mock.calls[0]![0])).toContain('[data-theme="dark"]');
    write.mockRestore();
  });

  it('prints usage for a bad format and an error for a missing theme', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await main(['export', 'light', '--format', 'xml'])).toBe(1);
    expect(error.mock.calls[0]![0]).toContain('usemotif-tokens export <theme>');
    expect(await main(['export', 'missing.json', '--format', 'css'])).toBe(1);
    expect(String(error.mock.calls[1]![0])).toContain('usemotif-tokens:');
    error.mockRestore();
  });
});
