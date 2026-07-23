import type { ChatMessage, ChatMessageContentPart, MessageEnginePlugin } from '../types.js';

/**
 * lengthPlugin — computes a content length metric and stashes it on
 * `message.state.length` (character count of text content). Used by senders /
 * token-usage displays. Ported from tiny-robot `lengthPlugin`.
 *
 * Framework-agnostic: no `react`/DOM references.
 */
export function createLengthPlugin(): MessageEnginePlugin {
  return {
    name: 'length',
    onCompletionChunk(_ctx, _chunk, assistantMessage: ChatMessage) {
      if (!assistantMessage.state) assistantMessage.state = {};
      assistantMessage.state.length = measureContentLength(assistantMessage);
    },
    onAfterRequest(_ctx, assistantMessage: ChatMessage) {
      if (!assistantMessage.state) assistantMessage.state = {};
      assistantMessage.state.length = measureContentLength(assistantMessage);
    },
  };
}

export function measureContentLength(message: ChatMessage): number {
  const content = message.content;
  if (typeof content === 'string') {
    return content.length;
  }
  if (Array.isArray(content)) {
    return content.reduce((sum, part) => sum + textLengthOfPart(part), 0);
  }
  return 0;
}

function textLengthOfPart(part: ChatMessageContentPart): number {
  if (part.type === 'text') {
    return typeof part.text === 'string' ? part.text.length : 0;
  }
  return 0;
}
