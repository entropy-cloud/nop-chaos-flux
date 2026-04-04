// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { registerReportDesignerRenderers } from './index.js';

const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

afterEach(() => {
  cleanup();
});

function renderInspector(
  schemaOverrides: Record<string, unknown> = {},
) {
  const registry = createDefaultRegistry([textRenderer]);
  registerReportDesignerRenderers(registry);
  const SchemaRenderer = createSchemaRenderer();

  const schema = {
    type: 'report-inspector' as const,
    ...schemaOverrides,
  };

  render(
    <SchemaRenderer
      schema={schema}
      env={env}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
      data={{ selectionTarget: { kind: 'cell' } }}
    />,
  );
}

describe('ReportInspectorRenderer', () => {
  it('renders empty label when no panels', () => {
    renderInspector({ inspectorPanels: [] });

    expect(screen.getByText('No inspector panels available.')).toBeTruthy();
  });

  it('renders custom emptyLabel when no panels', () => {
    renderInspector({ inspectorPanels: [], emptyLabel: 'Custom empty' });

    expect(screen.getByText('Custom empty')).toBeTruthy();
  });

  it('renders panels with titles', () => {
    renderInspector({
      inspectorPanels: [
        { id: 'panel-1', title: 'Cell Properties', targetKind: 'cell', body: { type: 'text', text: 'Panel body' } },
        { id: 'panel-2', title: 'Style', targetKind: 'cell', body: { type: 'text', text: 'Style body' } },
      ],
    });

    expect(screen.getByText('Cell Properties')).toBeTruthy();
    expect(screen.getByText('Style')).toBeTruthy();
    expect(screen.getByText('Panel body')).toBeTruthy();
    expect(screen.getByText('Style body')).toBeTruthy();
  });

  it('renders single panel', () => {
    renderInspector({
      inspectorPanels: [
        { id: 'panel-1', title: 'Basic', targetKind: 'cell', body: { type: 'text', text: 'Content' } },
      ],
    });

    expect(screen.getByText('Basic')).toBeTruthy();
    expect(screen.getByText('Content')).toBeTruthy();
  });

  it('has data-testid when panels present', () => {
    renderInspector({
      inspectorPanels: [
        { id: 'panel-1', title: 'Test', targetKind: 'cell', body: { type: 'text', text: 'x' } },
      ],
    });

    expect(screen.getByTestId('report-inspector')).toBeTruthy();
  });

  it('renders default empty label when inspectorPanels is undefined', () => {
    renderInspector({});

    expect(screen.getByText('No inspector panels available.')).toBeTruthy();
  });
});
