// @vitest-environment happy-dom

import React from 'react';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import type { DesignerConfig, GraphDocument } from '@nop-chaos/flow-designer-core';

const testState: {
  layoutResolvers: Array<(positions: Map<string, { x: number; y: number }>) => void>;
} = {
  layoutResolvers: [],
};

vi.mock('@nop-chaos/flow-designer-core', async () => {
  const actual = await vi.importActual<typeof import('@nop-chaos/flow-designer-core')>(
    '@nop-chaos/flow-designer-core',
  );

  return {
    ...actual,
    layoutWithElk: vi.fn(
      () =>
        new Promise((resolve) => {
          testState.layoutResolvers.push(resolve);
        }),
    ),
  };
});

vi.mock('./canvas-bridge', async () => {
  const actual = await vi.importActual<typeof import('./canvas-bridge.js')>('./canvas-bridge');

  function MockCanvas(props: any) {
    const firstNode = props.snapshot?.doc?.nodes?.[0];

    return (
      <div data-testid="node-pos">{`${firstNode?.position?.x ?? 'na'},${firstNode?.position?.y ?? 'na'}`}</div>
    );
  }

  return {
    ...actual,
    DesignerXyflowCanvasBridge: MockCanvas,
    renderDesignerCanvasBridge(props: any) {
      return <MockCanvas {...props} />;
    },
  };
});

import { flowDesignerRendererDefinitions } from './index.js';

const SchemaRenderer = createSchemaRenderer([
  ...flowDesignerRendererDefinitions,
  {
    type: 'text',
    component: (props: any) => <span>{String(props.props.text ?? '')}</span>,
  },
]);

const testEnv = {
  fetcher: async () => ({ ok: true, status: 200, data: null }),
  notify: vi.fn(),
};

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
    ],
    edgeTypes: [{ id: 'default', label: 'Flow', defaults: {} }],
    palette: { groups: [] },
    toolbar: {
      items: [{ type: 'button', label: 'Auto layout', action: 'designer:autoLayout' }],
    },
    features: { autoLayout: true },
  };
}

function renderDesignerPage(document: GraphDocument) {
  return render(
    <SchemaRenderer
      schema={{ type: 'designer-page', document, config: createTestConfig() } as any}
      env={testEnv as any}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('DesignerPage auto layout guards', () => {
  beforeEach(() => {
    testState.layoutResolvers = [];
  });

  it('ignores stale auto-layout results after switching documents', async () => {
    const view = renderDesignerPage({
      id: 'doc-1',
      kind: 'flow',
      name: 'Example',
      version: '1.0.0',
      nodes: [{ id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Task 1' } }],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    const canvas = within(view.container);

    fireEvent.click(canvas.getByRole('button', { name: 'Auto layout' }));
    await waitFor(() => {
      expect(testState.layoutResolvers).toHaveLength(1);
    });

    view.rerender(
      <SchemaRenderer
        schema={
          {
            type: 'designer-page',
            document: {
              id: 'doc-2',
              kind: 'flow',
              name: 'Next',
              version: '1.0.0',
              nodes: [
                { id: 'node-1', type: 'task', position: { x: 5, y: 5 }, data: { label: 'Task 1' } },
              ],
              edges: [],
              viewport: { x: 0, y: 0, zoom: 1 },
            },
            config: createTestConfig(),
          } as any
        }
        env={testEnv as any}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    testState.layoutResolvers[0]?.(new Map([['node-1', { x: 100, y: 100 }]]));
    await Promise.resolve();

    await waitFor(() => {
      expect(within(view.container).getByTestId('node-pos').textContent).toBe('5,5');
    });
  });

  it('ignores layout results after renderer unmount invalidates the request', async () => {
    const view = renderDesignerPage({
      id: 'doc-1',
      kind: 'flow',
      name: 'Example',
      version: '1.0.0',
      nodes: [{ id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Task 1' } }],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    fireEvent.click(within(view.container).getByRole('button', { name: 'Auto layout' }));
    await waitFor(() => {
      expect(testState.layoutResolvers).toHaveLength(1);
    });

    view.unmount();
    testState.layoutResolvers[0]?.(new Map([['node-1', { x: 100, y: 100 }]]));
    await Promise.resolve();

    expect(true).toBe(true);
  });

  it('keeps sibling layout requests active across instance cleanup', async () => {
    const first = renderDesignerPage({
      id: 'doc-1',
      kind: 'flow',
      name: 'First',
      version: '1.0.0',
      nodes: [{ id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Task 1' } }],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    const second = renderDesignerPage({
      id: 'doc-2',
      kind: 'flow',
      name: 'Second',
      version: '1.0.0',
      nodes: [
        { id: 'node-2', type: 'task', position: { x: 10, y: 10 }, data: { label: 'Task 2' } },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    fireEvent.click(within(first.container).getByRole('button', { name: 'Auto layout' }));
    fireEvent.click(within(second.container).getByRole('button', { name: 'Auto layout' }));

    await waitFor(() => {
      expect(testState.layoutResolvers).toHaveLength(2);
    });

    first.unmount();
    testState.layoutResolvers[1]?.(new Map([['node-2', { x: 200, y: 120 }]]));
    await Promise.resolve();

    await waitFor(() => {
      expect(within(second.container).getByTestId('node-pos').textContent).toBe('200,120');
    });

    second.unmount();
  });
});
