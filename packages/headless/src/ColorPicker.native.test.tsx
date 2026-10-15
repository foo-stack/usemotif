/** @vitest-environment jsdom */
/**
 * Native ColorPicker tests run against the `react-native` mock from
 * `@usemotif/react-native` (aliased in `vitest.config.ts`). The mock
 * renders View / Pressable / Text as DOM hosts so jsdom can query
 * them; PanResponder is a no-op in the mock so the drag pipeline
 * isn't exercised here - the gesture path is documented and trivially
 * reviewable.
 *
 * `react-native-svg` isn't installed in the headless package's
 * devDependencies, so the picker runs through the gradient-less
 * fallback path. That's the same path bare-RN apps without
 * `react-native-svg` would see in production, so the conformance
 * boundary is identical.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  ColorPicker,
  NATIVE_COLOR_PICKER_HAS_SVG,
  parseColor,
  formatColor,
} from './specialized.native.js';

let container: HTMLElement;
let root: Root;

function render(node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function clickHost(host: Element): void {
  act(() => {
    (host as HTMLElement).click();
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.removeChild(container);
});

describe('Native ColorPicker - render shape', () => {
  it('runs through the gradient-less fallback path in tests', () => {
    // Sanity check - without `react-native-svg` installed, the picker
    // skips the gradient layers but still renders.
    expect(NATIVE_COLOR_PICKER_HAS_SVG).toBe(false);
  });

  it('renders the SV plane, hue slider, and format toggle by default', () => {
    render(<ColorPicker defaultValue="#3b82f6" />);
    const adjustables = container.querySelectorAll('[accessibilityRole="adjustable"]');
    // Root + SV plane + hue slider = 3 (no alpha by default).
    expect(adjustables.length).toBe(3);
    const radiogroup = container.querySelector('[accessibilityRole="radiogroup"]');
    expect(radiogroup).not.toBeNull();
  });

  it('renders the alpha slider when allowAlpha + non-hex format', () => {
    render(<ColorPicker defaultValue="rgba(59, 130, 246, 0.5)" format="rgb" allowAlpha />);
    const adjustables = container.querySelectorAll('[accessibilityRole="adjustable"]');
    // Root + SV plane + hue slider + alpha slider = 4.
    expect(adjustables.length).toBe(4);
  });

  it('hides the alpha slider when format is hex (no alpha channel)', () => {
    render(<ColorPicker defaultValue="#3b82f6" format="hex" allowAlpha />);
    const adjustables = container.querySelectorAll('[accessibilityRole="adjustable"]');
    expect(adjustables.length).toBe(3);
  });

  it('renders the requested format options as radio buttons', () => {
    render(<ColorPicker defaultValue="#3b82f6" formats={['hex', 'rgb']} />);
    const radios = container.querySelectorAll('[accessibilityRole="radio"]');
    expect(radios.length).toBe(2);
  });

  it('hides the format toggle when formats=[]', () => {
    render(<ColorPicker defaultValue="#3b82f6" formats={[]} />);
    const radiogroup = container.querySelector('[accessibilityRole="radiogroup"]');
    expect(radiogroup).toBeNull();
  });
});

describe('Native ColorPicker - format toggle', () => {
  it('changes format and re-emits in the new format (uncontrolled)', () => {
    const onValueChange = vi.fn();
    render(<ColorPicker defaultValue="#3b82f6" onValueChange={onValueChange} />);
    const radios = container.querySelectorAll('[accessibilityRole="radio"]');
    // Find the rgb radio and click it. The Pressable wraps a Text
    // node whose textContent is the format label.
    const rgbRadio = Array.from(radios).find((el) => el.textContent === 'rgb');
    expect(rgbRadio).not.toBeUndefined();
    clickHost(rgbRadio!);
    // Latest emit is the same colour in `rgb(...)` form.
    const last = onValueChange.mock.calls.at(-1)?.[0];
    expect(typeof last).toBe('string');
    expect((last as string).startsWith('rgb(')).toBe(true);
  });

  it('respects controlled `format` (does not flip on press)', () => {
    const onFormatChange = vi.fn();
    render(<ColorPicker defaultValue="#3b82f6" format="hex" onFormatChange={onFormatChange} />);
    const radios = container.querySelectorAll('[accessibilityRole="radio"]');
    const rgbRadio = Array.from(radios).find((el) => el.textContent === 'rgb');
    clickHost(rgbRadio!);
    expect(onFormatChange).toHaveBeenCalledWith('rgb');
    // Even after the press, the rendered format toggle still has hex
    // marked selected. The mock serialises the resolved style into
    // `data-motif-style`; selected radios get the `#dbeafe` highlight.
    const hexRadio = Array.from(radios).find((el) => el.textContent === 'hex');
    expect(hexRadio?.getAttribute('data-motif-style') ?? '').toContain('#dbeafe');
  });
});

describe('Native ColorPicker - disabled', () => {
  it('marks the format radios as disabled', () => {
    render(<ColorPicker defaultValue="#3b82f6" disabled />);
    const radios = container.querySelectorAll('[accessibilityRole="radio"]');
    expect(radios.length).toBeGreaterThan(0);
    for (const r of radios) {
      // The mock's Pressable forwards the `disabled` prop directly to
      // the underlying `<button>`, so jsdom exposes it as an HTML
      // attribute. (`accessibilityState` is an object that the mock
      // doesn't serialise - querying via the HTML `disabled`
      // attribute is the cleaner check.)
      expect((r as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('does not call onValueChange when a format radio is pressed while disabled', () => {
    const onValueChange = vi.fn();
    render(<ColorPicker defaultValue="#3b82f6" disabled onValueChange={onValueChange} />);
    const radios = container.querySelectorAll('[accessibilityRole="radio"]');
    const rgbRadio = Array.from(radios).find((el) => el.textContent === 'rgb');
    clickHost(rgbRadio!);
    // Pressable's `disabled` swallows the press; nothing should emit.
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('Native ColorPicker - controlled value', () => {
  it('re-parses an externally-changed value', () => {
    const Wrapper = ({ value }: { value: string }) => (
      <ColorPicker value={value} onValueChange={() => {}} />
    );
    render(<Wrapper value="#3b82f6" />);
    render(<Wrapper value="#ef4444" />);
    // The picker accepts the new value without throwing; the hex
    // format radio still highlights as the selected one.
    const radios = container.querySelectorAll('[accessibilityRole="radio"]');
    const hexRadio = Array.from(radios).find((el) => el.textContent === 'hex');
    expect(hexRadio?.getAttribute('data-motif-style') ?? '').toContain('#dbeafe');
  });
});

describe('parseColor / formatColor - exported from native module', () => {
  it('round-trips a hex colour through HSV', () => {
    const roundTripped = formatColor(parseColor('#3b82f6'), 'hex');
    expect(roundTripped).toBe('#3b82f6');
  });

  it('rgb format includes alpha when < 1', () => {
    const out = formatColor(parseColor('rgba(59, 130, 246, 0.5)'), 'rgb');
    expect(out.startsWith('rgba(')).toBe(true);
  });
});

describe('native ColorPicker swatches', () => {
  it('checks the matching swatch and commits the one pressed', () => {
    const onValueChange = vi.fn();
    render(
      <ColorPicker
        defaultValue="#22c55e"
        swatches={['#ef4444', '#22c55e']}
        onValueChange={onValueChange}
      />,
    );
    // The format toggle is a radio group too; find the swatches by their colours.
    const radios = ['#ef4444', '#22c55e'].map(
      (c) => container.querySelector(`[accessibilityRole="radio"][accessibilityLabel="${c}"]`)!,
    );
    const checked = radios.map((el) => {
      const key = Object.keys(el).find((k) => k.startsWith('__reactProps'))!;
      return (el as unknown as Record<string, { accessibilityState: { checked: boolean } }>)[key]!
        .accessibilityState.checked;
    });
    expect(checked).toEqual([false, true]);
    act(() => (radios[0] as HTMLElement).click());
    expect(onValueChange).toHaveBeenLastCalledWith('#ef4444');
  });
});
