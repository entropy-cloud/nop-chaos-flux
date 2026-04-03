import type { ReactElement, ReactNode } from 'react';
import type { ActionContext, ActionScope } from './actions';
import type { FormulaCompiler } from './compilation';
import type { ComponentHandleRegistry } from './renderer-component';
import type { RendererEnv } from './renderer-api';
import type { CompiledSchemaNode } from './renderer-compiler';
import type { RendererHelpers, RendererRegistry, RendererRuntime } from './renderer-core';
import type { RendererPlugin } from './renderer-plugin';
import type { FormErrorQuery, FormFieldStateSnapshot, FormRuntime, PageRuntime, PageStoreApi } from './runtime';
import type { SchemaInput, SchemaPath } from './schema';
import type { ScopeRef } from './scope';
import type { ValidationError } from './validation';

export interface RenderFragmentOptions {
  data?: object;
  scope?: ScopeRef;
  scopeKey?: string;
  isolate?: boolean;
  pathSuffix?: string;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
}

export interface RenderRegionHandle {
  key: string;
  path: SchemaPath;
  node: CompiledSchemaNode | CompiledSchemaNode[] | null;
  render(options?: RenderFragmentOptions): ReactNode;
}

export type RenderNodeInput = SchemaInput | CompiledSchemaNode | CompiledSchemaNode[] | null | undefined;

export interface RendererHookApi {
  useRendererRuntime(): RendererRuntime;
  useRenderScope(): ScopeRef;
  useCurrentActionScope(): ActionScope | undefined;
  useCurrentComponentRegistry(): ComponentHandleRegistry | undefined;
  useScopeSelector<T, S = Record<string, unknown>>(selector: (scopeData: S) => T, equalityFn?: (a: T, b: T) => boolean): T;
  useOwnScopeSelector<T, S = Record<string, unknown>>(selector: (scopeData: S) => T, equalityFn?: (a: T, b: T) => boolean): T;
  useRendererEnv(): RendererEnv;
  useActionDispatcher(): RendererRuntime['dispatch'];
  useCurrentForm(): FormRuntime | undefined;
  useCurrentFormErrors(query?: FormErrorQuery): ValidationError[];
  useCurrentFormError(query: FormErrorQuery): ValidationError | undefined;
  useCurrentFormFieldState(path: string, query?: FormErrorQuery): FormFieldStateSnapshot;
  useValidationNodeState(path: string): FormFieldStateSnapshot;
  useFieldError(path: string): ValidationError | undefined;
  useOwnedFieldState(path: string): FormFieldStateSnapshot;
  useChildFieldState(path: string): FormFieldStateSnapshot;
  useAggregateError(path: string): ValidationError | undefined;
  useCurrentPage(): PageRuntime | undefined;
  useCurrentNodeMeta(): { id: string; path: SchemaPath; type: string };
  useRenderFragment(): RendererHelpers['render'];
}

export interface RenderNodeMeta {
  id: string;
  path: SchemaPath;
  type: string;
}

export interface SchemaRendererProps {
  schema: SchemaInput;
  data?: Record<string, any>;
  env: RendererEnv;
  formulaCompiler: FormulaCompiler;
  registry?: RendererRegistry;
  plugins?: RendererPlugin[];
  pageStore?: PageStoreApi;
  parentScope?: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  onComponentRegistryChange?: (componentRegistry: ComponentHandleRegistry | null) => void;
  onActionScopeChange?: (actionScope: ActionScope | null) => void;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}

export type SchemaRendererComponent = (props: SchemaRendererProps) => ReactElement | null;
