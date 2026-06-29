import type {
  AsyncErrorSummary,
  AsyncGovernanceStore,
  AsyncOwnerDebugState,
  AsyncOwnerKind,
  AsyncOwnerRunDebugEntry,
} from '@nop-chaos/flux-core';

function summarizeError(error: unknown): AsyncErrorSummary | undefined {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }

  return {
    message: String(error),
  };
}

interface AsyncGovernanceOwnerRecord extends AsyncOwnerDebugState {
  nextRunId: number;
  /** Tracks active (not yet settled) handles per runId.
   *  Under React.StrictMode, two mounts share the same runId. Without
   *  reference counting, settling the first mount's handle would clear
   *  currentRun, causing the second mount's isCurrentRun to fail. */
  activeHandles: Map<number, number>;
}

const DEFAULT_RETENTION = 8;

export function createAsyncGovernanceStore(options?: { retention?: number }): AsyncGovernanceStore {
  const owners = new Map<string, AsyncGovernanceOwnerRecord>();
  const retention = Math.max(1, options?.retention ?? DEFAULT_RETENTION);

  function getOrCreateOwner(input: {
    ownerKind: AsyncOwnerKind;
    ownerId: string;
    scopeId: string;
  }): AsyncGovernanceOwnerRecord {
    const existing = owners.get(input.ownerId);

    if (existing) {
      existing.ownerKind = input.ownerKind;
      existing.scopeId = input.scopeId;
      return existing;
    }

    const created: AsyncGovernanceOwnerRecord = {
      ownerKind: input.ownerKind,
      ownerId: input.ownerId,
      scopeId: input.scopeId,
      recentRuns: [],
      nextRunId: 1,
      activeHandles: new Map(),
    };
    owners.set(input.ownerId, created);
    return created;
  }

  function appendRecentRun(owner: AsyncGovernanceOwnerRecord, entry: AsyncOwnerRunDebugEntry) {
    owner.recentRuns = [entry, ...owner.recentRuns].slice(0, retention);
  }

  return {
    beginRun(input) {
      const owner = getOrCreateOwner(input);
      const previousCurrent = owner.currentRun;
      const runId = owner.nextRunId;
      owner.nextRunId += 1;
      const currentRun: AsyncOwnerRunDebugEntry = {
        ownerKind: input.ownerKind,
        ownerId: input.ownerId,
        scopeId: input.scopeId,
        runId,
        cause: input.cause,
        startedAt: Date.now(),
        outcome: 'running',
      };

      if (previousCurrent?.outcome === 'running') {
        previousCurrent.supersededBy = runId;
      }

      owner.currentRun = currentRun;
      owner.activeHandles.set(runId, (owner.activeHandles.get(runId) ?? 0) + 1);

      return {
        runId,
        ownerKind: input.ownerKind,
        ownerId: input.ownerId,
        scopeId: input.scopeId,
        cause: input.cause,
        startedAt: currentRun.startedAt,
      };
    },

    markCancelled(handle, options) {
      const owner = owners.get(handle.ownerId);
      const currentRun = owner?.currentRun;

      if (!owner || !currentRun || currentRun.runId !== handle.runId) {
        return;
      }

      currentRun.cancelled = true;
      if (options?.supersededBy !== undefined) {
        currentRun.supersededBy = options.supersededBy;
      }
    },

    invalidateCurrentRun(ownerId: string) {
      const owner = owners.get(ownerId);

      if (!owner?.currentRun) {
        return;
      }

      owner.currentRun = undefined;
    },

    isCurrentRun(handle) {
      const owner = owners.get(handle.ownerId);
      if (!owner) return false;
      // A run is "current" if its runId matches AND at least one handle for
      // this runId is still active (not yet settled). This prevents StrictMode's
      // shared-runId double-mount from failing the check when the first mount's
      // settleRun clears currentRun.
      return owner.currentRun?.runId === handle.runId
        && (owner.activeHandles.get(handle.runId) ?? 0) > 0;
    },

    settleRun(handle, input) {
      const owner = getOrCreateOwner(handle);
      const stale = owner.currentRun?.runId !== handle.runId;
      const settled: AsyncOwnerRunDebugEntry = {
        ownerKind: handle.ownerKind,
        ownerId: handle.ownerId,
        scopeId: handle.scopeId,
        runId: handle.runId,
        cause: handle.cause,
        startedAt: handle.startedAt,
        settledAt: Date.now(),
        outcome: stale ? 'stale-dropped' : input.outcome,
        supersededBy: stale ? owner.currentRun?.runId : owner.currentRun?.supersededBy,
        cancelled: input.cancelled,
        timedOut: input.timedOut,
        error: summarizeError(input.error),
      };

      appendRecentRun(owner, settled);

      if (!stale) {
        const remaining = (owner.activeHandles.get(settled.runId) ?? 1) - 1;
        owner.activeHandles.set(settled.runId, remaining);
        if (remaining <= 0) {
          owner.currentRun = settled.outcome === 'running' ? settled : undefined;
        }
      }

      return settled;
    },

    getOwnerState(ownerId) {
      const owner = owners.get(ownerId);
      if (!owner) {
        return undefined;
      }

      return {
        ownerKind: owner.ownerKind,
        ownerId: owner.ownerId,
        scopeId: owner.scopeId,
        currentRun: owner.currentRun,
        recentRuns: owner.recentRuns,
      };
    },

    getSnapshot() {
      return {
        owners: Array.from(owners.values())
          .map((owner) => ({
            ownerKind: owner.ownerKind,
            ownerId: owner.ownerId,
            scopeId: owner.scopeId,
            currentRun: owner.currentRun,
            recentRuns: owner.recentRuns,
          }))
          .sort(
            (left, right) =>
              left.scopeId.localeCompare(right.scopeId) ||
              left.ownerId.localeCompare(right.ownerId),
          ),
      };
    },

    clearOwner(ownerId: string) {
      owners.delete(ownerId);
    },
  } satisfies AsyncGovernanceStore;
}
