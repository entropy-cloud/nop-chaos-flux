import type { ActionContext, ActionSchema } from './actions';
import type { ErrorMonitorPayload } from './renderer-api';
import type { CompiledSchemaNode } from './renderer-compiler';
import type { RendererDefinition } from './renderer-core';
import type { BaseSchema, SchemaInput } from './schema';

export interface RendererPlugin {
  name: string;
  priority?: number;
  beforeCompile?(schema: SchemaInput): SchemaInput;
  afterCompile?(node: CompiledSchemaNode | CompiledSchemaNode[]): CompiledSchemaNode | CompiledSchemaNode[];
  wrapComponent?<S extends BaseSchema>(definition: RendererDefinition<S>): RendererDefinition<S>;
  beforeAction?(action: ActionSchema, ctx: ActionContext): ActionSchema | Promise<ActionSchema>;
  onError?(error: unknown, payload: ErrorMonitorPayload): void;
}