import type { ChatMessage, MessageEnginePlugin } from '../types.js';

/**
 * thinkingPlugin — detects `reasoning_content` (DeepSeek / Anthropic style) and
 * mirrors it onto `message.state.thinking` so the bubble can render a collapsible
 * "thinking" panel. Ported from tiny-robot `thinkingPlugin`.
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
        if (!assistantMessage.state.thinking) {
          assistantMessage.state.thinking = { open: false };
        }
      }
    },
    onTurnEnd() {
      // No-op: thinking state follows the message snapshot.
    },
  };
}
