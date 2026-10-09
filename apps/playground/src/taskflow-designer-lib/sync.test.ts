import { describe, expect, it } from 'vitest';
import type { GraphDocument, TreeDocument } from '@nop-chaos/flow-designer-core';
import { syncFromGraphDocument, syncFromTreeDocument } from './sync.js';
import { validateAuthoringModel } from './validation.js';
import type { TaskFlowAuthoringModel, TaskFlowGraphContainer, TaskFlowTreeContainer } from './types.js';
import { createNamespace } from './index.js';

function createWorkflowModel(): TaskFlowAuthoringModel & { root: TaskFlowGraphContainer } {
  return {
    kind: 'nop-taskflow',
    schemaVersion: '1.0',
    task: {
      version: 1,
      graphMode: true,
      restartable: false,
      defaultSaveState: true,
      useParentBeanContainer: false,
      recordMetrics: false,
    },
    root: {
      id: 'root',
      profile: 'workflow',
      enterStepRefs: ['n1'],
      exitStepRefs: ['n1'],
      nodes: [],
      edges: [],
    },
  };
}

function createTreeModel(): TaskFlowAuthoringModel & { root: TaskFlowTreeContainer } {
  return {
    kind: 'nop-taskflow',
    schemaVersion: '1.0',
    task: {
      version: 1,
      graphMode: false,
      restartable: false,
      defaultSaveState: true,
      useParentBeanContainer: false,
      recordMetrics: false,
    },
    root: {
      id: 'root',
      profile: 'dingflow',
      syntheticRootId: '__root__',
      steps: [],
    },
  };
}

describe('taskflow sync guards', () => {
  it('maps workflow graph node ids to valid taskflow step types when task payload is missing', () => {
    const model = createWorkflowModel();
    const graphDoc: GraphDocument = {
      id: 'root',
      kind: 'graph',
      name: 'Workflow',
      version: '1',
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        {
          id: 'n1',
          type: 'tf-invoke',
          position: { x: 10, y: 20 },
          data: {},
        },
      ],
      edges: [],
    };

    const synced = syncFromGraphDocument(model, 'root', graphDoc);
    const node = synced.root.profile === 'workflow' ? synced.root.nodes[0] : undefined;

    expect(node?.step.type).toBe('invoke');
    expect(node?.step.props).toEqual({ type: 'invoke', bean: '', method: '' });
    expect(validateAuthoringModel(synced)).toEqual([]);
  });

  it('ignores malformed graph step payloads instead of persisting invalid step unions', () => {
    const model = createWorkflowModel();
    const graphDoc: GraphDocument = {
      id: 'root',
      kind: 'graph',
      name: 'Workflow',
      version: '1',
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        {
          id: 'n1',
          type: 'tf-script',
          position: { x: 10, y: 20 },
          data: {
            step: {
              type: 'bogus',
              common: { name: 'unsafe-step' },
              props: { type: 'bogus', unexpected: true },
            },
          },
        },
      ],
      edges: [],
    };

    const synced = syncFromGraphDocument(model, 'root', graphDoc);
    const node = synced.root.profile === 'workflow' ? synced.root.nodes[0] : undefined;

    expect(node?.step.type).toBe('script');
    expect(node?.step.props.type).toBe('script');
    expect(validateAuthoringModel(synced)).toEqual([]);
  });

  it('preserves graph node step payload during projection-style flush updates', () => {
    const model = createWorkflowModel();
    model.root.nodes = [
      {
        id: 'n1',
        position: { x: 10, y: 20 },
        step: {
          id: 'n1',
          type: 'invoke',
          common: { name: 'invokeStep' },
          props: { type: 'invoke', bean: 'UserService', method: 'load' },
        },
      },
    ];
    model.root.enterStepRefs = ['n1'];
    model.root.exitStepRefs = ['n1'];

    const graphDoc: GraphDocument = {
      id: 'root',
      kind: 'graph',
      name: 'Workflow',
      version: '1',
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        {
          id: 'n1',
          type: 'tf-invoke',
          position: { x: 30, y: 40 },
          data: {
            step: {
              id: 'n1',
              type: 'invoke',
              common: { name: 'invokeStep' },
              props: { type: 'invoke', bean: 'UserService', method: 'load' },
            },
          },
        },
      ],
      edges: [],
    };

    const synced = syncFromGraphDocument(model, 'root', graphDoc);
    const node = synced.root.profile === 'workflow' ? synced.root.nodes[0] : undefined;

    expect(node?.step.props).toEqual({ type: 'invoke', bean: 'UserService', method: 'load' });
    expect(validateAuthoringModel(synced)).toEqual([]);
  });

  it('normalizes unknown tree branch types back to a safe default', () => {
    const model = createTreeModel();
    const treeDoc: TreeDocument = {
      id: 'root',
      kind: 'tree',
      name: 'Tree',
      version: '1',
      root: {
        id: '__root__',
        type: 'root',
        data: {},
        child: {
          id: 'step-1',
          type: 'node',
          data: {
            step: {
              id: 'step-1',
              type: 'if',
              common: { name: 'condition' },
              props: { type: 'if' },
            },
          },
          branches: [
            {
              id: 'branch-1',
              data: { branchType: 'bogus', label: 'Unsafe' },
              child: undefined,
            },
          ],
          child: undefined,
        },
      },
    };

    const synced = syncFromTreeDocument(model, 'root', treeDoc);
    const step = synced.root.profile === 'dingflow' ? synced.root.steps[0] : undefined;

    expect(step?.branches?.[0]?.data.branchType).toBe('then');
    expect(validateAuthoringModel(synced)).toEqual([]);
  });

  it('reports unsupported step unions during validation', () => {
    const model = createWorkflowModel();
    model.root.nodes = [
      {
        id: 'n1',
        position: { x: 0, y: 0 },
        step: {
          id: 'n1',
          type: 'bogus' as never,
          common: { name: 'bad' },
          props: { type: 'bogus' as never },
        },
      },
    ];
    model.root.enterStepRefs = ['n1'];
    model.root.exitStepRefs = ['n1'];

    const errors = validateAuthoringModel(model);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'root.nodes[n1].type', message: 'Unsupported step type: "bogus"' }),
        expect.objectContaining({ path: 'root.nodes[n1].props.type', message: 'Unsupported step props type: "bogus"' }),
      ]),
    );
  });

  it('maps workflow end nodes to the supported end step union', () => {
    const model = createWorkflowModel();
    const graphDoc: GraphDocument = {
      id: 'root',
      kind: 'graph',
      name: 'Workflow',
      version: '1',
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        {
          id: 'n1',
          type: 'tf-end',
          position: { x: 10, y: 20 },
          data: {},
        },
      ],
      edges: [],
    };

    const synced = syncFromGraphDocument(model, 'root', graphDoc);
    const node = synced.root.profile === 'workflow' ? synced.root.nodes[0] : undefined;

    expect(node?.step.type).toBe('end');
    expect(node?.step.props).toEqual({ type: 'end' });
    expect(validateAuthoringModel(synced)).toEqual([]);
  });

  it('rejects unsupported imported DSL step types instead of downgrading them to script', async () => {
    const namespace = createNamespace({} as never);
    const result = await namespace.invoke(
      'import-json',
      {
        json: {
          kind: 'nop-taskflow',
          schemaVersion: '1.0',
          task: { graphMode: true },
          steps: [{ type: 'selector', name: 'pickOne' }],
        },
      },
      {} as never,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toContain('Unsupported TaskFlow step types: selector');
  });
});

describe('plan 556: tree projection sync (dingflow fresh-page save/export)', () => {
  // Captured via createTreeDesignerCore(demo treeDocument) + buildDesignerHostProjection
  // (the exact production path the tree tab publishes to `$page.imports.designer`).
  // Host projection edges carry NO branch/continuation discriminator (the internal
  // __fdTree payload is sanitized away), so the v1 contract is structure-level:
  // chain walk + fan-out-as-branches, step props defaulted (or merged from an
  // existing model by step id).
  const dingflowProjectionDoc = {
    id: 'tf-dingflow-demo',
    kind: 'nop-taskflow-dingflow',
    name: 'TaskFlow DingFlow Demo',
    version: '1.0.0',
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [
      { id: '__synthetic_root__', type: 'tf-entry', position: { x: 110, y: 0 } },
      { id: 'seq-1', type: 'tf-sequential', position: { x: 85, y: 112 } },
      { id: 'script-1', type: 'tf-script', position: { x: 85, y: 236 } },
      { id: 'if-1', type: 'tf-if', position: { x: 80, y: 360 } },
      { id: 'invoke-1', type: 'tf-invoke', position: { x: 0, y: 538 } },
      { id: 'script-2', type: 'tf-script', position: { x: 170, y: 538 } },
    ],
    edges: [
      { id: 'te-1', source: '__synthetic_root__', target: 'seq-1' },
      { id: 'te-2', source: 'seq-1', target: 'script-1' },
      { id: 'te-3', source: 'script-1', target: 'if-1' },
      { id: 'te-4', source: 'if-1', target: 'invoke-1' },
      { id: 'te-5', source: 'if-1', target: 'script-2' },
    ],
    nodeCount: 6,
    edgeCount: 5,
  };

  function treeCtxWithDoc(doc: unknown): import('@nop-chaos/flux-core').ActionContext {
    return {
      scope: {
        readOwn: () => ({ doc }),
        get: () => undefined,
      },
    } as never;
  }

  it('save on a fresh tree page bootstraps a dingflow model from the projection', async () => {
    const namespace = createNamespace({} as never);
    const result = await namespace.invoke('save', undefined, treeCtxWithDoc(dingflowProjectionDoc));

    expect(result.ok).toBe(true);
    const dsl = (result.data as { dsl: { steps: Array<Record<string, unknown>> } }).dsl;
    // V1 contract: the host projection carries no step payloads, so display
    // names default to the node ids (the canvas labels live in data.step,
    // which never reaches the imported-library scope).
    const names = (dsl.steps ?? []).map((s) => (s.common as { name?: string } | undefined)?.name ?? s.name);
    expect(names).toEqual(['seq-1', 'script-1', 'if-1']);

    // Lowered DSL shape: `if` branches lower to then/else keys.
    const ifStep = (dsl.steps ?? [])[2] as { then?: Array<Record<string, unknown>>; else?: Array<Record<string, unknown>> };
    const stepName = (s: Record<string, unknown> | undefined) =>
      ((s?.common as { name?: string } | undefined)?.name ?? s?.name) as string;
    expect((ifStep.then ?? []).map(stepName)).toEqual(['invoke-1']);
    expect((ifStep.else ?? []).map(stepName)).toEqual(['script-2']);
  });

  it('export on a fresh tree page lowers the synced projection instead of failing', async () => {
    const namespace = createNamespace({} as never);
    const result = await namespace.invoke('export-json', undefined, treeCtxWithDoc(dingflowProjectionDoc));

    expect(result.ok).toBe(true);
    const dsl = (result.data as { dsl: { steps: unknown[] } }).dsl;
    expect(dsl.steps.length).toBe(3);
  });

  it('re-save merges canvas structure into an existing model without duplicating steps', async () => {
    const namespace = createNamespace({} as never);
    await namespace.invoke('save', undefined, treeCtxWithDoc(dingflowProjectionDoc));
    const second = await namespace.invoke('save', undefined, treeCtxWithDoc(dingflowProjectionDoc));

    expect(second.ok).toBe(true);
    const dsl = (second.data as { dsl: { steps: unknown[] } }).dsl;
    expect(dsl.steps.length).toBe(3);
  });

  it('import-json on a dingflow-profile DSL returns a tree projection for canvas injection', async () => {
    const namespace = createNamespace({} as never);
    const result = await namespace.invoke(
      'import-json',
      {
        json: {
          kind: 'nop-taskflow',
          schemaVersion: '1.0',
          task: { graphMode: false },
          steps: [
            { type: 'sequential', name: 'importedSeq', steps: [{ type: 'script', name: 'importedScript' }] },
            { type: 'if', name: 'importedIf', branches: [{ branchType: 'then', steps: [{ type: 'invoke', name: 'importedInvoke' }] }] },
          ],
        },
      },
      {} as never,
    );

    expect(result.ok).toBe(true);
    const data = result.data as { projectedDoc: unknown; projectedTreeDoc: { root: unknown } | null; profile: string };
    expect(data.profile).toBe('dingflow');
    expect(data.projectedTreeDoc).toBeTruthy();
    expect(data.projectedTreeDoc?.root).toBeTruthy();
  });
});
