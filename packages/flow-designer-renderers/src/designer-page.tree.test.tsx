// @vitest-environment happy-dom

import React from 'react';
import { describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { render, waitFor, within } from '@testing-library/react';
import {
  createDesignerPageSchemaRenderer,
  createRendererEnv,
  createTreeTestConfig,
  getLayoutTreeWithElkMock,
} from './designer-page.test-support.js';

describe('DesignerPageRenderer tree mode', () => {
  it('renders tree mode by projecting treeDocument to graph nodes and edges', () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();

    const treeDocument = {
      id: 'tree-1',
      kind: 'test-tree',
      name: 'Test Tree',
      version: '1.0',
      root: {
        id: 'start',
        type: 'start',
        data: { label: 'Start' },
        child: {
          id: 'task-1',
          type: 'task',
          data: { label: 'Do Work' },
          child: {
            id: 'end',
            type: 'end',
            data: { label: 'End' },
          },
        },
      },
    };

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-basic"
        schema={{
          type: 'designer-page',
          treeDocument,
          config: createTreeTestConfig(),
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const canvas = within(view.container);
    expect(canvas.getByRole('application')).toBeTruthy();
    expect(view.container.querySelectorAll('.react-flow__node')).toHaveLength(3);
    expect(view.container.querySelector('.react-flow__edges')).toBeTruthy();
  });

  it('runs ELK auto-layout once after initial tree-mode mount', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const layoutTreeWithElkMock = getLayoutTreeWithElkMock();

    const treeDocument = {
      id: 'tree-elk-init',
      kind: 'test-tree',
      name: 'Tree ELK Init',
      version: '1.0',
      root: {
        id: 'start',
        type: 'start',
        data: { label: 'Start' },
        child: {
          id: 'task-1',
          type: 'task',
          data: { label: 'Do Work' },
          child: {
            id: 'end',
            type: 'end',
            data: { label: 'End' },
          },
        },
      },
    };

    render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-elk-init"
        schema={{
          type: 'designer-page',
          treeDocument,
          config: createTreeTestConfig(),
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(layoutTreeWithElkMock).toHaveBeenCalledTimes(1);
    });
  });

  it('renders tree mode with branches correctly', () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();

    const treeDocument = {
      id: 'branch-tree',
      kind: 'test-tree',
      name: 'Branch Tree',
      version: '1.0',
      root: {
        id: 'start',
        type: 'start',
        data: { label: 'Start' },
        child: {
          id: 'gw',
          type: 'condition',
          data: { label: 'Gateway' },
          branches: [
            {
              id: 'b1',
              data: { label: 'Branch 1' },
              child: { id: 'task-1', type: 'task', data: { label: 'Task 1' } },
            },
            {
              id: 'b2',
              data: { label: 'Branch 2' },
              child: { id: 'task-2', type: 'task', data: { label: 'Task 2' } },
            },
          ],
          child: { id: 'end', type: 'end', data: { label: 'End' } },
        },
      },
    };

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-branches"
        schema={{
          type: 'designer-page',
          treeDocument,
          config: createTreeTestConfig(),
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(view.container.querySelectorAll('.react-flow__node')).toHaveLength(5);
    expect(view.container.querySelector('.react-flow__edges')).toBeTruthy();
  });

  it('shows fallback when treeDocument is missing in tree mode', () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-fallback"
        schema={{
          type: 'designer-page',
          config: createTreeTestConfig(),
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(view.getByText('Tree mode requires treeDocument prop')).toBeTruthy();
  });
});
