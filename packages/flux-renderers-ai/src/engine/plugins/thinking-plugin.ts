import type { ChatMessage, MessageEnginePlugin } from '../types.js';

/**
 * thinkingPlugin — detects `reasoning_content` (DeepSeek / Anthropic style) and
 * mirrors it onto `message.state.thinking` so the bubble can render a collapsible
 * "thinking" panel. Ported from tiny-robot `thinkingPlugin`.
 *
 * A-10: records `startedAt`/`endedAt` (ms) on `state.thinking` so the bubble
 * can display "Thought for Xs" once reasoning completes.
 *
 * P1-8 (2026-08-10 multi-audit): the plugin never writes `open` — the expand
 * state stays undefined-absent so the reasoning panel's local expand state
 * engages (`controlled.open === undefined` → local toggle, button enabled).
 *
 * Framework-agnostic: no `react`/DOM references.
 */
export function createThinkingPlugin(): MessageEnginePlugin {
  return {
    name: 'thinking',
    onCompletionChunk(_ctx, _chunk, assistantMessage: ChatMessage) {
      if (typeof assistantMessage.reasoning_content === 'string' && assistantMessage.reasoning_content.length > 0) {
        if (!assistantMessage.state) {
          assistantMessage.state = {};
        }
        const thinking = assistantMessage.state.thinking ?? (assistantMessage.state.thinking = { startedAt: Date.now() });
        // Refresh the end timestamp on every reasoning chunk so the duration
        // reflects the full reasoning window once the stream settles.
        thinking.endedAt = Date.now();
      }
    },
    onTurnEnd() {
      // No-op: thinking state + timing follow the message snapshot.
    },
  };
}
