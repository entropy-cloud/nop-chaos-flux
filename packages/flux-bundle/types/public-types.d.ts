import type { ComponentType } from 'react';
import type { ActionContext, ApiRequestContext, RendererEnv, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';

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

export interface FluxRendererDefinition {
  type: string;
  component?: (...args: any[]) => unknown;
  reactComponent?: (...args: any[]) => unknown;
  [key: string]: unknown;
}

export interface FluxRendererRegistry {
  register(definition: FluxRendererDefinition, options?: { override?: boolean }): void;
  get(type: string): FluxRendererDefinition | undefined;
  has(type: string): boolean;
  list(): FluxRendererDefinition[];
}

export interface FluxSchemaRendererProps {
  schema: FluxSchema;
  schemaUrl: string;
  env: FluxRendererEnv;
  data?: Record<string, unknown>;
  strictValidation?: boolean;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
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
