import React from 'react';
import { describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { render, waitFor } from '@testing-library/react';
import {
  createDesignerPageSchemaRenderer,
  createRendererEnv,
  createTreeTestConfig,
} from './designer-page.test-support.js';

const TREE_DOCUMENT = {
  id: 'features-tree',
  kind: 'test-tree',
  name: 'Features Tree',
  version: '1.0.0',
  root: {
    id: 'start',
    type: 'start',
    data: { label: 'Start' },
    child: {
      id: 'end',
      type: 'end',
      data: { label: 'End' },
    },
  },
};

describe('designer canvas features wiring', () => {
  it('renders minimap and controls by default (features not declared)', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/features-default"
        schema={{
          type: 'designer-page',
          treeDocument: TREE_DOCUMENT,
          config: createTreeTestConfig(),
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(view.container.querySelector('.react-flow__node')).toBeTruthy();
    });
    expect(view.container.querySelector('.react-flow__minimap')).toBeTruthy();
    expect(view.container.querySelector('.react-flow__controls')).toBeTruthy();
  });

  it('hides minimap and controls when features declare them false', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/features-off"
        schema={{
          type: 'designer-page',
          treeDocument: TREE_DOCUMENT,
          config: {
            ...createTreeTestConfig(),
            features: { minimap: false, controls: false },
          },
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(view.container.querySelector('.react-flow__node')).toBeTruthy();
    });
    expect(view.container.querySelector('.react-flow__minimap')).toBeNull();
    expect(view.container.querySelector('.react-flow__controls')).toBeNull();
  });
});
