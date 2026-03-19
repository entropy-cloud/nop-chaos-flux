import { createContext, useContext } from 'react';
import type { Context } from 'react';
import type { FormRuntime, PageRuntime, RenderNodeMeta, RendererRuntime, ScopeRef } from '@nop-chaos/amis-schema';

export const RuntimeContext = createContext<RendererRuntime | null>(null);
export const ScopeContext = createContext<ScopeRef | null>(null);
export const FormContext = createContext<FormRuntime | undefined>(undefined);
export const PageContext = createContext<PageRuntime | undefined>(undefined);
export const NodeMetaContext = createContext<RenderNodeMeta | null>(null);

export function useRequiredContext<T>(context: Context<T | null>, label: string): T {
  const value = useContext(context);

  if (!value) {
    throw new Error(`${label} is unavailable outside SchemaRenderer.`);
  }

  return value;
}
