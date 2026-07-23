import type { AiConversationInfo } from '../engine/types.js';

/**
 * Host-side conversation controller. The `ai` ActionScope namespace delegates
 * `createConversation` / `switchConversation` / `deleteConversation` /
 * `renameConversation` to this controller (design.md §14.2).
 *
 * The renderer does NOT own the conversations list — it is scope-owned and
 * host-managed via the `useConversation` host helper (engine.md §8.6,
 * design.md §11.5). This interface is the bridge the action namespace uses to
 * reach the host-owned conversation runtime.
 *
 * The host injects an implementation through the `ai-chat` schema
 * `conversationController` prop (typically resolved from an `xui:imports`
 * expression such as `${$ai.controller}`). When absent, conversation actions
 * return an `ok:false` result with a clear error — the chat panel itself still
 * works (Failure Path `ai-action-no-controller`).
 */
export interface AiConversationController {
  createConversation(params?: { title?: string; metadata?: Record<string, unknown> }): MaybePromise<AiConversationInfo>;
  switchConversation(id: string): MaybePromise<void>;
  deleteConversation(id: string): MaybePromise<void>;
  renameConversation(id: string, title: string): MaybePromise<void>;
}

export type MaybePromise<T> = T | Promise<T>;
