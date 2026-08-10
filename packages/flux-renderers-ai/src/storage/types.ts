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
   * Optional atomic clear of every persisted conversation, for HOST-side use.
   *
   * FIND-02 (2026-08-11, plan 2026-08-11-0008-3): `useConversation.clearAll`
   * does NOT invoke this member anymore — it clears storage via per-id
   * `deleteConversation` fan-out over the clearAll-TIME conversation snapshot.
   * An atomic clear chained behind the pending-save drain settles AFTER any
   * conversation created in the clearAll→drain window and wipes its record
   * (reverse race). Per-id deletes only touch conversations that existed at
   * clearAll time, so post-clearAll writes survive. Hosts that want a true
   * storage wipe call this directly; failures route through `onStorageError`
   * with phase `deleteConversation` (list-level: no `conversationId`).
   *
   * P1-b (open-audit): added so `clearAll` is no longer a storage-bypassing
   * memory-only reset (which caused ghost rehydration on remount).
   */
  clearAll?: () => MaybePromise<void>;
}
