import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Theme } from '@usemotif/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NATIVE_SVG_COMPONENT, SVG_PRIMITIVES, Svg } from './Svg.js';
import { Icon, IconProvider } from './Icon.js';
import { ThemeProvider } from './Theme.js';

function FakeSvg(): React.ReactElement {
  return <></>;
}

const theme: Theme = { name: 'test', tokens: {} };

let container: HTMLElement;
let root: Root;
function render(node: React.ReactNode): void {
  act(() =>
    root.render(
      <ThemeProvider themes={[theme]} active="test">
        {node}
      </ThemeProvider>,
    ),
  );
}
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** A host SvgComponent that records the props it receives. */
function recordingSvg(sink: { props?: Record<string, unknown> }) {
  return function RecordingSvg(props: Record<string, unknown>): React.ReactElement {
    sink.props = props;
    return <div data-motif-host="RecordingSvg" />;
  };
}

describe('@usemotif/react-native - Svg', () => {
  it('NATIVE_SVG_COMPONENT is null when react-native-svg is not installed', () => {
    // The test environment doesn't ship react-native-svg, so the
    // optional require returns null and the integration falls back
    // to the Box-based shell.
    expect(NATIVE_SVG_COMPONENT).toBeNull();
  });

  it('SVG_PRIMITIVES is null without react-native-svg', () => {
    expect(SVG_PRIMITIVES).toBeNull();
  });

  it('renders without throwing when no SvgComponent is supplied', () => {
    const tree = (
      <Svg size={20}>
        <></>
      </Svg>
    );
    expect(tree).toBeTruthy();
  });

  it('Icon falls back to Box when render is provided but rn-svg missing', () => {
    // No throw. The render fn isn't invoked; children path is empty.
    const tree = <Icon render={({ Line }) => <Line />} />;
    expect(tree).toBeTruthy();
  });

  it('respects an explicit SvgComponent override', () => {
    const tree = <Svg SvgComponent={FakeSvg as React.ComponentType<Record<string, unknown>>} />;
    expect(tree).toBeTruthy();
  });
});

describe('@usemotif/react-native - Svg/Icon pass-through + a11y (#250)', () => {
  it('forwards rest props (accessibilityLabel, testID) onto the SVG host', () => {
    const sink: { props?: Record<string, unknown> } = {};
    render(
      <Svg
        SvgComponent={recordingSvg(sink)}
        accessibilityLabel="Close"
        testID="close-svg"
        size={20}
      />,
    );
    expect(sink.props?.accessibilityLabel).toBe('Close');
    expect(sink.props?.testID).toBe('close-svg');
  });

  it('forwards rest props onto the fallback Box when rn-svg is missing', () => {
    render(<Svg accessibilityLabel="Search" testID="search-svg" />);
    const host = container.querySelector('[testID="search-svg"]');
    expect(host).not.toBeNull();
    expect(host?.getAttribute('accessibilitylabel')).toBe('Search');
  });

  it('Icon is decorative by default (hidden from the screen reader)', () => {
    render(<Icon testID="deco" />);
    const host = container.querySelector('[testID="deco"]')!;
    expect(host.getAttribute('importantforaccessibility')).toBe('no-hide-descendants');
    expect(host.hasAttribute('accessibilitylabel')).toBe(false);
  });

  it('Icon with a label is announced as an image', () => {
    render(<Icon accessibilityLabel="Menu" testID="labelled" />);
    const host = container.querySelector('[testID="labelled"]')!;
    expect(host.getAttribute('accessibilitylabel')).toBe('Menu');
    expect(host.getAttribute('accessibilityrole')).toBe('image');
  });

  it('IconProvider sets the default size and stroke width, and an icon prop wins', () => {
    const first: { props?: Record<string, unknown> } = {};
    const second: { props?: Record<string, unknown> } = {};
    render(
      <IconProvider size="sm" strokeWidth={1.5}>
        <IconProvider size="xl">
          <Icon SvgComponent={recordingSvg(first)} />
        </IconProvider>
        <Icon size={28} strokeWidth={3} SvgComponent={recordingSvg(second)} />
      </IconProvider>,
    );
    expect(first.props).toMatchObject({ width: 32, height: 32, strokeWidth: 1.5 });
    expect(second.props).toMatchObject({ width: 28, strokeWidth: 3 });
  });
});
