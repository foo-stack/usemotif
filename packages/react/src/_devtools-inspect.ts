import { getBreakpoints, type BreakpointName } from '@usemotif/core';
import { _isRuntimeClass } from './style-cache.js';

/** What the devtools show for one element. */
export interface ElementReport {
  readonly element: string;
  readonly themeChain: readonly string[];
  readonly breakpoint: BreakpointName | 'base';
  readonly tokens: readonly {
    readonly variable: string;
    readonly path: string;
    readonly value: string;
  }[];
  readonly classes: readonly { readonly name: string; readonly source: 'runtime' | 'compiled' }[];
}

/** The themes an element sits under, outermost first. */
export function themeChain(element: Element): string[] {
  const chain: string[] = [];
  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    const name = node.getAttribute('data-theme');
    if (name !== null) chain.unshift(name);
  }
  return chain;
}

/** The widest breakpoint a viewport width has reached, or `base` below them all. */
export function activeBreakpoint(
  width: number,
  breakpoints: Readonly<Record<BreakpointName, number>> = getBreakpoints(),
): BreakpointName | 'base' {
  let active: BreakpointName | 'base' = 'base';
  let reached = -1;
  for (const [name, min] of Object.entries(breakpoints) as [BreakpointName, number][]) {
    if (width >= min && min > reached) {
      active = name;
      reached = min;
    }
  }
  return active;
}

const VAR = /var\(\s*(--[\w-]+)/g;

/**
 * The token a CSS variable carries, as a `$` path: motif names a token's variable by its path with
 * dashes, so `--colors-surface-base` is `$colors.surface.base`. A key that itself holds a dash reads
 * back split.
 */
export function variableToPath(variable: string): string {
  return `$${variable.slice(2).split('-').join('.')}`;
}

/** The text of every rule in the document's sheets that names one of these classes. */
function rulesFor(classes: readonly string[]): string[] {
  const out: string[] = [];
  const visit = (rules: CSSRuleList): void => {
    for (const rule of rules) {
      if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules.length > 0) {
        visit((rule as CSSGroupingRule).cssRules);
      } else if (classes.some((c) => rule.cssText.includes(`.${c}`))) {
        out.push(rule.cssText);
      }
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      visit(sheet.cssRules);
    } catch {
      // A cross-origin sheet can't be read; it holds no motif rules anyway.
    }
  }
  return out;
}

export function inspectElement(element: HTMLElement): ElementReport {
  const motifClasses = [...element.classList].filter((c) => c.startsWith('m-'));
  const css = [element.style.cssText, ...rulesFor(motifClasses)].join('\n');
  const variables = [...new Set([...css.matchAll(VAR)].map((m) => m[1]!))];
  const computed = getComputedStyle(element);
  return {
    element: `<${element.tagName.toLowerCase()}${element.id !== '' ? `#${element.id}` : ''}>`,
    themeChain: themeChain(element),
    breakpoint: activeBreakpoint(window.innerWidth),
    tokens: variables.map((variable) => ({
      variable,
      path: variableToPath(variable),
      value: computed.getPropertyValue(variable).trim(),
    })),
    classes: motifClasses.map((name) => ({
      name,
      source: _isRuntimeClass(name) ? 'runtime' : 'compiled',
    })),
  };
}
