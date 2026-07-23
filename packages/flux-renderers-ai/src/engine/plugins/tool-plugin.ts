import type { ChatMessage, ChatToolCall, MessageEnginePlugin } from '../types.js';

/**
 * toolPlugin — observes streamed `tool_calls` on the assistant message and
 * projects per-call UI state onto `message.state.toolCall[id]` (status / open /
 * result). P0 only tracks status transitions; actual tool execution + follow-up
 * requests (`finish_reason: 'tool_calls'` → call tool → requestNext) is a P2/P3
 * concern and is intentionally NOT implemented here (Non-Goal).
 *
 * Framework-agnostic: no `react`/DOM references.
 */
export function createToolPlugin(): MessageEnginePlugin {
  return {
    name: 'tool',
    onCompletionChunk(_ctx, _chunk, assistantMessage: ChatMessage) {
      const calls = assistantMessage.tool_calls;
      if (!calls || calls.length === 0) return;
      if (!assistantMessage.state) assistantMessage.state = {};
      const toolCallState = assistantMessage.state.toolCall ?? {};
      for (const call of calls) {
        const key = resolveToolCallKey(call);
        if (!toolCallState[key]) {
          toolCallState[key] = { status: 'running', open: false };
        }
      }
      assistantMessage.state.toolCall = toolCallState;
    },
    onAfterRequest(_ctx, assistantMessage: ChatMessage) {
      const calls = assistantMessage.tool_calls;
      if (!calls || calls.length === 0) return;
      if (!assistantMessage.state) assistantMessage.state = {};
      const toolCallState = assistantMessage.state.toolCall ?? {};
      for (const call of calls) {
        const key = resolveToolCallKey(call);
        if (!toolCallState[key] || toolCallState[key].status === 'running') {
          toolCallState[key] = { ...toolCallState[key], status: 'success' };
        }
      }
      assistantMessage.state.toolCall = toolCallState;
    },
  };
}

function resolveToolCallKey(call: ChatToolCall): string {
  return call.id ?? `idx-${call.index}`;
}
