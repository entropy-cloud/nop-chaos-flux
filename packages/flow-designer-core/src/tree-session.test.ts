import { describe, expect, it } from 'vitest';
import { createTreeDesignerCore, createDesignerCore } from './core.js';
import type { DesignerConfig, TreeDocument, DesignerEvent } from './types.js';
import { normalizeConfig } from './core/config.js';
import { projectAndLayoutTree } from './tree-projection.js';
import { createDesignerShellState } from './core/shell-state.js';
import { buildTreeSessionContext, createTreeSessionSurface } from './tree-session-impl.js';

function createTreeConfig(overrides?: Partial<DesignerConfig>): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      {
        id: 'start',
        label: 'Start',
        defaults: { label: 'Start' },
      },
      {
        id: 'task',
        label: 'Task',
        defaults: { label: 'Task' },
        tree: { allowChild: true, allowBranches: true, layoutSize: { width: 220, height: 80 } },
      },
      {
        id: 'condition',
        label: 'Condition',
        defaults: { label: 'Condition' },
        tree: { allowBranches: true, layoutSize: { width: 220, height: 80 } },
      },
      {
        id: 'end',
        label: 'End',
        defaults: { label: 'End' },
      },
    ],
    edgeTypes: [
      {
        id: 'chain',
        label: 'Chain',
        appearance: { stroke: '#000', strokeWidth: 2 },
      },
      {
        id: 'branch',
        label: 'Branch',
        appearance: { stroke: '#000', strokeWidth: 2 },
      },
      {
        id: 'merge',
        label: 'Merge',
        appearance: { stroke: '#000', strokeWidth: 2 },
      },
      { id: 'default', label: 'Default' },
    ],
    documentMode: 'tree',
    treeConfig: {
      layout: { direction: 'TB', nodeSpacing: 60, layerSpacing: 100 },
      showGatewayNodes: false,
      showMergeNodes: false,
      chainEdgeType: 'chain',
      branchEdgeType: 'branch',
      mergeEdgeType: 'merge',
    },
    ...overrides,
  };
}

function createChainTree(): TreeDocument {
  return {
    id: 'tree-1',
    kind: 'flow',
    name: 'Chain',
    version: '1.0.0',
    root: {
      id: 'root',
      type: 'task',
      data: { label: 'Root' },
      child: {
        id: 'n1',
        type: 'task',
        data: { label: 'N1' },
        child: {
          id: 'n2',
          type: 'task',
          data: { label: 'N2' },
          child: { id: 'end', type: 'end', data: { label: 'End' } },
        },
      },
    },
  };
}

function createBranchTree(): TreeDocument {
  return {
    id: 'tree-1',
    kind: 'flow',
    name: 'Branch',
    version: '1.0.0',
    root: {
      id: 'root',
      type: 'task',
      data: { label: 'Root' },
      child: {
        id: 'cond',
        type: 'condition',
        data: { label: 'Condition' },
        branches: [
          { id: 'b1', data: { label: 'A' }, child: { id: 'leaf-a', type: 'task', data: { label: 'A' } } },
          { id: 'b2', data: { label: 'B' }, child: { id: 'leaf-b', type: 'task', data: { label: 'B' } } },
        ],
        child: { id: 'after', type: 'task', data: { label: 'After' } },
      },
    },
  };
}

function collectEvents(core: ReturnType<typeof createTreeDesignerCore> extends { ok: true; core: infer C } ? C : never): DesignerEvent[] {
  const events: DesignerEvent[] = [];
  core.subscribe((event) => events.push(event));
  return events;
}

function getCore(result: ReturnType<typeof createTreeDesignerCore>) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('tree core creation failed');
  return result.core;
}

describe('createTreeDesignerCore - factory', () => {
  it('creates a tree core with a projected pair document', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    expect(core.getDocument().nodes).toHaveLength(4);
    expect(core.getTreeDocument()?.root.id).toBe('root');
    expect(core.getDocument().edges).toHaveLength(3);
  });

  it('rejects invalid trees without creating a core', () => {
    const tree = createChainTree();
    tree.root.child!.id = 'root';
    const result = createTreeDesignerCore(tree, createTreeConfig());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('duplicate-id');
  });

  it('rejects unsupported config versions', () => {
    const result = createTreeDesignerCore(createChainTree(), createTreeConfig({ version: '2.0.0' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unsupported-version');
  });

  it('migrates legacy 1.0 config version to 1.1.0', () => {
    const config = createTreeConfig({ version: '1.0' });
    const core = getCore(createTreeDesignerCore(createChainTree(), config));
    expect(core.getConfig().version).toBe('1.1.0');
  });

  it('removes treeConfig.autoLayout during migration', () => {
    const config = createTreeConfig();
    (config.treeConfig as { autoLayout?: boolean }).autoLayout = true;
    const core = getCore(createTreeDesignerCore(createChainTree(), config));
    expect('autoLayout' in (core.getConfig().treeConfig ?? {})).toBe(false);
  });

  it('copies appearance minWidth/minHeight into missing tree.layoutSize', () => {
    const config = createTreeConfig();
    const nodeType = config.nodeTypes[1];
    delete nodeType.tree!.layoutSize;
    nodeType.appearance = { minWidth: 260, minHeight: 100 };
    const core = getCore(createTreeDesignerCore(createChainTree(), config));
    expect(core.getConfig().nodeTypes.get('task')?.tree?.layoutSize).toEqual({ width: 260, height: 100 });
  });

  it('createDesignerCore rejects tree mode with tree-core-factory-required', () => {
    expect(() => createDesignerCore({ id: 'd', kind: 'flow', name: 'x', version: '1.0.0', nodes: [], edges: [] }, createTreeConfig())).toThrow(
      'tree-core-factory-required',
    );
  });
});

describe('createTreeDesignerCore - mutation gate', () => {
  it('rejects every graph topology mutation with mutationRejected diagnostics', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    const events = collectEvents(core);

    expect(core.addNode('task', { x: 0, y: 0 })).toBeNull();
    core.updateNode('n1', { label: 'x' });
    core.moveNode('n1', { x: 1, y: 1 });
    expect(core.duplicateNode('n1')).toBeNull();
    core.deleteNode('n1');
    expect(core.addEdge('root', 'n1')).toBeNull();
    expect(core.reconnectEdge('te-1', 'root', 'end')).toEqual({ ok: false, reason: 'unavailable' });
    core.updateEdge('te-1', { label: 'x' });
    core.deleteEdge('te-1');
    core.moveNodes({ n1: { dx: 1, dy: 1 } });
    core.updateMultipleNodes([{ nodeId: 'n1', data: { label: 'x' } }]);
    core.pasteClipboard();
    core.layoutNodes(new Map([['n1', { x: 0, y: 0 }]]));

    const rejected = events.filter((event) => event.type === 'mutationRejected');
    expect(rejected.length).toBeGreaterThanOrEqual(13);
    expect(new Set(rejected.map((event) => event.type === 'mutationRejected' ? event.method : ''))).toContain('addNode');

    const doc = core.getDocument();
    expect(doc.nodes).toHaveLength(4);
    expect(doc.edges).toHaveLength(3);
  });

  it('keeps pair and history unchanged after rejected mutations', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    const beforeDoc = core.getDocument();
    core.addEdge('root', 'n1');
    core.deleteNode('n1');
    core.reconnectEdge('te-1', 'root', 'end');
    expect(core.getDocument()).toBe(beforeDoc);
    expect(core.canUndo()).toBe(false);
    expect(core.getSnapshot().isDirty).toBe(false);
  });

  it('rejects replaceDocument and replaceDocumentFromHost in tree mode', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    const events = collectEvents(core);
    const doc = core.getDocument();
    core.replaceDocument(doc);
    core.replaceDocumentFromHost(doc);
    expect(events.some((event) => event.type === 'mutationRejected')).toBe(true);
  });
});

describe('createTreeDesignerCore - tree commands', () => {
  it('inserts a chain node between source and downstream', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    const result = core.insertChainNode('n1', 'task', { label: 'New' });
    expect(result.ok).toBe(true);
    const tree = core.getTreeDocument()!;
    expect(tree.root.child!.id).toBe('n1');
    expect(tree.root.child!.child!.data.label).toBe('New');
    expect(tree.root.child!.child!.child!.id).toBe('n2');
  });

  it('deletes a chain node and splices its child', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    const result = core.deleteTreeNode('n1');
    expect(result.ok).toBe(true);
    const tree = core.getTreeDocument()!;
    expect(tree.root.child!.id).toBe('n2');
  });

  it('rejects deleting the root', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    const result = core.deleteTreeNode('root');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('constraint');
  });

  it('rejects deleting a branch owner', () => {
    const core = getCore(createTreeDesignerCore(createBranchTree(), createTreeConfig()));
    const result = core.deleteTreeNode('cond');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('constraint');
  });

  it('deletes a branch-subtree head and turns the branch into an empty slot', () => {
    const core = getCore(createTreeDesignerCore(createBranchTree(), createTreeConfig()));
    const result = core.deleteTreeNode('leaf-a');
    expect(result.ok).toBe(true);
    const tree = core.getTreeDocument()!;
    const cond = tree.root.child!;
    expect(cond.branches![0].child).toBeUndefined();
  });

  it('inserts a branch child into an empty branch', () => {
    const tree = createBranchTree();
    delete (tree.root.child as { branches?: Array<{ child?: unknown }> }).branches![1].child;
    const core = getCore(createTreeDesignerCore(tree, createTreeConfig()));
    const result = core.insertBranchChild('cond', 'b2', 'task', { label: 'Filled' });
    expect(result.ok).toBe(true);
    const updated = core.getTreeDocument()!;
    expect(updated.root.child!.branches![1].child?.data.label).toBe('Filled');
  });

  it('rejects insertBranchChild on a non-empty branch', () => {
    const core = getCore(createTreeDesignerCore(createBranchTree(), createTreeConfig()));
    const result = core.insertBranchChild('cond', 'b1', 'task');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('constraint');
  });

  it('rejects insertBranchChild for a missing branch or node type', () => {
    const core = getCore(createTreeDesignerCore(createBranchTree(), createTreeConfig()));
    expect(core.insertBranchChild('cond', 'missing-branch', 'task').ok).toBe(false);
    expect(core.insertBranchChild('missing-owner', 'b1', 'task').ok).toBe(false);
    expect(core.insertBranchChild('cond', 'b2', 'unknown-type').ok).toBe(false);
  });

  it('keeps undo/redo coherent with paired tree and graph', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    core.insertChainNode('n1', 'task', { label: 'New' });
    expect(core.getDocument().nodes).toHaveLength(5);

    core.undo();
    expect(core.getTreeDocument()?.root.child!.child!.id).toBe('n2');
    expect(core.getDocument().nodes).toHaveLength(4);

    core.redo();
    expect(core.getDocument().nodes).toHaveLength(5);
    expect(core.getTreeDocument()?.root.child!.child!.child!.id).toBe('n2');
  });

  it('emits treeChanged events with the command reason', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    const events: DesignerEvent[] = [];
    core.subscribe((event) => events.push(event));
    core.insertChainNode('n1', 'task');
    core.undo();
    core.redo();
    const treeChanged = events.filter((event) => event.type === 'treeChanged') as Array<Extract<DesignerEvent, { type: 'treeChanged' }>>;
    expect(treeChanged.map((event) => event.reason)).toEqual(['command', 'undo', 'redo']);
  });
});

describe('createTreeDesignerCore - host replacement', () => {
  it('replaces the paired view from host with epoch', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    const nextTree = createBranchTree();
    const result = core.replaceTreeFromHost(nextTree, 5);
    expect(result.ok).toBe(true);
    expect(core.getTreeDocument()?.root.child!.id).toBe('cond');
    expect(core.getDocument().nodes.length).toBeGreaterThan(4);
    expect(core.getSnapshot().isDirty).toBe(false);
    expect(core.canUndo()).toBe(false);
  });

  it('rejects invalid host epoch values', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    const result = core.replaceTreeFromHost(createChainTree(), -1);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error?.code).toBe('invalid-tree-document-epoch');
  });

  it('rejects invalid host trees without replacing the pair', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    const badTree = createBranchTree();
    badTree.root.id = '__fd_internal__/bad';
    const result = core.replaceTreeFromHost(badTree, 2);
    expect(result.ok).toBe(false);
    expect(core.getTreeDocument()?.root.id).toBe('root');
  });

  it('rejects non-integer epoch values', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    const result = core.replaceTreeFromHost(createChainTree(), 1.5);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error?.code).toBe('invalid-tree-document-epoch');
  });
});

describe('createTreeDesignerCore - relayout and export', () => {
  it('relayouts without dirty/history and is a no-op when coordinates are unchanged', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    const events: DesignerEvent[] = [];
    core.subscribe((event) => events.push(event));
    const result = core.relayoutTree();
    expect(result.ok).toBe(true);
    expect(core.getSnapshot().isDirty).toBe(false);
    expect(core.canUndo()).toBe(false);
    const changed = events.some((event) => event.type === 'presentationChanged');
    expect(changed).toBe(false);
    expect(events.some((event) => event.type === 'documentChanged')).toBe(false);
  });

  it('exports the TreeDocument JSON from exportDocument', () => {
    const core = getCore(createTreeDesignerCore(createChainTree(), createTreeConfig()));
    const exported = core.exportDocument();
    const parsed = JSON.parse(exported);
    expect(parsed.root.id).toBe('root');
    expect(exported).not.toContain('__fdTree');
    expect(exported).not.toContain('nodes');
  });
});

describe('relayoutTree change detection branches (15-1)', () => {
  function createSessionHarness() {
    const normalizedConfig = normalizeConfig(createTreeConfig());
    const tree = createChainTree();
    const projection = projectAndLayoutTree(tree, normalizedConfig);
    if (!projection.ok) throw new Error('projection failed');
    const state = {
      treeDocument: projection.view.tree,
      doc: projection.view.document,
      docRevision: 0,
      events: [] as DesignerEvent[],
    };
    const shellState = createDesignerShellState(state.doc);
    const ctx = buildTreeSessionContext({
      isTreeMode: true,
      getCurrentTreeDocument: () => state.treeDocument,
      setCurrentTreeDocument: (value) => {
        state.treeDocument = value;
      },
      lastAcceptedHostEpoch: 0,
      normalizedConfig,
      getDoc: () => state.doc,
      setDoc: (value) => {
        state.doc = value;
      },
      getDocRevision: () => state.docRevision,
      setDocRevision: (value) => {
        state.docRevision = value;
      },
      historyState: {} as never,
      savedTreeDocument: undefined,
      savedRevision: 0,
      transactionStack: [],
      shellState,
      isReadonly: false,
      assertReadonly: () => false,
      emit: (event) => {
        state.events.push(event);
      },
      emitTreeChanged: () => {},
      replaceDocument: () => {},
      replaceHistoryBaseline: () => {},
      markHostDocumentSaved: () => {},
      pushHistory: () => {},
      canUndo: () => false,
      canRedo: () => false,
      isDirty: () => false,
      updateDirtyState: () => {},
      resetViewport: () => {},
    });
    const surface = createTreeSessionSurface(ctx);
    return { surface, state };
  }

  it('no-op branch: relayout over a synchronized pair emits nothing (15-1)', () => {
    const { surface, state } = createSessionHarness();
    const before = state.doc.nodes.map((node) => ({ id: node.id, position: node.position }));

    const result = surface.relayoutTree();

    expect(result.ok).toBe(true);
    expect(state.events.some((event) => event.type === 'presentationChanged')).toBe(false);
    expect(state.doc.nodes.map((node) => ({ id: node.id, position: node.position }))).toEqual(
      before,
    );
  });

  it('changed branch: relayout over a desynced pair emits presentationChanged and restores projection positions (15-1)', () => {
    const { surface, state } = createSessionHarness();
    const expectedPositions = state.doc.nodes.map((node) => ({
      id: node.id,
      position: node.position,
    }));
    state.doc = {
      ...state.doc,
      nodes: state.doc.nodes.map((node) => ({ ...node, position: { x: 0, y: 0 } })),
    };

    const result = surface.relayoutTree();

    expect(result.ok).toBe(true);
    expect(state.events.some((event) => event.type === 'presentationChanged')).toBe(true);
    expect(state.doc.nodes.map((node) => ({ id: node.id, position: node.position }))).toEqual(
      expectedPositions,
    );
  });

  it('changed branch emits while the tree version stays unchanged, proving a revision-count comparison cannot be equivalent (15-1)', () => {
    const { surface, state } = createSessionHarness();
    state.doc = {
      ...state.doc,
      nodes: state.doc.nodes.map((node) => ({ ...node, position: { x: 1, y: 1 } })),
    };

    surface.relayoutTree();

    expect(state.events.some((event) => event.type === 'presentationChanged')).toBe(true);
    expect(state.events.at(-1)).toMatchObject({ type: 'presentationChanged' });
  });
});
