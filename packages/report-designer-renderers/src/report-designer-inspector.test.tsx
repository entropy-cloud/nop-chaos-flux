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

function renderInspector(schemaOverrides: Record<string, unknown> = {}) {
  const registry = createDefaultRegistry([textRenderer]);
  registerReportDesignerRenderers(registry);
  const SchemaRenderer = createSchemaRenderer();

  const schema = {
    type: 'report-inspector' as const,
    ...schemaOverrides,
  };

  render(
    <SchemaRenderer
      schemaUrl="test://report/inspector"
      schema={schema}
      env={env}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
      data={{ selectionTarget: { kind: 'cell' } }}
    />,
  );
}

describe('ReportInspectorRenderer', () => {
  it('renders empty label when no schema body is available', () => {
    renderInspector({});

    expect(screen.getByText('无可用的检查器面板。')).toBeTruthy();
  });

  it('renders custom emptyLabel when no schema body is available', () => {
    renderInspector({ emptyLabel: 'Custom empty' });

    expect(screen.getByText('Custom empty')).toBeTruthy();
  });

  it('renders schema body content', () => {
    renderInspector({
      body: { type: 'text', text: 'Panel body' },
    });

    expect(screen.getByText('Panel body')).toBeTruthy();
  });

  it('has data-testid when schema body is present', () => {
    renderInspector({
      body: { type: 'text', text: 'x' },
    });

    const inspector = screen.getByTestId('report-inspector');
    expect(inspector).toBeTruthy();
    expect(inspector.classList.contains('nop-report-inspector')).toBe(true);
  });

  it('renders noSelectionLabel when selection is absent', () => {
    const registry = createDefaultRegistry([textRenderer]);
    registerReportDesignerRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://report/inspector-no-selection"
        schema={{ type: 'report-inspector', noSelectionLabel: 'Select something first' }}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{}}
      />,
    );

    expect(screen.getByText('Select something first')).toBeTruthy();
  });
});
