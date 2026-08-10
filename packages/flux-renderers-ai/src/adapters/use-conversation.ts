import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { generateMessageId } from '../engine/utils.js';
import { createMessageEngine } from '../engine/create-engine.js';
import { createReactMessageAdapter } from './react-adapter.js';
import { attachAutoSave } from './use-conversation-autosave.js';
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

  // Engine cache: id → engine. We keep this in a ref-like closure local so
  // updates don't trigger re-renders (the engine is read via subscribe).
  const [engineCache] = useState(() => new Map<string, MessageEngine>());
  const [activeEngine, setActiveEngine] = useState<MessageEngine | null>(null);

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
  useEffect(() => {
    if (!storage) return;
    const controller = new AbortController();
    const { signal } = controller;
    (async () => {
      try {
        const convs = await storage.loadConversations();
        if (signal.aborted) return;
        // K-⑦-1 (Cycle 2 / I4): clearAll during the load invalidates the
        // restore — the deliberately cleared list must not be resurrected by
        // the late resolve.
        if (listClearedRef.current) return;
        if (convs.length > 0) {
          // K-⑦ (Cycle 2 / I4): MERGE, do not wholesale-overwrite — a
          // conversation created while `loadConversations` was pending must
          // stay in the list (probe-2: create X → bootstrap resolve → list
          // rolled back to [A], activeId=X dangling off-list). The merge is
          // computed against the synchronous mirror (same-tick source of
          // truth for created conversations).
          const merged = [
            ...convs,
            ...conversationsRef.current.filter((c) => !convs.some((l) => l.id === c.id)),
          ];
          setConversations(merged);
          // K4 (ai-invariant-loop): sync the mirror synchronously so a
          // same-tick reader (create/rename/delete) sees the loaded list
          // before the mirror effect flushes.
          conversationsRef.current = merged;
          // Select the first conversation as active when none is active yet.
          // K-⑥-3 (Cycle 2 / I4): build the engine for the selected active
          // conversation on demand and hydrate its stored messages — the
          // default conversation's messages must be visible without a manual
          // switch (mirror of switchConversation's build-on-demand semantics).
          const currentActive = activeIdRef.current;
          setActiveId((current) => current ?? convs[0].id);
          if (!currentActive) {
            activeIdRef.current = convs[0].id;
            const engine = ensureEngineAndHydrateEvent(convs[0].id);
            setActiveEngine(engine);
          }
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
    // rehydrate cleared items (FP-2 ghost rehydration). Prefer an atomic
    // `storage.clearAll` when the host provides one; otherwise fall back to a
    // per-id `deleteConversation` fan-out (mirroring deleteConversation's
    // storage path). Per-id failures route through reportStorageError so one
    // rejection doesn't hide the others (FP-3).
    void drain.then(() => {
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
