// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createReportTemplateDocument,
  type ReportDesignerConfig,
} from '@nop-chaos/report-designer-core';
import { defineReportDesignerPageSchema, registerReportDesignerRenderers } from './index.js';

const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

afterEach(() => {
  cleanup();
});

function createRuntimeConfig(overrides?: Partial<ReportDesignerConfig>): ReportDesignerConfig {
  return { kind: 'report-template', ...overrides };
}

function renderToolbarInPage(overrides: { itemsOverride?: any[] }) {
  const spreadsheet = createEmptyDocument('toolbar-test');
  const document = createReportTemplateDocument(spreadsheet, 'Toolbar Test');
  const schema = defineReportDesignerPageSchema({
    type: 'report-designer-page',
    document,
    designer: createRuntimeConfig(),
    toolbar: {
      type: 'report-toolbar',
      itemsOverride: overrides.itemsOverride,
    },
  });

  const registry = createDefaultRegistry();
  registerReportDesignerRenderers(registry);
  const SchemaRenderer = createSchemaRenderer();

  render(
    <SchemaRenderer
      schemaUrl="test://report/toolbar"
      schema={schema}
      env={env}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
      data={{}}
    />,
  );
}

describe('report-toolbar renderer', () => {
  it('renders with default items (no overrides) and no implicit default test id', () => {
    renderToolbarInPage({});
    const toolbar = document.querySelector('.nop-report-toolbar') as HTMLElement | null;
    expect(toolbar).toBeTruthy();
    if (!toolbar) {
      throw new Error('Expected toolbar root');
    }
    expect(toolbar.className).toContain('nop-report-toolbar');
    expect(document.querySelector('[data-testid="report-toolbar"]')).toBeNull();
  });

  it('renders with itemsOverride that adds a button', () => {
    renderToolbarInPage({
      itemsOverride: [
        { id: 'custom-btn', type: 'button', label: 'Custom', action: 'report-designer:save' },
      ],
    });
    expect(screen.getByText('Custom')).toBeTruthy();
  });

  it('renders with itemsOverride that removes a default item via visible:false', () => {
    renderToolbarInPage({
      itemsOverride: [{ id: 'undo', type: 'button', visible: false }],
    });
    expect(screen.queryByText('Undo')).toBeNull();
  });

  it('exposes accessible semantics for toolbar switches', () => {
    renderToolbarInPage({
      itemsOverride: [{ id: 'preview', type: 'switch', label: 'Preview mode', action: 'report-designer:preview' }],
    });

    expect(screen.getByRole('switch', { name: 'Preview mode' })).toBeTruthy();
  });

  it('hides default items when visible expression resolves false', () => {
    renderToolbarInPage({});

    expect(screen.queryByText('Stop')).toBeNull();
  });
});
