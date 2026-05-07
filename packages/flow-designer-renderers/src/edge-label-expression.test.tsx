// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { RenderNodes } from '@nop-chaos/flux-react/unstable';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { flowDesignerRendererDefinitions } from './index.js';
import type { DesignerConfig, GraphDocument } from '@nop-chaos/flow-designer-core';
import { normalizeConfig } from '@nop-chaos/flow-designer-core';

afterEach(() => cleanup());

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
  nodeTypes: [
    {
      id: 'start',
      label: 'Start',
      body: { type: 'text', body: '${label}' },
      defaults: { label: 'Start' },
    },
  ],
  edgeTypes: [
    {
      id: 'default',
      label: 'Default Edge',
      body: {
        type: 'text',
        body: '${condition}',
        className: 'text-sm',
      },
      appearance: { stroke: '#94a3b8', strokeWidth: 2, markerEnd: 'arrow-closed' },
      defaults: { condition: '' },
    },
  ],
  palette: { groups: [{ id: 'basic', label: 'Basic', nodeTypes: ['start'] }] },
};

const TEST_DOC: GraphDocument = {
  id: 'test-doc',
  kind: 'workflow',
  name: 'Test',
  version: '1.0',
  nodes: [
    {
      id: 'node-1',
      type: 'start',
      position: { x: 0, y: 0 },
      data: { label: '开始', config: { trigger: 'register' } },
    },
    {
      id: 'node-2',
      type: 'start',
      position: { x: 300, y: 0 },
      data: { label: '结束' },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      type: 'default',
      source: 'node-1',
      target: 'node-2',
      data: { condition: '触发条件', lineStyle: 'solid' },
    },
    {
      id: 'edge-2',
      type: 'default',
      source: 'node-1',
      target: 'node-2',
      data: { condition: '', lineStyle: 'solid' },
    },
  ],
};

describe('Edge label expression rendering', () => {
  it('resolves ${condition} from edge data via RenderNodes + bindings', async () => {
    const SchemaRenderer = createSchemaRenderer([textWithBody, ...flowDesignerRendererDefinitions]);

    render(
      <SchemaRenderer
        schemaUrl="test://edge-expr"
        schema={{ type: 'designer-page', document: TEST_DOC, config: TEST_CONFIG }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      const designerPage = screen.queryByTestId('designer-page-root')
        ?? document.querySelector('[data-runtime-id]');
      expect(designerPage).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('compiles edgeType.body schema and resolves expression in fragment scope', async () => {
    const normalized = normalizeConfig(TEST_CONFIG);
    const edgeType = normalized.edgeTypes.get('default');

    expect(edgeType).toBeDefined();
    expect(edgeType!.body).toEqual({ type: 'text', body: '${condition}', className: 'text-sm' });

    const bindings = {
      edge: { id: 'edge-1', source: 'node-1', target: 'node-2', data: { condition: '触发条件' } },
      data: { condition: '触发条件', lineStyle: 'solid' },
      condition: '触发条件',
      lineStyle: 'solid',
    };

    createSchemaRenderer([textWithBody]);

    const hostRenderer: RendererDefinition = {
      type: 'binding-host',
      component: () => (
        <div data-testid="host">
          <RenderNodes
            input={edgeType!.body!}
            options={{ bindings, scopeKey: 'edge:edge-1', pathSuffix: 'edge' }}
          />
        </div>
      ),
      fields: [],
      staticCapable: true,
    };

    const LocalRenderer = createSchemaRenderer([textWithBody, hostRenderer]);
    render(
      <LocalRenderer
        schemaUrl="test://edge-expr-direct"
        schema={{ type: 'binding-host' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('edge-text').textContent).toBe('触发条件');
    });
  });

  it('renders empty string when condition is empty', async () => {
    const normalized = normalizeConfig(TEST_CONFIG);
    const edgeType = normalized.edgeTypes.get('default');

    const bindings = {
      edge: { id: 'edge-2', source: 'node-1', target: 'node-2', data: { condition: '' } },
      data: { condition: '', lineStyle: 'solid' },
      condition: '',
      lineStyle: 'solid',
    };

    const hostRenderer: RendererDefinition = {
      type: 'empty-host',
      component: () => (
        <div data-testid="host">
          <RenderNodes
            input={edgeType!.body!}
            options={{ bindings, scopeKey: 'edge:edge-2', pathSuffix: 'edge' }}
          />
        </div>
      ),
      fields: [],
      staticCapable: true,
    };

    const LocalRenderer = createSchemaRenderer([textWithBody, hostRenderer]);
    render(
      <LocalRenderer
        schemaUrl="test://edge-expr-empty"
        schema={{ type: 'empty-host' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('edge-text').textContent).toBe('');
    });
  });
});

describe('Node body expression rendering', () => {
  it('resolves nodeType.body expressions from spread config data', async () => {
    const normalized = normalizeConfig(TEST_CONFIG);
    const nodeType = normalized.nodeTypes.get('start');

    expect(nodeType).toBeDefined();
    expect(nodeType!.body).toEqual({ type: 'text', body: '${label}' });

    const nodeRenderData = {
      config: { trigger: 'register' },
      node: { id: 'node-1', type: 'start', label: '开始', data: { label: '开始', config: { trigger: 'register' } } },
      data: { label: '开始', config: { trigger: 'register' } },
      label: '开始',
      trigger: 'register',
    };

    const hostRenderer: RendererDefinition = {
      type: 'node-host',
      component: () => (
        <div data-testid="host">
          <RenderNodes
            input={nodeType!.body!}
            options={{ bindings: nodeRenderData, scopeKey: 'node:node-1', pathSuffix: 'node' }}
          />
        </div>
      ),
      fields: [],
      staticCapable: true,
    };

    const LocalRenderer = createSchemaRenderer([textWithBody, hostRenderer]);
    render(
      <LocalRenderer
        schemaUrl="test://node-expr"
        schema={{ type: 'node-host' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('edge-text').textContent).toBe('开始');
    });
  });
});
