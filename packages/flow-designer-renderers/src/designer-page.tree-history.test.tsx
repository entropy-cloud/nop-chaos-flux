import React from 'react';
import { describe, expect, it } from 'vitest';
import type { DesignerCore } from '@nop-chaos/flow-designer-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { render, waitFor } from '@testing-library/react';
import {
  createDesignerPageSchemaRenderer,
  createRendererEnv,
  createTreeTestConfig,
  getCreateTreeDesignerCoreMock,
  getLatestCreatedTreeDesignerCore,
} from './designer-page.test-support.js';

describe('DesignerPageRenderer tree history continuity', () => {
  it('does not recreate core when treeDocument changes in tree mode', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const createTreeDesignerCoreMock = getCreateTreeDesignerCoreMock();
    const config = createTreeTestConfig();

    const initialTreeDocument = {
      id: 'tree-selection',
      kind: 'test-tree',
      name: 'Selection Continuity Tree',
      version: '1.0.0',
      root: {
        id: 'start',
        type: 'start',
        data: { label: 'Start' },
        child: {
          id: 'task-1',
          type: 'task',
          data: { label: 'Task 1' },
        },
      },
    };

    const { container, rerender } = render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-selection-continuity"
        schema={{
          type: 'designer-page',
          treeDocument: initialTreeDocument,
          config,
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0);
    });

    expect(createTreeDesignerCoreMock).toHaveBeenCalledTimes(1);

    rerender(
      <SchemaRenderer
        schemaUrl="test://flow/tree-selection-continuity"
        schema={{
          type: 'designer-page',
          treeDocument: {
            ...initialTreeDocument,
            root: {
              ...initialTreeDocument.root,
              child: {
                id: 'task-1',
                type: 'task',
                data: { label: 'Task 1 updated' },
                child: {
                  id: 'end-1',
                  type: 'end',
                  data: { label: 'End' },
                },
              },
            },
          },
          config,
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0);
    });

    expect(createTreeDesignerCoreMock).toHaveBeenCalledTimes(1);
  });

  it('does not replace the core document on rerenders that keep the same treeDocument reference', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const config = createTreeTestConfig();
    const treeDocument = {
      id: 'tree-stable-ref',
      kind: 'test-tree',
      name: 'Stable Ref Tree',
      version: '1.0.0',
      root: {
        id: 'start',
        type: 'start',
        data: { label: 'Start' },
        child: {
          id: 'task-1',
          type: 'task',
          data: { label: 'Task 1' },
        },
      },
    };

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-stable-ref"
        schema={{
          type: 'designer-page',
          treeDocument,
          config,
          className: 'first-pass',
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const firstCore = getLatestCreatedTreeDesignerCore() as DesignerCore | undefined;
    const firstDoc = firstCore?.getDocument();

    rerender(
      <SchemaRenderer
        schemaUrl="test://flow/tree-stable-ref"
        schema={{
          type: 'designer-page',
          treeDocument,
          config,
          className: 'second-pass',
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const secondCore = getLatestCreatedTreeDesignerCore() as DesignerCore | undefined;
    expect(secondCore).toBe(firstCore);
    expect(secondCore?.getDocument()).toBe(firstDoc);
  });

  it('preserves selection and undo history continuity across treeDocument updates', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const config = createTreeTestConfig();

    const initialTreeDocument = {
      id: 'tree-undo-continuity',
      kind: 'test-tree',
      name: 'Undo Continuity Tree',
      version: '1.0.0',
      root: {
        id: 'start',
        type: 'start',
        data: { label: 'Start' },
        child: {
          id: 'task-1',
          type: 'task',
          data: { label: 'Task 1' },
        },
      },
    };

    const { container, rerender } = render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-undo-continuity"
        schema={{
          type: 'designer-page',
          treeDocument: initialTreeDocument,
          config,
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0);
    });

    const core = getLatestCreatedTreeDesignerCore() as DesignerCore | undefined;
    expect(core).toBeTruthy();

    core?.selectNode('task-1');
    const command = core?.insertChainNode('task-1', 'task', { label: 'New Node' });
    expect(command?.ok).toBe(true);
    expect(core?.getSnapshot().canUndo).toBe(true);

    rerender(
      <SchemaRenderer
        schemaUrl="test://flow/tree-undo-continuity"
        schema={{
          type: 'designer-page',
          treeDocument: {
            ...initialTreeDocument,
            root: {
              ...initialTreeDocument.root,
              child: {
                id: 'task-1',
                type: 'task',
                data: { label: 'Task 1' },
                child: {
                  id: 'new-node',
                  type: 'task',
                  data: { label: 'New Node' },
                  child: { id: 'end-1', type: 'end', data: { label: 'End' } },
                },
              },
            },
          },
          config,
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0);
    });

    expect(core?.getSnapshot().selection.activeNodeId).toBe('task-1');
    expect(core?.getSnapshot().canUndo).toBe(true);
  });

  it('keeps tree history snapshots paired with epoch host replacements', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const config = createTreeTestConfig();

    const initialTreeDocument = {
      id: 'tree-epoch',
      kind: 'test-tree',
      name: 'Epoch Tree',
      version: '1.0.0',
      root: {
        id: 'start',
        type: 'start',
        data: { label: 'Start' },
        child: {
          id: 'task-1',
          type: 'task',
          data: { label: 'Task 1' },
        },
      },
    };

    const { container, rerender } = render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-epoch"
        schema={{
          type: 'designer-page',
          treeDocument: initialTreeDocument,
          treeDocumentEpoch: 1,
          config,
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0);
    });

    const core = getLatestCreatedTreeDesignerCore() as DesignerCore | undefined;
    expect(core).toBeTruthy();
    const command = core?.insertChainNode('task-1', 'task', { label: 'New Node' });
    expect(command?.ok).toBe(true);

    rerender(
      <SchemaRenderer
        schemaUrl="test://flow/tree-epoch"
        schema={{
          type: 'designer-page',
          treeDocument: {
            ...initialTreeDocument,
            root: {
              ...initialTreeDocument.root,
              child: {
                id: 'task-1',
                type: 'task',
                data: { label: 'Task 1' },
                child: { id: 'end-1', type: 'end', data: { label: 'End' } },
              },
            },
          },
          treeDocumentEpoch: 2,
          config,
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0);
    });

    expect(core?.getTreeDocument()?.root.child?.child?.id).toBe('end-1');
    expect(core?.getSnapshot().isDirty).toBe(false);
  });

  it('accepts later host replacements again after local tree state realigns with the host document', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const config = createTreeTestConfig();

    const initialTreeDocument = {
      id: 'tree-realign',
      kind: 'test-tree',
      name: 'Realign Tree',
      version: '1.0.0',
      root: {
        id: 'start',
        type: 'start',
        data: { label: 'Start' },
        child: {
          id: 'task-1',
          type: 'task',
          data: { label: 'Task 1' },
        },
      },
    };

    const { container, rerender } = render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-realign"
        schema={{
          type: 'designer-page',
          treeDocument: initialTreeDocument,
          treeDocumentEpoch: 1,
          config,
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0);
    });

    const core = getLatestCreatedTreeDesignerCore() as DesignerCore | undefined;
    expect(core).toBeTruthy();

    rerender(
      <SchemaRenderer
        schemaUrl="test://flow/tree-realign"
        schema={{
          type: 'designer-page',
          treeDocument: {
            ...initialTreeDocument,
            root: {
              ...initialTreeDocument.root,
              child: {
                id: 'task-1',
                type: 'task',
                data: { label: 'Task 1' },
                child: { id: 'end-1', type: 'end', data: { label: 'End' } },
              },
            },
          },
          treeDocumentEpoch: 2,
          config,
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0);
    });

    expect(core?.getTreeDocument()?.root.child?.child?.id).toBe('end-1');
  });
});
