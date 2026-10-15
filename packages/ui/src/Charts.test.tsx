import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AreaChart, BarChart, LineChart, Sparkline } from './Charts.js';

const MONTHS = [
  { label: 'Jan', value: 12 },
  { label: 'Feb', value: -4 },
  { label: 'Mar', value: 18 },
];

describe('charts (web)', () => {
  it('draws a sparkline as one image whose label carries the values', () => {
    const html = renderToStaticMarkup(<Sparkline label="Signups" data={[4, 6, 5, 9]} area />);
    expect(html).toContain('role="img" aria-label="Signups: 4, 6, 5, 9"');
    expect(html.match(/<path /g)).toHaveLength(2);
    expect(html).toContain(
      'stroke="var(--components-chart-color, var(--colors-action-primary-bg, currentColor))"',
    );
  });

  it('draws one bar per value, from zero, over a grid', () => {
    const html = renderToStaticMarkup(
      <BarChart
        label="Profit"
        data={MONTHS}
        color="$colors.brand.9"
        formatValue={(n) => `$${n}`}
      />,
    );
    expect(html).toContain('aria-label="Profit: Jan $12, Feb $-4, Mar $18"');
    const rects = [
      ...html.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="[\d.]+" height="([\d.]+)"/g),
    ];
    expect(rects).toHaveLength(3);
    const zero = Number(rects[0]![2]) + Number(rects[0]![3]);
    expect(Number(rects[1]![2])).toBeCloseTo(zero);
    expect(html).toContain('fill="var(--colors-brand-9, currentColor)"');
    expect(html.match(/<line /g)).toHaveLength(5);
  });

  it('fills an area chart and leaves a line chart open', () => {
    const area = renderToStaticMarkup(<AreaChart label="A" data={MONTHS} />);
    const line = renderToStaticMarkup(<LineChart label="L" data={MONTHS} color="#ff0000" />);
    expect(area).toMatch(/<path d="M[^"]+Z" fill="var\(/);
    expect(line).not.toContain('Z"');
    expect(line).toContain('stroke="#ff0000"');
  });
});
