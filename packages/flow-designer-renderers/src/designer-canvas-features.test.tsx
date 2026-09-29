import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { setPaletteDragType } from './designer-xyflow-canvas/designer-xyflow-canvas.js';
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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

describe('palette drop preview (R3-U12, real xyflow render)', () => {
  it('shows a ghost preview while dragging a palette node and clears it on drop', async () => {
    setPaletteDragType('task');
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/drop-preview"
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
    const rfWrapper = view.container.querySelector('[data-testid="rf__wrapper"]') as HTMLElement;
    expect(rfWrapper).toBeTruthy();

    fireEvent.dragOver(rfWrapper, { clientX: 200, clientY: 150, dataTransfer: {} });
    await waitFor(() => {
      expect(view.getByTestId('designer-drop-preview').textContent).toContain('task');
    });

    fireEvent.drop(rfWrapper, {
      dataTransfer: { getData: () => 'task', dropEffect: 'move' },
    });
    await waitFor(() => {
      expect(view.queryByTestId('designer-drop-preview')).toBeNull();
    });
    setPaletteDragType(null);
  });

  it('does not show a preview for drags that did not start from the palette', async () => {
    const SchemaRenderer = createDesignerPageSchemaRenderer();
    const view = render(
      <SchemaRenderer
        schemaUrl="test://flow/drop-preview-none"
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
    const rfWrapper = view.container.querySelector('[data-testid="rf__wrapper"]') as HTMLElement;
    fireEvent.dragOver(rfWrapper, { clientX: 200, clientY: 150, dataTransfer: {} });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(view.queryByTestId('designer-drop-preview')).toBeNull();
  });
});
