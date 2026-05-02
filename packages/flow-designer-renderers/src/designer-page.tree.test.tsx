// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { DesignerConfig } from '@nop-chaos/flow-designer-core';
import { flowDesignerRendererDefinitions } from './index';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { render, waitFor, within } from '@testing-library/react';

const { layoutTreeWithElkMock } = vi.hoisted(() => ({
  layoutTreeWithElkMock: vi.fn(async (nodes: unknown[]) => nodes),
}));

vi.mock('@nop-chaos/flow-designer-core', async () => {
  const actual = await vi.importActual<typeof import('@nop-chaos/flow-designer-core')>(
    '@nop-chaos/flow-designer-core',
  );
  return {
    ...actual,
    layoutTreeWithElk: layoutTreeWithElkMock,
  };
});

const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render()}</section>,
  regions: ['body'],
};

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
    configurable: true,
  });
}

beforeEach(async () => {
  layoutTreeWithElkMock.mockClear();
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
});

function createTreeTestConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'test-tree',
    documentMode: 'tree',
    treeConfig: {
      layout: { direction: 'TB', nodeSpacing: 60, layerSpacing: 100 },
      showGatewayNodes: false,
      showMergeNodes: false,
      autoLayout: true,
      chainEdgeType: 'chain',
      branchEdgeType: 'branch',
      mergeEdgeType: 'merge',
    },
    nodeTypes: [
      { id: 'start', label: 'Start', body: { type: 'text' } },
      { id: 'task', label: 'Task', body: { type: 'text' } },
      { id: 'condition', label: 'Condition', body: { type: 'text' } },
      { id: 'end', label: 'End', body: { type: 'text' } },
    ],
    edgeTypes: [
      { id: 'chain', label: 'Chain', defaults: {} },
      { id: 'branch', label: 'Branch', defaults: {} },
      { id: 'merge', label: 'Merge', defaults: {} },
    ],
  };
}

function createGraphTestConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'test-graph',
    nodeTypes: [
      { id: 'task', label: 'Task', body: { type: 'text' } },
      { id: 'end', label: 'End', body: { type: 'text' } },
    ],
    edgeTypes: [{ id: 'default', label: 'Flow', defaults: {} }],
  };
}

function createRendererEnv(notify = vi.fn()): RendererEnv {
  return {
    fetcher: async function <T>() {
      return { ok: true, status: 200, data: null as T };
    },
    notify,
  };
}

describe('DesignerPageRenderer tree mode', () => {
  it('renders tree mode by projecting treeDocument to graph nodes and edges', () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...flowDesignerRendererDefinitions,
    ]);

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
        schema={
          {
            type: 'designer-page',
            treeDocument,
            config: createTreeTestConfig(),
          }
        }
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
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...flowDesignerRendererDefinitions,
    ]);

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
        schema={
          {
            type: 'designer-page',
            treeDocument,
            config: createTreeTestConfig(),
          }
        }
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(layoutTreeWithElkMock).toHaveBeenCalledTimes(1);
    });
  });

  it('renders tree mode with branches correctly', () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...flowDesignerRendererDefinitions,
    ]);

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
        schema={
          {
            type: 'designer-page',
            treeDocument,
            config: createTreeTestConfig(),
          }
        }
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(view.container.querySelectorAll('.react-flow__node')).toHaveLength(5);
    expect(view.container.querySelector('.react-flow__edges')).toBeTruthy();
  });

  it('shows fallback when treeDocument is missing in tree mode', () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...flowDesignerRendererDefinitions,
    ]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-fallback"
        schema={
          {
            type: 'designer-page',
            config: createTreeTestConfig(),
          }
        }
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(view.getByText('Tree mode requires treeDocument prop')).toBeTruthy();
  });

  it('graph mode still works correctly (regression test)', () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...flowDesignerRendererDefinitions,
    ]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-graph-regression"
        schema={
          {
            type: 'designer-page',
            document: {
              id: 'graph-1',
              kind: 'test-graph',
              name: 'Graph Test',
              version: '1.0',
              nodes: [
                { id: 'n1', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Task' } },
                { id: 'n2', type: 'end', position: { x: 200, y: 0 }, data: { label: 'End' } },
              ],
              edges: [{ id: 'e1', type: 'default', source: 'n1', target: 'n2', data: {} }],
              viewport: { x: 0, y: 0, zoom: 1 },
            },
            config: createGraphTestConfig(),
          }
        }
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const canvas = within(view.container);
    expect(canvas.getByRole('application')).toBeTruthy();
    expect(view.container.querySelectorAll('.react-flow__node')).toHaveLength(2);
    expect(view.container.querySelector('.react-flow__edges')).toBeTruthy();
  });

  it('reads tree mode inputs through resolved runtime props', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...flowDesignerRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-runtime-props"
        schema={
          {
            type: 'designer-page',
            treeDocument: '${$scope.treeDocument}',
            config: '${$scope.config}',
          }
        }
        data={{
          treeDocument: {
            id: 'tree-runtime-props',
            kind: 'test-tree',
            name: 'Runtime Props Tree',
            version: '1.0',
            root: {
              id: 'start',
              type: 'start',
              data: { label: 'Start' },
            },
          },
          config: createTreeTestConfig(),
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(document.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0);
    });
  });

  it('reads graph mode document through resolved runtime props', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...flowDesignerRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flow/graph-runtime-props"
        schema={
          {
            type: 'designer-page',
            document: '${$scope.document}',
            config: '${$scope.config}',
          }
        }
        data={{
          document: {
            id: 'graph-runtime-props',
            kind: 'test-graph',
            name: 'Runtime Props Graph',
            version: '1.0',
            nodes: [
              { id: 'n1', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Task' } },
              { id: 'n2', type: 'end', position: { x: 200, y: 0 }, data: { label: 'End' } },
            ],
            edges: [{ id: 'e1', type: 'default', source: 'n1', target: 'n2', data: {} }],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: createGraphTestConfig(),
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(document.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0);
    });
  });

  it('does not warn about render-phase updates when treeDocument runtime props change', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      ...flowDesignerRendererDefinitions,
    ]);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-runtime-rerender"
        schema={
          {
            type: 'designer-page',
            treeDocument: '${$scope.treeDocument}',
            config: '${$scope.config}',
          }
        }
        data={{
          treeDocument: {
            id: 'tree-runtime-rerender-1',
            kind: 'test-tree',
            name: 'Runtime Rerender Tree 1',
            version: '1.0',
            root: {
              id: 'start',
              type: 'start',
              data: { label: 'Start' },
            },
          },
          config: createTreeTestConfig(),
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(document.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0);
    });

    rerender(
      <SchemaRenderer
        schemaUrl="test://flow/tree-runtime-rerender"
        schema={
          {
            type: 'designer-page',
            treeDocument: '${$scope.treeDocument}',
            config: '${$scope.config}',
          }
        }
        data={{
          treeDocument: {
            id: 'tree-runtime-rerender-2',
            kind: 'test-tree',
            name: 'Runtime Rerender Tree 2',
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
          },
          config: createTreeTestConfig(),
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(document.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0);
    });

    expect(
      consoleErrorSpy.mock.calls.some((call) =>
        call.some(
          (arg) =>
            typeof arg === 'string' && arg.includes('Cannot update a component while rendering'),
        ),
      ),
    ).toBe(false);

    consoleErrorSpy.mockRestore();
  });
});
