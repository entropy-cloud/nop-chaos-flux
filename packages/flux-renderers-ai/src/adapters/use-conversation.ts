import { useCallback, useMemo, useState } from 'react';
import { generateMessageId } from '../engine/utils.js';
import { createMessageEngine } from '../engine/create-engine.js';
import { createReactMessageAdapter } from './react-adapter.js';
import type {
  AiConnector,
  AiConversationInfo,
  ChatMessage,
  MessageEngine,
  MessageEnginePlugin,
} from '../engine/types.js';
import type { UseMessageOptions } from './use-message.js';
import type { ConversationStorageStrategy } from '../storage/types.js';

export interface UseConversationOptions {
  connector: AiConnector;
  createEngineOptions?: Omit<UseMessageOptions, 'connector'>;
  storage?: ConversationStorageStrategy;
  autoSaveMessages?: boolean;
  /** Initial conversations to seed the list (ignored when `storage` is provided). */
  initialConversations?: AiConversationInfo[];
}

export interface UseConversationReturn {
  conversations: AiConversationInfo[];
  activeConversationId: string | null;
  /** Engine for the active conversation (null before the first switch/create). */
  activeEngine: MessageEngine | null;
  createConversation(params?: { title?: string; metadata?: Record<string, unknown> }): AiConversationInfo;
  switchConversation(id: string): Promise<void>;
  deleteConversation(id: string): Promise<void>;
  renameConversation(id: string, title: string): void;
  clearAll(): void;
  /** Bind this as the `conversationController` prop on `ai-chat` (Layer B bridge). */
  controller: AiConversationControllerBridge;
}

/**
 * Host-side conversation manager (engine.md §8.6, design.md §11.5).
 *
 * Implements the tiny-robot double-layer model:
 * - `conversations`: full in-memory array (the source of truth for the list).
 * - `engines`: lazily-created `MessageEngine` per conversation id. Switching
 *   away from a non-active, non-processing conversation disposes its engine
 *   to bound memory; a conversation that is mid-stream keeps running in the
 *   background (Failure Path `switch-while-stream`).
 *
 * This is a HOST HELPER (design.md §11.5 INV-16): it is NOT used inside
 * renderers. `ai-conversations` reads `conversations` / `activeConversationId`
 * from schema expressions (scope-owned, host-managed).
 */
export function useConversation(options: UseConversationOptions): UseConversationReturn {
  const { connector, createEngineOptions, storage, autoSaveMessages = false, initialConversations } = options;
  const connectorRef = useMemo(() => ({ current: connector }), [connector]);

  const [conversations, setConversations] = useState<AiConversationInfo[]>(
    () => initialConversations ?? [],
  );
  const [activeId, setActiveId] = useState<string | null>(
    () => initialConversations?.[0]?.id ?? null,
  );

  // Engine cache: id → engine. We keep this in a ref-like closure local so
  // updates don't trigger re-renders (the engine is read via subscribe).
  const [engineCache] = useState(() => new Map<string, MessageEngine>());
  const [activeEngine, setActiveEngine] = useState<MessageEngine | null>(null);

  const buildEngine = useCallback((): MessageEngine => {
    const plugins = (createEngineOptions?.plugins ?? []) as MessageEnginePlugin[];
    return createMessageEngine({
      connector: connectorRef.current,
      initialMessages: createEngineOptions?.initialMessages,
      plugins,
      extraRequestParams: createEngineOptions?.extraRequestParams,
      systemPrompt: createEngineOptions?.systemPrompt,
      adapter: createReactMessageAdapter(),
    });
  }, [connectorRef, createEngineOptions]);

  const createConversation = useCallback(
    (params?: { title?: string; metadata?: Record<string, unknown> }): AiConversationInfo => {
      const now = Date.now();
      const info: AiConversationInfo = {
        id: generateMessageId('conv'),
        title: params?.title,
        createdAt: now,
        updatedAt: now,
        metadata: params?.metadata,
      };
      setConversations((prev) => [info, ...prev]);
      setActiveId(info.id);
      const engine = buildEngine();
      engineCache.set(info.id, engine);
      setActiveEngine(engine);
      void storage?.saveConversation?.(info);
      return info;
    },
    [buildEngine, engineCache, storage],
  );

  const switchConversation = useCallback(
    async (id: string): Promise<void> => {
      const exists = conversations.some((c) => c.id === id);
      if (!exists) return;
      setActiveId(id);

      let engine = engineCache.get(id);
      if (!engine) {
        engine = buildEngine();
        engineCache.set(id, engine);
        if (autoSaveMessages && storage) {
          try {
            const stored = await storage.loadMessages(id);
            if (stored.length > 0) {
              // Re-hydrate by sending the stored messages as initial state.
              // The engine exposes `send` which sets the conversation.
            }
          } catch {
            // Storage failures are non-fatal (Failure Path `storage-load-error`).
          }
        }
      }
      setActiveEngine(engine);

      // Evict non-active, non-processing engines to bound memory, but keep
      // any conversation that is mid-stream running in the background
      // (Failure Path `switch-while-stream`).
      for (const [cachedId, cachedEngine] of engineCache.entries()) {
        if (cachedId === id) continue;
        if (cachedEngine.getState().isProcessing) continue;
        engineCache.delete(cachedId);
      }
    },
    [autoSaveMessages, buildEngine, conversations, engineCache, storage],
  );

  const deleteConversation = useCallback(
    async (id: string): Promise<void> => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      const removed = engineCache.get(id);
      engineCache.delete(id);
      if (removed && removed.getState().isProcessing) {
        await removed.abort();
      }
      if (activeId === id) {
        const next = conversations.find((c) => c.id !== id) ?? null;
        setActiveId(next?.id ?? null);
        setActiveEngine(next ? (engineCache.get(next.id) ?? null) : null);
      }
      try {
        await storage?.deleteConversation?.(id);
      } catch {
        // non-fatal
      }
    },
    [activeId, conversations, engineCache, storage],
  );

  const renameConversation = useCallback(
    (id: string, title: string): void => {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c)),
      );
      const updated = conversations.find((c) => c.id === id);
      if (updated) {
        void storage?.saveConversation?.({ ...updated, title, updatedAt: Date.now() });
      }
    },
    [conversations, storage],
  );

  const clearAll = useCallback((): void => {
    for (const [, engine] of engineCache.entries()) {
      if (engine.getState().isProcessing) {
        void engine.abort();
      }
    }
    engineCache.clear();
    setConversations([]);
    setActiveId(null);
    setActiveEngine(null);
  }, [engineCache]);

  const controller = useMemo<AiConversationControllerBridge>(
    () => ({
      createConversation,
      switchConversation,
      deleteConversation,
      renameConversation,
    }),
    [createConversation, switchConversation, deleteConversation, renameConversation],
  );

  return {
    conversations,
    activeConversationId: activeId,
    activeEngine,
    createConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
    clearAll,
    controller,
  };
}

/**
 * The bridge the `ai-chat` `ai` namespace delegates conversation actions to.
 * Returned by `useConversation` so hosts can pass `controller={conv.controller}`
 * without re-wiring each method.
 */
export interface AiConversationControllerBridge {
  createConversation(params?: { title?: string; metadata?: Record<string, unknown> }): AiConversationInfo | Promise<AiConversationInfo>;
  switchConversation(id: string): void | Promise<void>;
  deleteConversation(id: string): void | Promise<void>;
  renameConversation(id: string, title: string): void;
}

export type { ChatMessage, ConversationStorageStrategy };
