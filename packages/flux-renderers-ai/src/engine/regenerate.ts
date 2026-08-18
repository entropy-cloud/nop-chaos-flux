/**
 * A-16 message branches: regenerate helper — plan 461 size-budget extraction.
 *
 * Extracted from `create-engine.ts` (which crossed the 700-line hard gate
 * after plan 461 added the `hasStableSnapshotAdapter` wiring). The function
 * has well-defined dependencies (passed via the `RegenerateDeps` interface)
 * so it can live standalone.
 *
 * Behaviour parity with the previous inline implementation:
 * - Reject when a turn is in-flight (`isProcessing`).
 * - Find the last user message; truncate history to `[0..lastUserIdx]`.
 * - Determine the branch id: explicit arg > advance prior > new sequence.
 * - Re-run the turn with no new messages (the engine produces a fresh
 *   assistant message from the now-truncated history).
 */
import { findLastUserIndex, findPriorAssistantBranchId } from './branching.js';
import type {
  AiConnector,
  ChatMessage,
  MessageStateAdapter,
} from './types.js';
import type { BranchSequencer } from './branching.js';

export interface RegenerateDeps {
  adapter: MessageStateAdapter;
  branchSeq: BranchSequencer;
  /** Read+write the pending branch id slot on the engine closure. */
  getPendingBranchId: () => string | undefined;
  setPendingBranchId: (id: string | undefined) => void;
  /** Re-run a turn with the supplied new incoming messages. */
  runTurn: (incoming: ChatMessage[]) => Promise<void>;
}

export async function regenerateTurn(
  deps: RegenerateDeps,
  branchId?: string,
): Promise<void> {
  if (deps.adapter.getState().isProcessing) {
    return;
  }
  const current = deps.adapter.getState().messages;
  // Find the last user message — everything after it is the assistant turn to
  // regenerate. If there is no preceding user message, there is nothing to
  // re-request.
  const lastUserIdx = findLastUserIndex(current);
  if (lastUserIdx < 0) return;

  // Determine the branch id: explicit > advance prior > new sequence.
  const priorBranchId = findPriorAssistantBranchId(current, lastUserIdx + 1);
  const nextBranchId = branchId ?? deps.branchSeq.next(priorBranchId);

  // Truncate to [0..lastUserIdx] (keep the user prompt; drop the old turn).
  deps.adapter.mutate('messages', (draft) => {
    draft.messages = draft.messages.slice(0, lastUserIdx + 1);
  });

  deps.setPendingBranchId(nextBranchId);
  // Re-run the turn with no new incoming messages — runTurn streams a fresh
  // assistant message using the existing (now user-terminated) history.
  await deps.runTurn([]);
}

/** Marker re-export for callers that still need the AiConnector type. */
export type { AiConnector };