/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileUpload } from './specialized.js';

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
  act(() => root.render(node));
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

function fireDrag(el: Element, type: 'dragenter' | 'dragleave'): void {
  // jsdom lacks a DragEvent constructor; a bubbling Event of the right
  // type still triggers React's delegated drag handlers.
  act(() => {
    el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  });
}

describe('FileUpload - drag highlight', () => {
  function renderZone(): { zone: HTMLElement; child: HTMLElement } {
    render(
      <FileUpload>
        {({ isDragging }) => (
          <div data-testid="zone" data-dragging={String(isDragging)}>
            <span data-testid="child">drop here</span>
          </div>
        )}
      </FileUpload>,
    );
    return {
      zone: container.querySelector('[data-testid="zone"]') as HTMLElement,
      child: container.querySelector('[data-testid="child"]') as HTMLElement,
    };
  }
  const dragging = (): string =>
    container.querySelector('[data-testid="zone"]')!.getAttribute('data-dragging') ?? '';

  // Regression: onDragLeave unconditionally cleared the highlight, so it
  // flickered off every time the pointer crossed between child elements.
  it('stays highlighted while the pointer crosses child elements', () => {
    const { zone, child } = renderZone();
    fireDrag(zone, 'dragenter'); // enter the drop zone
    expect(dragging()).toBe('true');
    // Pointer moves onto a child: dragenter(child) + dragleave(zone) - net 0.
    fireDrag(child, 'dragenter');
    fireDrag(zone, 'dragleave');
    expect(dragging()).toBe('true'); // must NOT flicker off
    // Truly leaving the zone clears the highlight.
    fireDrag(child, 'dragleave');
    expect(dragging()).toBe('false');
  });
});

describe('FileUpload - limits and rejections', () => {
  const png = (name: string, bytes: number): File =>
    new File(['x'.repeat(bytes)], name, { type: 'image/png' });

  function drop(zone: Element, files: File[]): void {
    const ev = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'dataTransfer', { value: { files } });
    act(() => {
      zone.dispatchEvent(ev);
    });
  }

  function renderZone(props: Partial<React.ComponentProps<typeof FileUpload>>) {
    const onFiles = vi.fn();
    const onReject = vi.fn();
    render(
      <FileUpload {...props} onFiles={onFiles} onReject={onReject}>
        {() => <span>zone</span>}
      </FileUpload>,
    );
    return { zone: container.firstElementChild!, onFiles, onReject };
  }

  it('keeps passing files and reports each refused one with its reasons', () => {
    const { zone, onFiles, onReject } = renderZone({
      accept: 'image/*',
      maxSize: 10,
      multiple: true,
      maxFiles: 2,
    });
    const pdf = new File(['x'.repeat(50)], 'doc.pdf', { type: 'application/pdf' });
    const [a, b, c, big] = [png('a.png', 5), png('b.png', 5), png('c.png', 5), png('big.png', 50)];
    drop(zone, [pdf, a, big, b, c]);
    expect(onFiles).toHaveBeenCalledWith([a, b]);
    expect(onReject).toHaveBeenCalledWith([
      { file: pdf, reasons: ['type', 'size'] },
      { file: big, reasons: ['size'] },
      { file: c, reasons: ['count'] },
    ]);
  });

  it('takes one file without multiple, and reports the rest as count', () => {
    const { zone, onFiles, onReject } = renderZone({});
    const [a, b] = [png('a.png', 1), png('b.png', 1)];
    drop(zone, [a, b]);
    expect(onFiles).toHaveBeenCalledWith([a]);
    expect(onReject).toHaveBeenCalledWith([{ file: b, reasons: ['count'] }]);
  });

  it('applies the same rules to a pick', () => {
    const { onFiles, onReject } = renderZone({ maxSize: 2 });
    const input = container.querySelector('input[type="file"]')!;
    const big = png('big.png', 9);
    Object.defineProperty(input, 'files', { value: [big], configurable: true });
    act(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onFiles).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenCalledWith([{ file: big, reasons: ['size'] }]);
  });
});
