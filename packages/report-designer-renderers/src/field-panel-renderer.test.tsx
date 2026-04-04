// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import type { FieldSourceSnapshot } from '@nop-chaos/report-designer-core';
import { registerReportDesignerRenderers } from './index.js';

const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

const sampleFieldSources: FieldSourceSnapshot[] = [
  {
    id: 'source-1',
    label: 'Database Fields',
    groups: [
      {
        id: 'group-1',
        label: 'User Info',
        expanded: true,
        fields: [
          { id: 'field-1', label: 'User Name' },
          { id: 'field-2', label: 'Email' },
        ],
      },
    ],
  },
  {
    id: 'source-2',
    label: 'Calculated Fields',
    groups: [
      {
        id: 'group-2',
        label: 'Metrics',
        expanded: true,
        fields: [
          { id: 'field-3', label: 'Total Sales' },
        ],
      },
    ],
  },
];

afterEach(() => {
  cleanup();
});

function renderFieldPanel(
  schemaOverrides: Record<string, unknown> = {},
  scopeData: Record<string, unknown> = {},
) {
  const registry = createDefaultRegistry();
  registerReportDesignerRenderers(registry);
  const SchemaRenderer = createSchemaRenderer();

  const schema = {
    type: 'report-field-panel' as const,
    ...schemaOverrides,
  };

  render(
    <SchemaRenderer
      schema={schema}
      env={env}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
      data={scopeData}
    />,
  );
}

describe('ReportFieldPanelRenderer', () => {
  it('renders field items from schema fieldSources', () => {
    renderFieldPanel({ fieldSources: sampleFieldSources });

    expect(screen.getByText('User Name')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('Total Sales')).toBeTruthy();
  });

  it('renders custom emptyLabel when no field sources', () => {
    renderFieldPanel({ emptyLabel: 'Nothing here', fieldSources: [] });

    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('renders default empty label when no field sources and no emptyLabel', () => {
    renderFieldPanel({ fieldSources: [] });

    expect(screen.getByText('No field sources registered.')).toBeTruthy();
  });

  it('disables dragging when dragEnabled is false', () => {
    renderFieldPanel({ fieldSources: sampleFieldSources, dragEnabled: false });

    const items = screen.getAllByRole('listitem');
    for (const item of items) {
      expect(item.getAttribute('draggable')).toBe('false');
    }
  });

  it('enables dragging by default', () => {
    renderFieldPanel({ fieldSources: sampleFieldSources });

    const items = screen.getAllByRole('listitem');
    for (const item of items) {
      expect(item.getAttribute('draggable')).toBe('true');
    }
  });

  it('hides source headers when showFieldSourceHeader is false', () => {
    renderFieldPanel({ fieldSources: sampleFieldSources, showFieldSourceHeader: false });

    expect(screen.queryByText('Database Fields')).toBeNull();
    expect(screen.queryByText('Calculated Fields')).toBeNull();
    expect(screen.queryByText('User Info')).toBeNull();
    expect(screen.queryByText('Metrics')).toBeNull();

    expect(screen.getByText('User Name')).toBeTruthy();
  });

  it('shows source headers by default', () => {
    renderFieldPanel({ fieldSources: sampleFieldSources });

    expect(screen.getByText('Database Fields')).toBeTruthy();
    expect(screen.getByText('Calculated Fields')).toBeTruthy();
    expect(screen.getByText('User Info')).toBeTruthy();
    expect(screen.getByText('Metrics')).toBeTruthy();
  });

  it('shows source headers when showFieldSourceHeader is true', () => {
    renderFieldPanel({ fieldSources: sampleFieldSources, showFieldSourceHeader: true });

    expect(screen.getByText('Database Fields')).toBeTruthy();
    expect(screen.getByText('User Info')).toBeTruthy();
  });

  it('falls back to scope fieldSources when schema has none', () => {
    renderFieldPanel({}, { fieldSources: sampleFieldSources });

    expect(screen.getByText('User Name')).toBeTruthy();
    expect(screen.getByText('Total Sales')).toBeTruthy();
  });

  it('sets data-field-id and data-field-source-id on field items', () => {
    renderFieldPanel({ fieldSources: sampleFieldSources });

    const userNameItem = screen.getByText('User Name').closest('li');
    expect(userNameItem?.getAttribute('data-field-id')).toBe('field-1');
    expect(userNameItem?.getAttribute('data-field-source-id')).toBe('source-1');
  });
});
