import React from 'react';
import type { CompiledSchemaNode, InstanceFrame, ScopeRef } from '@nop-chaos/flux-core';
import type { LoopSchema } from './schemas';

export interface StructuralLoopBindings {
  itemName: string;
  indexName: string;
  keyName?: string;
}

export interface StructuralLoopContextValue {
  ownerId: string;
  path: string;
  bodyNode: CompiledSchemaNode | CompiledSchemaNode[] | null;
  bindings: StructuralLoopBindings;
  itemData?: Record<string, unknown>;
  keyBy?: unknown;
  scope: ScopeRef;
  instancePath?: readonly InstanceFrame[];
  depth: number;
  schema: LoopSchema;
}

export const StructuralLoopContext = React.createContext<StructuralLoopContextValue | null>(null);
