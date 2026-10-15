import { useCallback, useEffect, useState, type CSSProperties, type ReactElement } from 'react';
import { inspectElement, type ElementReport } from './_devtools-inspect.js';

export interface MotifDevtoolsProps {
  /** Corner the panel sits in. Default `'bottom-right'`. */
  position?: 'bottom-right' | 'bottom-left';
}

const Z = 2147483647;
const FONT = '12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace';

/**
 * A dev-only inspector. Turn it on with its button or Alt+Shift+M, then hover to outline elements
 * and click one to see its theme chain, the active breakpoint, the tokens its styles read with
 * their current values, and whether each of its motif classes came from the runtime or the
 * compiler. Escape stops inspecting. Renders nothing in a production build.
 *
 * @example
 * ```tsx
 * import { MotifDevtools } from '@usemotif/react/devtools';
 *
 * <ThemeProvider themes={themes} active="light">
 *   <App />
 *   <MotifDevtools />
 * </ThemeProvider>
 * ```
 */
export function MotifDevtools(props: MotifDevtoolsProps): ReactElement | null {
  if (process.env.NODE_ENV === 'production') return null;
  return <Devtools {...props} />;
}

function Devtools({ position = 'bottom-right' }: MotifDevtoolsProps): ReactElement {
  const [inspecting, setInspecting] = useState(false);
  const [hovered, setHovered] = useState<DOMRect | null>(null);
  const [report, setReport] = useState<ElementReport | null>(null);
  const toggle = useCallback(() => setInspecting((on) => !on), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.altKey && event.shiftKey && event.code === 'KeyM') toggle();
      else if (event.key === 'Escape') setInspecting(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  useEffect(() => {
    if (!inspecting) {
      setHovered(null);
      return undefined;
    }
    const own = (target: EventTarget | null): boolean =>
      target instanceof Element && target.closest('[data-motif-devtools]') !== null;
    const onMove = (event: MouseEvent): void => {
      setHovered(
        own(event.target) || !(event.target instanceof Element)
          ? null
          : event.target.getBoundingClientRect(),
      );
    };
    // Capture, so the page's own click handlers don't run while inspecting.
    const onClick = (event: MouseEvent): void => {
      if (own(event.target) || !(event.target instanceof HTMLElement)) return;
      event.preventDefault();
      event.stopPropagation();
      setReport(inspectElement(event.target));
      setInspecting(false);
    };
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('click', onClick, true);
    };
  }, [inspecting]);

  const corner: CSSProperties = position === 'bottom-left' ? { left: 12 } : { right: 12 };
  return (
    <div
      data-motif-devtools=""
      style={{ position: 'fixed', bottom: 12, zIndex: Z, font: FONT, ...corner }}
    >
      {hovered !== null ? (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: hovered.top,
            left: hovered.left,
            width: hovered.width,
            height: hovered.height,
            outline: '2px solid #e8590c',
            background: 'rgba(232, 89, 12, 0.08)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      {report !== null ? <Panel report={report} onClose={() => setReport(null)} /> : null}
      <button
        type="button"
        aria-pressed={inspecting}
        onClick={toggle}
        style={{
          font: FONT,
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid #44403c',
          background: inspecting ? '#e8590c' : '#1c1917',
          color: '#fafaf9',
          cursor: 'pointer',
        }}
      >
        {inspecting ? 'Click an element (Esc)' : 'motif'}
      </button>
    </div>
  );
}

function Panel({ report, onClose }: { report: ElementReport; onClose: () => void }): ReactElement {
  const row: CSSProperties = { margin: '2px 0' };
  return (
    <div
      role="dialog"
      aria-label="motif inspector"
      style={{
        marginBottom: 8,
        width: 360,
        maxHeight: 420,
        overflow: 'auto',
        padding: 12,
        borderRadius: 8,
        background: '#1c1917',
        color: '#fafaf9',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>{report.element}</strong>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{ font: FONT, background: 'none', border: 0, color: 'inherit', cursor: 'pointer' }}
        >
          x
        </button>
      </div>
      <p style={row}>
        Themes: {report.themeChain.length > 0 ? report.themeChain.join(' > ') : 'none'}
      </p>
      <p style={row}>Breakpoint: {report.breakpoint}</p>
      <p style={{ ...row, marginTop: 8 }}>Tokens</p>
      {report.tokens.length === 0 ? <p style={row}>none</p> : null}
      {report.tokens.map((t) => (
        <p key={t.variable} style={row}>
          {t.path} = {t.value === '' ? '(unset)' : t.value}
        </p>
      ))}
      <p style={{ ...row, marginTop: 8 }}>Classes</p>
      {report.classes.length === 0 ? (
        <p style={row}>no motif classes (inline styles only)</p>
      ) : null}
      {report.classes.map((c) => (
        <p key={c.name} style={row}>
          .{c.name}: {c.source === 'runtime' ? 'runtime' : 'extracted by the compiler'}
        </p>
      ))}
    </div>
  );
}
