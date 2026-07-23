/**
 * Playground host helper: a localStorage-backed `ConversationStorageStrategy`.
 *
 * This lives in the HOST app (NOT in `@nop-chaos/flux-renderers-ai`, which
 * ships no concrete storage — design.md §11.3, §18.2 invariant 13). It
 * demonstrates end-to-end persistence for the P3 demo: conversations + their
 * messages are JSON-serialized under a single localStorage key.
 *
 * `structuredClone` deep-copies message snapshots on save (design.md §4: avoid
 * leaking Vue/proxy references into persisted state). Storage failures
 * (e.g. `QuotaExceededError`) propagate to `useConversation`, which treats them
 * as non-fatal (`storage-save-error`).
 */
import type {
  AiConversationInfo,
  ChatMessage,
  ConversationStorageStrategy,
} from '@nop-chaos/flux-renderers-ai';

interface StorageShape {
  conversations: AiConversationInfo[];
  messages: Record<string, ChatMessage[]>;
}

const EMPTY: StorageShape = { conversations: [], messages: {} };

export interface CreateLocalStorageStorageOptions {
  /** localStorage key holding the serialized `{ conversations, messages }` blob. */
  key: string;
}

export function createLocalStorageStorage(
  options: CreateLocalStorageStorageOptions,
): ConversationStorageStrategy {
  const { key } = options;

  function read(): StorageShape {
    if (typeof localStorage === 'undefined') return EMPTY;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return EMPTY;
      const parsed = JSON.parse(raw) as Partial<StorageShape>;
      return {
        conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
        messages: parsed.messages && typeof parsed.messages === 'object' ? parsed.messages : {},
      };
    } catch {
      // Corrupt blob — fail safe to empty rather than blocking the chat.
      return EMPTY;
    }
  }

  function write(data: StorageShape): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  return {
    loadConversations() {
      return read().conversations;
    },
    loadMessages(conversationId) {
      return read().messages[conversationId] ?? [];
    },
    saveConversation(conversation) {
      const data = read();
      const idx = data.conversations.findIndex((c) => c.id === conversation.id);
      if (idx >= 0) {
        data.conversations[idx] = conversation;
      } else {
        data.conversations = [conversation, ...data.conversations];
      }
      write(data);
    },
    saveMessages(conversationId, messages) {
      const data = read();
      // Deep clone so no live engine/proxy reference is persisted.
      data.messages[conversationId] =
        typeof structuredClone === 'function' ? structuredClone(messages) : messages.map((m) => ({ ...m }));
      write(data);
    },
    deleteConversation(conversationId) {
      const data = read();
      data.conversations = data.conversations.filter((c) => c.id !== conversationId);
      delete data.messages[conversationId];
      write(data);
    },
  };
}
