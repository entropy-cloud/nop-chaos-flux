import type { AiConversationInfo, ChatMessage } from '../engine/types.js';

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
}

export type MaybePromise<T> = T | Promise<T>;
