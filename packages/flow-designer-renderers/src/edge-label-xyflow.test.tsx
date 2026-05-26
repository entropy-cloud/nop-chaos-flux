// @vitest-environment happy-dom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import type { DesignerConfig, GraphDocument } from '@nop-chaos/flow-designer-core';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import { DesignerContext } from './designer-context.js';
import { createDesignerCommandAdapter } from './designer-command-adapter.js';
import { registerDesignerCanvasFocusHandler } from './designer-canvas-focus.js';

afterEach(() => cleanup());

vi.mock('@xyflow/react', () => {
  return {
    BaseEdge: ({ style, ..._props }: any) => <svg data-testid="base-edge" data-style={JSON.stringify(style ?? null)} />,
    EdgeLabelRenderer: ({ children }: any) => (
      <div data-testid="edge-label-renderer">{children}</div>
    ),
    getBezierPath: () => ['M 0 0 C 100 0 200 0 300 0', 150, 0],
    Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
    useNodesState: () => [[], () => {}, () => {}],
    useEdgesState: () => [[], () => {}, () => {}],
  };
});

import { DesignerXyflowEdge } from './designer-xyflow-canvas/designer-xyflow-edge.js';

const env = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

const textWithBody: RendererDefinition = {
  type: 'text',
  component: (props: any) => (
    <span data-testid="edge-text">{String(props.props.body ?? props.props.text ?? '')}</span>
  ),
  fields: [
    { key: 'text', kind: 'prop', allowSource: true },
    { key: 'body', kind: 'prop' },
  ],
  staticCapable: true,
};

const TEST_CONFIG: DesignerConfig = {
  version: '1.0',
  kind: 'flow',
  nodeTypes: [],
  edgeTypes: [
    {
      id: 'default',
      label: 'Default Edge',
      body: { type: 'text', body: '${condition}', className: 'text-sm' },
      appearance: { stroke: '#94a3b8', strokeWidth: 2 },
      defaults: { condition: '' },
    },
  ],
  palette: { groups: [] },
};

const TEST_DOC: GraphDocument = {
  id: 'test-doc',
  kind: 'workflow',
  name: 'Test',
  version: '1.0',
  nodes: [
    { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'A' } },
    { id: 'node-2', type: 'start', position: { x: 300, y: 0 }, data: { label: 'B' } },
  ],
  edges: [
    { id: 'edge-1', type: 'default', source: 'node-1', target: 'node-2', data: { condition: '触发条件' } },
  ],
};

function createDesignerContextValue(config: DesignerConfig, doc: GraphDocument) {
  const core = createDesignerCore(doc, config);
  const adapter = createDesignerCommandAdapter(core);
  return {
    core,
    commandAdapter: adapter,
    dispatch: (cmd: any) => {
      if (typeof (adapter as any).dispatch === 'function') {
        return (adapter as any).dispatch(cmd);
      }
      return core.execute?.(cmd) ?? { ok: true };
    },
    config,
  };
}

describe('DesignerXyflowEdge label rendering', () => {
  it('renders edge label with resolved expression', async () => {
    const ctx = createDesignerContextValue(TEST_CONFIG, TEST_DOC);

    const edgeHostRenderer: RendererDefinition = {
      type: 'edge-host',
      component: () => (
        <DesignerContext.Provider value={ctx}>
          <DesignerXyflowEdge
            id="edge-1"
            source="node-1"
            target="node-2"
            sourceX={0}
            sourceY={0}
            targetX={300}
            targetY={0}
            sourcePosition="right"
            targetPosition="left"
            data={{ condition: '触发条件', lineStyle: 'solid', typeId: 'default', label: 'edge-1' }}
            selected={false}
            type="designerEdge"
          />
        </DesignerContext.Provider>
      ),
      fields: [],
      staticCapable: true,
    };

    const LocalRenderer = createSchemaRenderer([textWithBody, edgeHostRenderer]);
    render(
      <LocalRenderer
        schemaUrl="test://edge-render"
        schema={{ type: 'edge-host' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      const textEl = screen.getByTestId('edge-text');
      expect(textEl.textContent).toBe('触发条件');
    }, { timeout: 3000 });
  });

  it('publishes stable accessible edge name and selected state', async () => {
    const ctx = createDesignerContextValue(TEST_CONFIG, TEST_DOC);

    const edgeHostRenderer: RendererDefinition = {
      type: 'edge-host',
      component: () => (
        <DesignerContext.Provider value={ctx}>
          <DesignerXyflowEdge
            id="edge-1"
            source="node-1"
            target="node-2"
            sourceX={0}
            sourceY={0}
            targetX={300}
            targetY={0}
            sourcePosition="right"
            targetPosition="left"
            data={{ condition: '触发条件', lineStyle: 'solid', typeId: 'default', label: '审批连线' }}
            selected={true}
            type="designerEdge"
          />
        </DesignerContext.Provider>
      ),
      fields: [],
      staticCapable: true,
    };

    const LocalRenderer = createSchemaRenderer([textWithBody, edgeHostRenderer]);
    render(
      <LocalRenderer
        schemaUrl="test://edge-render-selected"
        schema={{ type: 'edge-host' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      const edge = screen.getByRole('button', { name: 'Selected Edge 审批连线' });
      expect(edge.getAttribute('aria-pressed')).toBe('true');
    });
  });

  it('uses public primary token color for branch-focused edge chrome', async () => {
    const ctx = createDesignerContextValue(TEST_CONFIG, TEST_DOC);

    const edgeHostRenderer: RendererDefinition = {
      type: 'edge-host',
      component: () => (
        <DesignerContext.Provider value={ctx}>
          <DesignerXyflowEdge
            id="edge-1"
            source="node-1"
            target="node-2"
            sourceX={0}
            sourceY={0}
            targetX={300}
            targetY={0}
            sourcePosition="right"
            targetPosition="left"
            data={{
              condition: '触发条件',
              lineStyle: 'solid',
              typeId: 'default',
              label: '审批连线',
              __fdBranchFocused: true,
            }}
            selected={false}
            type="designerEdge"
          />
        </DesignerContext.Provider>
      ),
      fields: [],
      staticCapable: true,
    };

    const LocalRenderer = createSchemaRenderer([textWithBody, edgeHostRenderer]);
    render(
      <LocalRenderer
        schemaUrl="test://edge-render-branch-focused"
        schema={{ type: 'edge-host' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      const baseEdge = screen.getByTestId('base-edge');
      const style = JSON.parse(baseEdge.getAttribute('data-style') ?? 'null');
      expect(style).toMatchObject({
        stroke: 'hsl(var(--primary))',
        strokeWidth: 3,
      });
    });
  });

  it('restores focus to the canvas after deleting an edge from the toolbar', async () => {
    const ctx = createDesignerContextValue(TEST_CONFIG, TEST_DOC);
    const canvas = document.createElement('div');
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'region');
    canvas.setAttribute('aria-label', 'Flow designer canvas');
    document.body.appendChild(canvas);
    const unregister = registerDesignerCanvasFocusHandler(ctx.core, () => canvas.focus());

    const edgeHostRenderer: RendererDefinition = {
      type: 'edge-host',
      component: () => (
        <DesignerContext.Provider value={ctx}>
          <DesignerXyflowEdge
            id="edge-1"
            source="node-1"
            target="node-2"
            sourceX={0}
            sourceY={0}
            targetX={300}
            targetY={0}
            sourcePosition="right"
            targetPosition="left"
            data={{ condition: '触发条件', lineStyle: 'solid', typeId: 'default', label: '审批连线' }}
            selected={true}
            type="designerEdge"
          />
        </DesignerContext.Provider>
      ),
      fields: [],
      staticCapable: true,
    };

    const LocalRenderer = createSchemaRenderer([textWithBody, edgeHostRenderer]);
    render(
      <LocalRenderer
        schemaUrl="test://edge-delete-focus"
        schema={{ type: 'edge-host' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByTestId('designer-edge-delete'));

    await waitFor(() => {
      expect(document.activeElement).toBe(canvas);
    });

    unregister();
    canvas.remove();
  });
});
