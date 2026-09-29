import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { cleanup, render, waitFor } from '@testing-library/react';
import {
  createDesignerPageSchemaRenderer,
  createRendererEnv,
  createTreeTestConfig,
} from './designer-page.test-support.js';

const TREE_DOCUMENT = {
  id: 'toolbar-defaults-tree',
  kind: 'test-tree',
  name: 'Toolbar Defaults Tree',
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

// R3-U19: hosts that declare no toolbar still get undo/redo/save with
// localized accessible names; an explicit empty toolbar stays hidden.
afterEach(() => {
  cleanup();
});

describe('designer default toolbar', () => {
  it('renders undo/redo/save buttons with localized accessible names when the host config has no toolbar', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/default-toolbar"
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
    await waitFor(() => {
      expect(view.getByRole('button', { name: 'Undo' })).toBeTruthy();
    });
    expect(view.getByRole('button', { name: 'Redo' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('keeps the toolbar hidden when the host explicitly passes an empty toolbar', async () => {
    const config = createTreeTestConfig();
    config.toolbar = { items: [] };
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/empty-toolbar"
        schema={{
          type: 'designer-page',
          treeDocument: TREE_DOCUMENT,
          config,
        }}
        env={createRendererEnv()}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(view.container.querySelector('.react-flow__node')).toBeTruthy();
    });
    expect(view.queryByRole('button', { name: 'Undo' })).toBeNull();
    expect(view.queryByTestId('designer-toolbar')).toBeNull();
  });
});
