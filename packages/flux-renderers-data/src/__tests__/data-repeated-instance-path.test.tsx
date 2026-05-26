import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createDataSchemaRenderer,
  env,
  formulaCompiler,
  nodeInstanceProbeRenderer,
} from '../test-support.js';

describe('dataRendererDefinitions repeated instance paths', () => {
  afterEach(() => {
    cleanup();
  });

  it('exposes repeated instancePath through nodeInstance for row child renderers', async () => {
    const SchemaRenderer = createDataSchemaRenderer([nodeInstanceProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-and-chart"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columns: [{ label: 'Probe', cell: { type: 'node-instance-probe' } }],
              source: [{ id: 1, name: 'Alice' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect((await screen.findByTestId('node-instance-probe')).textContent ?? '').toMatch(
      /^\[\{"repeatedTemplateId":"table-row:/,
    );
  });

  it('passes repeated instancePath into tree node child renderers', async () => {
    const SchemaRenderer = createDataSchemaRenderer([nodeInstanceProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/tree-node-instance-path"
        schema={{
          type: 'page',
          body: [{ type: 'tree', data: '${nodes}', node: { type: 'node-instance-probe' } }],
        }}
        data={{
          nodes: [{ id: 'root', label: 'Root', children: [{ id: 'child', label: 'Child' }] }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect((await screen.findByTestId('node-instance-probe')).textContent ?? '').toBe(
      '[{"repeatedTemplateId":"tree-node:_.body_0_","instanceKey":"root"}]',
    );
  });
});
