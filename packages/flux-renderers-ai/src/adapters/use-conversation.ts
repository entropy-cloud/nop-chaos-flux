import { useCallback, useEffect, useRef, useState } from 'react';
import { generateMessageId } from '../engine/utils.js';
import { createMessageEngine } from '../engine/create-engine.js';
import { createReactMessageAdapter } from './react-adapter.js';
import type {
  AiConnector,
  AiConversationInfo,
  ChatMessage,
  MessageEngine,
  MessageEnginePlugin,
  RequestState,
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
 * Persistence (P3): when `storage` is injected the hook bootstraps the
 * conversation list on mount, re-hydrates messages on switch via
 * `engine.setMessages`, and auto-saves a snapshot when a turn completes
 * (`requestState`: `processing` → `completed|aborted|error`). Storage
 * failures are non-fatal (Failure Paths `storage-load-error` /
 * `storage-save-error`).
 *
 * This is a HOST HELPER (design.md §11.5 INV-16): it is NOT used inside
 * renderers. `ai-conversations` reads `conversations` / `activeConversationId`
 * from schema expressions (scope-owned, host-managed).
 */
export function useConversation(options: UseConversationOptions): UseConversationReturn {
  const { connector, createEngineOptions, storage, autoSaveMessages = false, initialConversations, onStorageError } = options;
  const connectorRef = useRef(connector);
  useEffect(() => {
    connectorRef.current = connector;
  }, [connector]);

  // AI-28: stable storage-error reporter. useCallback is retained here (not
  // removed by F3.1) because the mount-bootstrap effect depends on it — the
  // test failure in use-conversation.test.ts is the profiling evidence that
  // plain-function identity causes the effect to double-fire.
  const onStorageErrorRef = useRef(onStorageError);
  useEffect(() => {
    onStorageErrorRef.current = onStorageError;
  });
  const reportStorageError = useCallback(
    (event: ConversationStorageErrorEvent): void => {
      onStorageErrorRef.current?.(event);
      if (typeof console !== 'undefined') {
        console.warn(`[useConversation] storage error: ${event.phase}`, event.error);
      }
    },
    [],
  );

  // When storage is injected it owns the source of truth: the in-memory list
  // is seeded empty and `loadConversations()` runs on mount. Without storage
  // the host-provided `initialConversations` seeds the list.
  const [conversations, setConversations] = useState<AiConversationInfo[]>(() =>
    storage ? [] : (initialConversations ?? []),
  );
  const [activeId, setActiveId] = useState<string | null>(() =>
    storage ? null : (initialConversations?.[0]?.id ?? null),
  );

  // Engine cache: id → engine. We keep this in a ref-like closure local so
  // updates don't trigger re-renders (the engine is read via subscribe).
  const [engineCache] = useState(() => new Map<string, MessageEngine>());
  const [activeEngine, setActiveEngine] = useState<MessageEngine | null>(null);

  // Per-engine auto-save unsubscribe handles, kept alongside the engine cache
  // so subscriptions are torn down on evict / delete / unmount.
  const autoSaveUnsubsRef = useRef(new Map<string, () => void>());

  function buildEngine(): MessageEngine {
    const plugins = (createEngineOptions?.plugins ?? []) as MessageEnginePlugin[];
    return createMessageEngine({
      connector: connectorRef.current,
      initialMessages: createEngineOptions?.initialMessages,
      plugins,
      extraRequestParams: createEngineOptions?.extraRequestParams,
      systemPrompt: createEngineOptions?.systemPrompt,
      // F1.2: forward the agentic tool triad so useConversation-built engines
      // can run multi-round tool_calls loops (parity with use-message.ts).
      tools: createEngineOptions?.tools,
      toolExecutor: createEngineOptions?.toolExecutor,
      maxToolRounds: createEngineOptions?.maxToolRounds,
      adapter: createReactMessageAdapter(),
    });
  }

  /**
   * Attach a `requestState` subscription that persists the engine snapshot
   * when a turn completes. Returns the unsubscribe handle (no-op when storage
   * or `autoSaveMessages` is disabled). Bound to the engine lifecycle: the
   * caller evicts the handle together with the engine cache entry.
   */
  function attachAutoSave(engine: MessageEngine, conversationId: string): () => void {
    const prev = autoSaveUnsubsRef.current.get(conversationId);
    if (prev) prev();
    if (!storage || !autoSaveMessages) {
      autoSaveUnsubsRef.current.delete(conversationId);
      return () => {};
    }
    let prevState: RequestState = engine.getState().requestState;
    const unsub = engine.subscribe('requestState', (state) => {
      const next = state.requestState;
      const wasProcessing = prevState === 'processing';
      const isDone = next === 'completed' || next === 'aborted' || next === 'error';
      prevState = next;
      if (wasProcessing && isDone) {
        try {
          Promise.resolve(storage.saveMessages(conversationId, engine.getMessages())).catch(
            (error: unknown) => {
              reportStorageError({ phase: 'saveMessages', conversationId, error });
            },
          );
        } catch (error) {
          reportStorageError({ phase: 'saveMessages', conversationId, error });
        }
      }
    });
    autoSaveUnsubsRef.current.set(conversationId, unsub);
    return unsub;
  }

  function buildEngineFor(conversationId: string): MessageEngine {
    const engine = buildEngine();
    attachAutoSave(engine, conversationId);
    return engine;
  }

  function detachEngine(conversationId: string): void {
    const unsub = autoSaveUnsubsRef.current.get(conversationId);
    if (unsub) {
      unsub();
      autoSaveUnsubsRef.current.delete(conversationId);
    }
  }

  // ---- Mount bootstrap: hydrate conversations from storage (P3) ----
  useEffect(() => {
    if (!storage) return;
    let cancelled = false;
    (async () => {
      try {
        const convs = await storage.loadConversations();
        if (cancelled) return;
        if (convs.length > 0) {
          setConversations(convs);
          // Select the first conversation as active when none is active yet.
          setActiveId((current) => current ?? convs[0].id);
        }
      } catch (error) {
        // Failure Path `storage-load-error`: non-fatal, keep the empty list.
        // AI-28: surface to host (callback may be undefined).
        reportStorageError({ phase: 'loadConversations', error });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storage, reportStorageError]);

  // ---- Unmount: abort in-flight streams + tear down auto-save subscriptions ----
  // F2.2: every engine in the cache is SELF-BUILT by this hook, so on full
  // unmount (route switch / component teardown) we abort any in-flight stream
  // so no orphaned background connection lingers. This is distinct from the
  // intentional "switch-while-stream" background keep-alive handled in
  // `switchConversation` (which retains processing engines between active
  // switches, not on unmount).
  useEffect(() => {
    const unsubs = autoSaveUnsubsRef.current;
    const cache = engineCache;
    return () => {
      for (const engine of cache.values()) {
        if (engine.getState().isProcessing) {
          void engine.abort();
        }
      }
      for (const unsub of unsubs.values()) unsub();
      unsubs.clear();
    };
  }, [engineCache]);

  function createConversation(params?: { title?: string; metadata?: Record<string, unknown> }): AiConversationInfo {
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
    const engine = buildEngineFor(info.id);
    engineCache.set(info.id, engine);
    setActiveEngine(engine);
    void storage?.saveConversation?.(info);
    return info;
  }

  async function switchConversation(id: string): Promise<void> {
    const exists = conversations.some((c) => c.id === id);
    if (!exists) return;
    setActiveId(id);

    let engine = engineCache.get(id);
    if (!engine) {
      engine = buildEngineFor(id);
      engineCache.set(id, engine);
      if (storage) {
        try {
          const stored = await storage.loadMessages(id);
          if (stored.length > 0) {
            engine.setMessages(stored);
          }
        } catch (error) {
          reportStorageError({ phase: 'loadMessages', conversationId: id, error });
        }
      }
    }
    setActiveEngine(engine);

    for (const [cachedId, cachedEngine] of engineCache.entries()) {
      if (cachedId === id) continue;
      if (cachedEngine.getState().isProcessing) continue;
      detachEngine(cachedId);
      engineCache.delete(cachedId);
    }
  }

  async function deleteConversation(id: string): Promise<void> {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    const removed = engineCache.get(id);
    detachEngine(id);
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
    } catch (error) {
      reportStorageError({ phase: 'deleteConversation', conversationId: id, error });
    }
  }

  function renameConversation(id: string, title: string): void {
    const now = Date.now();
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title, updatedAt: now } : c)));
    const updated = conversations.find((c) => c.id === id);
    if (updated) {
      void storage?.saveConversation?.({ ...updated, title, updatedAt: now });
    }
  }

  function clearAll(): void {
    for (const [, engine] of engineCache.entries()) {
      if (engine.getState().isProcessing) {
        void engine.abort();
      }
    }
    for (const id of engineCache.keys()) detachEngine(id);
    engineCache.clear();
    setConversations([]);
    setActiveId(null);
    setActiveEngine(null);
  }

  const controller: AiConversationControllerBridge = {
    createConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
  };

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
