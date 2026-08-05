import { describe, expect, it, vi } from 'vitest';
import type { ActionResult, ActionSchema, RendererHelpers, ScopeRef } from '@nop-chaos/flux-core';
import { createTreeDesignerCore } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig, TreeDocument } from '@nop-chaos/flow-designer-core';
import { TreeDocumentSession, digestTreeDocument, TREE_SESSION_MAX_PENDING } from './tree-session.js';

function createConfig(): DesignerConfig {
  return {
    version: '1.1.0',
    kind: 'test-tree',
    documentMode: 'tree',
    treeConfig: {
      layout: { direction: 'TB', nodeSpacing: 60, layerSpacing: 100 },
      showGatewayNodes: false,
      showMergeNodes: false,
      chainEdgeType: 'chain',
      branchEdgeType: 'branch',
      mergeEdgeType: 'merge',
    },
    nodeTypes: [
      { id: 'start', label: 'Start' },
      { id: 'task', label: 'Task' },
      { id: 'end', label: 'End' },
    ],
    edgeTypes: [
      { id: 'chain', label: 'Chain', appearance: { strokeWidth: 2 } },
      { id: 'branch', label: 'Branch', appearance: { strokeWidth: 2 } },
      { id: 'merge', label: 'Merge', appearance: { strokeWidth: 2 } },
      { id: 'default', label: 'Default' },
    ],
  };
}

function createTree(): TreeDocument {
  return {
    id: 'tree-1',
    kind: 'test-tree',
    name: 'Session Tree',
    version: '1.0.0',
    root: {
      id: 'root',
      type: 'task',
      data: { label: 'Root' },
      child: {
        id: 'n1',
        type: 'task',
        data: { label: 'N1' },
        child: { id: 'end', type: 'end', data: { label: 'End' } },
      },
    },
  };
}

const changeAction: ActionSchema = { action: 'test:treeChange' };

interface SessionHarnessOptions {
  actionResult?: ActionResult;
  actionError?: unknown;
}

function createHarness(options: SessionHarnessOptions = {}) {
  const dispatch = vi.fn(async () => {
    if (options.actionError !== undefined) {
      throw options.actionError;
    }
    return (options.actionResult ?? { ok: true }) as ActionResult;
  });
  const reportHostIssue = vi.fn();
  const creation = createTreeDesignerCore(createTree(), createConfig());
  if (!creation.ok) throw new Error('tree core creation failed');
  const core = creation.core;

  const helpers = {
    dispatch,
    render: vi.fn(),
    evaluate: vi.fn(),
    evaluateCompiled: vi.fn(),
    createScope: vi.fn(),
    disposeScope: vi.fn(),
    executeSource: vi.fn(),
  } as unknown as RendererHelpers;

  const session = new TreeDocumentSession(
    {
      core,
      sessionId: 'session-1',
      changeAction,
      helpers,
      designerScope: { id: 'scope-1' } as ScopeRef,
      reportHostIssue,
    },
    { onStateChange: vi.fn() },
  );
  const unsubscribe = core.subscribe((event) => {
    if (event.type === 'treeChanged') {
      session.enqueueTreeChange(event.tree, event.reason, event.commandType);
    }
  });

  return { session, core, dispatch, reportHostIssue, unsubscribe };
}

function cloneWithLabel(tree: TreeDocument, label: string): TreeDocument {
  const next = JSON.parse(JSON.stringify(tree)) as TreeDocument;
  next.root = { ...next.root, data: { ...next.root.data, label } };
  return next;
}

describe('TreeDocumentSession - FIFO dispatch', () => {
  it('enqueues tree changes and dispatches them in order', async () => {
    const { session, core, dispatch } = createHarness();
    const tree1 = cloneWithLabel(createTree(), 'One');
    core.replaceTreeFromHost(tree1, 1);
    session.applyHostInput({ treeDocument: tree1, epoch: 1 });

    core.insertChainNode('root', 'task', { label: 'Two' });
    const afterCommand = core.getTreeDocument()!;
    void session.dispatchNext();
    await vi.waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
    const firstCall = dispatch.mock.calls[0][0];
    expect(firstCall).toBe(changeAction);
    const bindings = dispatch.mock.calls[0][1].evaluationBindings;
    expect(bindings.dispatchId).toBe(1);
    expect(bindings.sessionId).toBe('session-1');
    expect(bindings.reason).toBe('command');
    expect(bindings.treeDocument.root.child!.data.label).toBe('Two');
    expect(afterCommand.root.child!.data.label).toBe('Two');
  });

  it('removes the head on neutral action results and continues', async () => {
    const { session, core } = createHarness({ actionResult: { ok: true, skipped: true } });
    core.replaceTreeFromHost(cloneWithLabel(createTree(), 'Base'), 1);
    session.applyHostInput({ treeDocument: cloneWithLabel(createTree(), 'Base'), epoch: 1 });

    core.insertChainNode('root', 'task', { label: 'Two' });
    void session.dispatchNext();
    await vi.waitFor(() => {
      expect(session.state.pendingQueue).toHaveLength(0);
      expect(session.state.inFlight).toBeNull();
    });
  });

  it('removes the head on cancelled action results', async () => {
    const { session, core } = createHarness({ actionResult: { ok: false, cancelled: true } });
    core.replaceTreeFromHost(cloneWithLabel(createTree(), 'Base'), 1);
    session.applyHostInput({ treeDocument: cloneWithLabel(createTree(), 'Base'), epoch: 1 });

    core.insertChainNode('root', 'task', { label: 'Two' });
    void session.dispatchNext();
    await vi.waitFor(() => {
      expect(session.state.pendingQueue).toHaveLength(0);
    });
  });

  it('removes the head on failed action results', async () => {
    const { session, core, reportHostIssue } = createHarness({
      actionResult: { ok: false, error: new Error('boom') },
    });
    core.replaceTreeFromHost(cloneWithLabel(createTree(), 'Base'), 1);
    session.applyHostInput({ treeDocument: cloneWithLabel(createTree(), 'Base'), epoch: 1 });

    core.insertChainNode('root', 'task', { label: 'Two' });
    void session.dispatchNext();
    await vi.waitFor(() => {
      expect(session.state.pendingQueue).toHaveLength(0);
    });
    expect(reportHostIssue).toHaveBeenCalledWith(
      expect.objectContaining({ details: expect.objectContaining({ reason: 'tree-document-change-action-failed' }) }),
    );
  });

  it('normalizes synchronous throws into failure results', async () => {
    const { session, core, reportHostIssue } = createHarness({
      actionError: new Error('sync boom'),
    });
    core.replaceTreeFromHost(cloneWithLabel(createTree(), 'Base'), 1);
    session.applyHostInput({ treeDocument: cloneWithLabel(createTree(), 'Base'), epoch: 1 });

    core.insertChainNode('root', 'task', { label: 'Two' });
    void session.dispatchNext();
    await vi.waitFor(() => {
      expect(session.state.pendingQueue).toHaveLength(0);
    });
    expect(reportHostIssue).toHaveBeenCalled();
  });

  it('coalesces the latest change when the queue is full and appends on release', async () => {
    const { session, core } = createHarness({ actionResult: { ok: true } });
    core.replaceTreeFromHost(cloneWithLabel(createTree(), 'Base'), 1);
    session.applyHostInput({ treeDocument: cloneWithLabel(createTree(), 'Base'), epoch: 1 });

    for (let index = 0; index < TREE_SESSION_MAX_PENDING + 5; index += 1) {
      core.insertChainNode('root', 'task', { label: `Node ${index}` });
      session.state.inFlight = null;
    }

    expect(session.state.coalescedUnsent).not.toBeNull();
    expect(session.state.pendingQueue.length).toBeLessThanOrEqual(TREE_SESSION_MAX_PENDING);
  });
});

describe('TreeDocumentSession - host epoch and ack', () => {
  it('replaces the pair on strictly greater epoch', () => {
    const { session, core } = createHarness();
    const treeA = cloneWithLabel(createTree(), 'A');
    const treeB = cloneWithLabel(createTree(), 'B');
    session.applyHostInput({ treeDocument: treeA, epoch: 1 });
    expect(core.getTreeDocument()?.root.data.label).toBe('A');

    session.applyHostInput({ treeDocument: treeB, epoch: 2 });
    expect(core.getTreeDocument()?.root.data.label).toBe('B');
    expect(session.state.lastAcceptedHostEpoch).toBe(2);
  });

  it('ignores an equal or smaller epoch', () => {
    const { session } = createHarness();
    const treeA = cloneWithLabel(createTree(), 'A');
    session.applyHostInput({ treeDocument: treeA, epoch: 3 });

    const outcome = session.applyHostInput({ treeDocument: treeA, epoch: 2 });
    expect(['echo', 'stale-ack', 'conflict', 'ack-invalid', 'stale-echo', 'unchanged']).toContain(outcome.outcome);
    expect(session.state.lastAcceptedHostEpoch).toBe(3);
  });

  it('rejects invalid epoch values', () => {
    const { session } = createHarness();
    const outcome = session.applyHostInput({ treeDocument: createTree(), epoch: -1 });
    expect(outcome.outcome).toBe('invalid-epoch');
  });

  it('rejects non-integer epoch values', () => {
    const { session } = createHarness();
    const outcome = session.applyHostInput({ treeDocument: createTree(), epoch: 1.5 });
    expect(outcome.outcome).toBe('invalid-epoch');
  });

  it('accepts an ack that matches session id, head dispatch id, and digest', async () => {
    const { session, core } = createHarness({ actionResult: { ok: true } });
    core.replaceTreeFromHost(cloneWithLabel(createTree(), 'Base'), 1);
    session.applyHostInput({ treeDocument: cloneWithLabel(createTree(), 'Base'), epoch: 1 });

    core.insertChainNode('root', 'task', { label: 'Two' });
    const treeAfter = core.getTreeDocument()!;
    const head = session.state.pendingQueue[0];
    expect(head).toBeTruthy();

    const outcome = session.applyHostInput({
      treeDocument: treeAfter,
      ackSessionId: 'session-1',
      ackDispatchId: head.dispatchId,
    });
    expect(outcome.outcome).toBe('ack-accepted');
    expect(session.state.pendingQueue).toHaveLength(0);
  });

  it('treats an unknown session id ack as stale no-op', async () => {
    const { session, core } = createHarness({ actionResult: { ok: true } });
    core.replaceTreeFromHost(cloneWithLabel(createTree(), 'Base'), 1);
    session.applyHostInput({ treeDocument: cloneWithLabel(createTree(), 'Base'), epoch: 1 });

    core.insertChainNode('root', 'task', { label: 'Two' });
    const treeAfter = core.getTreeDocument()!;

    const outcome = session.applyHostInput({
      treeDocument: treeAfter,
      ackSessionId: 'other-session',
      ackDispatchId: 1,
    });
    expect(outcome.outcome).toBe('stale-ack');
    expect(session.state.pendingQueue).toHaveLength(1);
  });

  it('returns tree-host-invalid-ack for a digest mismatch on the head', async () => {
    const { session, core } = createHarness({ actionResult: { ok: true } });
    core.replaceTreeFromHost(cloneWithLabel(createTree(), 'Base'), 1);
    session.applyHostInput({ treeDocument: cloneWithLabel(createTree(), 'Base'), epoch: 1 });

    core.insertChainNode('root', 'task', { label: 'Two' });
    const mismatched = cloneWithLabel(createTree(), 'Mismatch');
    const head = session.state.pendingQueue[0];

    const outcome = session.applyHostInput({
      treeDocument: mismatched,
      ackSessionId: 'session-1',
      ackDispatchId: head.dispatchId,
    });
    expect(outcome.outcome).toBe('ack-invalid');
  });

  it('treats a digest inside the local LRU as a stale echo', () => {
    const { session } = createHarness();
    const treeA = cloneWithLabel(createTree(), 'A');
    session.applyHostInput({ treeDocument: treeA, epoch: 1 });
    const digest = digestTreeDocument(treeA);

    const outcome = session.applyHostInput({ treeDocument: treeA });
    expect(['echo', 'stale-echo']).toContain(outcome.outcome);
    expect(digest).toBeTruthy();
  });

  it('disposes cleanly and makes stale completions inert', async () => {
    const { session, core } = createHarness({ actionResult: { ok: true } });
    core.replaceTreeFromHost(cloneWithLabel(createTree(), 'Base'), 1);
    session.applyHostInput({ treeDocument: cloneWithLabel(createTree(), 'Base'), epoch: 1 });

    core.insertChainNode('root', 'task', { label: 'Two' });
    session.dispose();
    expect(session.isDisposed()).toBe(true);
    expect(session.state.pendingQueue).toHaveLength(0);
    expect(session.state.inFlight).toBeNull();
  });
});

describe('TreeDocumentSession - no change action', () => {
  it('does not create a pending queue without a change action', () => {
    const creation = createTreeDesignerCore(createTree(), createConfig());
    if (!creation.ok) throw new Error('tree core creation failed');
    const session = new TreeDocumentSession(
      {
        core: creation.core,
        sessionId: 'session-1',
        changeAction: undefined,
        helpers: {} as unknown as RendererHelpers,
        designerScope: { id: 'scope-1' } as ScopeRef,
        reportHostIssue: vi.fn(),
      },
      { onStateChange: vi.fn() },
    );

    creation.core.insertChainNode('root', 'task', { label: 'Two' });
    expect(session.state.pendingQueue).toHaveLength(0);
    expect(session.state.coalescedUnsent).toBeNull();
  });
});
