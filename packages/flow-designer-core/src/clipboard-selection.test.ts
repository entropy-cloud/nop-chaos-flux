import { describe, expect, it } from 'vitest';
import { createDesignerCore, createTreeDesignerCore } from './core.js';
import type { DesignerConfig, GraphDocument } from './types.js';

function createTestDesignerConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      {
        id: 'start',
        label: 'Start',
        defaults: { label: 'Start', description: '', config: '{}' },
        constraints: { maxInstances: 1 },
      },
      {
        id: 'task',
        label: 'Task',
        defaults: { label: 'Task', description: '', config: '{}' },
      },
      {
        id: 'end',
        label: 'End',
        defaults: { label: 'End', description: '', config: '{}' },
      },
    ],
    edgeTypes: [
      {
        id: 'default',
        label: 'Flow',
        defaults: { label: 'Flow', condition: '', lineStyle: 'solid' },
      },
    ],
    palette: {
      groups: [
        {
          id: 'basic',
          label: 'Basic',
          nodeTypes: ['start', 'task', 'end'],
        },
      ],
    },
  };
}

function createMultiNodeDocument(): GraphDocument {
  return {
    id: 'doc-1',
    kind: 'flow',
    name: 'Example',
    version: '1.0.0',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 10, y: 20 },
        data: { label: 'Start', description: 'Entry', config: '{}' },
      },
      {
        id: 'task-1',
        type: 'task',
        position: { x: 120, y: 60 },
        data: { label: 'Task A', description: '', config: '{}' },
      },
      {
        id: 'task-2',
        type: 'task',
        position: { x: 220, y: 60 },
        data: { label: 'Task B', description: '', config: '{}' },
      },
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

describe('selection and clipboard (plan 475 Phase 1)', () => {
  it('selectAllNodes fills the selection with every node id', () => {
    const core = createDesignerCore(createMultiNodeDocument(), createTestDesignerConfig());
    core.selectAllNodes();
    expect(core.getSnapshot().selection.selectedNodeIds).toEqual(['start-1', 'task-1', 'task-2']);
  });

  it('multi-select copy + paste clones the whole cluster with one undo step', () => {
    const core = createDesignerCore(createMultiNodeDocument(), createTestDesignerConfig());
    core.setSelection(['task-2', 'task-1'], []);

    core.copySelection();
    core.pasteClipboard();

    const doc = core.getDocument();
    expect(doc.nodes).toHaveLength(5);

    const originalIds = new Set(['start-1', 'task-1', 'task-2']);
    const pasted = doc.nodes.filter((node) => !originalIds.has(node.id));
    expect(pasted).toHaveLength(2);
    expect(pasted.map((node) => node.position)).toEqual([
      { x: 268, y: 108 },
      { x: 168, y: 108 },
    ]);
    expect(new Set(pasted.map((node) => node.data.label))).toEqual(new Set(['Task A', 'Task B']));

    expect(core.getSnapshot().canUndo).toBe(true);
    core.undo();
    expect(core.getDocument().nodes).toHaveLength(3);
  });

  it('repeated paste keeps producing fresh ids from the same clipboard', () => {
    const core = createDesignerCore(createMultiNodeDocument(), createTestDesignerConfig());
    core.setSelection(['task-1'], []);
    core.copySelection();

    core.pasteClipboard();
    core.pasteClipboard();

    const doc = core.getDocument();
    expect(doc.nodes).toHaveLength(5);
    const ids = new Set(doc.nodes.map((node) => node.id));
    expect(ids.size).toBe(5);
  });

  it('single-select copy + paste keeps the legacy +48 offset behaviour', () => {
    const core = createDesignerCore(createMultiNodeDocument(), createTestDesignerConfig());
    core.setSelection(['task-2'], []);
    core.copySelection();
    core.pasteClipboard();

    const doc = core.getDocument();
    expect(doc.nodes).toHaveLength(4);
    const pasted = doc.nodes.find((node) => node.id !== 'task-2' && node.data.label === 'Task B');
    expect(pasted?.position).toEqual({ x: 268, y: 108 });
  });

  it('copy with empty selection and paste with empty clipboard are no-ops', () => {
    const core = createDesignerCore(createMultiNodeDocument(), createTestDesignerConfig());
    core.copySelection();
    core.pasteClipboard();
    expect(core.getDocument().nodes).toHaveLength(3);

    core.setSelection([], []);
    core.copySelection();
    core.pasteClipboard();
    expect(core.getDocument().nodes).toHaveLength(3);
  });

  it('clipboard snapshots survive later document edits', () => {
    const core = createDesignerCore(createMultiNodeDocument(), createTestDesignerConfig());
    core.setSelection(['task-1'], []);
    core.copySelection();
    core.updateNode('task-1', { label: 'Renamed' });

    core.pasteClipboard();
    const pasted = core.getDocument().nodes.find((node) => node.id !== 'task-1' && node.type === 'task' && node.position.x === 168);
    expect(pasted?.data.label).toBe('Task A');
  });

  it('tree mode still rejects paste', () => {
    const treeDoc = {
      id: 'tree-1',
      kind: 'flow' as const,
      name: 'Tree',
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
    const treeConfig: DesignerConfig = {
      ...createTestDesignerConfig(),
      nodeTypes: [
        { id: 'start', label: 'Start', defaults: { label: 'Start' } },
        {
          id: 'task',
          label: 'Task',
          defaults: { label: 'Task' },
          tree: { allowChild: true, allowBranches: true, layoutSize: { width: 220, height: 80 } },
        },
        { id: 'end', label: 'End', defaults: { label: 'End' } },
      ],
      edgeTypes: [
        { id: 'chain', label: 'Chain', appearance: { stroke: '#000', strokeWidth: 2 } },
        { id: 'branch', label: 'Branch', appearance: { stroke: '#000', strokeWidth: 2 } },
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
    };
    const result = createTreeDesignerCore(treeDoc, treeConfig);
    if (!result.ok) {
      throw new Error(`tree core creation failed: ${JSON.stringify(result.error)}`);
    }
    const before = JSON.stringify(result.core.getDocument());
    result.core.pasteClipboard();
    expect(JSON.stringify(result.core.getDocument())).toBe(before);
  });
});
