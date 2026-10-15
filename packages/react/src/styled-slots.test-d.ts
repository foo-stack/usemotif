import { expectTypeOf } from 'vitest';
import type { ComponentProps } from 'react';
import { styled } from './styled.js';
import { styledSlots } from './styled-slots.js';

const Card = styledSlots({
  slots: { root: 'div', title: 'h3' },
  variants: { size: { sm: { root: {} }, lg: { title: {} } } },
});

expectTypeOf(Card).toHaveProperty('root');
expectTypeOf(Card).toHaveProperty('title');
// A slot's variant prop is typed exactly as a styled() component's would be.
const Plain = styled('h3', { variants: { size: { sm: {}, lg: {} } } });
expectTypeOf<ComponentProps<typeof Card.title>['size']>().toEqualTypeOf<
  ComponentProps<typeof Plain>['size']
>();
expectTypeOf<ComponentProps<typeof Card.title>['children']>().toEqualTypeOf<
  ComponentProps<typeof Plain>['children']
>();
// @ts-expect-error - not a slot
void Card.footer;
