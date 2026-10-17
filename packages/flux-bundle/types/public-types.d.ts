import type { ComponentType } from 'react';
import type {
  ActionContext,
  ApiRequestContext,
  ApiResponse,
  BaseSchema,
  ExecutableApiRequest,
  RendererDefinition,
  RendererEnv,
  RendererRegistry,
  SchemaInput,
  SchemaObject,
  SchemaRendererProps,
  SchemaValue,
} from '@nop-chaos/flux-core';

export type FluxSchemaValue = SchemaValue;

export interface FluxSchemaObject extends SchemaObject {
  [key: string]: FluxSchemaValue;
}

export type FluxSchemaNode = BaseSchema;

export type FluxSchema = SchemaInput;

export type FluxApiRequest = ExecutableApiRequest;

export type FluxApiRequestContext = ApiRequestContext;

export type FluxApiResponse<T = unknown> = ApiResponse<T>;

export type FluxRendererEnv = RendererEnv;

export type FluxRendererDefinition = RendererDefinition;

export type FluxRendererRegistry = RendererRegistry;

export interface FluxSchemaRendererProps
  extends Omit<SchemaRendererProps, 'schema' | 'env' | 'onActionError' | 'formulaCompiler' | 'registry'> {
  schema: FluxSchema;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
  env: FluxRendererEnv;
}

export type FluxSchemaRendererComponent = ComponentType<FluxSchemaRendererProps>;

export declare const FLUX_ROOT_CLASS = 'nop-flux-root';

export declare function registerDefaultFluxRenderers(
  registry: FluxRendererRegistry,
): FluxRendererRegistry;

export declare function createFluxRendererRegistry(): FluxRendererRegistry;

export declare function createDefaultFluxEnv(input?: Partial<FluxRendererEnv>): FluxRendererEnv;

export declare function createFluxSchemaRendererWithRegistry(
  registry: FluxRendererRegistry,
): FluxSchemaRendererComponent;

export declare function createFluxSchemaRenderer(): FluxSchemaRendererComponent;

/**
 * xlang 在线调试编辑器渲染器注册（plan 2474）：已在 registerDefaultFluxRenderers
 * 内调用；单独暴露供自定义 registry 复用。definition 同步注册，CE/lezer 实现
 * 经异步 chunk 按需加载。
 */
export declare function registerXlangDebugEditorRenderers(
  registry: FluxRendererRegistry,
): void;
