import type { ComponentType } from 'react';
import type {
  ActionContext,
  ApiResponse,
  ApiRequestContext,
  BaseSchema,
  ExecutableApiRequest,
  RendererDefinition,
  RendererEnv,
  RendererRegistry,
  SchemaObject,
  SchemaInput,
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
  extends Omit<
    import('@nop-chaos/flux-core').SchemaRendererProps,
    'schema' | 'env' | 'onActionError' | 'formulaCompiler' | 'registry'
  > {
  schema: FluxSchema;
  env: FluxRendererEnv;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}

export type FluxSchemaRendererComponent = ComponentType<FluxSchemaRendererProps>;
