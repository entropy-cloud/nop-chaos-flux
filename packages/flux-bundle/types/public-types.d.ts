import type { ComponentType } from 'react';

export type FluxSchemaValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | FluxSchemaNode
  | FluxSchemaValue[];

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

export interface FluxApiRequestContext {
  signal?: AbortSignal;
  interactionId?: string;
  requestInstanceId?: string;
  [key: string]: unknown;
}

export interface FluxApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  headers?: Record<string, string>;
  raw?: unknown;
}

export interface FluxRendererEnv {
  fetcher: <T = unknown>(
    api: FluxApiRequest,
    ctx: FluxApiRequestContext,
  ) => Promise<FluxApiResponse<T>>;
  notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  navigate?: (to: string | number, options?: { replace?: boolean }) => void;
  confirm?: (message: string, options?: unknown) => Promise<boolean>;
  functions?: Record<string, (...args: any[]) => any>;
  filters?: Record<string, (input: any, ...args: any[]) => any>;
  importLoader?: unknown;
  resolveImportUrl?: (schemaUrl: string, from: string, options?: Record<string, unknown>) => string;
  monitor?: Record<string, unknown>;
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
  onActionError?: (error: unknown, ctx: unknown) => void;
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
