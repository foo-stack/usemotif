'use client';

import type { MotifComponent } from '@usemotif/core';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { BreakpointName } from '@usemotif/core';
import { Box, type BoxProps } from './Box.js';
import { isolateBackground } from './_inert-background.js';
import { lockScroll } from './_scroll-lock.js';
import { useBreakpointWidths, useThemeName } from './theme-context.js';
import { KeepMountedBoundary, keepsMounted, type KeepMounted } from './_keep-mounted.js';

// Token CSS vars are scoped to the `[data-theme]` element that
// ThemeProvider / Theme render; a portal mounts under `document.body`,
// outside that element, so `var(--colors-*)` inside portaled content
// would resolve to nothing. Re-stamp the active theme name (already
// resolved for nested `<Theme>` chains by useThemeName) on a wrapper.
// `display: contents` adds no layout box, but inherited custom
// properties still cascade through it to the portaled subtree.
const THEMED_PORTAL_STYLE: CSSProperties = { display: 'contents' };

/**
 * Portal - renders children into a different part of the DOM,
 * outside the parent's hierarchy. Used as the foundation for
 * overlays, modals, tooltips, etc.
 *
 * `to` defaults to `document.body`; pass any HTMLElement to render
 * elsewhere (useful for portal-into-shadow-DOM scenarios).
 *
 * Carries the active theme across the portal boundary: when a
 * `<ThemeProvider>` / `<Theme>` is in scope, the portaled subtree is
 * wrapped in a `data-theme` element so token vars resolve the same as
 * inline content. No-op (no wrapper) when no theme is in scope.
 *
 * SSR-safe - returns `null` until the document is available.
 */
export interface PortalProps {
  children?: ReactNode;
  to?: HTMLElement | null;
}
export function Portal({ children, to }: PortalProps): ReactElement | null {
  const themeName = useThemeName();
  if (typeof document === 'undefined') return null;
  const target = to ?? document.body;
  const content =
    themeName === undefined ? (
      children
    ) : (
      <div data-theme={themeName} style={THEMED_PORTAL_STYLE}>
        {children}
      </div>
    );
  return createPortal(content, target);
}

/**
 * Overlay - full-viewport scrim. Composes Portal + a fixed-position
 * Box so the overlay covers everything regardless of where the
 * caller renders.
 *
 * By default it also isolates what is behind it: background siblings
 * get `inert` and `aria-hidden`, and page scrolling is locked (touch
 * included). Both are opt-out via `isolateBackground` and `lockScroll`
 * for a non-modal surface.
 *
 * Focus management, tap-outside, and Escape remain the caller's
 * responsibility. Compose with FocusScope for the full modal contract.
 */
export interface OverlayProps extends Omit<BoxProps, 'position'> {
  /** Fired when the user clicks the scrim itself (not propagated
   * children). Useful for tap-outside-to-dismiss. */
  onScrimClick?: () => void;
  /** Background tint. Defaults to a translucent black. */
  scrim?: string;
  /**
   * Marks everything behind the overlay `inert` and `aria-hidden`, so the
   * background leaves the tab order and the accessibility tree. Defaults
   * to `true`. Set `false` for a non-modal surface that should leave the
   * page interactive.
   */
  isolateBackground?: boolean;
  /**
   * Freezes page scrolling behind the overlay, including touch scrolling
   * on iOS Safari. Scrollable content inside the overlay keeps working.
   * Defaults to `true`.
   */
  lockScroll?: boolean;
  children?: ReactNode;
}
export const Overlay: MotifComponent<OverlayProps, ReactElement | null> = function ({
  onScrimClick,
  scrim = 'rgba(0, 0, 0, 0.5)',
  isolateBackground: isolate = true,
  lockScroll: lock = true,
  children,
  style,
  onClick,
  ref,
  ...rest
}: OverlayProps): ReactElement {
  const nodeRef = useRef<HTMLElement | null>(null);

  // Compose rather than replace: `ref` is part of BoxProps, so a consumer
  // may already be holding one and overwriting it would break them.
  const setNode = useCallback(
    (node: HTMLElement | null) => {
      nodeRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref !== null && ref !== undefined) ref.current = node;
    },
    [ref],
  );

  useEffect(() => {
    const node = nodeRef.current;
    if (node === null) return;

    const releases: Array<() => void> = [];
    if (isolate) releases.push(isolateBackground(node));
    // The overlay's own subtree stays touch-scrollable while the page
    // behind it is frozen.
    if (lock) releases.push(lockScroll(node));

    return () => {
      // Release in reverse so the DOM unwinds in the order it was changed.
      for (const release of releases.reverse()) release();
    };
  }, [isolate, lock]);

  return (
    <Portal>
      <Box
        ref={setNode}
        style={
          {
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: scrim,
            ...style,
          } as CSSProperties
        }
        {...rest}
        // Compose the consumer's onClick with the scrim-dismiss test. The
        // built-in handler must run regardless of a consumer onClick -
        // declaring it before {...rest} let a consumer onClick clobber the
        // dismiss handler silently.
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented && e.target === e.currentTarget) onScrimClick?.();
        }}
      >
        {children}
      </Box>
    </Portal>
  );
};

/**
 * VisuallyHidden - visually hidden content that remains in the
 * accessibility tree. Use for sr-only labels, off-screen headings,
 * etc. Renders the standard "sr-only" pattern (1×1 clipped span).
 */
export interface VisuallyHiddenProps {
  as?: 'span' | 'div';
  children?: ReactNode;
}
const SR_ONLY_STYLE: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};
export function VisuallyHidden({ as = 'span', children }: VisuallyHiddenProps): ReactElement {
  const Tag = as;
  return <Tag style={SR_ONLY_STYLE}>{children}</Tag>;
}

/**
 * LiveRegion - `aria-live` container for announcing updates to
 * screen readers (e.g. toast messages, status changes). `politeness`
 * controls urgency: `'polite'` queues announcements, `'assertive'`
 * interrupts.
 */
export interface LiveRegionProps extends BoxProps {
  politeness?: 'polite' | 'assertive' | 'off';
  /** When true, the region is also visually hidden (sr-only). */
  visuallyHidden?: boolean;
  children?: ReactNode;
}
export const LiveRegion: MotifComponent<LiveRegionProps, ReactElement | null> = function ({
  politeness = 'polite',
  visuallyHidden = false,
  children,
  style,
  ...rest
}: LiveRegionProps): ReactElement {
  return (
    <Box
      style={
        {
          ...(visuallyHidden ? SR_ONLY_STYLE : {}),
          ...style,
        } as CSSProperties
      }
      {...({ 'aria-live': politeness, 'aria-atomic': 'true' } as Record<string, string>)}
      {...rest}
    >
      {children}
    </Box>
  );
};

/**
 * FocusScope - focus management for overlays. Four behaviours,
 * each independently togglable:
 *
 * - `autoFocus` (default true) - moves focus to the first focusable
 *   descendant on mount.
 * - `restoreFocus` (default true) - returns focus to the
 *   previously-active element on unmount.
 * - `trapFocus` (default true) - keeps Tab / Shift+Tab cycling
 *   inside the scope. From the last focusable, Tab wraps to the
 *   first; from the first, Shift+Tab wraps to the last.
 * - `captureFocus` (default tracks `trapFocus`) - when external
 *   code moves focus outside the scope (programmatic `.focus()`,
 *   click on a non-`inert` background element), focus is recaptured
 *   to the first focusable inside. Required for full WAI-ARIA modal
 *   compliance - without it, `someElementOutside.focus()` escapes the
 *   modal silently.
 *
 * Dialog / AlertDialog compose Portal + Overlay (which sets `inert`
 * and `aria-hidden` on background content, and locks page scroll) +
 * FocusScope to deliver the full modal contract: keyboard cycling
 * stays in, programmatic focus stays in, background click-targets are
 * non-interactive, and the page behind cannot scroll.
 *
 * `onEscape` fires when the user presses Escape inside the scope.
 * Wire it to the parent's dismiss handler - Dialog uses this to
 * implement escape-to-close without re-implementing the keydown
 * listener everywhere.
 */
export interface FocusScopeProps {
  autoFocus?: boolean;
  restoreFocus?: boolean;
  /** Trap Tab cycling inside the scope. Defaults to true. */
  trapFocus?: boolean;
  /** Recapture focus to the scope when external code moves it
   * outside (e.g. programmatic `.focus()`). Defaults to `trapFocus`
   * - modal-style traps capture programmatic focus too; non-modal
   * uses (focus-restore-only) leave it alone. Pass `false` to
   * explicitly disable even when trapping is on. */
  captureFocus?: boolean;
  /** Called on Escape keypress inside the scope. */
  onEscape?: () => void;
  children?: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

function focusableInside(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function FocusScope({
  autoFocus = true,
  restoreFocus = true,
  trapFocus = true,
  captureFocus,
  onEscape,
  children,
}: FocusScopeProps): ReactElement {
  // captureFocus defaults to trapFocus - modal-style traps want to
  // capture programmatic focus too; non-modal uses (focus-restore-
  // only) opt out by passing trapFocus={false}.
  const shouldCapture = captureFocus ?? trapFocus;
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const escapeRef = useRef<typeof onEscape>(onEscape);
  escapeRef.current = onEscape;

  const restoreFocusRef = useRef(restoreFocus);
  restoreFocusRef.current = restoreFocus;

  // Capture the pre-open focus owner once on mount and restore it once on
  // unmount. Deliberately separate from the trap/capture wiring below
  // (which re-runs whenever autoFocus/trapFocus/shouldCapture change): if
  // restore lived in that effect, toggling any of those props while the
  // scope is still open would run the cleanup and yank focus back to the
  // pre-open element, out of the live scope. Restore is an unmount concern.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (restoreFocusRef.current) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    }
    return () => {
      if (restoreFocusRef.current) previousFocusRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = containerRef.current;
    if (root === null) return;

    if (autoFocus) {
      // If there's nothing focusable inside the scope, pin focus to
      // the container itself (it carries `tabIndex={-1}`) so keyboard
      // events - Escape, Tab - still land on the keydown listener
      // below. Without this fallback, an empty scope leaves focus on
      // the previously-active element and Escape never reaches us.
      const first = focusableInside(root)[0];
      (first ?? root).focus();
    }

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && escapeRef.current !== undefined) {
        escapeRef.current();
        return;
      }
      if (!trapFocus || e.key !== 'Tab') return;
      const focusables = focusableInside(root!);
      if (focusables.length === 0) {
        // No focusable inside - at least keep focus from leaving the
        // scope by pinning it to the container itself.
        e.preventDefault();
        root!.focus();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    root.addEventListener('keydown', handleKeyDown);

    // Programmatic-focus capture: a document-level focusin listener
    // catches any focus event whose target lies outside the scope and
    // bounces focus back to the first focusable inside. Listener runs
    // in the bubble phase (capture: false) to give descendants in the
    // scope a chance to handle their own focus first; only escapes
    // hit our redirect.
    let onFocusIn: ((e: FocusEvent) => void) | undefined;
    if (shouldCapture) {
      onFocusIn = (e: FocusEvent): void => {
        const target = e.target;
        if (target === null) return;
        if (!(target instanceof Node)) return;
        if (root!.contains(target)) return;
        // Focus left the scope - pull it back. Prefer the first
        // focusable descendant; fall back to the container itself
        // (which carries tabIndex={-1}) so Escape still works.
        const first = focusableInside(root!)[0] ?? root!;
        first.focus();
      };
      document.addEventListener('focusin', onFocusIn);
    }

    return () => {
      root.removeEventListener('keydown', handleKeyDown);
      if (onFocusIn !== undefined) {
        document.removeEventListener('focusin', onFocusIn);
      }
    };
  }, [autoFocus, trapFocus, shouldCapture]);

  return (
    <div ref={containerRef} tabIndex={-1} style={{ outline: 'none' }}>
      {children}
    </div>
  );
}

/**
 * Show / Hide - declarative responsive visibility. `<Show above="md">`
 * only renders children when the viewport is `md+`; `<Hide above="md">`
 * is the inverse. Web uses CSS media queries (the children always
 * render but their containing wrapper toggles `display`); native
 * uses the viewport hook to drop the children entirely.
 *
 * Web v0: emits inline media queries via a generated class. The
 * children are always part of the React tree; only their visibility
 * is controlled.
 */
export interface ShowHideProps {
  /** Lower bound - a breakpoint name (resolved against the app's configured
   * widths) or an explicit pixel width. */
  above?: BreakpointName | number;
  /** Upper bound - a breakpoint name or an explicit pixel width. */
  below?: BreakpointName | number;
  /**
   * `'activity'` keeps the children mounted while they are not shown, hidden through React's
   * `<Activity>`, so their state survives a resize across the breakpoint. Needs React 19.2.
   */
  keepMounted?: KeepMounted;
  children?: ReactNode;
}

// Width assumed by the server and by the first client render, before the
// real viewport can be measured. Keeping server + first-hydration render
// identical avoids a hydration mismatch; the effect below corrects it.
const SSR_DEFAULT_WIDTH = 1024;

export function Show({ above, below, keepMounted, children }: ShowHideProps): ReactElement | null {
  return showWhen(useViewportMatch(above, below), keepMounted, children);
}

export function Hide({ above, below, keepMounted, children }: ShowHideProps): ReactElement | null {
  return showWhen(!useViewportMatch(above, below), keepMounted, children);
}

function showWhen(
  visible: boolean,
  keepMounted: KeepMounted | undefined,
  children: ReactNode,
): ReactElement | null {
  if (keepsMounted(keepMounted)) {
    return <KeepMountedBoundary visible={visible}>{children}</KeepMountedBoundary>;
  }
  return visible ? <>{children}</> : null;
}

function useViewportMatch(
  above?: BreakpointName | number,
  below?: BreakpointName | number,
): boolean {
  // Width lives in state (not a ref) so a resize re-renders Show/Hide and
  // re-evaluates the match - the previous ref + no-op "force" never
  // scheduled a render, so these components ignored resize entirely.
  //
  // Both the server and the first client render use SSR_DEFAULT_WIDTH so
  // the hydrated markup matches the server output; the effect measures the
  // real width on mount (reconciling any difference) and on every resize.
  const [width, setWidth] = useState<number>(SSR_DEFAULT_WIDTH);
  useEffect(() => {
    const onResize = (): void => setWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // Read the per-tree configured widths so `<ThemeProvider breakpoints={...}>`
  // flows through to Show/Hide (and concurrent SSR requests resolve
  // independently). A `number` bound is an explicit pixel width; a name
  // resolves through the configured set.
  const bp = useBreakpointWidths();
  const resolve = (bound: BreakpointName | number): number =>
    typeof bound === 'number' ? bound : bp[bound];
  const aboveOk = above === undefined || width >= resolve(above);
  const belowOk = below === undefined || width < resolve(below);
  return aboveOk && belowOk;
}
