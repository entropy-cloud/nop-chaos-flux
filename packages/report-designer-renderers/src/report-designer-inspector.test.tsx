// @vitest-environment happy-dom
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

  it('renders the root class without injecting a default test id', () => {
    renderInspector({
      body: { type: 'text', text: 'x' },
    });

    const inspector = document.querySelector('.nop-report-inspector') as HTMLElement | null;
    expect(inspector).toBeTruthy();
    if (!inspector) {
      throw new Error('Expected inspector root');
    }
    expect(inspector.classList.contains('nop-report-inspector')).toBe(true);
    expect(document.querySelector('[data-testid="report-inspector"]')).toBeNull();
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

  it('passes root meta attributes through inspector root', () => {
    renderInspector({ body: { type: 'text', text: 'Panel body' }, testid: 'inspector-root' });

    expect(screen.getByTestId('inspector-root')).toBeTruthy();
  });

  it('renders inspector-shell through the report-inspector definition path', () => {
    const registry = createDefaultRegistry([textRenderer]);
    registerReportDesignerRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://report/inspector-shell"
        schema={{ type: 'report-inspector-shell' }}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{
          selectionTarget: { kind: 'cell' },
          inspector: { resolvedSchema: { type: 'text', text: 'Shell body' } },
        }}
      />,
    );

    expect(screen.getByText('Shell body')).toBeTruthy();
  });
});
