import { vi } from 'vitest';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  AiConversationInfo,
  ChatMessage,
} from '../../engine/types.js';
import type { ConversationStorageStrategy } from '../../storage/types.js';

/**
 * Shared harness helpers for the `useConversation` domain test split. Extracted
 * from the original monolithic `use-conversation.test.ts` so each domain file
 * (create / switch / controller / storage) can stay focused without duplicating
 * the connector / storage scripting.
 */

export function slowConnector(chunks: AiConnectorChunk[], delayMs = 5): AiConnector {
  return {
    async stream(_req: AiConnectorRequest) {
      async function* gen() {
        for (const c of chunks) {
          await new Promise((r) => setTimeout(r, delayMs));
          yield c;
        }
      }
      void _req;
      return gen();
    },
  };
}

/**
 * Scripted connector for multi-round tool-loop tests: each `stream` call
 * consumes the next scripted round.
 */
export function scriptedConnector(rounds: AiConnectorChunk[][]): AiConnector & {
  calls: AiConnectorRequest[];
} {
  const calls: AiConnectorRequest[] = [];
  let round = 0;
  return {
    calls,
    async stream(request: AiConnectorRequest) {
      calls.push(request);
      const chunks = rounds[Math.min(round, rounds.length - 1)];
      round += 1;
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        for (const c of chunks) yield c;
      }
      return gen();
    },
  };
}

export const okChunks: AiConnectorChunk[] = [
  { delta: { content: 'Hi' } },
  { finishReason: 'stop' },
];

export interface MockStorageCalls {
  loadConversations: number;
  loadMessages: number;
  saveConversation: number;
  saveMessages: number;
  deleteConversation: number;
}

export function mockStorage(initial?: {
  conversations?: AiConversationInfo[];
  messages?: Record<string, ChatMessage[]>;
}) {
  const calls: MockStorageCalls = {
    loadConversations: 0,
    loadMessages: 0,
    saveConversation: 0,
    saveMessages: 0,
    deleteConversation: 0,
  };
  const savedMessages: Record<string, ChatMessage[]> = {};
  const strategy: ConversationStorageStrategy = {
    async loadConversations() {
      calls.loadConversations++;
      return initial?.conversations ?? [];
    },
    async loadMessages(id: string) {
      calls.loadMessages++;
      return initial?.messages?.[id] ?? [];
    },
    async saveConversation() {
      calls.saveConversation++;
    },
    async saveMessages(id: string, messages: ChatMessage[]) {
      calls.saveMessages++;
      savedMessages[id] = messages;
    },
    async deleteConversation() {
      calls.deleteConversation++;
    },
  };
  return { strategy, calls, savedMessages };
}

export function wait(ms = 10): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Re-export so domain files can assert executor invocations uniformly. */
export { vi };
