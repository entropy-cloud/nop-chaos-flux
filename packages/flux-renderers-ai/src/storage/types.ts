import type { AiConversationInfo, ChatMessage, MaybePromise } from '../engine/types.js';

/**
 * Persistence strategy contract (interface only). The package ships NO
 * concrete implementation — localStorage / IndexedDB / server storage are all
 * host responsibilities, injected via `xui:imports` (design.md §11.3, §18.2
 * invariant 13).
 */
export interface ConversationStorageStrategy {
  loadConversations: () => MaybePromise<AiConversationInfo[]>;
  loadMessages: (conversationId: string) => MaybePromise<ChatMessage[]>;
  saveConversation: (conversation: AiConversationInfo) => MaybePromise<void>;
  saveMessages: (conversationId: string, messages: ChatMessage[]) => MaybePromise<void>;
  deleteConversation?: (conversationId: string) => MaybePromise<void>;
  /**
   * Optional atomic clear of every persisted conversation. When absent (the
   * default), `useConversation.clearAll` falls back to per-id
   * `deleteConversation` calls — so existing hosts need no migration. Hosts
   * that can clear atomically (e.g. a single SQL `DELETE`) provide this for a
   * one-shot optimization; failures route through `onStorageError` with phase
   * `deleteConversation` (list-level: no `conversationId`).
   *
   * P1-b (open-audit): added so `clearAll` is no longer a storage-bypassing
   * memory-only reset (which caused ghost rehydration on remount).
   */
  clearAll?: () => MaybePromise<void>;
}
