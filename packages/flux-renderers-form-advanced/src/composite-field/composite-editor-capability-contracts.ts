import type { RendererCapabilityContract } from '@nop-chaos/flux-core';

export const COMPOSITE_EDITOR_METHODS = ['addItem', 'removeItem', 'moveItem'] as const;

export const COMPOSITE_EDITOR_CAPABILITY_CONTRACTS: readonly RendererCapabilityContract[] = [
  {
    handle: 'addItem',
    displayName: 'Add Item',
    description: 'Append a new item to the composite editor array.',
    args: {
      kind: 'object',
      fields: { value: { kind: 'unknown' } },
      optional: ['value'],
    },
  },
  {
    handle: 'removeItem',
    displayName: 'Remove Item',
    description: 'Remove the item at the given index.',
    args: {
      kind: 'object',
      fields: { index: { kind: 'number' } },
    },
  },
  {
    handle: 'moveItem',
    displayName: 'Move Item',
    description: 'Move the item from index `from` to index `to`.',
    args: {
      kind: 'object',
      fields: { from: { kind: 'number' }, to: { kind: 'number' } },
    },
  },
];
