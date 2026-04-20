export type AsyncOwnerKind = 'data-source' | 'reaction' | 'validation';

export type AsyncRunOutcome = 'running' | 'succeeded' | 'failed' | 'cancelled' | 'stale-dropped';

export interface AsyncErrorSummary {
  name?: string;
  message: string;
}

export interface AsyncOwnerRunDebugEntry {
  ownerKind: AsyncOwnerKind;
  ownerId: string;
  scopeId: string;
  runId: number;
  cause: string;
  startedAt: number;
  settledAt?: number;
  outcome: AsyncRunOutcome;
  supersededBy?: number;
  cancelled?: boolean;
  timedOut?: boolean;
  error?: AsyncErrorSummary;
}

export interface AsyncOwnerDebugState {
  ownerKind: AsyncOwnerKind;
  ownerId: string;
  scopeId: string;
  currentRun?: AsyncOwnerRunDebugEntry;
  recentRuns: AsyncOwnerRunDebugEntry[];
}

export interface AsyncOwnerDebugSnapshot {
  owners: AsyncOwnerDebugState[];
}

export interface AsyncRunHandle {
  runId: number;
  ownerKind: AsyncOwnerKind;
  ownerId: string;
  scopeId: string;
  cause: string;
  startedAt: number;
}

export interface SettleAsyncRunInput {
  outcome: Exclude<AsyncRunOutcome, 'running'>;
  cancelled?: boolean;
  timedOut?: boolean;
  error?: unknown;
}

export interface AsyncGovernanceOwnerSnapshot extends AsyncOwnerDebugState {}

export interface AsyncGovernanceStore {
  beginRun(input: { ownerKind: AsyncOwnerKind; ownerId: string; scopeId: string; cause: string }): AsyncRunHandle;
  markCancelled(handle: AsyncRunHandle, options?: { supersededBy?: number }): void;
  invalidateCurrentRun(ownerId: string): void;
  isCurrentRun(handle: AsyncRunHandle): boolean;
  settleRun(handle: AsyncRunHandle, input: SettleAsyncRunInput): AsyncOwnerRunDebugEntry;
  getOwnerState(ownerId: string): AsyncGovernanceOwnerSnapshot | undefined;
  getSnapshot(): AsyncOwnerDebugSnapshot;
  clearOwner(ownerId: string): void;
}
