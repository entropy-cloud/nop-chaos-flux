import type { RefObject } from 'react';
import { isVacuousAssistantResidue, sanitizeDanglingToolCalls } from '../engine/utils.js';
import type { AiConversationInfo, MessageEngine, RequestState } from '../engine/types.js';
import type { ConversationStorageErrorEvent } from './use-conversation.js';
import type { ConversationStorageStrategy } from '../storage/types.js';

/**
 * Auto-save lifecycle helper for `useConversation` (extracted from
 * `use-conversation.ts` for the oversized-code-files limit; the hook binds
 * the engine cache + auto-save subscription handles together).
 *
 * Attaches a `requestState` subscription that persists the engine snapshot
 * when a turn completes. Returns the unsubscribe handle (no-op when storage
 * or `autoSaveMessages` is disabled). Bound to the engine lifecycle: the
 * caller evicts the handle together with the engine cache entry.
 */
export interface AutoSaveDeps {
  storage: ConversationStorageStrategy | undefined;
  autoSaveMessages: boolean;
  pendingSavesRef: RefObject<Map<string, Promise<unknown>>>;
  conversationsRef: RefObject<AiConversationInfo[]>;
  autoSaveUnsubsRef: RefObject<Map<string, () => void>>;
  reportStorageError: (event: ConversationStorageErrorEvent) => void;
}

export function attachAutoSave(
  engine: MessageEngine,
  conversationId: string,
  deps: AutoSaveDeps,
): () => void {
  const { storage, autoSaveMessages, pendingSavesRef, conversationsRef, autoSaveUnsubsRef, reportStorageError } = deps;
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
        const snapshot = engine.getMessages();
        // K-⑩-3 (ai-invariant-loop): never persist a failed/aborted turn's
        // vacuous empty assistant residue. `abort()` flips requestState to
        // 'aborted' synchronously — before the engine's own cleanup runs —
        // so the snapshot taken here can still contain the placeholder;
        // strip trailing vacuous empties (same predicate as the engine).
        while (
          snapshot.length > 0 &&
          isVacuousAssistantResidue(snapshot[snapshot.length - 1])
        ) {
          snapshot.pop();
        }
        // P1-2 (⑩): never persist a dangling tool_calls assistant (no
        // paired role:'tool' response — strict backends 400 it and a
        // remount would rehydrate the corrupted history). Drop (empty
        // content) or strip tool_calls (text kept); same predicate family
        // as the engine's cleanup surfaces + buildContext projection.
        const sanitized = sanitizeDanglingToolCalls(snapshot);
        // K3: serialize this save behind the conversation's previous
        // pending save (a rejection must not skip the next save — settle
        // first, then write). The chain entry is what deleteConversation
        // drains and clearAll chains its storage clear behind.
        const prevPending = pendingSavesRef.current.get(conversationId);
        const pending = Promise.resolve(prevPending)
          .catch(() => {})
          .then(() => {
            // P1-3 (2026-08-10 multi-audit): settlement-time mirror
            // re-check — a conversation removed by delete/clearAll (mirror
            // already filtered synchronously) must not land its late save
            // after the storage record is gone (ghost resurrection on
            // remount). Parity with the create/rename metadata-write
            // re-checks; an EVICTED-but-still-listed session still saves —
            // its landing is ordered before the clear by the K3 drain.
            if (!conversationsRef.current.some((c) => c.id === conversationId)) {
              return;
            }
            return storage.saveMessages(conversationId, sanitized);
          });
        pending.catch((error: unknown) => {
          reportStorageError({ phase: 'saveMessages', conversationId, error });
        });
        pendingSavesRef.current.set(conversationId, pending);
      } catch (error) {
        reportStorageError({ phase: 'saveMessages', conversationId, error });
      }
    }
  });
  autoSaveUnsubsRef.current.set(conversationId, unsub);
  return unsub;
}
