import type {
  NopDebuggerController,
  NopSchemaPatch,
  NopSchemaPatchValidationResult,
} from '@nop-chaos/nop-debugger';

// ============================================
// Candidate store
// ============================================

type PatchCandidateStatus = 'staged' | 'applied' | 'reverted' | 'discarded' | 'conflicted';

export interface PatchCandidate {
  id: string;
  patch: NopSchemaPatch;
  validation: NopSchemaPatchValidationResult;
  stagedAt: number;
  status: PatchCandidateStatus;
}

export interface PatchCandidateStore {
  subscribe(listener: () => void): () => void;
  /** Cached array identity — stable between mutations (useSyncExternalStore). */
  getSnapshot(): PatchCandidate[];
  stage(patch: NopSchemaPatch, validation: NopSchemaPatchValidationResult): { ok: true } | { ok: false; error: string };
  get(id: string): PatchCandidate | undefined;
  list(): PatchCandidate[];
  activeCount(): number;
  setStatus(id: string, status: PatchCandidateStatus): void;
  dismiss(id: string): void;
  /** Notify subscribers without a state change — drives render-time revalidation. */
  touch(): void;
}

const ACTIVE_LIMIT = 10;
const HISTORY_LIMIT = 10;

export function createPatchCandidateStore(): PatchCandidateStore {
  function pruneTerminalHistory() {
    const terminal = [...candidates.values()].filter((candidate) =>
      candidate.status === 'applied' || candidate.status === 'reverted' || candidate.status === 'discarded',
    );
    if (terminal.length > HISTORY_LIMIT) {
      for (const stale of terminal.slice(0, terminal.length - HISTORY_LIMIT)) {
        candidates.delete(stale.id);
      }
    }
  }
  const candidates = new Map<string, PatchCandidate>();
  const listeners = new Set<() => void>();
  let snapshotCache: PatchCandidate[] = [];
  const notify = () => {
    snapshotCache = [...candidates.values()];
    for (const listener of listeners) listener();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshotCache,
    stage(patch, validation) {
      const activeCount = [...candidates.values()].filter(
        (candidate) => candidate.status === 'staged' || candidate.status === 'conflicted',
      ).length;
      if (activeCount >= ACTIVE_LIMIT) {
        return { ok: false, error: `candidate limit reached (${ACTIVE_LIMIT} active); resolve existing candidates first` };
      }
      candidates.set(patch.id, {
        id: patch.id,
        patch,
        validation,
        stagedAt: Date.now(),
        status: 'staged',
      });
      pruneTerminalHistory();
      notify();
      return { ok: true };
    },
    get: (id) => candidates.get(id),
    list: () => [...candidates.values()],
    activeCount: () =>
      [...candidates.values()].filter((candidate) => candidate.status === 'staged' || candidate.status === 'conflicted').length,
    touch() {
      notify();
    },
    setStatus(id, status) {
      const candidate = candidates.get(id);
      if (!candidate) {
        return;
      }
      candidates.set(id, { ...candidate, status });
      pruneTerminalHistory();
      notify();
    },
    dismiss(id) {
      const candidate = candidates.get(id);
      if (!candidate) {
        return;
      }
      if (candidate.status === 'staged' || candidate.status === 'conflicted') {
        // Active slots are freed by an explicit terminal transition, not dismissal.
        candidates.set(id, { ...candidate, status: 'discarded' });
      } else {
        candidates.delete(id);
      }
      pruneTerminalHistory();
      notify();
    },
  };
}

// ============================================
// Candidate actions (UI-facing; the human adopt gate lives here)
// ============================================

export interface PatchCandidateDeps {
  controller: NopDebuggerController;
  store: PatchCandidateStore;
  /** Host sandbox preview (optional); text summary only in v1. */
  preview?: (patch: NopSchemaPatch) => Promise<{ kind: 'rendered'; summary: string } | { kind: 'unsupported' }>;
}

/**
 * Adopt a staged candidate: the human gate. Re-validates at adopt time
 * (fail-closed; the controller re-validates a third time inside
 * applySchemaPatch) before handing the patch to the host applier.
 */
export async function adoptCandidate(deps: PatchCandidateDeps, candidateId: string): Promise<void> {
  const candidate = deps.store.get(candidateId);
  if (!candidate) {
    throw new Error(`candidate not found: ${candidateId}`);
  }
  if (candidate.status !== 'staged' && candidate.status !== 'conflicted') {
    throw new Error(`candidate ${candidateId} is ${candidate.status}; only staged/conflicted candidates can be adopted`);
  }
  const revalidation = deps.controller.validateSchemaPatch(candidate.patch);
  if (!revalidation.ok) {
    deps.store.setStatus?.(candidateId, 'conflicted');
    throw new Error(`candidate ${candidateId} conflicted: ${revalidation.errors.join('; ')}`);
  }
  // Applier failure: AD-3 guarantees no half state; the candidate stays staged
  // for retry (the error propagates to the UI error surface).
  await deps.controller.applySchemaPatch(candidate.patch);
  deps.store.setStatus?.(candidateId, 'applied');
}

export async function rollbackCandidate(deps: PatchCandidateDeps, candidateId: string): Promise<void> {
  const candidate = deps.store.get(candidateId);
  if (!candidate || candidate.status !== 'applied') {
    throw new Error(`candidate ${candidateId} is not in applied state`);
  }
  await deps.controller.revertSchemaPatch(candidateId);
  deps.store.setStatus?.(candidateId, 'reverted');
}

export async function discardCandidate(deps: PatchCandidateDeps, candidateId: string): Promise<void> {
  const candidate = deps.store.get(candidateId);
  if (!candidate) {
    throw new Error(`candidate not found: ${candidateId}`);
  }
  deps.store.setStatus?.(candidateId, 'discarded');
}

/** Render-time revalidation: flips staged↔conflicted without touching the applier. */
export function revalidateCandidate(deps: PatchCandidateDeps, candidateId: string): PatchCandidateStatus | undefined {
  const candidate = deps.store.get(candidateId);
  if (!candidate) {
    return undefined;
  }
  if (candidate.status !== 'staged' && candidate.status !== 'conflicted') {
    return candidate.status;
  }
  const revalidation = deps.controller.validateSchemaPatch(candidate.patch);
  const next: PatchCandidateStatus = revalidation.ok ? 'staged' : 'conflicted';
  if (next !== candidate.status) {
    deps.store.setStatus?.(candidateId, next);
  }
  return next;
}
