import type { ComponentType } from 'react';
import type {
  ActionContext,
  ApiRequestContext,
  RendererDefinition,
  RendererEnv,
  RendererRegistry,
  SchemaObject,
  SchemaRendererProps,
  SchemaValue,
} from '@nop-chaos/flux-core';

export type FluxSchemaValue = SchemaValue;

export interface FluxSchemaObject extends SchemaObject {
  [key: string]: FluxSchemaValue;
}

export interface FluxSchemaNode {
  type: string;
  [key: string]: FluxSchemaValue;
}

export type FluxSchema = FluxSchemaNode | FluxSchemaNode[];

export interface FluxApiRequest {
  url: string;
  method?: string;
  data?: FluxSchemaValue;
  headers?: Record<string, string>;
}

export type FluxApiRequestContext = ApiRequestContext;

export interface FluxApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  headers?: Record<string, string>;
  raw?: unknown;
}

export interface FluxRendererEnv extends Omit<RendererEnv, 'fetcher'> {
  fetcher: <T = unknown>(
    api: FluxApiRequest,
    ctx: FluxApiRequestContext,
  ) => Promise<FluxApiResponse<T>>;
  [key: string]: unknown;
}

export type FluxRendererDefinition = RendererDefinition;

export type FluxRendererRegistry = RendererRegistry;

export interface FluxSchemaRendererProps
  extends Omit<SchemaRendererProps, 'schema' | 'env' | 'onActionError' | 'formulaCompiler'> {
  schema: FluxSchema;
  env: FluxRendererEnv;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}

export type FluxSchemaRendererComponent = ComponentType<FluxSchemaRendererProps>;
