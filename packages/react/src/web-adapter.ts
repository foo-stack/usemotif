import { createElement, type ComponentType, type ReactNode } from 'react';
import {
  defaultTestTheme,
  type ConformanceCase,
  type PrimitiveName,
  type RendererAdapter,
  type RendererOutput,
} from '@usemotif/test-utils';
import { Box } from './Box.js';
import { Container } from './Container.js';
import { HStack, Stack, VStack } from './Stack.js';
import { Image } from './Image.js';
import { Pressable } from './Pressable.js';
import { Text } from './Text.js';
import { TitleBar } from './TitleBar.js';
import { renderStyles } from './testing.js';

const PRIMITIVES: Record<PrimitiveName, ComponentType<Record<string, unknown>>> = {
  Box: Box as unknown as ComponentType<Record<string, unknown>>,
  Stack: Stack as unknown as ComponentType<Record<string, unknown>>,
  HStack: HStack as unknown as ComponentType<Record<string, unknown>>,
  VStack: VStack as unknown as ComponentType<Record<string, unknown>>,
  Text: Text as unknown as ComponentType<Record<string, unknown>>,
  Container: Container as unknown as ComponentType<Record<string, unknown>>,
  Pressable: Pressable as unknown as ComponentType<Record<string, unknown>>,
  Image: Image as unknown as ComponentType<Record<string, unknown>>,
  TitleBar: TitleBar as unknown as ComponentType<Record<string, unknown>>,
};

/**
 * Web renderer adapter for the conformance / snapshot suites.
 *
 * Each case's primitive renders through `renderStyles` (`./testing.ts`), the
 * same function consumers use for their own components, so the conformance
 * suite and consumer tests read styles identically.
 */
export function createWebAdapter(): RendererAdapter {
  return {
    name: 'react-web',
    render(c: ConformanceCase): RendererOutput {
      const Component = PRIMITIVES[c.primitive];
      return renderStyles(
        createElement(
          Component,
          c.props,
          c.children !== undefined ? (c.children as ReactNode) : undefined,
        ),
        c.theme ?? defaultTestTheme,
      );
    },
  };
}
