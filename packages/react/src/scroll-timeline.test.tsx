/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, useRef, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Box } from './Box.js';
import { useScroll } from './use-scroll.js';
import { useTransform } from './use-motion-value.js';
import { _resetScrollTimelineSupportForTesting } from './_scroll-timeline.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function stubSupport(value: boolean): void {
  vi.stubGlobal('CSS', { supports: (q: string) => value && q === 'animation-timeline: scroll()' });
  _resetScrollTimelineSupportForTesting();
}

const box = (): HTMLElement => container.querySelector<HTMLElement>('[data-testid="b"]')!;
const keyframes = (): string =>
  [...document.querySelectorAll('style[data-motif-timelines]')]
    .flatMap((s) => [...(s as HTMLStyleElement).sheet!.cssRules].map((r) => r.cssText))
    .join('\n');

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  _resetScrollTimelineSupportForTesting();
});

function PageFade(): ReactNode {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0.2, 0.5], [0, 1]);
  return <Box data-testid="b" opacity={opacity} />;
}

describe('scroll-driven animation', () => {
  it('puts a page-scroll transform on a CSS scroll timeline', () => {
    stubSupport(true);
    render(<PageFade />);
    const style = box().style;
    expect(style.animationName).toMatch(/^motif-scroll-\w+$/);
    expect(style.getPropertyValue('animation-timeline')).toBe('scroll(root block)');
    expect(style.animationFillMode).toBe('both');
    expect(style.opacity).toBe('');
    const rule = keyframes();
    expect(rule).toContain(style.animationName);
    expect(rule).toMatch(/0% \{ ?opacity: 0;? ?\}/);
    expect(rule).toMatch(/20% \{ ?opacity: 0;? ?\}/);
    expect(rule).toMatch(/50% \{ ?opacity: 1;? ?\}/);
    expect(rule).toMatch(/100% \{ ?opacity: 1;? ?\}/);
  });

  it('keeps the JS path where the browser lacks scroll timelines', () => {
    stubSupport(false);
    render(<PageFade />);
    expect(box().style.animationName).toBe('');
    expect(box().style.opacity).toBe('0');
  });

  it('keeps the JS path for outputs CSS would interpolate differently', () => {
    stubSupport(true);
    function Grow(): ReactNode {
      const { scrollYProgress } = useScroll();
      // Mixed units step in the JS path; CSS would interpolate them.
      const width = useTransform(scrollYProgress, [0, 1], ['10px', '50%']);
      return <Box data-testid="b" width={width} />;
    }
    render(<Grow />);
    expect(box().style.animationName).toBe('');
  });

  it('names a view timeline on the target for its default offset', () => {
    stubSupport(true);
    function Reveal(): ReactNode {
      const ref = useRef<HTMLElement | null>(null);
      const { scrollYProgress } = useScroll({ target: ref });
      return (
        <Box ref={ref} data-testid="t">
          <Box data-testid="b" scaleX={scrollYProgress} />
        </Box>
      );
    }
    vi.useFakeTimers();
    render(<Reveal />);
    act(() => vi.advanceTimersToNextFrame());
    vi.useRealTimers();
    const target = container.querySelector<HTMLElement>('[data-testid="t"]')!;
    const name = target.style.getPropertyValue('view-timeline').split(' ')[0]!;
    expect(name).toMatch(/^--motif-tl-\d+$/);
    expect(box().style.getPropertyValue('animation-timeline')).toBe(name);
    expect(box().style.getPropertyValue('animation-range')).toBe('cover 0% cover 100%');
    expect(document.documentElement.style.getPropertyValue('timeline-scope')).toContain(name);
  });

  it('keeps the JS path for a target offset CSS cannot express', () => {
    stubSupport(true);
    function Partial(): ReactNode {
      const ref = useRef<HTMLElement | null>(null);
      const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start start'] });
      return <Box ref={ref} data-testid="b" opacity={scrollYProgress} />;
    }
    render(<Partial />);
    expect(box().style.animationName).toBe('');
  });

  it('keeps two transform axes on the JS path, since they share transform', () => {
    stubSupport(true);
    function Both(): ReactNode {
      const { scrollYProgress } = useScroll();
      return <Box data-testid="b" scaleX={scrollYProgress} rotate={scrollYProgress} />;
    }
    render(<Both />);
    expect(box().style.animationName).toBe('');
  });
});
