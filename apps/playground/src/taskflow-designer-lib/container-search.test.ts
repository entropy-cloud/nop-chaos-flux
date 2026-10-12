import { describe, expect, it } from 'vitest';
import type { TreeDocument } from '@nop-chaos/flow-designer-core';
import { projectToGraphDocument, projectToTreeDocument } from './projection.js';
import { syncFromTreeDocument } from './sync.js';
import { createNamespace } from './index.js';
import type { TaskFlowAuthoringModel, TaskFlowGraphContainer, TaskFlowTreeContainer } from './types.js';

function createNestedWorkflowModel(): TaskFlowAuthoringModel & { root: TaskFlowGraphContainer } {
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
      nodes: [
        {
          id: 'n1',
          position: { x: 0, y: 0 },
          step: {
            id: 'n1',
            type: 'sequential',
            common: { name: 'outer-seq' },
            props: { type: 'sequential' },
            body: {
              id: 'inner-1',
              profile: 'workflow',
              name: 'Inner One',
              enterStepRefs: ['n1-1'],
              exitStepRefs: ['n1-1'],
              nodes: [
                {
                  id: 'n1-1',
                  position: { x: 10, y: 10 },
                  step: {
                    id: 'n1-1',
                    type: 'sequential',
                    common: { name: 'mid-seq' },
                    props: { type: 'sequential' },
                    body: {
                      id: 'inner-2',
                      profile: 'workflow',
                      name: 'Inner Two',
                      enterStepRefs: ['n1-2'],
                      exitStepRefs: ['n1-2'],
                      nodes: [
                        {
                          id: 'n1-2',
                          position: { x: 20, y: 20 },
                          step: {
                            id: 'n1-2',
                            type: 'invoke',
                            common: { name: 'deep-invoke' },
                            props: { type: 'invoke', bean: 'DeepBean', method: 'run' },
                          },
                        },
                      ],
                      edges: [],
                    },
                  },
                },
              ],
              edges: [],
            },
          },
        },
      ],
      edges: [],
    },
  };
}

function createNestedTreeModel(): TaskFlowAuthoringModel & { root: TaskFlowTreeContainer } {
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
      steps: [
        {
          id: 's1',
          type: 'script',
          common: { name: 'top-script' },
          props: { type: 'script', lang: 'js' },
        },
        {
          id: 's2',
          type: 'sequential',
          common: { name: 'body-holder' },
          props: { type: 'sequential' },
          body: {
            id: 'tree-body',
            profile: 'dingflow',
            name: 'Tree Body',
            syntheticRootId: '__body__',
            steps: [
              {
                id: 't1',
                type: 'invoke',
                common: { name: 'body-invoke' },
                props: { type: 'invoke', bean: 'BodyBean', method: 'call' },
              },
            ],
          },
        },
      ],
    },
  };
}

describe('WA-taskflow-001 characterization: container search across profiles', () => {
  it('projects a deeply nested workflow body container by id', () => {
    const model = createNestedWorkflowModel();
    const doc = projectToGraphDocument({ authoringModel: model, containerId: 'inner-2' });
    expect(doc?.kind).toBe('nop-taskflow-workflow');
    expect(doc?.name).toBe('Inner Two');
    expect(doc?.nodes.map((n) => n.id)).toEqual(['n1-2']);
    const nodeData = doc?.nodes[0]?.data as { step?: { props?: unknown } } | undefined;
    expect(nodeData?.step?.props).toEqual({ type: 'invoke', bean: 'DeepBean', method: 'run' });
  });

  it('projects a nested dingflow step body container by id', () => {
    const model = createNestedTreeModel();
    const doc = projectToTreeDocument({ authoringModel: model, containerId: 'tree-body' });
    expect(doc?.kind).toBe('nop-taskflow-dingflow');
    expect(doc?.root.child?.id).toBe('t1');
  });

  it('returns null projections for an unknown container id', () => {
    const model = createNestedWorkflowModel();
    expect(projectToGraphDocument({ authoringModel: model, containerId: 'missing' })).toBeNull();
    expect(projectToTreeDocument({ authoringModel: model, containerId: 'missing' })).toBeNull();
  });

  it('enter-container reaches a nested workflow body through the namespace', async () => {
    const namespace = createNamespace({} as never);
    const model = createNestedWorkflowModel();
    await namespace.invoke('set-authoring-model', { model, containerId: 'root' }, {} as never);
    const result = await namespace.invoke('enter-container', { containerId: 'inner-2' }, {} as never);
    expect(result.ok).toBe(true);
    const data = result.data as { containerId: string; profile: string };
    expect(data.containerId).toBe('inner-2');
    expect(data.profile).toBe('workflow');
  });
});

describe('WA-taskflow-003 characterization: tree-walk collection and payload resolve', () => {
  const branchedTreeDoc: TreeDocument = {
    id: 'tree-body',
    kind: 'tree',
    name: 'Tree Body',
    version: '1',
    root: {
      id: '__doc_root__',
      type: 'root',
      data: {},
      child: {
        id: 'tree-a',
        type: 'node',
        data: { step: { id: 'tree-a', type: 'script', common: { name: 'a' }, props: { type: 'script', lang: 'js' } } },
        child: {
          id: 'tree-if',
          type: 'node',
          data: { step: { id: 'tree-if', type: 'if', common: { name: 'gate' }, props: { type: 'if', condition: '1' } } },
          branches: [
            {
              id: 'tree-if-b1',
              data: { branchType: 'then' },
              child: {
                id: 'tree-b1-1',
                type: 'node',
                data: { step: { id: 'tree-b1-1', type: 'script', common: { name: 'b11' }, props: { type: 'script', lang: 'js' } } },
              },
            },
            {
              id: 'tree-if-b2',
              data: { branchType: 'else' },
              child: {
                id: 'tree-b2-1',
                type: 'node',
                data: { step: { id: 'tree-b2-1', type: 'invoke', common: { name: 'b21' }, props: { type: 'invoke', bean: 'B', method: 'm' } } },
              },
            },
          ],
          child: {
            id: 'tree-c',
            type: 'node',
            data: { step: { id: 'tree-c', type: 'script', common: { name: 'c' }, props: { type: 'script', lang: 'js' } } },
          },
        },
      },
    },
  };

  it('syncs a branched tree doc into a nested dingflow body, preserving branch steps', () => {
    const model = createNestedTreeModel();
    const synced = syncFromTreeDocument(model, 'tree-body', branchedTreeDoc);
    const rootSteps = synced.root.profile === 'dingflow' ? synced.root.steps : [];
    const body = rootSteps[1]?.body;
    expect(body?.profile).toBe('dingflow');
    const steps = (body as TaskFlowTreeContainer).steps;
    expect(steps.map((s) => s.id)).toEqual(['tree-a', 'tree-if', 'tree-c']);
    const gate = steps[1];
    expect(gate.branches?.map((b) => b.data.branchType)).toEqual(['then', 'else']);
    expect(gate.branches?.[0]?.steps.map((s) => s.id)).toEqual(['tree-b1-1']);
    expect(gate.branches?.[1]?.steps.map((s) => s.id)).toEqual(['tree-b2-1']);
    expect(gate.branches?.[1]?.steps[0].props).toEqual({ type: 'invoke', bean: 'B', method: 'm' });
  });

  it('resolves payload-provided model and containerId through the namespace', async () => {
    const namespace = createNamespace({} as never);
    const graphResult = await namespace.invoke(
      'project-to-graph',
      { model: createNestedWorkflowModel(), containerId: 'inner-1' },
      {} as never,
    );
    expect(graphResult.ok).toBe(true);
    expect((graphResult.data as { name: string }).name).toBe('Inner One');

    const treeResult = await namespace.invoke(
      'project-to-tree',
      { model: createNestedTreeModel(), containerId: 'tree-body' },
      {} as never,
    );
    expect(treeResult.ok).toBe(true);
    expect((treeResult.data as { kind: string }).kind).toBe('nop-taskflow-dingflow');
  });
});
