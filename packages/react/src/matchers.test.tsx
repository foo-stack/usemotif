import { beforeAll, describe, expect, it } from 'vitest';
import { motifMatchers } from '@usemotif/test-utils';
import { createWebAdapter } from './web-adapter.js';

beforeAll(() => {
  expect.extend(motifMatchers);
});

describe('matchers - toHaveStyle / toHaveStyleAt', () => {
  const adapter = createWebAdapter();

  it('toHaveStyle passes for matching inline style', () => {
    const out = adapter.render({ name: 'p=$4', primitive: 'Box', props: { p: '$4' } });
    expect(out).toHaveStyle({ padding: 16 });
  });

  it('toHaveStyle fails when a value is wrong', () => {
    const out = adapter.render({ name: 'p=$4', primitive: 'Box', props: { p: '$4' } });
    expect(() => expect(out).toHaveStyle({ padding: 999 })).toThrow(/padding/);
  });

  it('toHaveStyle does subset matching - extra keys are fine', () => {
    const out = adapter.render({
      name: 'p+bg',
      primitive: 'Box',
      props: { p: '$4', bg: '#fff' },
    });
    expect(out).toHaveStyle({ padding: 16 });
    expect(out).toHaveStyle({ backgroundColor: '#fff' });
  });

  it('toHaveStyleAt routes @media scopes to the media bucket', () => {
    const out = adapter.render({
      name: 'p={{ md: $8 }}',
      primitive: 'Box',
      props: { p: { md: '$8' } },
    });
    expect(out).toHaveStyleAt('@media (min-width: 768px)', { padding: 32 });
  });

  it('toHaveStyleAt routes @container scopes to the container bucket', () => {
    const out = adapter.render({
      name: 'p={{ @card.md: $8 }}',
      primitive: 'Box',
      props: { p: { '@card.md': '$8' } },
    });
    expect(out).toHaveStyleAt('@container card (min-width: 768px)', { padding: 32 });
  });

  it('toHaveStyleAt routes :pseudo scopes to the pseudo bucket', () => {
    const out = adapter.render({
      name: 'pressable hover',
      primitive: 'Pressable',
      props: { _hover: { opacity: 0.9 } },
    });
    expect(out).toHaveStyleAt(':hover', { opacity: 0.9 });
  });

  it('emits _checked and _selected as their ARIA-state pseudo rules', () => {
    const out = adapter.render({
      name: 'checked + selected',
      primitive: 'Box',
      props: {
        _checked: { backgroundColor: 'navy' },
        _selected: { backgroundColor: 'teal' },
      },
    });
    // The matcher keys the pseudo bucket by the first selector's suffix after
    // the class - so `_checked` surfaces as `:checked` (its `[aria-checked]`
    // alternate rides the same rule), `_selected` as `[aria-selected="true"]`.
    expect(out).toHaveStyleAt(':checked', { backgroundColor: 'navy' });
    expect(out).toHaveStyleAt('[aria-selected="true"]', { backgroundColor: 'teal' });
  });

  it('emits _expanded as its [aria-expanded] pseudo rule', () => {
    const out = adapter.render({
      name: 'expanded',
      primitive: 'Box',
      props: {
        _expanded: { backgroundColor: 'olive' },
      },
    });
    expect(out).toHaveStyleAt('[aria-expanded="true"]', { backgroundColor: 'olive' });
  });

  it('emits _invalid, _pressed, _focusWithin and _readOnly as their rules', () => {
    const out = adapter.render({
      name: 'more-states',
      primitive: 'Box',
      props: {
        _invalid: { borderColor: 'red' },
        _pressed: { backgroundColor: 'navy' },
        _focusWithin: { outlineColor: 'blue' },
        _readOnly: { opacity: 0.6 },
      },
    });
    expect(out).toHaveStyleAt('[aria-invalid="true"]', { borderColor: 'red' });
    expect(out).toHaveStyleAt('[aria-pressed="true"]', { backgroundColor: 'navy' });
    expect(out).toHaveStyleAt(':focus-within', { outlineColor: 'blue' });
    expect(out).toHaveStyleAt('[readonly]', { opacity: 0.6 });
  });

  it('toHaveStyleAt fails clearly when the scope is missing', () => {
    const out = adapter.render({ name: 'p=$4', primitive: 'Box', props: { p: '$4' } });
    expect(() => expect(out).toHaveStyleAt('@media (min-width: 768px)', { padding: 32 })).toThrow(
      /mediaRules/,
    );
  });

  it('.not.toHaveStyle inverts correctly', () => {
    const out = adapter.render({ name: 'p=$4', primitive: 'Box', props: { p: '$4' } });
    expect(out).not.toHaveStyle({ padding: 999 });
  });
});
