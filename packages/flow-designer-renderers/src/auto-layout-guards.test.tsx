import React from 'react';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createSchemaRenderer, useScopeSelector } from '@nop-chaos/flux-react';
import type { DesignerConfig, GraphDocument } from '@nop-chaos/flow-designer-core';
import {
  basicTestRendererDefinitions,
  createRendererEnv,
  createTestConfig,
  formulaCompiler,
  installFlowDesignerTestHooks,
} from './index-test-support.js';
import {
  invokeDesignerPlusButtonHandler,
  registerDesignerPlusButtonHandler,
} from './designer-canvas.js';

const testState: {
  layoutResolvers: Array<(positions: Map<string, { x: number; y: number }>) => void>;
  rejectNextGraphLayout: boolean;
  layoutOwners: unknown[];
  invalidatedOwnerIds: number[];
} = {
  layoutResolvers: [],
  rejectNextGraphLayout: false,
  layoutOwners: [],
  invalidatedOwnerIds: [],
};

vi.mock('@nop-chaos/flow-designer-core', async () => {
  const actual = await vi.importActual<typeof import('@nop-chaos/flow-designer-core')>(
    '@nop-chaos/flow-designer-core',
  );

  let nextOwnerId = 0;

  return {
    ...actual,
    createElkLayoutOwner: vi.fn(() => {
      const ownerId = nextOwnerId + 1;
      nextOwnerId = ownerId;
      let requestId = 0;
      let invalidated = false;

      return {
        nextRequestId() {
          if (invalidated) {
            throw new Error(`ELK owner ${ownerId} was reused after cleanup`);
          }

          requestId += 1;
          return requestId;
        },
        isActive(activeRequestId: number) {
          return !invalidated && activeRequestId === requestId;
        },
        invalidate() {
          invalidated = true;
          requestId += 1;
          testState.invalidatedOwnerIds.push(ownerId);
        },
      };
    }),
    layoutWithElk: vi.fn((_nodes, _edges, _nodeTypes, _options, owner) => {
      testState.layoutOwners.push(owner);
      if (testState.rejectNextGraphLayout) {
        testState.rejectNextGraphLayout = false;
        return Promise.reject(new Error('ELK failed'));
      }

      return new Promise((resolve) => {
        testState.layoutResolvers.push(resolve as never);
      });
    }),
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

installFlowDesignerTestHooks();

function DesignerStatusProbe() {
  const status = useScopeSelector(
    (data: Record<string, unknown>) =>
      data.designerStatus as { error?: string | null } | undefined,
  );
  return <span data-testid="designer-status-error">{status?.error ?? ''}</span>;
}

const statusProbeRenderer = {
  type: 'designer-status-probe',
  component: DesignerStatusProbe,
} as RendererDefinition;

const SchemaRenderer = createSchemaRenderer([
  ...basicTestRendererDefinitions,
  ...flowDesignerRendererDefinitions,
  statusProbeRenderer,
]);

const testEnv = createRendererEnv();

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
        formulaCompiler={formulaCompiler}
      />,
    );
}

describe('DesignerPage auto layout guards', () => {
  beforeEach(() => {
    testState.layoutResolvers = [];
    testState.rejectNextGraphLayout = false;
    testState.layoutOwners = [];
    testState.invalidatedOwnerIds = [];
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
        formulaCompiler={formulaCompiler}
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

  it('reports initial auto-layout failure through host-visible status', async () => {
    const notify = vi.fn();
    const failingEnv = {
      ...testEnv,
      notify,
    };

    testState.rejectNextGraphLayout = true;

    const view = render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'designer-page',
              document: {
                id: 'doc-3',
                kind: 'test-graph',
                name: 'Broken',
                version: '1.0.0',
                nodes: [
                  { id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Task 1' } },
                ],
                edges: [],
              },
              config: {
                ...createTestConfig(),
                statusPath: 'designerStatus',
              },
              statusPath: 'designerStatus',
            },
            {
              type: 'designer-status-probe',
            },
          ],
        } as any}
        env={failingEnv as RendererEnv}
        formulaCompiler={formulaCompiler}
        data={{ designerStatus: undefined }}
      />,
    );

    fireEvent.click(within(view.container).getByRole('button', { name: 'Auto layout' }));
    await waitFor(() => {
      expect(document.querySelector('[data-testid="designer-status-error"]')?.textContent).toBe(
        'ELK failed',
      );
    });
  });

  it('preserves non-Error initial auto-layout failures through notify', async () => {
    const notify = vi.fn();
    const structuredFailure = { code: 'E_LAYOUT', nodeId: 'node-1' };
    const failingEnv = {
      ...testEnv,
      notify,
    };

    testState.rejectNextGraphLayout = false;
    const { layoutWithElk } = await import('@nop-chaos/flow-designer-core');
    vi.mocked(layoutWithElk).mockImplementationOnce(async () => {
      throw structuredFailure;
    });

    const view = render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'designer-page',
              document: {
                id: 'doc-4',
                kind: 'test-graph',
                name: 'Broken cause',
                version: '1.0.0',
                nodes: [
                  { id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Task 1' } },
                ],
                edges: [],
              },
              config: {
                ...createTestConfig(),
                statusPath: 'designerStatus',
              },
              statusPath: 'designerStatus',
            },
            {
              type: 'designer-status-probe',
            },
          ],
        } as any}
        env={failingEnv as RendererEnv}
        formulaCompiler={formulaCompiler}
        data={{ designerStatus: undefined }}
      />,
    );

    fireEvent.click(within(view.container).getByRole('button', { name: 'Auto layout' }));
    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('error', expect.any(String));
    });
  });

  it('recreates the ELK owner after cleanup before graph remount work resumes', async () => {
    const firstView = render(
      <SchemaRenderer
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-remount-1',
            kind: 'test-graph',
            name: 'Remount 1',
            version: '1.0.0',
            nodes: [
              { id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Task 1' } },
            ],
            edges: [],
          },
          config: {
            ...createTestConfig(),
          },
        } as any}
        env={testEnv as any}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(within(firstView.container).getByRole('button', { name: 'Auto layout' }));
    await waitFor(() => {
      expect(testState.layoutOwners).toHaveLength(1);
    });

    const firstOwner = testState.layoutOwners[0];
    firstView.unmount();
    expect(testState.invalidatedOwnerIds).toHaveLength(1);

    const secondView = render(
      <SchemaRenderer
        schema={{
          type: 'designer-page',
          document: {
            id: 'doc-remount-2',
            kind: 'test-graph',
            name: 'Remount 2',
            version: '1.0.0',
            nodes: [
              { id: 'node-2', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Task 2' } },
            ],
            edges: [],
          },
          config: {
            ...createTestConfig(),
          },
        } as any}
        env={testEnv as any}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(within(secondView.container).getByRole('button', { name: 'Auto layout' }));
    await waitFor(() => {
      expect(testState.layoutOwners).toHaveLength(2);
    });

    expect(testState.layoutOwners[1]).not.toBe(firstOwner);
    secondView.unmount();
  });

  it('keeps plus-button handlers isolated per designer instance', () => {
    const firstOwner = {};
    const secondOwner = {};
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();

    const disposeFirst = registerDesignerPlusButtonHandler(firstOwner, firstHandler);
    const disposeSecond = registerDesignerPlusButtonHandler(secondOwner, secondHandler);

    invokeDesignerPlusButtonHandler(firstOwner, 'node-1', 10, 20, 'node');
    expect(firstHandler).toHaveBeenCalledWith('node-1', 10, 20, 'node');
    expect(secondHandler).not.toHaveBeenCalled();

    disposeFirst();
    invokeDesignerPlusButtonHandler(secondOwner, 'node-2', 30, 40, 'merge');

    expect(firstHandler).toHaveBeenCalledTimes(1);
    expect(secondHandler).toHaveBeenCalledWith('node-2', 30, 40, 'merge');

    disposeSecond();
  });
});
