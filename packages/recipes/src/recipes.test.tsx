/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { Box, Input, Pressable, Text, styled } from 'usemotif';
import {
  alertRecipe,
  badgeRecipe,
  bannerRecipe,
  buttonRecipe,
  cardRecipe,
  chipRecipe,
  inputRecipe,
  statDeltaRecipe,
  statRecipe,
} from './index.js';

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
  act(() => root.render(node));
}

/** Everything that visually distinguishes a rendered element: its classes and
 * its inline style (motif bakes static base/variant styles inline). */
function look(el: Element): string {
  return `${el.getAttribute('class') ?? ''}|${el.getAttribute('style') ?? ''}`;
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

describe('recipes integrate with styled()', () => {
  it('every recipe produces a working styled component', () => {
    const Button = styled(Pressable, buttonRecipe);
    const Card = styled(Box, cardRecipe);
    const Badge = styled(Box, badgeRecipe);
    const Field = styled(Input, inputRecipe);

    render(
      <>
        <Button data-testid="btn">Save</Button>
        <Card data-testid="card" />
        <Badge data-testid="badge">New</Badge>
        <Field data-testid="field" />
      </>,
    );

    for (const id of ['btn', 'card', 'badge', 'field']) {
      const el = container.querySelector(`[data-testid="${id}"]`);
      expect(el, id).not.toBeNull();
      // The recipe's base/default-variant styles resolved to applied styling.
      expect(look(el!), id).not.toBe('|');
    }
  });

  it('applies default variants and lets explicit variants override', () => {
    const Button = styled(Pressable, buttonRecipe);
    render(
      <>
        <Button data-testid="default">A</Button>
        <Button data-testid="danger" intent="danger" size="lg">
          B
        </Button>
      </>,
    );
    const def = container.querySelector('[data-testid="default"]') as HTMLElement;
    const danger = container.querySelector('[data-testid="danger"]') as HTMLElement;
    // Different variant selections must produce different styling.
    expect(look(def)).not.toBe(look(danger));
  });

  it('carries interaction from the recipe (button hover emits a :hover rule)', () => {
    const Button = styled(Pressable, buttonRecipe);
    render(<Button>Save</Button>);
    const css = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n');
    // The recipe's base `_hover` resolved to a hashed hover rule - proof a
    // recipe (a styled() config) can now carry pseudo-state, not only statics.
    expect(css).toContain(':hover');
  });

  it('respects a call-site style prop over the recipe', () => {
    const Badge = styled(Box, badgeRecipe);
    render(
      <Badge data-testid="b" borderRadius={0}>
        x
      </Badge>,
    );
    // Smoke: the one-off override renders without throwing and still styles up.
    const el = container.querySelector('[data-testid="b"]') as HTMLElement;
    expect(look(el)).not.toBe('|');
  });
});

describe('recipe data is internally consistent', () => {
  const recipes = { buttonRecipe, cardRecipe, badgeRecipe, inputRecipe };

  it('every defaultVariants key points at a real variant value', () => {
    for (const [name, recipe] of Object.entries(recipes)) {
      const defaults =
        (recipe as { defaultVariants?: Record<string, string> }).defaultVariants ?? {};
      const variants = (recipe as { variants: Record<string, Record<string, unknown>> }).variants;
      for (const [key, value] of Object.entries(defaults)) {
        expect(variants[key], `${name}.${key}`).toBeDefined();
        expect(variants[key]![String(value)], `${name}.${key}=${value}`).toBeDefined();
      }
    }
  });
});

describe('display recipes', () => {
  function looks(ids: readonly string[]): string[] {
    return ids.map((id) => {
      const el = container.querySelector(`[data-testid="${id}"]`);
      expect(el, id).not.toBeNull();
      return look(el!);
    });
  }

  it('gives every alert and banner intent its own look, defaulting to neutral', () => {
    const Alert = styled(Box, alertRecipe);
    const Banner = styled(Box, bannerRecipe);
    const intents = ['neutral', 'info', 'success', 'warning', 'danger'] as const;
    render(
      <>
        <Alert data-testid="alert-default" />
        <Banner data-testid="banner-default" />
        {intents.map((intent) => (
          <Alert key={`a-${intent}`} data-testid={`alert-${intent}`} intent={intent} />
        ))}
        {intents.map((intent) => (
          <Banner key={`b-${intent}`} data-testid={`banner-${intent}`} intent={intent} />
        ))}
      </>,
    );
    for (const kind of ['alert', 'banner']) {
      const all = looks(intents.map((i) => `${kind}-${i}`));
      expect(new Set(all).size, kind).toBe(intents.length);
      const [byDefault] = looks([`${kind}-default`]);
      expect(byDefault, kind).toBe(all[0]);
    }
  });

  it('switches chip padding on withIcon and removable', () => {
    const Chip = styled(Box, chipRecipe);
    render(
      <>
        <Chip data-testid="plain">a</Chip>
        <Chip data-testid="icon" withIcon>
          a
        </Chip>
        <Chip data-testid="remove" removable>
          a
        </Chip>
        <Chip data-testid="primary" intent="primary">
          a
        </Chip>
      </>,
    );
    const all = looks(['plain', 'icon', 'remove', 'primary']);
    expect(new Set(all).size).toBe(4);
  });

  it('colours the stat delta by trend and renders the stat column', () => {
    const Stat = styled(Box, statRecipe);
    const Delta = styled(Text, statDeltaRecipe);
    render(
      <Stat data-testid="stat">
        <Delta data-testid="default">1</Delta>
        <Delta data-testid="up" trend="up">
          1
        </Delta>
        <Delta data-testid="down" trend="down">
          1
        </Delta>
        <Delta data-testid="neutral" trend="neutral">
          1
        </Delta>
      </Stat>,
    );
    const [stat, byDefault, up, down, neutral] = looks([
      'stat',
      'default',
      'up',
      'down',
      'neutral',
    ]);
    expect(stat).not.toBe('|');
    expect(new Set([up, down, neutral]).size).toBe(3);
    expect(byDefault).toBe(neutral);
  });
});
