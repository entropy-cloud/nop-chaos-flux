// @vitest-environment jsdom

import { createFormulaCompiler } from '../../flux-formula/src/index';
import { createSchemaRenderer } from '../../flux-react/src/index';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { DesignerConfig, GraphDocument } from '../../flow-designer-core/src/index';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
});

vi.mock('./canvas-bridge', async () => {
  const actual = await vi.importActual<typeof import('./canvas-bridge')>('./canvas-bridge');

  function MockXyflowBridge(props: any) {
    return (
      <div>
        <div>{`nodes:${props.snapshot?.doc?.nodes?.length ?? 0}`}</div>
        <div>{`pending:${props.pendingConnectionSourceId ?? 'none'}`}</div>
        <div>{`reconnecting:${props.reconnectingEdgeId ?? 'none'}`}</div>
        <button type="button" onClick={(event) => props.onStartConnection('node-1', event)}>
          Start connection node-1
        </button>
        <button type="button" onClick={(event) => props.onCompleteConnection('node-2', event)}>
          Complete connection node-2
        </button>
        <button type="button" onClick={(event) => props.onStartReconnect('edge-2', event)}>
          Start reconnect edge-2
        </button>
        <button type="button" onClick={(event) => props.onCompleteReconnect('edge-2', 'node-1', 'node-2', event)}>
          Complete reconnect edge-2 to node-2
        </button>
      </div>
    );
  }

  return {
    ...actual,
    DesignerXyflowCanvasBridge: MockXyflowBridge,
    renderDesignerCanvasBridge(props: any) {
      return <MockXyflowBridge {...props} />;
    }
  };
});

import { flowDesignerRendererDefinitions } from './index';

function createTestConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow',
    nodeTypes: [
      {
        id: 'task',
        label: 'Task',
        body: { type: 'text', text: 'Task' },
        defaults: { label: 'Task' }
      },
      {
        id: 'end',
        label: 'End',
        body: { type: 'text', text: 'End' },
        defaults: { label: 'End' }
      }
    ],
    edgeTypes: [{ id: 'default', label: 'Flow', defaults: {} }],
    palette: {
      groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['task', 'end'] }]
    }
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
      mergeEdgeType: 'dt-merge'
    },
    nodeTypes: [
      {
        id: 'dt-approval',
        label: 'Approval',
        body: { type: 'text', text: 'Approval' },
        defaults: { label: 'Approval' }
      },
      {
        id: 'dt-condition',
        label: 'Condition',
        body: { type: 'text', text: 'Condition' },
        defaults: { label: 'Condition' }
      }
    ],
    edgeTypes: [
      { id: 'dt-chain', label: 'Chain', defaults: {} },
      { id: 'dt-branch', label: 'Branch', defaults: {} },
      { id: 'dt-merge', label: 'Merge', defaults: {} }
    ],
    palette: {
      groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['dt-approval', 'dt-condition'] }]
    }
  };
}

function createRendererEnv(notify = vi.fn()) {
  return {
    fetcher: async function <T>() {
      return { ok: true, status: 200, data: null as T };
    },
    notify
  };
}

function renderDesignerPage(document: GraphDocument, notify = vi.fn()) {
  const SchemaRenderer = createSchemaRenderer([
    ...flowDesignerRendererDefinitions,
    {
      type: 'text',
      component: (props: any) => <span>{String(props.props.text ?? '')}</span>
    }
  ]);

  const view = render(
    <SchemaRenderer
      schemaUrl="test://flow/xyflow-render"
      schema={{ type: 'designer-page', document, config: createTestConfig() } as any}
      env={createRendererEnv(notify)}
      formulaCompiler={createFormulaCompiler()}
    />
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
        { id: 'node-2', type: 'end', position: { x: 220, y: 40 }, data: { label: 'Task 2' } }
      ],
      edges: [{ id: 'edge-1', type: 'default', source: 'node-1', target: 'node-2', data: { label: 'Existing edge' } }],
      viewport: { x: 0, y: 0, zoom: 1 }
    });
    const canvas = within(view.container);

    fireEvent.click(canvas.getByText('Start connection node-1'));
    expect(canvas.getByText('pending:node-1')).toBeTruthy();

    fireEvent.click(canvas.getByText('Complete connection node-2'));

    await waitFor(() => {
      expect(view.notify).toHaveBeenCalledWith('warning', 'Duplicate edges are not supported in the playground example.');
      expect(canvas.getByText('pending:node-1')).toBeTruthy();
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
        { id: 'node-3', type: 'end', position: { x: 420, y: 40 }, data: { label: 'Task 3' } }
      ],
      edges: [
        { id: 'edge-1', type: 'default', source: 'node-1', target: 'node-2', data: { label: 'Primary edge' } },
        { id: 'edge-2', type: 'default', source: 'node-1', target: 'node-3', data: { label: 'Reconnect edge' } }
      ],
      viewport: { x: 0, y: 0, zoom: 1 }
    });
    const canvas = within(view.container);

    fireEvent.click(canvas.getByText('Start reconnect edge-2'));
    expect(canvas.getByText('reconnecting:edge-2')).toBeTruthy();

    fireEvent.click(canvas.getByText('Complete reconnect edge-2 to node-2'));

    await waitFor(() => {
      expect(view.notify).toHaveBeenCalledWith('warning', 'Duplicate edges are not supported in the playground example.');
      expect(canvas.getByText('reconnecting:edge-2')).toBeTruthy();
    });
  });

  it('opens createDialog-configured palette nodes before creating them', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...flowDesignerRendererDefinitions,
      {
        type: 'text',
        component: (props: any) => <span>{String(props.props.text ?? '')}</span>
      }
    ]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/xyflow-create-dialog"
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-1',
            kind: 'flow',
            name: 'Example',
            version: '1.0.0',
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 }
          },
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
                }
              },
              {
                id: 'end',
                label: 'End',
                body: { type: 'text', text: 'End' },
                defaults: { label: 'End' }
              }
            ]
          }
        } as any}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(within(view.container).getByRole('button', { name: 'Task' }));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="designer-create-dialog"]')).toBeTruthy();
      expect(document.body.textContent).toContain('Create Task');
      expect(document.body.textContent).toContain('Create dialog body');
    });

    expect(within(view.container).getByText('nodes:0')).toBeTruthy();

    fireEvent.click(within(document.body).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(within(view.container).getByText('nodes:1')).toBeTruthy();
    });
  });

  it('does not keep free-graph connect intent in tree mode', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...flowDesignerRendererDefinitions,
      {
        type: 'text',
        component: (props: any) => <span>{String(props.props.text ?? '')}</span>
      }
    ]);

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/xyflow-tree-mode"
        schema={{
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
                data: { label: 'Task 2' }
              }
            }
          },
          config: createTreeTestConfig()
        } as any}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const canvas = within(view.container);
    fireEvent.click(canvas.getByText('Start connection node-1'));
    expect(canvas.getByText('pending:none')).toBeTruthy();

    fireEvent.click(canvas.getByText('Start reconnect edge-2'));
    expect(canvas.getByText('reconnecting:none')).toBeTruthy();
  });
});
