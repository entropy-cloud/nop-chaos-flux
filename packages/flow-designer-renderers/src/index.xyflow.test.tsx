import React from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, useScopeSelector } from '@nop-chaos/flux-react';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { DesignerConfig, GraphDocument } from '@nop-chaos/flow-designer-core';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { flowDesignerRendererDefinitions } from './index.js';
import { basicTestRendererDefinitions } from './index-test-support.js';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
});

function createTestConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      {
        id: 'task',
        label: 'Task',
        body: { type: 'text', text: 'Task' },
        defaults: { label: 'Task' },
      },
      {
        id: 'end',
        label: 'End',
        body: { type: 'text', text: 'End' },
        defaults: { label: 'End' },
      },
    ],
    edgeTypes: [{ id: 'default', label: 'Flow', defaults: {} }],
    palette: {
      groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['task', 'end'] }],
    },
  };
}

function createTreeTestConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'dingtalk-workflow',
    documentMode: 'tree',
    treeConfig: {
      layout: { direction: 'TB', nodeSpacing: 60, layerSpacing: 100 },
      showGatewayNodes: false,
      showMergeNodes: false,
      autoLayout: true,
      chainEdgeType: 'dt-chain',
      branchEdgeType: 'dt-branch',
      mergeEdgeType: 'dt-merge',
    },
    nodeTypes: [
      {
        id: 'dt-approval',
        label: 'Approval',
        body: { type: 'text', text: 'Approval' },
        defaults: { label: 'Approval' },
      },
      {
        id: 'dt-condition',
        label: 'Condition',
        body: { type: 'text', text: 'Condition' },
        defaults: { label: 'Condition' },
      },
    ],
    edgeTypes: [
      { id: 'dt-chain', label: 'Chain', defaults: {} },
      { id: 'dt-branch', label: 'Branch', defaults: {} },
      { id: 'dt-merge', label: 'Merge', defaults: {} },
    ],
    palette: {
      groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['dt-approval', 'dt-condition'] }],
    },
  };
}

function createRendererEnv(notify = vi.fn()) {
  return {
    fetcher: async function <T>() {
      return { ok: true, status: 200, data: null as T };
    },
    notify,
  };
}

function StatusProbe() {
  const status = useScopeSelector(
    (data: Record<string, unknown>) => {
      if (typeof data.selectionKind !== 'string' || typeof data.selectionCount !== 'number') {
        return undefined;
      }

      return {
        selectionKind: data.selectionKind,
        selectionCount: data.selectionCount,
        doc:
          typeof data.doc === 'object' && data.doc !== null
            ? (data.doc as { nodeCount?: number; edgeCount?: number })
            : undefined,
      };
    },
  );
  return (
    <span data-testid="designer-status-probe">
      {status
        ? `${status.selectionKind}:${status.selectionCount}:${status.doc?.nodeCount ?? -1}:${status.doc?.edgeCount ?? -1}`
        : ''}
    </span>
  );
}

function getNodeCount(container: HTMLElement) {
  return container.querySelectorAll('.react-flow__node').length;
}

function getEdgeCount(container: HTMLElement) {
  return container.querySelectorAll('.react-flow__edge').length;
}

const statusProbeRenderer = {
  type: 'designer-status-probe',
  component: StatusProbe,
} as RendererDefinition;

function createSchemaRendererForTests() {
  return createSchemaRenderer([
    ...basicTestRendererDefinitions,
    ...flowDesignerRendererDefinitions,
    statusProbeRenderer,
  ]);
}

function renderDesignerPage(document: GraphDocument, notify = vi.fn()) {
  const SchemaRenderer = createSchemaRendererForTests();

  const view = render(
    <SchemaRenderer
      schemaUrl="test://flow/xyflow-render"
      schema={{
        type: 'page',
        body: [
          {
            type: 'designer-page',
            document,
            config: createTestConfig(),
            statusPath: 'designerStatus',
            dialogs: { type: 'designer-status-probe' },
          },
        ],
      } as any}
      env={createRendererEnv(notify)}
      formulaCompiler={createFormulaCompiler()}
    />,
  );

  return { notify, ...view };
}

describe('designer-page live xyflow intent retention', () => {
  it('keeps pending connection intent after duplicate-edge failures', async () => {
    const view = renderDesignerPage({
      id: 'doc-1',
      kind: 'flow',
      name: 'Example',
      version: '1.0.0',
      nodes: [
        { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } },
        { id: 'node-2', type: 'end', position: { x: 220, y: 40 }, data: { label: 'Task 2' } },
      ],
      edges: [
        {
          id: 'edge-1',
          type: 'default',
          source: 'node-1',
          target: 'node-2',
          data: { label: 'Existing edge' },
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    const sourcePort = within(view.container).getByRole('button', {
      name: 'Start connection from output port default on node Task 1',
    });
    fireEvent.keyDown(sourcePort, { key: 'Enter' });

    await waitFor(() => {
      expect(within(view.container).getByTestId('designer-status-probe').textContent).toBe('none:0:2:1');
      expect(within(view.container).getByRole('button', {
        name: 'Cancel connection from output port default on node Task 1',
      })).toBeTruthy();
    });

    window.dispatchEvent(
      new CustomEvent('nop-designer:test-connect', {
        detail: { source: 'node-1', target: 'node-2' },
      }),
    );

    await waitFor(() => {
      expect(view.notify).toHaveBeenCalledWith(
        'warning',
        'Duplicate edges are not supported in the playground example.',
      );
      expect(within(view.container).getByRole('button', {
        name: 'Cancel connection from output port default on node Task 1',
      })).toBeTruthy();
    });
  });

  it('keeps reconnect intent after duplicate-edge failures', async () => {
    const view = renderDesignerPage({
      id: 'doc-1',
      kind: 'flow',
      name: 'Example',
      version: '1.0.0',
      nodes: [
        { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } },
        { id: 'node-2', type: 'end', position: { x: 220, y: 40 }, data: { label: 'Task 2' } },
        { id: 'node-3', type: 'end', position: { x: 420, y: 40 }, data: { label: 'Task 3' } },
      ],
      edges: [
        {
          id: 'edge-1',
          type: 'default',
          source: 'node-1',
          target: 'node-2',
          data: { label: 'Primary edge' },
        },
        {
          id: 'edge-2',
          type: 'default',
          source: 'node-1',
          target: 'node-3',
          data: { label: 'Reconnect edge' },
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    window.dispatchEvent(
      new CustomEvent('nop-designer:test-start-reconnect', {
        detail: { edgeId: 'edge-2' },
      }),
    );

    await waitFor(() => {
      expect(within(view.container).getByRole('button', {
        name: 'Cancel reconnect from output port default on node Task 1',
      })).toBeTruthy();
    });

    window.dispatchEvent(
      new CustomEvent('nop-designer:test-reconnect', {
        detail: { edgeId: 'edge-2', source: 'node-1', target: 'node-2' },
      }),
    );

    await waitFor(() => {
      expect(view.notify).toHaveBeenCalledWith(
        'warning',
        'Duplicate edges are not supported in the playground example.',
      );
      expect(within(view.container).getByRole('button', {
        name: 'Cancel reconnect from output port default on node Task 1',
      })).toBeTruthy();
    });
  });

  it('dispatches port-aware edge payloads through the live canvas bridge', async () => {
    const view = renderDesignerPage({
      id: 'doc-ports',
      kind: 'flow',
      name: 'Port Example',
      version: '1.0.0',
      nodes: [
        { id: 'node-1', type: 'task', position: { x: 20, y: 40 }, data: { label: 'Task 1' } },
        { id: 'node-2', type: 'end', position: { x: 220, y: 40 }, data: { label: 'Task 2' } },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    window.dispatchEvent(
      new CustomEvent('nop-designer:test-connect', {
        detail: { source: 'node-1', target: 'node-2', sourcePort: 'out-primary', targetPort: 'in-primary' },
      }),
    );

    await waitFor(() => {
      expect(view.notify).not.toHaveBeenCalled();
      expect(within(view.container).getByTestId('designer-status-probe').textContent).toBe('none:0:2:1');
      expect(getNodeCount(view.container)).toBe(2);
      expect(getEdgeCount(view.container)).toBe(0);
    });
  });

  it('opens createDialog-configured palette nodes before creating them', async () => {
    const SchemaRenderer = createSchemaRendererForTests();

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/xyflow-create-dialog"
        schema={{
          type: 'page',
          body: [
            {
              type: 'designer-page',
              document: {
                id: 'doc-1',
                kind: 'flow',
                name: 'Example',
                version: '1.0.0',
                nodes: [],
                edges: [],
                viewport: { x: 0, y: 0, zoom: 1 },
              },
              dialogs: { type: 'designer-status-probe' },
              statusPath: 'designerStatus',
              config: {
                ...createTestConfig(),
                nodeTypes: [
                  {
                    id: 'task',
                    label: 'Task',
                    body: { type: 'text', text: 'Task' },
                    defaults: { label: 'Task' },
                    createDialog: {
                      title: 'Create Task',
                      body: { type: 'text', text: 'Create dialog body' },
                    },
                  },
                  {
                    id: 'end',
                    label: 'End',
                    body: { type: 'text', text: 'End' },
                    defaults: { label: 'End' },
                  },
                ],
              },
            },
          ],
        } as any}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(within(view.container).getByRole('button', { name: 'Task' }));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="designer-create-dialog"]')).toBeTruthy();
      expect(document.body.textContent).toContain('Create Task');
      expect(document.body.textContent).toContain('Create dialog body');
    });

    expect(within(view.container).getByTestId('designer-status-probe').textContent).toBe('none:0:0:0');
    expect(getNodeCount(view.container)).toBe(0);
    expect(getEdgeCount(view.container)).toBe(0);

    fireEvent.click(within(document.body).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(within(view.container).getByTestId('designer-status-probe').textContent).toBe('none:0:1:0');
      expect(getNodeCount(view.container)).toBe(1);
      expect(getEdgeCount(view.container)).toBe(0);
    });
  });

  it('does not keep free-graph connect intent in tree mode', async () => {
    const SchemaRenderer = createSchemaRendererForTests();

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/xyflow-tree-mode"
        schema={{
          type: 'page',
          body: [
            {
              type: 'designer-page',
              treeDocument: {
                id: 'tree-1',
                kind: 'dingtalk-workflow',
                name: 'Tree Example',
                version: '1.0.0',
                root: {
                  id: 'node-1',
                  type: 'dt-approval',
                  data: { label: 'Task 1' },
                  child: {
                    id: 'node-2',
                    type: 'dt-approval',
                    data: { label: 'Task 2' },
                  },
                },
              },
              config: createTreeTestConfig(),
              statusPath: 'designerStatus',
              dialogs: { type: 'designer-status-probe' },
            },
          ],
        } as any}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    window.dispatchEvent(
      new CustomEvent('nop-designer:test-connect', {
        detail: { source: 'node-1', target: 'node-2' },
      }),
    );

    window.dispatchEvent(
      new CustomEvent('nop-designer:test-reconnect', {
        detail: { edgeId: 'edge-2', source: 'node-1', target: 'node-2' },
      }),
    );

    await waitFor(() => {
      expect(within(view.container).getByTestId('designer-status-probe').textContent).toBe('none:0:2:1');
      expect(getNodeCount(view.container)).toBe(2);
    });
  });
});
