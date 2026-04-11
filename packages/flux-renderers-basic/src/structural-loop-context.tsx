import React from 'react';
import type { InstanceFrame } from '@nop-chaos/flux-core';
import type { LoopSchema } from './schemas';

export interface StructuralLoopBindings {
  itemName: string;
  indexName: string;
  keyName?: string;
}

export interface StructuralLoopContextValue {
  ownerId: string;
  path: string;
  bindings: StructuralLoopBindings;
  itemData?: Record<string, unknown>;
  keyBy?: unknown;
  instancePath?: readonly InstanceFrame[];
  depth: number;
  schema: LoopSchema;
  renderBody(slotBindings: Record<string, unknown>, instancePath: readonly InstanceFrame[]): React.ReactNode;
}

export const StructuralLoopContext = React.createContext<StructuralLoopContextValue | null>(null);
