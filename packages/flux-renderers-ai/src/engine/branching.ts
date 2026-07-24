import type { ChatMessage } from './types.js';

/**
 * A-16 branch-id helpers, extracted from `create-engine.ts` (AI-24 module-size
 * remediation). The engine assigns `branch-<n>` ids when the host does not pass
 * an explicit one; the host owns the full branch set.
 *
 * Framework-agnostic: no `react`/DOM references.
 */

/**
 * Mutable branch-id sequencer. Encapsulates the engine-local counter so
 * `create-engine.ts` does not carry the branch state directly.
 */
export interface BranchSequencer {
  /**
   * Compute the next branch id. When `prev` is supplied, its trailing number is
   * incremented (e.g. `branch-1` → `branch-2`); otherwise a fresh `branch-<n>`
   * is minted from the internal counter.
   */
  next(prev?: string): string;
}

export function createBranchSequencer(): BranchSequencer {
  let seq = 0;
  return {
    next(prev?: string): string {
      if (!prev) {
        seq += 1;
        return `branch-${seq}`;
      }
      const m = /^(.*?)(\d+)$/.exec(prev);
      if (m) return `${m[1]}${parseInt(m[2], 10) + 1}`;
      seq += 1;
      return `branch-${seq}`;
    },
  };
}

/**
 * Find the index of the last `role:'user'` message, or `-1` if none. Used by
 * `regenerate` to locate the anchor of the assistant turn to drop.
 */
export function findLastUserIndex(messages: ChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return i;
  }
  return -1;
}

/**
 * Find the `branchId` of the prior assistant turn (searched forward from
 * `fromIndex`). Returns `undefined` when no prior assistant carries a branch id.
 */
export function findPriorAssistantBranchId(
  messages: ChatMessage[],
  fromIndex: number,
): string | undefined {
  const prior = messages
    .slice(fromIndex)
    .find((m) => m.role === 'assistant' && typeof m.metadata?.branchId === 'string');
  return prior?.metadata?.branchId as string | undefined;
}
