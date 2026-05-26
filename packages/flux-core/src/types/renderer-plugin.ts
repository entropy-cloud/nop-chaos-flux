import type { ActionContext, ActionSchema } from './actions.js';
import type { ErrorMonitorPayload } from './renderer-api.js';
import type { CompiledTemplate } from './node-identity.js';
import type { RendererDefinitionShape } from './renderer-definition-types.js';
import type { BaseSchema, SchemaInput } from './schema.js';

export interface RendererPlugin {
  name: string;
  priority?: number;
  beforeCompile?(schema: SchemaInput): SchemaInput;
  afterCompile?(template: CompiledTemplate): CompiledTemplate;
  wrapComponent?<S extends BaseSchema>(definition: RendererDefinitionShape<S>): RendererDefinitionShape<S>;
  beforeAction?(action: ActionSchema, ctx: ActionContext): ActionSchema | Promise<ActionSchema>;
  onError?(error: unknown, payload: ErrorMonitorPayload): void;
}
