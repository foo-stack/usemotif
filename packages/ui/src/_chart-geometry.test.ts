import { describe, expect, it } from 'vitest';
import { areaPath, bars, describeSeries, linePath, plot, valueScale } from './_chart-geometry.js';

describe('chart geometry', () => {
  it('scales the range onto the box, larger values higher', () => {
    const s = valueScale([10, 20, 30], 100, 10, false);
    expect([s.y(10), s.y(20), s.y(30)]).toEqual([90, 50, 10]);
    expect(valueScale([10, 30], 100, 10, true).y(0)).toBe(90);
  });

  it('centres a flat series and a single point', () => {
    const s = valueScale([5, 5], 40, 4, false);
    expect(plot([5, 5], 100, s, 4)).toEqual([
      { x: 4, y: 20 },
      { x: 96, y: 20 },
    ]);
    expect(plot([5], 100, s, 4)).toEqual([{ x: 50, y: 20 }]);
  });

  it('draws a line and closes an area to the baseline', () => {
    const points = [
      { x: 0, y: 10 },
      { x: 50, y: 0.333 },
    ];
    expect(linePath(points)).toBe('M0 10 L50 0.33');
    expect(areaPath(points, 40)).toBe('M0 10 L50 0.33 L50 40 L0 40 Z');
    expect(areaPath([], 40)).toBe('');
  });

  it('grows bars from zero, downward for a negative value', () => {
    const s = valueScale([10, -10], 100, 0, true);
    expect(bars([10, -10], 100, s, 0, 10)).toEqual([
      { x: 5, y: 0, width: 40, height: 50 },
      { x: 55, y: 50, width: 40, height: 50 },
    ]);
  });

  it('describes small series in full and long ones by range and ends', () => {
    const fmt = (n: number): string => String(n);
    expect(
      describeSeries(
        [
          { label: 'Jan', value: 3 },
          { label: 'Feb', value: 5 },
        ],
        fmt,
      ),
    ).toBe('Jan 3, Feb 5');
    const long = Array.from({ length: 20 }, (_, i) => ({ label: `d${i + 1}`, value: i % 7 }));
    expect(describeSeries(long, fmt)).toBe(
      '20 values from 0 to 6, starting at d1 0 and ending at d20 5',
    );
    expect(describeSeries([], fmt)).toBe('No data');
    expect(
      describeSeries(
        [
          { label: '', value: 4 },
          { label: '', value: 6 },
        ],
        fmt,
      ),
    ).toBe('4, 6');
  });
});
