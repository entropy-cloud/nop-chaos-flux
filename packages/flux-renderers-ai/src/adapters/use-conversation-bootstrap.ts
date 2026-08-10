import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { AiConversationInfo } from '../engine/types.js';
import type { ConversationStorageStrategy } from '../storage/types.js';
import type { ConversationStorageErrorEvent } from './use-conversation.js';

/**
 * Mount-bootstrap helper for `useConversation` (extracted from
 * `use-conversation.ts` for the oversized-code-files limit; the
 * `use-conversation-autosave.ts` plain-function precedent). The component
 * effect owns the AbortController lifecycle and passes the signal in; this
 * helper owns the load + merge semantics.
 */

export interface ConversationStorageBootstrapDeps {
  storageRef: RefObject<ConversationStorageStrategy | undefined>;
  conversationsRef: RefObject<AiConversationInfo[]>;
  activeIdRef: RefObject<string | null>;
  /** K-⑦-1 (Cycle 2 / I4): clearAll-during-load guard. */
  listClearedRef: RefObject<boolean>;
  /** R1-F4 (2026-08-11): deleted-during-load merge filter set. */
  deletedDuringLoadRef: RefObject<Set<string>>;
  reportStorageError: (event: ConversationStorageErrorEvent) => void;
  setConversations: Dispatch<SetStateAction<AiConversationInfo[]>>;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  signal: AbortSignal;
  /**
   * K-⑥-3 (Cycle 2 / I4): invoked with the first loaded conversation id when
   * none is active yet — the component effect builds the engine on demand +
   * hydrates stored messages (the callback lives inside the effect so the
   * `ensureEngineAndHydrateEvent` useEffectEvent stays in component scope).
   */
  onFirstActiveSelected: (conversationId: string) => void;
}

/**
 * Storage bootstrap load + merge: hydrate the conversation list from storage
 * on mount (P3) with the K-⑦ merge semantics — a conversation created while
 * `loadConversations` was pending stays in the list; a clearAll during the
 * load (`listClearedRef`) invalidates the restore; a conversation deleted
 * during the load (`deletedDuringLoadRef`, R1-F4) is filtered out of the
 * merge base BEFORE the non-empty check so a sole deleted conversation cannot
 * re-seed the active selection either. The first loaded conversation is
 * selected as active (K-⑥-3 build-on-demand via `onFirstActiveSelected`).
 */
export async function hydrateConversationsFromStorage(
  deps: ConversationStorageBootstrapDeps,
): Promise<void> {
  const {
    storageRef,
    conversationsRef,
    activeIdRef,
    listClearedRef,
    deletedDuringLoadRef,
    reportStorageError,
    setConversations,
    setActiveId,
    signal,
    onFirstActiveSelected,
  } = deps;
  try {
    const convs = await storageRef.current!.loadConversations();
    if (signal.aborted) return;
    // K-⑦-1 (Cycle 2 / I4): clearAll during the load invalidates the
    // restore — the deliberately cleared list must not be resurrected by
    // the late resolve.
    if (listClearedRef.current) return;
    // R1-F4 (2026-08-11, engine/adapter P2): filter conversations deleted
    // while the load was pending — K-⑦'s merge base (the raw loaded list)
    // would otherwise resurrect them as ghost items. Filtered BEFORE the
    // non-empty check so a sole deleted conversation cannot re-seed the
    // active selection either.
    const loaded = convs.filter((c) => !deletedDuringLoadRef.current.has(c.id));
    deletedDuringLoadRef.current.clear();
    if (loaded.length > 0) {
      // K-⑦ (Cycle 2 / I4): MERGE, do not wholesale-overwrite — a
      // conversation created while `loadConversations` was pending must
      // stay in the list (probe-2: create X → bootstrap resolve → list
      // rolled back to [A], activeId=X dangling off-list). The merge is
      // computed against the synchronous mirror (same-tick source of
      // truth for created conversations).
      const merged = [
        ...loaded,
        ...conversationsRef.current.filter((c) => !loaded.some((l) => l.id === c.id)),
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
      setActiveId((current) => current ?? loaded[0].id);
      if (!currentActive) {
        onFirstActiveSelected(loaded[0].id);
      }
    }
  } catch (error) {
    if (signal.aborted) return;
    // Failure Path `storage-load-error`: non-fatal, keep the empty list.
    // AI-28: surface to host (callback may be undefined).
    reportStorageError({ phase: 'loadConversations', error });
  }
}
