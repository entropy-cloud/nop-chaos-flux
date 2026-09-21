import type { AiConnector, AiConversationInfo, MessageEngine } from '../engine/types.js';
import type { UseMessageOptions } from './use-message.js';
import type { ConversationStorageStrategy } from '../storage/types.js';

/**
 * Public contract types of `useConversation` ([oversized-file governance]:
 * extracted from use-conversation.ts). The hook implementation imports these
 * back as types; host-facing shapes are unchanged.
 */

export interface UseConversationOptions {
  connector: AiConnector;
  /**
   * Engine-construction options forwarded to the hook's SELF-BUILT engines.
   * `connector` and `engine` are excluded: the connector flows through the
   * hot-swap path (open P2-1) and `engine` would be silently dropped by
   * `buildEngine` (open P2-2 — the type contract rejects it at compile time).
   */
  createEngineOptions?: Omit<UseMessageOptions, 'connector' | 'engine'>;
  storage?: ConversationStorageStrategy;
  autoSaveMessages?: boolean;
  /** Initial conversations to seed the list (ignored when `storage` is provided). */
  initialConversations?: AiConversationInfo[];
  /**
   * AI-28: host callback invoked when a storage operation fails. Storage
   * failures remain non-fatal (the engine and conversation list are
   * unaffected), but the host can now observe them to toast / retry / log —
   * instead of the previous silent `console.warn`. Receives the failing
   * phase, the optional conversation id, and the caught error.
   */
  onStorageError?: (event: ConversationStorageErrorEvent) => void;
}

export interface ConversationStorageErrorEvent {
  /** Which storage operation failed. */
  phase:
    | 'loadConversations'
    | 'loadMessages'
    | 'saveConversation'
    | 'saveMessages'
    | 'deleteConversation';
  /** Conversation id when applicable (absent for list-level operations). */
  conversationId?: string;
  /** The caught error (typed `unknown` to avoid assuming an Error subclass). */
  error: unknown;
}

export interface UseConversationReturn {
  conversations: AiConversationInfo[];
  activeConversationId: string | null;
  /** Engine for the active conversation (null before the first switch/create). */
  activeEngine: MessageEngine | null;
  /**
   * [G5-R4-视角5-01] id of the conversation whose engine is currently being
   * hydrated by `switchConversation` (null when settled). During this window
   * `activeEngine` is null — hosts can render a loading affordance instead of
   * the previous conversation's messages.
   */
  switchingId: string | null;
  createConversation(params?: { title?: string; metadata?: Record<string, unknown> }): AiConversationInfo;
  switchConversation(id: string): Promise<void>;
  deleteConversation(id: string): Promise<void>;
  renameConversation(id: string, title: string): void;
  clearAll(): void;
  /** Bind this as the `conversationController` prop on `ai-chat` (Layer B bridge). */
  controller: AiConversationControllerBridge;
}

export interface AiConversationControllerBridge {
  createConversation(params?: { title?: string; metadata?: Record<string, unknown> }): AiConversationInfo | Promise<AiConversationInfo>;
  switchConversation(id: string): void | Promise<void>;
  deleteConversation(id: string): void | Promise<void>;
  renameConversation(id: string, title: string): void;
}
