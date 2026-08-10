import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { generateMessageId } from '../engine/utils.js';
import { createMessageEngine } from '../engine/create-engine.js';
import { createReactMessageAdapter } from './react-adapter.js';
import { attachAutoSave } from './use-conversation-autosave.js';
import { hydrateConversationsFromStorage } from './use-conversation-bootstrap.js';
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
  // multi P2-7 (2026-08-10): storage ref mirror — the mount bootstrap effect
  // must not re-run `loadConversations` when a host re-constructs the storage
  // object every render (inline construction). Aligns with the connectorRef
  // precedent: the ref is synced by an effect; the bootstrap effect reads
  // `storageRef.current` and keeps stable deps.
  const storageRef = useRef(storage);
  useEffect(() => {
    storageRef.current = storage;
  }, [storage]);

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
  // K-⑥ (Cycle 2 / I4): latest switch target id. A switch only supersedes an
  // in-flight switch when it targets a DIFFERENT conversation — a same-id fast
  // re-switch must not drop the in-flight hydration wholesale. Displacement
  // methods (create/delete/clearAll) reset the target to null so ANY in-flight
  // switch is invalidated regardless of target.
  const switchTargetRef = useRef<string | null>(null);
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
  // K-⑦-1 (Cycle 2 / I4): marks that clearAll emptied the list. The mount
  // bootstrap consults it after `loadConversations` resolves: a clearAll that
  // happened while the load was pending must not have the loaded list
  // restored (the bootstrap merges — but only into a list the host did NOT
  // deliberately clear).
  const listClearedRef = useRef(false);
  // R1-F4 (2026-08-11, engine/adapter P2): ids deleted while the mount
  // bootstrap `loadConversations` is pending. K-⑦'s merge base is the RAW
  // loaded `convs` — a delete filters the mirror synchronously, but the
  // loaded base still contains the id → the merge resurrects it as a ghost
  // list item (and a sole deleted conversation would wrongly become active).
  // Mirrors the `listClearedRef` clearAll guard precedent; cleared after the
  // one-time bootstrap merge.
  const deletedDuringLoadRef = useRef<Set<string>>(new Set());

  // Engine cache: id → engine. We keep this in a ref-like closure local so
  // updates don't trigger re-renders (the engine is read via subscribe).
  const [engineCache] = useState(() => new Map<string, MessageEngine>());
  const [activeEngine, setActiveEngine] = useState<MessageEngine | null>(null);

  // open P2-1 (2026-08-10): connector hot-swap fan-out. `buildEngine` captures
  // `connectorRef.current` at build time; without this fan-out a host swapping
  // the connector would leave every cached SELF-BUILT engine on stale
  // credentials/model (2151 hot-swap family). m4 does not apply — the cache
  // holds only engines built by this hook; external engines are never cached
  // here. `setConnector` is idempotent (skips the same reference), so the
  // mount-time run is a no-op for already-correct engines.
  useEffect(() => {
    for (const cached of engineCache.values()) {
      cached.setConnector(connector);
    }
  }, [connector, engineCache]);

  // Per-engine auto-save unsubscribe handles, kept alongside the engine cache
  // so subscriptions are torn down on evict / delete / unmount.
  const autoSaveUnsubsRef = useRef(new Map<string, () => void>());

  // K3 (ai-invariant-loop): per-conversation in-flight save chain. Every
  // auto-save is chained onto the conversation's latest pending promise so a
  // save that started before a delete/clearAll can never land AFTER the
  // storage deletion (ghost re-landing). deleteConversation awaits the chain
  // (async signature), clearAll chains the storage clear behind it (sync
  // signature `(): void` is preserved — the drain→clear order is guaranteed
  // without awaiting).
  const pendingSavesRef = useRef(new Map<string, Promise<unknown>>());

  // Host-input sync sweep (2026-08-10, multi P2-7 / open P2-1 / open P2-2):
  // `connector` is ref-mirrored + hot-swapped (fan-out above); `storage` is
  // ref-mirrored for the mount bootstrap; `createEngineOptions` fields are
  // INTENTIONALLY build-time captured (engines are built lazily per
  // conversation — a host changing options mid-session builds a new engine,
  // same documented contract as use-message's hot-swap scope); `onStorageError`
  // is ref-mirrored (`onStorageErrorRef`); `initialConversations` is
  // mount-only by design.
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
   * caller evicts the handle together with the engine cache entry. Lives in
   * `use-conversation-autosave.ts` (oversized-code-files split) — the helper
   * receives the hook's refs + storage-error reporter via `AutoSaveDeps`.
   */
  function attachAutoSaveToEngine(engine: MessageEngine, conversationId: string): () => void {
    return attachAutoSave(engine, conversationId, {
      storage,
      autoSaveMessages,
      pendingSavesRef,
      conversationsRef,
      autoSaveUnsubsRef,
      reportStorageError,
    });
  }

  function buildEngineFor(conversationId: string): MessageEngine {
    const engine = buildEngine();
    attachAutoSaveToEngine(engine, conversationId);
    return engine;
  }

  function detachEngine(conversationId: string): void {
    const unsub = autoSaveUnsubsRef.current.get(conversationId);
    if (unsub) {
      unsub();
      autoSaveUnsubsRef.current.delete(conversationId);
    }
  }

  // K-⑥ (Cycle 2 / I4): build (or reuse) the engine for a conversation and
  // hydrate its stored messages, mirroring `switchConversation`'s
  // loadMessages + version-guard semantics (id-aware: a same-id switch must
  // not drop the late hydration). Used by the delete-active fixup.
  function ensureEngineAndHydrate(conversationId: string): MessageEngine {
    const existing = engineCache.get(conversationId);
    if (existing) return existing;
    const engine = buildEngineFor(conversationId);
    engineCache.set(conversationId, engine);
    if (storage) {
      const myVersion = switchVersionRef.current;
      void (async () => {
        try {
          const stored = await storage.loadMessages(conversationId);
          // A displacement during the await (create/delete/clearAll — target
          // reset to null — or a switch to a DIFFERENT conversation)
          // invalidates the late hydration. A same-id switch must NOT drop it
          // (same-id fast re-switch / bootstrap members).
          if (
            switchVersionRef.current !== myVersion &&
            switchTargetRef.current !== conversationId
          ) {
            return;
          }
          if (stored.length > 0) engine.setMessages(stored);
        } catch (error) {
          reportStorageError({ phase: 'loadMessages', conversationId, error });
        }
      })();
    }
    return engine;
  }

  // useEffectEvent (React 19): the mount-bootstrap effect needs the helper's
  // fresh closure without forcing mount-once deps to include the per-render
  // function identity (which would re-run loadConversations every render).
  const ensureEngineAndHydrateEvent = useEffectEvent((conversationId: string) =>
    ensureEngineAndHydrate(conversationId),
  );

  // ---- Mount bootstrap: hydrate conversations from storage (P3) ----
  // Load + merge body in `use-conversation-bootstrap.ts` (attachAutoSave
  // plain-function precedent); this effect owns the AbortController; K-⑥-3
  // build-on-demand runs via `onFirstActiveSelected` (in-effect closure).
  useEffect(() => {
    if (!storageRef.current) return;
    const controller = new AbortController();
    void hydrateConversationsFromStorage({
      storageRef,
      conversationsRef,
      activeIdRef,
      listClearedRef,
      deletedDuringLoadRef,
      reportStorageError,
      setConversations,
      setActiveId,
      signal: controller.signal,
      onFirstActiveSelected: (conversationId) => {
        activeIdRef.current = conversationId;
        const engine = ensureEngineAndHydrateEvent(conversationId);
        setActiveEngine(engine);
      },
    });
    return () => {
      controller.abort();
    };
  }, [reportStorageError]);

  // R1-F3 (2026-08-11, engine/adapter P2): no-storage + `initialConversations`
  // first-session build-on-demand — `activeId` seeds from `initialConversations[0]`
  // but `activeEngine` stayed null (K-⑥-3 covered only the storage path);
  // build on demand, skip hydrate. Idempotent for strict-mode double mount.
  const buildEngineForEvent = useEffectEvent((conversationId: string) =>
    buildEngineFor(conversationId),
  );
  useEffect(() => {
    if (storageRef.current) return;
    const targetId = activeIdRef.current;
    if (!targetId || engineCache.get(targetId)) return;
    const engine = buildEngineForEvent(targetId);
    engineCache.set(targetId, engine);
    setActiveEngine(engine);
  }, [engineCache]);

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
    const pendingSaves = pendingSavesRef.current;
    return () => {
      // multi P2-2 (2026-08-10): detach (unsubscribe) BEFORE abort — the
      // abort's requestState transition ('processing' → 'aborted') fires the
      // auto-save callback, and an abort-triggered save of the aborted
      // snapshot must not be enqueued by a hook that is about to be gone (no
      // drain surface left → cross-mount ghost on rapid remount). Mirrors
      // clearAll's K3 detach-before-abort ordering.
      for (const unsub of unsubs.values()) unsub();
      unsubs.clear();
      for (const engine of cache.values()) {
        if (engine.getState().isProcessing) {
          void engine.abort();
        }
      }
      // Pending saves chained BEFORE unmount (completed turns) continue to
      // settle on their own — the chain is promise-owned and its settlement
      // re-check reads the mirror, which outlives the hook. Drop the map so
      // the unmounted hook has no stale drain surface.
      pendingSaves.clear();
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
    // K4 (ai-invariant-loop): keep the list mirror in sync SYNCHRONOUSLY — a
    // same-tick reader (renameConversation / deleteConversation) must see the
    // new conversation before the mirror effect flushes (parity with the
    // activeIdRef synchronous update below).
    conversationsRef.current = [info, ...conversationsRef.current];
    // K-⑥ (Cycle 2 / I4): displacement — invalidate any in-flight switch.
    ++switchVersionRef.current;
    switchTargetRef.current = null;
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
    // K-K3/④ (Cycle 2 / I4): the metadata write is CHAINED into the
    // conversation's pending-save drain (K3 排空链 now covers metadata writes
    // too — a same-tick clearAll/delete must be able to drain it) and
    // re-checks the mirror at settlement time (a same-tick delete/clearAll
    // skips the write — no ghost re-save).
    const prevPending = pendingSavesRef.current.get(info.id);
    const pending = Promise.resolve(prevPending)
      .catch(() => {})
      .then(() => {
        if (!conversationsRef.current.some((c) => c.id === info.id)) return;
        return storage?.saveConversation?.(info);
      });
    pending.catch((error: unknown) => {
      reportStorageError({ phase: 'saveConversation', conversationId: info.id, error });
    });
    pendingSavesRef.current.set(info.id, pending);
    return info;
  }

  async function switchConversation(id: string): Promise<void> {
    // K-⑥-2 (Cycle 2 / I4): the existence check reads the SYNCHRONOUS mirror
    // (not the render closure) — a same-tick deleteConversation(X)+
    // switchConversation(X) must see X already removed and bail BEFORE
    // `setActiveId(id)` (the guard must be in effect before the active id
    // moves, or the deleted target gets promoted + a fresh engine cached).
    const exists = conversationsRef.current.some((c) => c.id === id);
    if (!exists) return;
    setActiveId(id);
    // P1-3: stamp this switch with a version + sync the active-id mirror so the
    // post-await checks (version guard + eviction) see the freshest state even
    // before the effect flushes.
    const myVersion = ++switchVersionRef.current;
    switchTargetRef.current = id;
    activeIdRef.current = id;

    let engine = engineCache.get(id);
    if (!engine) {
      engine = buildEngineFor(id);
      engineCache.set(id, engine);
      if (storage) {
        try {
          const stored = await storage.loadMessages(id);
          // P1-3 + K-⑥ (Cycle 2 / I4): a newer switch supersedes this one only
          // when it targets a DIFFERENT conversation — drop the late resolve
          // before it can hydrate a stale engine or displace the now-active
          // one (Failure Path FP-5). A same-id fast re-switch must NOT drop
          // this hydration wholesale.
          if (switchVersionRef.current !== myVersion && switchTargetRef.current !== id) {
            return;
          }
          if (stored.length > 0) {
            engine.setMessages(stored);
          }
        } catch (error) {
          reportStorageError({ phase: 'loadMessages', conversationId: id, error });
        }
      }
    }
    // P1-3 + K-⑥: a newer switch (different target) owns the active slot now —
    // do not promote this (possibly stale) engine to activeEngine.
    if (switchVersionRef.current !== myVersion && switchTargetRef.current !== id) return;
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
  // R1-F4 (2026-08-11, engine/adapter P2): record the deletion so the pending
  // bootstrap merge filters it out of the loaded base (K-⑦ merge guard —
  // see `deletedDuringLoadRef`).
  deletedDuringLoadRef.current.add(id);
    // K4/K-K4 (ai-invariant-loop): keep the list mirror in sync SYNCHRONOUSLY —
    // a same-tick reader (renameConversation / deleteConversation fixup /
    // switchConversation exists-check) must see the deletion before the mirror
    // effect flushes (K-K4/②-1: the delete's own fixup used to read a stale
    // mirror and pick a ghost next-active; K-⑥-1 ghost fixup root cause).
    conversationsRef.current = conversationsRef.current.filter((c) => c.id !== id);
    // K-⑥ (Cycle 2 / I4): displacement — invalidate any in-flight switch.
    ++switchVersionRef.current;
    switchTargetRef.current = null;
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
      // K-⑥ (Cycle 2 / I4): build the next engine on demand instead of
      // null-hanging — a conversation that was never switched to has no
      // cached engine (registration member "delete active → build-on-demand").
      if (next) {
        const nextEngine = ensureEngineAndHydrate(next.id);
        setActiveEngine(nextEngine);
      } else {
        setActiveEngine(null);
      }
    }
    // K3: drain the conversation's in-flight saves BEFORE the storage delete
    // — a save that started before deleteConversation must settle first, so
    // it can never re-land its messages after the record is gone (ghost).
    // The chain entry is dropped after draining (its save is complete or
    // failed and already routed through reportStorageError).
    const pendingSave = pendingSavesRef.current.get(id);
    if (pendingSave) {
      await Promise.allSettled([pendingSave]);
      pendingSavesRef.current.delete(id);
    }
    try {
      await storage?.deleteConversation?.(id);
    } catch (error) {
      reportStorageError({ phase: 'deleteConversation', conversationId: id, error });
    }
  }

  function renameConversation(id: string, title: string): void {
    const now = Date.now();
    // K4 (ai-invariant-loop): read the list from the ref mirror, NOT the
    // render closure — a same-tick createConversation+renameConversation
    // would otherwise read a stale snapshot (the create's setState has not
    // re-rendered yet) and silently skip the rename's persistence.
    const updated = conversationsRef.current.find((c) => c.id === id);
    if (!updated) return;
    const next = { ...updated, title, updatedAt: now };
    setConversations((prev) => prev.map((c) => (c.id === id ? next : c)));
    // K4: keep the list mirror in sync synchronously (same-tick readers).
    conversationsRef.current = conversationsRef.current.map((c) => (c.id === id ? next : c));
    // P1-2: route saveConversation failures through reportStorageError
    // (parity with create + the saveMessages / load* call sites). Was a bare
    // `void storage?.saveConversation?.(...)` that silently swallowed
    // rejections — a rename-time persistence failure was unobservable.
    // K-K4/② (Cycle 2 / I4): the metadata write is CHAINED into the
    // conversation's pending-save drain (delete's drain and clearAll's
    // drain must cover it — a gated rename write must not land after the
    // storage delete/clear, K-K4/②-1/2) and re-checks the mirror at
    // settlement time (a same-tick delete/clearAll skips the write — the
    // renamed record is not re-saved as a ghost).
    const prevPending = pendingSavesRef.current.get(id);
    const pending = Promise.resolve(prevPending)
      .catch(() => {})
      .then(() => {
        if (!conversationsRef.current.some((c) => c.id === id)) return;
        return storage?.saveConversation?.(next);
      });
    pending.catch((error: unknown) => {
      reportStorageError({ phase: 'saveConversation', conversationId: id, error });
    });
    pendingSavesRef.current.set(id, pending);
  }

  function clearAll(): void {
    // P1-3/P1-4 (2026-08-10 multi-audit): the fan-out enumeration source is
    // the FULL storage conversation set, not just `engineCache.keys()`. The
    // cache only holds sessions that built an engine — a session evicted by
    // `switchConversation` (its in-flight autoSave still pending) or loaded
    // by bootstrap but never opened would otherwise escape the drain and the
    // per-id delete fallback → their records survive the clear → ghost
    // rehydration on remount (FP-2). The list mirror
    // (`conversationsRef.current`) + pending-save keys + engine cache cover
    // every session that can hold storage state.
    const ids = [
      ...new Set([
        ...engineCache.keys(),
        ...pendingSavesRef.current.keys(),
        ...conversationsRef.current.map((c) => c.id),
      ]),
    ];
    // K3: detach (unsubscribe) BEFORE aborting — an abort's requestState
    // transition fires the auto-save callback, and an abort-triggered save of
    // the aborted snapshot must not be able to start after the storage clear.
    // Previously the abort loop ran first, letting the aborted snapshot
    // re-land after the clear (ghost).
    for (const id of ids) detachEngine(id);
    for (const id of ids) {
      const engine = engineCache.get(id);
      if (engine && engine.getState().isProcessing) {
        void engine.abort();
      }
    }
    engineCache.clear();
    // K-⑦-1 (Cycle 2 / I4): mark the list as deliberately cleared so a
    // pending mount bootstrap does not restore the loaded list.
    listClearedRef.current = true;
    // K4/K-K4 (ai-invariant-loop): keep the list mirror in sync SYNCHRONOUSLY
    // — a same-tick reader (deleteConversation fixup / renameConversation)
    // must see the cleared list before the mirror effect flushes (K-⑥-1 ghost
    // fixup root cause: the fixup used to read a stale mirror and re-select a
    // cleared conversation as active).
    conversationsRef.current = [];
    // K-⑥ (Cycle 2 / I4): displacement — invalidate any in-flight switch.
    ++switchVersionRef.current;
    switchTargetRef.current = null;
    setConversations([]);
    setActiveId(null);
    activeIdRef.current = null;
    setActiveEngine(null);
    // K3: drain every conversation's in-flight save chain, then clear
    // storage. clearAll keeps its sync signature `(): void` (public API
    // contract) — the storage clear is chained behind the drain so the
    // drain→clear order is guaranteed without awaiting.
    const drain = Promise.allSettled(
      ids.map((id) => pendingSavesRef.current.get(id) ?? Promise.resolve()),
    );
    pendingSavesRef.current.clear();
    // P1-b (open-audit): keep storage consistent so a remount does not
    // rehydrate cleared items (FP-2 ghost rehydration).
    // FIND-02 (2026-08-11, plan 2026-08-11-0008-3): the storage clear must
    // target the clearAll-TIME conversation snapshot — per-id
    // `deleteConversation` fan-out over `ids` — and must NEVER use an atomic
    // `storage.clearAll()`. An atomic clear chained behind the drain settles
    // AFTER any conversation created in the clearAll→drain window (its save
    // is not part of this drain: pendingSavesRef is cleared synchronously),
    // so the late atomic clear wipes the new conversation's record
    // ("ghost-free-creation in reverse": the list survived, the record was
    // erased; the K3 drain only guards the forward direction — old writes
    // drain before the clear). Per-id deletes over the snapshot only touch
    // conversations that existed at clearAll time; post-clearAll writes are
    // never swept. Per-id failures route through reportStorageError so one
    // rejection doesn't hide the others (FP-3).
    void drain.then(() => {
      for (const id of ids) {
        Promise.resolve(storage?.deleteConversation?.(id)).catch((error: unknown) => {
          reportStorageError({ phase: 'deleteConversation', conversationId: id, error });
        });
      }
    });
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
