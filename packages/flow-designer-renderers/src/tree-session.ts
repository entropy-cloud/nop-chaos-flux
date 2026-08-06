import type { ActionSchema, ActionResult, RendererHelpers, ScopeRef, ActionScope } from '@nop-chaos/flux-core';
import { classifyActionResult } from '@nop-chaos/flux-action-core';
import type {
  DesignerCore,
  TreeDocument,
} from '@nop-chaos/flow-designer-core';
import { canonicalizeTreeDocument } from '@nop-chaos/flow-designer-core';

export type TreeChangeReason = 'command' | 'undo' | 'redo' | 'restore' | 'coalesced';

export interface TreeWritebackItem {
  dispatchId: number;
  tree: TreeDocument;
  digest: string;
  sourceCommandCount: number;
  reason: TreeChangeReason;
  commandType?: 'transaction';
}

export interface TreeSessionOptions {
  core: DesignerCore;
  sessionId: string;
  changeAction?: ActionSchema | ActionSchema[];
  helpers: RendererHelpers;
  designerScope: ScopeRef;
  actionScope?: ActionScope;
  reportHostIssue: (input: {
    message: string;
    error?: unknown;
    details?: Record<string, unknown>;
  }) => void;
}

export const TREE_SESSION_MAX_PENDING = 32;
export const TREE_SESSION_MAX_DIGEST_LRU = 256;

/**
 * Deterministic digest of the canonical tree document. Uses FNV-1a over the
 * canonical (sorted-key, whitespace-free) serialization; stable within a
 * session and across processes.
 */
export function digestTreeDocument(tree: TreeDocument): string {
  const canonical = canonicalizeTreeDocument(tree);
  let hash = 0x811c9dc5;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export interface TreeSessionHostInput {
  treeDocument?: TreeDocument;
  epoch?: number;
  ackSessionId?: string;
  ackDispatchId?: number;
}

export interface TreeSessionState {
  pendingQueue: TreeWritebackItem[];
  coalescedUnsent: TreeWritebackItem | null;
  inFlight: { dispatchId: number; generation: number } | null;
  lastAcceptedHostEpoch: number;
  acceptedBaselineDigest: string | null;
  generation: number;
  nextDispatchId: number;
  disposed: boolean;
  backpressureReported: boolean;
}

export interface TreeSessionCallbacks {
  onStateChange: () => void;
}

function createInitialState(): TreeSessionState {
  return {
    pendingQueue: [],
    coalescedUnsent: null,
    inFlight: null,
    lastAcceptedHostEpoch: 0,
    acceptedBaselineDigest: null,
    generation: 0,
    nextDispatchId: 1,
    disposed: false,
    backpressureReported: false,
  };
}

export class TreeDocumentSession {
  readonly state: TreeSessionState;
  private readonly options: TreeSessionOptions;
  private readonly locallyEmittedDigests: Map<string, number>;
  private readonly callbacks: TreeSessionCallbacks;

  constructor(options: TreeSessionOptions, callbacks: TreeSessionCallbacks) {
    this.options = options;
    this.callbacks = callbacks;
    this.state = createInitialState();
    this.locallyEmittedDigests = new Map();
    const initial = options.core.getTreeDocument();
    if (initial) {
      this.state.acceptedBaselineDigest = digestTreeDocument(initial);
    }
  }

  private notify(): void {
    this.callbacks.onStateChange();
  }

  private touchLocalDigest(digest: string): void {
    this.locallyEmittedDigests.set(digest, Date.now());
    while (this.locallyEmittedDigests.size > TREE_SESSION_MAX_DIGEST_LRU) {
      const oldestKey = this.locallyEmittedDigests.keys().next().value as string | undefined;
      if (oldestKey === undefined) {
        break;
      }
      this.locallyEmittedDigests.delete(oldestKey);
    }
  }

  private hasLocalDigest(digest: string): boolean {
    return this.locallyEmittedDigests.has(digest);
  }

  isDisposed(): boolean {
    return this.state.disposed;
  }

  dispose(): void {
    this.state.disposed = true;
    this.state.generation += 1;
    this.state.inFlight = null;
    this.state.pendingQueue = [];
    this.state.coalescedUnsent = null;
    this.notify();
  }

  enqueueTreeChange(tree: TreeDocument, reason: 'command' | 'undo' | 'redo' | 'restore', commandType?: 'transaction'): void {
    if (this.state.disposed) {
      return;
    }
    if (!this.options.changeAction) {
      return;
    }

    const digest = digestTreeDocument(tree);
    this.touchLocalDigest(digest);

    const queue = this.state.pendingQueue;
    const lastItem = queue[queue.length - 1];
    if (lastItem && lastItem.digest === digest) {
      lastItem.sourceCommandCount += 1;
      lastItem.reason = reason;
      if (commandType) lastItem.commandType = commandType;
      this.notify();
      return;
    }

    if (queue.length >= TREE_SESSION_MAX_PENDING) {
      if (!this.state.coalescedUnsent || this.state.coalescedUnsent.digest !== digest) {
        this.state.coalescedUnsent = {
          dispatchId: 0,
          tree,
          digest,
          sourceCommandCount: 1,
          reason: 'coalesced',
          commandType,
        };
        if (!this.state.backpressureReported) {
          this.state.backpressureReported = true;
          this.options.reportHostIssue({
            message: 'Tree writeback queue is full; latest change was coalesced.',
            details: { reason: 'tree-host-backpressure', sessionId: this.options.sessionId },
          });
        }
      }
      this.notify();
      return;
    }

    queue.push({
      dispatchId: this.state.nextDispatchId,
      tree,
      digest,
      sourceCommandCount: 1,
      reason,
      commandType,
    });
    this.state.nextDispatchId += 1;
    this.notify();
  }

  async dispatchNext(generationSnapshot?: number): Promise<void> {
    if (this.state.disposed) {
      return;
    }
    if (this.state.inFlight) {
      return;
    }
    const queue = this.state.pendingQueue;
    if (queue.length === 0) {
      this.flushCoalesced();
      return;
    }
    if (queue.length === 0) {
      return;
    }

    const generation = generationSnapshot ?? this.state.generation;
    const head = queue[0];
    this.state.inFlight = { dispatchId: head.dispatchId, generation };
    this.notify();

    try {
      const result = await this.options.helpers.dispatch(this.options.changeAction!, {
        scope: this.options.designerScope,
        actionScope: this.options.actionScope,
        evaluationBindings: {
          treeDocument: head.tree,
          reason: head.reason,
          commandType: head.commandType,
          sessionId: this.options.sessionId,
          dispatchId: head.dispatchId,
        },
      });
      this.handleActionCompletion(head.dispatchId, generation, result);
    } catch (error) {
      const normalized =
        error instanceof Error
          ? error
          : new Error('treeDocumentChangeAction failed', { cause: error });
      this.handleActionCompletion(head.dispatchId, generation, {
        ok: false,
        error: normalized,
      });
    }
  }

  private handleActionCompletion(dispatchId: number, generation: number, result: ActionResult): void {
    if (this.state.disposed) {
      return;
    }
    if (generation !== this.state.generation) {
      return;
    }
    if (!this.state.inFlight || this.state.inFlight.dispatchId !== dispatchId) {
      return;
    }

    const queue = this.state.pendingQueue;
    if (queue.length === 0 || queue[0].dispatchId !== dispatchId) {
      this.state.inFlight = null;
      this.notify();
      return;
    }

    const resultClass = classifyActionResult(result);

    if (resultClass === 'success') {
      // Dispatch success is treated as host confirmation (the action ran with
      // `{ ok: true }`): dequeue the head like the ack-accepted path does and
      // adopt its digest so later host echoes of this tree hit the fast path
      // instead of being judged stale. A subsequent explicit host ack for the
      // same dispatch degrades to a stale-ack no-op, which is correct because
      // the change is already confirmed.
      const head = queue[0];
      queue.shift();
      this.state.acceptedBaselineDigest = head.digest;
      this.state.inFlight = null;
      this.notify();
      void this.dispatchNext(generation);
      return;
    }

    queue.shift();
    this.state.inFlight = null;
    if (resultClass === 'neutral') {
      this.options.reportHostIssue({
        message: 'Tree change action was neutral; writeback item skipped.',
        details: { reason: 'tree-document-change-action-neutral', sessionId: this.options.sessionId, dispatchId },
      });
    } else if (resultClass === 'cancelled') {
      this.options.reportHostIssue({
        message: 'Tree change action was cancelled; writeback item skipped.',
        error: result.error,
        details: { reason: 'tree-document-change-action-cancelled', sessionId: this.options.sessionId, dispatchId },
      });
    } else {
      this.options.reportHostIssue({
        message: 'Tree change action failed; writeback item skipped.',
        error: result.error,
        details: { reason: 'tree-document-change-action-failed', sessionId: this.options.sessionId, dispatchId },
      });
    }

    void this.dispatchNext(generation);
  }

  private flushCoalesced(): void {
    if (!this.state.coalescedUnsent) {
      return;
    }
    if (this.state.pendingQueue.length >= TREE_SESSION_MAX_PENDING) {
      return;
    }
    const coalesced = this.state.coalescedUnsent;
    this.state.coalescedUnsent = null;
    this.state.backpressureReported = false;
    this.state.pendingQueue.push({
      ...coalesced,
      dispatchId: this.state.nextDispatchId,
    });
    this.state.nextDispatchId += 1;
    this.notify();
  }

  /**
   * Applies a host prop update following the documented epoch/ack protocol.
   * Returns a description of what happened for tests/diagnostics.
   */
  applyHostInput(input: TreeSessionHostInput): {
    outcome:
      | 'epoch-replaced'
      | 'stale-ack'
      | 'invalid-epoch'
      | 'ack-accepted'
      | 'ack-invalid'
      | 'echo'
      | 'stale-echo'
      | 'conflict'
      | 'no-change-action-epoch-required'
      | 'unchanged';
    error?: string;
  } {
    if (this.state.disposed) {
      return { outcome: 'unchanged' };
    }

    const epoch = input.epoch;
    const hasEpoch = epoch !== undefined;
    if (hasEpoch && (!Number.isInteger(epoch) || epoch < 0)) {
      return { outcome: 'invalid-epoch', error: 'invalid-tree-document-epoch' };
    }

    if (hasEpoch && epoch > this.state.lastAcceptedHostEpoch) {
      const current = input.treeDocument;
      if (!current) {
        return { outcome: 'conflict', error: 'tree-host-epoch-required' };
      }
      const result = this.options.core.replaceTreeFromHost(current, epoch);
      if (!result.ok) {
        return {
          outcome: 'conflict',
          error: result.error?.code ?? 'invalid-tree',
        };
      }
      this.state.generation += 1;
      this.state.lastAcceptedHostEpoch = epoch;
      this.state.acceptedBaselineDigest = digestTreeDocument(current);
      this.state.pendingQueue = [];
      this.state.coalescedUnsent = null;
      this.state.inFlight = null;
      this.state.backpressureReported = false;
      this.locallyEmittedDigests.clear();
      this.notify();
      return { outcome: 'epoch-replaced' };
    }

    if (hasEpoch) {
      return this.applyAckOrEcho(input);
    }

    return this.applyAckOrEcho(input);
  }

  private applyAckOrEcho(input: TreeSessionHostInput): ReturnType<TreeDocumentSession['applyHostInput']> {
    const queue = this.state.pendingQueue;
    const head = queue[0];
    const hasAckSession = typeof input.ackSessionId === 'string' && input.ackSessionId.length > 0;
    const hasAckDispatch = input.ackDispatchId !== undefined;
    const hasAckFields = hasAckSession || hasAckDispatch;

    if (hasAckFields) {
      if (input.ackSessionId !== this.options.sessionId) {
        return { outcome: 'stale-ack' };
      }
      if (!head) {
        return { outcome: 'stale-ack' };
      }
      if (input.ackDispatchId === undefined || input.ackDispatchId !== head.dispatchId) {
        if (input.ackDispatchId !== undefined && input.ackDispatchId < head.dispatchId) {
          return { outcome: 'stale-ack' };
        }
        return { outcome: 'ack-invalid', error: 'tree-host-invalid-ack' };
      }
      if (!input.treeDocument) {
        return { outcome: 'ack-invalid', error: 'tree-host-invalid-ack' };
      }
      const digest = digestTreeDocument(input.treeDocument);
      if (digest !== head.digest) {
        return { outcome: 'ack-invalid', error: 'tree-host-invalid-ack' };
      }
      queue.shift();
      this.state.acceptedBaselineDigest = digest;
      this.state.inFlight = null;
      this.notify();
      void this.dispatchNext();
      return { outcome: 'ack-accepted' };
    }

    // No ack fields: deep-equal current echo, or stale digest echo, else conflict.
    if (input.treeDocument) {
      const digest = digestTreeDocument(input.treeDocument);
      if (this.state.acceptedBaselineDigest === digest) {
        return { outcome: 'echo' };
      }
      const current = this.options.core.getTreeDocument();
      if (current && digestTreeDocument(current) === digest) {
        this.state.acceptedBaselineDigest = digest;
        this.state.inFlight = null;
        this.state.pendingQueue = [];
        this.state.coalescedUnsent = null;
        this.notify();
        return { outcome: 'echo' };
      }
      if (this.hasLocalDigest(digest)) {
        return { outcome: 'stale-echo' };
      }
      if (!this.options.changeAction) {
        return { outcome: 'no-change-action-epoch-required', error: 'tree-host-epoch-required' };
      }
      return { outcome: 'conflict', error: 'tree-host-conflict' };
    }

    return { outcome: 'unchanged' };
  }

  getPendingDigests(): string[] {
    return this.state.pendingQueue.map((item) => item.digest);
  }

  getAcceptedBaselineDigest(): string | null {
    return this.state.acceptedBaselineDigest;
  }
}

export function createTreeSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tree-session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
