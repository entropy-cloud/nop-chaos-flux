import { createContext, useContext } from 'react';
import type { Context } from 'react';
import type {
  ActionScope,
  ComponentHandleRegistry,
  ImportFrame,
  FormRuntime,
  InstanceFrame,
  PageRuntime,
  StructuralLoopRenderContext,
  SurfaceRuntime,
  RenderNodeMeta,
  RendererRuntime,
  ScopeRef,
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';

export interface FormLayoutContextValue {
  mode?: 'normal' | 'horizontal';
  labelAlign?: 'top' | 'left' | 'right';
  labelWidth?: string | number;
}

export const NO_VALIDATION_OWNER = Symbol('NO_VALIDATION_OWNER');
export type ValidationContextValue =
  | ValidationScopeRuntime
  | typeof NO_VALIDATION_OWNER
  | undefined;

export const RuntimeContext = createContext<RendererRuntime | null>(null);
export const RenderInstancePathContext = createContext<readonly InstanceFrame[] | undefined>(
  undefined,
);
export const ScopeContext = createContext<ScopeRef | null>(null);
export const ActionScopeContext = createContext<ActionScope | undefined>(undefined);
export const ComponentRegistryContext = createContext<ComponentHandleRegistry | undefined>(
  undefined,
);
export const ImportFrameContext = createContext<ImportFrame | undefined>(undefined);
export const FormContext = createContext<FormRuntime | undefined>(undefined);
export const ValidationContext = createContext<ValidationContextValue>(undefined);
export const PageContext = createContext<PageRuntime | undefined>(undefined);
export const SurfaceContext = createContext<SurfaceRuntime | undefined>(undefined);
export const NodeMetaContext = createContext<RenderNodeMeta | null>(null);
export const ClassAliasesContext = createContext<Record<string, string> | undefined>(undefined);
export const StructuralLoopContext = createContext<StructuralLoopRenderContext | undefined>(
  undefined,
);
export const FormLayoutContext = createContext<FormLayoutContextValue | undefined>(undefined);

export function useRequiredContext<T>(context: Context<T | null>, label: string): T {
  const value = useContext(context);

  if (!value) {
    throw new Error(`${label} is unavailable outside SchemaRenderer.`);
  }

  return value;
}
