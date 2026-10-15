import { parse } from '@babel/parser';
import * as t from '@babel/types';
import { describe, expect, it } from 'vitest';
import { classifyJsxAttributes } from './analyze.js';
import { PRIMITIVE_INFO } from './primitives.js';
import { analyzeStripSafety, type BailReason } from './safety-analysis.js';

/**
 * Parse a JSX expression as a complete `JSXElement`. Returns the
 * opening element and the wrapping element so safety checks can
 * inspect both the attribute list and the children.
 */
function parseJsxElement(jsx: string): {
  opening: t.JSXOpeningElement;
  parent: t.JSXElement;
} {
  const file = parse(`const __ = ${jsx};`, { sourceType: 'module', plugins: ['jsx'] });
  const decl = file.program.body[0];
  if (!t.isVariableDeclaration(decl)) throw new Error('parse helper failed');
  const init = decl.declarations[0]!.init;
  if (!t.isJSXElement(init)) throw new Error('expected JSX element');
  return { opening: init.openingElement, parent: init };
}

function expectSafe(jsx: string, primitiveName: keyof typeof PRIMITIVE_INFO): void {
  const { opening, parent } = parseJsxElement(jsx);
  const primitive = PRIMITIVE_INFO[primitiveName]!;
  const analysis = classifyJsxAttributes(opening.attributes, undefined, primitive);
  const safety = analyzeStripSafety(opening, parent, primitive, analysis);
  expect(safety.safe, `expected safe, got bail '${safety.bailReason}'`).toBe(true);
  expect(safety.bailReason).toBeUndefined();
}

function expectBail(
  jsx: string,
  primitiveName: keyof typeof PRIMITIVE_INFO,
  reason: BailReason,
): void {
  const { opening, parent } = parseJsxElement(jsx);
  const primitive = PRIMITIVE_INFO[primitiveName]!;
  const analysis = classifyJsxAttributes(opening.attributes, undefined, primitive);
  const safety = analyzeStripSafety(opening, parent, primitive, analysis);
  expect(safety.safe).toBe(false);
  expect(safety.bailReason).toBe(reason);
}

describe('analyzeStripSafety - safe cases', () => {
  it('plain Box with literal style props is safe', () => {
    expectSafe(`<Box p={4} bg="red" />`, 'Box');
  });

  it('Box with literal-string children is safe', () => {
    expectSafe(`<Box p={4}>hello</Box>`, 'Box');
  });

  it('Box with an expression child (not a function) is safe', () => {
    expectSafe(`<Box p={4}>{name}</Box>`, 'Box');
  });

  it('Stack with default direction is safe', () => {
    expectSafe(`<Stack p={4} />`, 'Stack');
  });

  it('HStack with literal padding is safe', () => {
    expectSafe(`<HStack p={4} />`, 'HStack');
  });

  it('Text with literal fontSize is safe', () => {
    expectSafe(`<Text fontSize={16}>hi</Text>`, 'Text');
  });
});

describe('analyzeStripSafety - bailout cases', () => {
  it('bails on non-strippable primitive (Pressable)', () => {
    expectBail(`<Pressable p={4} />`, 'Pressable', 'not-strippable');
  });

  it('bails on non-strippable primitive (Image)', () => {
    expectBail(`<Image src="/x.png" />`, 'Image', 'not-strippable');
  });

  it('bails on dynamic style prop (partial-static)', () => {
    expectBail(`<Box p={4} bg={dynamic} />`, 'Box', 'non-static-classification');
  });

  it('bails on a spread attribute', () => {
    expectBail(`<Box p={4} {...rest} />`, 'Box', 'has-spread');
  });

  it('bails on `as` attribute', () => {
    expectBail(`<Box as="section" p={4} />`, 'Box', 'as-attribute');
  });

  it('bails on `ref` attribute', () => {
    expectBail(`<Box ref={r} p={4} />`, 'Box', 'ref-attribute');
  });

  it('bails on arrow-function-as-child', () => {
    expectBail(`<Box p={4}>{(s) => s.x}</Box>`, 'Box', 'function-as-child');
  });

  it('bails on FunctionExpression-as-child', () => {
    expectBail(`<Box p={4}>{function (s) { return s; }}</Box>`, 'Box', 'function-as-child');
  });
});

describe('analyzeStripSafety - runtime-owned props keep the wrapper', () => {
  // enterStyle is the long-standing baseline blocked prop.
  it('bails on enterStyle', () => {
    expectBail(`<Box p={4} enterStyle={{ opacity: 0 }} />`, 'Box', 'blocked-prop:enterStyle');
  });

  // The FLIP runs in the runtime Box; a stripped `<div layout>` would not animate.
  it('bails on group, which renders a marker attribute at runtime', () => {
    expectBail(`<Box group p={4} />`, 'Box', 'blocked-prop:group');
  });

  it('strips a child that only uses group states', () => {
    expectSafe(`<Box _groupHover={{ color: 'red' }} />`, 'Box');
  });

  it('bails on layout and layoutTransition', () => {
    expectBail(`<Box p={4} layout />`, 'Box', 'blocked-prop:layout');
    expectBail(`<Stack layout="position" />`, 'Stack', 'blocked-prop:layout');
    expectBail(
      `<Box layoutTransition={{ duration: '120ms' }} p={4} />`,
      'Box',
      'blocked-prop:layoutTransition',
    );
  });

  // _before/_after are extracted into ::before/::after rules, so a literal
  // bag no longer keeps the wrapper; a dynamic one makes the element
  // non-static, which does.
  it('strips with a literal _before or _after on every strippable primitive', () => {
    expectSafe(`<Box _before={{ content: '"x"' }} p={4} />`, 'Box');
    expectSafe(`<Text _before={{ content: '"x"' }} />`, 'Text');
    expectSafe(`<Stack _after={{ content: '"x"' }} />`, 'Stack');
    expectSafe(`<HStack _before={{ color: 'red' }} />`, 'HStack');
    expectSafe(`<VStack _after={{ content: '"x"' }} />`, 'VStack');
  });

  it('keeps the wrapper for a dynamic _before or _after', () => {
    expectBail(`<Box _before={bag} p={4} />`, 'Box', 'non-static-classification');
    expectBail(`<Box _after={bag} />`, 'Box', 'non-static-classification');
  });

  // #173 - Text `lines` drives line-clamp inline styles.
  it('bails on Text lines', () => {
    expectBail(`<Text lines={2}>clamp me</Text>`, 'Text', 'blocked-prop:lines');
  });

  // #174 - Stack `stagger` wraps each child in a delayed entry box.
  it('bails on stagger for Stack/HStack/VStack', () => {
    expectBail(`<Stack stagger={50} />`, 'Stack', 'blocked-prop:stagger');
    expectBail(`<HStack stagger={50} />`, 'HStack', 'blocked-prop:stagger');
    expectBail(`<VStack stagger={50} />`, 'VStack', 'blocked-prop:stagger');
    expectBail(`<Stack staggerFrom="center" />`, 'Stack', 'blocked-prop:staggerFrom');
  });

  // The blocked props are scoped to the primitives that own them: `lines`
  // and `stagger` are not style props, so on a plain Box they're harmless
  // passthrough and don't block stripping.
  it('does not block stripping for props another primitive owns', () => {
    expectSafe(`<Box lines={2} p={4} />`, 'Box');
    expectSafe(`<Box stagger={50} p={4} />`, 'Box');
  });
});
