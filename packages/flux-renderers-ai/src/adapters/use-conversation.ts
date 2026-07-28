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

  // P1-3: per-switch version guard. Each switchConversation call captures the
  // current version; after its awaits, if a newer switch superseded it, it bails
  // (Failure Path FP-5 — A→B fast switch with a slow A loadMessages must not
  // let A's late resolve clobber engineB or wrongly evict it).
  const switchVersionRef = useRef(0);
  // P1-3: latest active-id mirror, read by the post-await eviction loop so it
  // evicts against the CURRENT active conversation (not the closure-captured
  // switch target, which a createConversation could have displaced). Mirrored
  // via effect + updated synchronously inside switchConversation.
  const activeIdRef = useRef<string | null>(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  });
  // P1-a (multi-audit): latest conversations mirror, read by deleteConversation's
  // post-await branch so it does not consult a stale closure list. Same
  // mirror+effect pattern as `activeIdRef`.
  const conversationsRef = useRef<AiConversationInfo[]>(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  });

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
          // getMessages() returns a per-message shallow-isolated copy (O-2),
          // so the async storage implementation cannot read a cross-turn
          // mixed snapshot even if it awaits before serializing.
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
    const controller = new AbortController();
    const { signal } = controller;
    (async () => {
      try {
        const convs = await storage.loadConversations();
        if (signal.aborted) return;
        if (convs.length > 0) {
          setConversations(convs);
          // Select the first conversation as active when none is active yet.
          setActiveId((current) => current ?? convs[0].id);
        }
      } catch (error) {
        if (signal.aborted) return;
        // Failure Path `storage-load-error`: non-fatal, keep the empty list.
        // AI-28: surface to host (callback may be undefined).
        reportStorageError({ phase: 'loadConversations', error });
      }
    })();
    return () => {
      controller.abort();
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
    // P1-a: keep the active-id mirror in sync synchronously so a post-await
    // reader (deleteConversation / switchConversation eviction) sees this
    // activation even before the mirror effect flushes — the effect alone
    // loses the race against the abort() microtask (Failure Path FP-1).
    activeIdRef.current = info.id;
    const engine = buildEngineFor(info.id);
    engineCache.set(info.id, engine);
    setActiveEngine(engine);
    // P1-2: route saveConversation failures through reportStorageError
    // (parity with the saveMessages / load* call sites). Previously this was a
    // bare `void storage?.saveConversation?.(...)` that silently swallowed
    // rejections — the host had no way to observe a create-time persistence
    // failure (Failure Path FP-4).
    Promise.resolve(storage?.saveConversation?.(info)).catch((error: unknown) => {
      reportStorageError({ phase: 'saveConversation', conversationId: info.id, error });
    });
    return info;
  }

  async function switchConversation(id: string): Promise<void> {
    const exists = conversations.some((c) => c.id === id);
    if (!exists) return;
    setActiveId(id);
    // P1-3: stamp this switch with a version + sync the active-id mirror so the
    // post-await checks (version guard + eviction) see the freshest state even
    // before the effect flushes.
    const myVersion = ++switchVersionRef.current;
    activeIdRef.current = id;

    let engine = engineCache.get(id);
    if (!engine) {
      engine = buildEngineFor(id);
      engineCache.set(id, engine);
      if (storage) {
        try {
          const stored = await storage.loadMessages(id);
          // P1-3: a newer switch superseded this one while loadMessages was
          // pending — drop the late resolve before it can hydrate a stale
          // engine or displace the now-active one (Failure Path FP-5).
          if (switchVersionRef.current !== myVersion) return;
          if (stored.length > 0) {
            engine.setMessages(stored);
          }
        } catch (error) {
          reportStorageError({ phase: 'loadMessages', conversationId: id, error });
        }
      }
    }
    // P1-3: a newer switch owns the active slot now — do not promote this
    // (possibly stale) engine to activeEngine.
    if (switchVersionRef.current !== myVersion) return;
    setActiveEngine(engine);

    // P1-3: evict against the CURRENT active id (activeIdRef.current), not the
    // closure-captured `id` — a createConversation between the await and here
    // could have displaced `id`, and evicting against the stale target would
    // wrongly drop the now-active engine.
    //
    // P1-c (open-audit): eviction is STORAGE-AWARE. Without storage there is
    // no rehydration path, so evicting an idle engine permanently loses its
    // message history (a no-storage A→B→A round-trip would rebuild A empty).
    // no-storage is ephemeral-by-design; the host can still bound memory
    // explicitly via deleteConversation. With storage, idle non-active
    // engines are evicted as before (they can be rehydrated on demand).
    if (!storage) return;
    const currentActiveId = activeIdRef.current;
    for (const [cachedId, cachedEngine] of engineCache.entries()) {
      if (cachedId === currentActiveId) continue;
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
    // P1-a (multi-audit): read the freshest active id / list via refs — a
    // createConversation during the await could have displaced `id`, and the
    // closure-captured `activeId` / `conversations` would wrongly reset the
    // now-active conversation (Failure Path FP-1).
    if (activeIdRef.current === id) {
      const next = conversationsRef.current.find((c) => c.id !== id) ?? null;
      const nextId = next?.id ?? null;
      setActiveId(nextId);
      activeIdRef.current = nextId;
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
      // P1-2: route saveConversation failures through reportStorageError
      // (parity with create + the saveMessages / load* call sites). Was a bare
      // `void storage?.saveConversation?.(...)` that silently swallowed
      // rejections — a rename-time persistence failure was unobservable.
      const next = { ...updated, title, updatedAt: now };
      Promise.resolve(storage?.saveConversation?.(next)).catch((error: unknown) => {
        reportStorageError({ phase: 'saveConversation', conversationId: id, error });
      });
    }
  }

  function clearAll(): void {
    // Capture ids before mutating the cache so the storage fan-out iterates a
    // stable snapshot (the cache is cleared below).
    const ids = [...engineCache.keys()];
    for (const [, engine] of engineCache.entries()) {
      if (engine.getState().isProcessing) {
        void engine.abort();
      }
    }
    for (const id of ids) detachEngine(id);
    engineCache.clear();
    setConversations([]);
    setActiveId(null);
    activeIdRef.current = null;
    setActiveEngine(null);
    // P1-b (open-audit): keep storage consistent so a remount does not
    // rehydrate cleared items (FP-2 ghost rehydration). Prefer an atomic
    // `storage.clearAll` when the host provides one; otherwise fall back to a
    // per-id `deleteConversation` fan-out (mirroring deleteConversation's
    // storage path). Per-id failures route through reportStorageError so one
    // rejection doesn't hide the others (FP-3). Fire-and-forget, like the
    // existing `void engine.abort()` calls.
    if (storage?.clearAll) {
      Promise.resolve(storage.clearAll()).catch((error: unknown) => {
        reportStorageError({ phase: 'deleteConversation', error });
      });
    } else {
      for (const id of ids) {
        Promise.resolve(storage?.deleteConversation?.(id)).catch((error: unknown) => {
          reportStorageError({ phase: 'deleteConversation', conversationId: id, error });
        });
      }
    }
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
