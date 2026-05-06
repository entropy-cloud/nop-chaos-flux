// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '../../flux-formula/src/index';
import { createSchemaRenderer } from '../../flux-react/src/index';
import type { RendererDefinition } from '../../flux-core/src/index';
import { createDesignerCore } from '../../flow-designer-core/src/index';
import { createDesignerCommandAdapter } from './designer-command-adapter';
import { DesignerContext } from './designer-context';
import { normalizeConfig } from '../../flow-designer-core/src/core/config';
import type { DesignerConfig, GraphDocument } from '../../flow-designer-core/src/index';

afterEach(() => cleanup());

vi.mock('@xyflow/react', () => {
  return {
    BaseEdge: ({ children, ...props }: any) => <svg data-testid="base-edge" />,
    EdgeLabelRenderer: ({ children }: any) => (
      <div data-testid="edge-label-renderer">{children}</div>
    ),
    getBezierPath: () => ['M 0 0 C 100 0 200 0 300 0', 150, 0],
    useNodesState: () => [[], () => {}, () => {}],
    useEdgesState: () => [[], () => {}, () => {}],
  };
});

import { DesignerXyflowEdge } from './designer-xyflow-canvas/designer-xyflow-edge';

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
    dispatch: (cmd: any) => adapter.dispatch(cmd),
    config,
  };
}

function renderEdgeWithRuntime(
  edgeProps: any,
  designerCtx: ReturnType<typeof createDesignerContextValue>,
) {
  const SchemaRenderer = createSchemaRenderer([textWithBody]);

  return render(
    <SchemaRenderer
      schemaUrl="test://edge-render"
      schema={{ type: 'edge-host' }}
      env={env}
      formulaCompiler={createFormulaCompiler()}
      extraContext={(runtime: any, scope: any) => ({
        designer: (
          <DesignerContext.Provider value={designerCtx}>
            {null}
          </DesignerContext.Provider>
        ),
      })}
    />,
  );
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
});
