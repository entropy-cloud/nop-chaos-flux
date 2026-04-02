import type { ComponentType, ReactNode } from 'react';
import type { ActionContext, ActionResult, ActionSchema, ActionScope } from './actions';
import type { ExpressionCompiler } from './compilation';
import type { ComponentHandleRegistry } from './renderer-component';
import type { RendererEnv } from './renderer-api';
import type { CompiledNodeRuntimeState, CompiledSchemaNode, ResolvedNodeMeta, ResolvedNodeProps, SchemaCompiler } from './renderer-compiler';
import type { RenderFragmentOptions, RenderNodeInput, RenderRegionHandle } from './renderer-hooks';
import type { RendererPlugin } from './renderer-plugin';
import type { FormRuntime, PageRuntime } from './runtime';
import type { BaseSchema, SchemaFieldRule, SchemaInput, SchemaPath, ScopePolicy, XuiImportSpec } from './schema';
import type { CreateScopeOptions, ScopeRef } from './scope';
import type { CompiledFormValidationModel, ValidationRule } from './validation';

export interface ValidationCollectContext<S extends BaseSchema = BaseSchema> {
  schema: S;
  renderer: RendererDefinition<S>;
  path: SchemaPath;
}

export interface ValidationContributor<S extends BaseSchema = BaseSchema> {
  kind: 'field' | 'container' | 'none';
  valueKind?: 'scalar' | 'array' | 'object';
  getFieldPath?(schema: S, ctx: ValidationCollectContext<S>): string | undefined;
  collectRules?(schema: S, ctx: ValidationCollectContext<S>): ValidationRule[];
}

export interface ResolvePropsArgs<S extends BaseSchema = BaseSchema> {
  schema: S;
  node: CompiledSchemaNode<S>;
  scope: ScopeRef;
  runtime: RendererRuntime;
}

export interface RendererHelpers {
  render: (input: RenderNodeInput, options?: RenderFragmentOptions) => ReactNode;
  evaluate: <T = unknown>(target: unknown, scope?: ScopeRef) => T;
  createScope: (patch?: object, options?: CreateScopeOptions) => ScopeRef;
  dispatch: (action: ActionSchema | ActionSchema[], ctx?: Partial<ActionContext>) => Promise<ActionResult>;
}

export type RendererEventHandler = (event?: unknown, ctx?: Partial<ActionContext>) => Promise<ActionResult>;

export interface RendererComponentProps<S extends BaseSchema = BaseSchema> {
  id: string;
  path: SchemaPath;
  schema: S;
  node: CompiledSchemaNode<S>;
  props: Readonly<Record<string, unknown>>;
  meta: ResolvedNodeMeta;
  regions: Readonly<Record<string, RenderRegionHandle>>;
  events: Readonly<Record<string, RendererEventHandler | undefined>>;
  helpers: RendererHelpers;
}

export interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  type: S['type'];
  component: ComponentType<RendererComponentProps<any>>;
  regions?: readonly string[];
  fields?: readonly SchemaFieldRule[];
  memo?: boolean;
  scopePolicy?: ScopePolicy;
  actionScopePolicy?: 'inherit' | 'new';
  componentRegistryPolicy?: 'inherit' | 'new';
  resolveProps?: (args: ResolvePropsArgs<S>) => Record<string, unknown>;
  validation?: ValidationContributor<S>;
  wrap?: boolean;
}

export interface RendererRegistry {
  register(definition: RendererDefinition): void;
  get(type: string): RendererDefinition | undefined;
  has(type: string): boolean;
  list(): RendererDefinition[];
}

export interface RendererRuntime {
  registry: RendererRegistry;
  env: RendererEnv;
  expressionCompiler: ExpressionCompiler;
  schemaCompiler: SchemaCompiler;
  plugins: readonly RendererPlugin[];
  compile(schema: SchemaInput): CompiledSchemaNode | CompiledSchemaNode[];
  evaluate<T = unknown>(target: unknown, scope: ScopeRef): T;
  resolveNodeMeta(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeMeta;
  resolveNodeProps(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeProps;
  createChildScope(parent: ScopeRef, patch?: object, options?: CreateScopeOptions): ScopeRef;
  createActionScope(input?: { id?: string; parent?: ActionScope }): ActionScope;
  createComponentHandleRegistry(input?: { id?: string; parent?: ComponentHandleRegistry }): ComponentHandleRegistry;
  ensureImportedNamespaces(input: {
    imports?: readonly XuiImportSpec[];
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    scope: ScopeRef;
    node?: CompiledSchemaNode;
  }): Promise<void>;
  releaseImportedNamespaces(input: {
    imports?: readonly XuiImportSpec[];
    actionScope?: ActionScope;
  }): void;
  dispatch(action: ActionSchema | ActionSchema[], ctx: ActionContext): Promise<ActionResult>;
  createPageRuntime(data?: Record<string, any>): PageRuntime;
  createFormRuntime(input: {
    id?: string;
    name?: string;
    initialValues?: Record<string, any>;
    parentScope: ScopeRef;
    page?: PageRuntime;
    validation?: CompiledFormValidationModel;
  }): FormRuntime;
}