import type { ReactNode } from 'react';
import type { StructuralLoopRenderContext } from '@nop-chaos/flux-core';
import { StructuralLoopContext } from './contexts.js';

export interface StructuralLoopProviderProps {
  value: StructuralLoopRenderContext;
  children: ReactNode;
}

export function StructuralLoopProvider(props: StructuralLoopProviderProps) {
  return (
    <StructuralLoopContext.Provider value={props.value}>
      {props.children}
    </StructuralLoopContext.Provider>
  );
}
