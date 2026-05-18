// @vitest-environment happy-dom

import React from 'react';
import { describe, expect, it } from 'vitest';
import type { DesignerCore } from '@nop-chaos/flow-designer-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { render, waitFor } from '@testing-library/react';
import {
  createDesignerPageSchemaRenderer,
  createRendererEnv,
  createTreeTestConfig,
  getCreateDesignerCoreMock,
} from './designer-page.test-support.js';
import { computeTreeModeDocument } from './designer-page-helpers.js';

describe('DesignerPageRenderer tree history continuity', () => {
  it('does not recreate core when treeDocument changes in tree mode', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const createDesignerCoreMock = getCreateDesignerCoreMock();
    const config = createTreeTestConfig();

    const initialTreeDocument = {
      id: 'tree-selection',
      kind: 'test-tree',
      name: 'Selection Continuity Tree',
      version: '1.0',
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

    expect(createDesignerCoreMock).toHaveBeenCalledTimes(1);

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

    expect(createDesignerCoreMock).toHaveBeenCalledTimes(1);
  });

  it('preserves selection and undo history continuity across treeDocument updates', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const createDesignerCoreMock = getCreateDesignerCoreMock();
    const config = createTreeTestConfig();

    const initialTreeDocument = {
      id: 'tree-history-continuity',
      kind: 'test-tree',
      name: 'History Continuity Tree',
      version: '1.0',
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
        schemaUrl="test://flow/tree-history-continuity"
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
      expect(container.querySelectorAll('.react-flow__node')).toHaveLength(2);
    });

    const core = createDesignerCoreMock.mock.results[0]?.value as DesignerCore | undefined;
    expect(core).toBeTruthy();

    core?.selectNode('task-1');
    core?.setViewport({ x: 24, y: 48, zoom: 1.2 });

    expect(core?.getSnapshot().selection.activeNodeId).toBe('task-1');
    expect(core?.getSnapshot().canUndo).toBe(true);

    rerender(
      <SchemaRenderer
        schemaUrl="test://flow/tree-history-continuity"
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
      expect(container.querySelectorAll('.react-flow__node')).toHaveLength(3);
    });

    expect(createDesignerCoreMock).toHaveBeenCalledTimes(1);
    expect(core?.getSnapshot().selection.activeNodeId).toBe('task-1');
    expect(core?.getSnapshot().activeNode?.id).toBe('task-1');
    expect(core?.getSnapshot().canUndo).toBe(true);
    expect(core?.getSnapshot().doc.nodes.some((node) => node.id === 'end-1')).toBe(true);
  });

  it('keeps tree history snapshots paired with external treeDocument replacements', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const createDesignerCoreMock = getCreateDesignerCoreMock();
    const config = createTreeTestConfig();
    const initialTreeDocument = {
      id: 'tree-history-pairing',
      kind: 'test-tree',
      name: 'History Pairing Tree',
      version: '1.0',
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
    const replacementTreeDocument = {
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
    };

    const { container, rerender } = render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-history-pairing"
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
      expect(container.querySelectorAll('.react-flow__node')).toHaveLength(2);
    });

    const core = createDesignerCoreMock.mock.results.at(-1)?.value as DesignerCore | undefined;
    expect(core).toBeTruthy();

    rerender(
      <SchemaRenderer
        schemaUrl="test://flow/tree-history-pairing"
        schema={{
          type: 'designer-page',
          treeDocument: replacementTreeDocument,
          config,
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.react-flow__node')).toHaveLength(3);
    });

    expect(core?.getSnapshot().doc.nodes.some((node) => node.id === 'end-1')).toBe(true);

    core?.undo();
    expect(core?.getSnapshot().doc.nodes.some((node) => node.id === 'end-1')).toBe(false);

    core?.redo();
    expect(core?.getSnapshot().doc.nodes.some((node) => node.id === 'end-1')).toBe(true);
  });

  it('does not overwrite unsaved tree edits when host treeDocument prop changes', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const createDesignerCoreMock = getCreateDesignerCoreMock();
    const config = createTreeTestConfig();
    const initialTreeDocument = {
      id: 'tree-unsaved-host-sync',
      kind: 'test-tree',
      name: 'Unsaved Host Sync Tree',
      version: '1.0',
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
        schemaUrl="test://flow/tree-unsaved-host-sync"
        schema={{
          type: 'designer-page',
          treeDocument: initialTreeDocument,
          config,
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const core = createDesignerCoreMock.mock.results[0]?.value as DesignerCore | undefined;
    expect(core).toBeTruthy();

    await waitFor(() => {
      expect(core?.getSnapshot().doc.nodes).toHaveLength(2);
    });

    const unsavedTreeDocument = {
      ...initialTreeDocument,
      root: {
        ...initialTreeDocument.root,
        child: {
          id: 'task-1',
          type: 'task',
          data: { label: 'Unsaved Local Edit' },
        },
      },
    };

    core?.replaceDocument(computeTreeModeDocument(unsavedTreeDocument, config), unsavedTreeDocument);

    rerender(
      <SchemaRenderer
        schemaUrl="test://flow/tree-unsaved-host-sync"
        schema={{
          type: 'designer-page',
          treeDocument: {
            ...initialTreeDocument,
            root: {
              ...initialTreeDocument.root,
              child: {
                id: 'task-1',
                type: 'task',
                data: { label: 'Host Replacement' },
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
      expect(core?.getSnapshot().doc.nodes.find((node) => node.id === 'task-1')?.data.label).toBe('Unsaved Local Edit');
    });

    expect(core?.getSnapshot().doc.nodes.some((node) => node.id === 'end-1')).toBe(false);
  });

  it('accepts later host replacements again after local tree state realigns with the host document', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const createDesignerCoreMock = getCreateDesignerCoreMock();
    const config = createTreeTestConfig();
    const initialTreeDocument = {
      id: 'tree-host-realign',
      kind: 'test-tree',
      name: 'Host Realign Tree',
      version: '1.0',
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
    const hostReplacement = {
      ...initialTreeDocument,
      root: {
        ...initialTreeDocument.root,
        child: {
          id: 'task-1',
          type: 'task',
          data: { label: 'Host Replacement' },
          child: {
            id: 'end-1',
            type: 'end',
            data: { label: 'End' },
          },
        },
      },
    };

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-host-realign"
        schema={{
          type: 'designer-page',
          treeDocument: initialTreeDocument,
          config,
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const core = createDesignerCoreMock.mock.results.at(-1)?.value as DesignerCore | undefined;
    expect(core).toBeTruthy();

    core?.replaceDocument(computeTreeModeDocument(initialTreeDocument, config), initialTreeDocument);

    rerender(
      <SchemaRenderer
        schemaUrl="test://flow/tree-host-realign"
        schema={{
          type: 'designer-page',
          treeDocument: hostReplacement,
          config,
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(core?.getSnapshot().doc.nodes.some((node) => node.id === 'end-1')).toBe(true);
    });
  });
});
