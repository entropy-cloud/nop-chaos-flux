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
  afterAction?(outcome: ActionOutcome): void;
  onRender?(span: RenderSpan): void;
  onExpressionEval?(trace: EvalTrace): void;
  onError?(error: unknown, payload: ErrorMonitorPayload): void;
}

export interface ActionOutcome {
  action: ActionSchema;
  status: 'success' | 'failed';
  durationMs: number;
  result?: unknown;
  error?: { message: string };
  nodeId?: string;
  interactionId?: string;
  /** Normalized serializable user-event payload (M5 recorder input; non-serializable keys stripped). */
  event?: { type: string; payload: Record<string, unknown> };
}

export interface RenderSpan {
  cid?: string;
  nodeId?: string;
  instancePath?: string;
  phase: 'resolve' | 'commit' | 'unmount';
  durationMs: number;
  dependencyPaths?: readonly string[];
}

export interface EvalTrace {
  expressionSource: string;
  nodeId?: string;
  cid?: string;
  readPaths?: readonly string[];
  resultPreview?: string;
  error?: { code: string; message: string };
}
