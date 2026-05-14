// @vitest-environment happy-dom

import React from 'react';
import { describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { render, within } from '@testing-library/react';
import {
  createDesignerPageSchemaRenderer,
  createGraphTestConfig,
  createRendererEnv,
} from './designer-page.test-support.js';

describe('DesignerPageRenderer graph mode regression', () => {
  it('graph mode still works correctly', () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();

    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/tree-graph-regression"
        schema={{
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
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const canvas = within(view.container);
    expect(canvas.getByRole('application')).toBeTruthy();
    expect(view.container.querySelectorAll('.react-flow__node')).toHaveLength(2);
    expect(view.container.querySelector('.react-flow__edges')).toBeTruthy();
  });
});
