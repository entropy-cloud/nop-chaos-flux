import type {
  AiToolSchema,
  ChatMessage,
  ChatToolCall,
  MessageEnginePlugin,
} from '../types.js';

/**
 * toolPlugin — observes streamed `tool_calls` on the assistant message and
 * projects per-call UI state onto `message.state.toolCall[id]` (status / open /
 * result). Streaming sets `status:'running'`; the engine's tool-execution loop
 * (`create-engine.ts` `executeToolCalls`) then overwrites it with
 * `success`/`failed` based on the host executor outcome. This plugin no longer
 * unconditionally marks calls `success` on `onAfterRequest`.
 *
 * `onBeforeRequest` aggregates host-provided `tools` schemas onto
 * `request.tools` so the model is told what it may call (engine.md §8.3).
 *
 * Framework-agnostic: no `react`/DOM references.
 *
 * Options:
 *  - `tools`: static tool schemas to forward on every request.
 */
export interface CreateToolPluginOptions {
  tools?: AiToolSchema[];
}

export function createToolPlugin(options: CreateToolPluginOptions = {}): MessageEnginePlugin {
  const hostTools = options.tools;
  return {
    name: 'tool',
    onBeforeRequest(ctx) {
      resolveTools(ctx, hostTools);
    },
    onCompletionChunk(_ctx, _chunk, assistantMessage: ChatMessage) {
      const calls = assistantMessage.tool_calls;
      if (!calls || calls.length === 0) return;
      if (!assistantMessage.state) assistantMessage.state = {};
      const toolCallState = assistantMessage.state.toolCall ?? {};
      for (const call of calls) {
        const key = resolveToolCallKey(call);
        if (!toolCallState[key]) {
          toolCallState[key] = { status: 'running', open: false };
        } else if (toolCallState[key].status === 'running') {
          // keep running while streaming; do not flip to success here
        }
      }
      assistantMessage.state.toolCall = toolCallState;
    },
    onAfterRequest(_ctx, assistantMessage: ChatMessage) {
      // Status is now driven by the engine's `executeToolCalls` (success /
      // failed). If no executor ran (e.g. tool_calls finish without an
      // executor, or this message had no tool_calls), leave status as-is so
      // streaming-time `running` is preserved only when truly pending.
      const calls = assistantMessage.tool_calls;
      if (!calls || calls.length === 0) return;
      if (!assistantMessage.state) assistantMessage.state = {};
      const toolCallState = assistantMessage.state.toolCall ?? {};
      for (const call of calls) {
        const key = resolveToolCallKey(call);
        // Only ensure the entry exists; do not override engine-written status.
        if (!toolCallState[key]) {
          toolCallState[key] = { status: 'running', open: false };
        }
      }
      assistantMessage.state.toolCall = toolCallState;
    },
  };
}

/**
 * Aggregate host-provided tool schemas onto `request.tools`. Merges any
 * tools already present on the request (e.g. extra params) with the plugin's
 * static list, de-duplicating by function name (request value wins).
 */
function resolveTools(
  ctx: Parameters<NonNullable<MessageEnginePlugin['onBeforeRequest']>>[0],
  hostTools: AiToolSchema[] | undefined,
): void {
  if (!hostTools || hostTools.length === 0) return;
  const existing = (ctx.request.tools ?? []) as AiToolSchema[];
  const byName = new Map<string, AiToolSchema>();
  for (const t of hostTools) byName.set(t.function.name, t);
  for (const t of existing) byName.set(t.function.name, t);
  ctx.request.tools = Array.from(byName.values());
}

function resolveToolCallKey(call: ChatToolCall): string {
  return call.id ?? `idx-${call.index}`;
}
