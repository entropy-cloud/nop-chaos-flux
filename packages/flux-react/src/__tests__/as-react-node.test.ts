import { expect, expectTypeOf, test } from 'vitest';
import type { ReactNode } from 'react';
import { asReactNode } from '../as-react-node.js';

// FM-018: the single sanctioned cast seam for RendererRenderOutput. The
// discriminator is the TYPE surface — an identity runtime function passes for
// any helper, so these assertions pin unknown-in / ReactNode-out.

test('accepts arbitrary render outputs (unknown contract) and returns ReactNode', () => {
  const element = asReactNode(null);
  expectTypeOf(element).toEqualTypeOf<ReactNode>();

  expectTypeOf(asReactNode('text' as unknown)).toEqualTypeOf<ReactNode>();
  expect(asReactNode('text')).toBe('text');
  expect(asReactNode(null)).toBeNull();
  expect(asReactNode(undefined)).toBeUndefined();

  const fakeElement = { $$typeof: 'test.element' } as unknown as ReactNode;
  expect(asReactNode(fakeElement)).toBe(fakeElement);
});

test('output is not silently assignable to unrelated concrete types', () => {
  const output = asReactNode('text');
  // ReactNode carries the string variant, but a bare string annotation must
  // reject the union — guards against the helper being used to launder types.
  // @ts-expect-error ReactNode union is not assignable to a bare string
  const narrow: string = output;
  expect(narrow).toBe('text');
});
