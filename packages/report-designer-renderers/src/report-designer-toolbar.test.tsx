// @vitest-environment happy-dom
import React from 'react';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { RuntimeContext, ScopeContext } from '@nop-chaos/flux-react/unstable';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createReportTemplateDocument,
  type ReportDesignerConfig,
} from '@nop-chaos/report-designer-core';
import { defineReportDesignerPageSchema, registerReportDesignerRenderers } from './index.js';
import { ReportToolbarRenderer } from './report-designer-toolbar.js';

const notify = vi.fn();

const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify,
};

afterEach(() => {
  cleanup();
  notify.mockReset();
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
    config: createRuntimeConfig(),
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

  it('keeps the toolbar on a single horizontal row with overflow instead of wrapping', () => {
    renderToolbarInPage({});
    const toolbar = document.querySelector('.nop-report-toolbar') as HTMLElement | null;
    expect(toolbar).toBeTruthy();
    if (!toolbar) {
      throw new Error('Expected toolbar root');
    }

    expect(toolbar.className).toContain('flex-nowrap');
    expect(toolbar.className).toContain('overflow-x-auto');
    expect(toolbar.className).not.toContain('flex-wrap');
  });

  it('renders with itemsOverride that adds a button', () => {
    renderToolbarInPage({
      itemsOverride: [
        {
          id: 'custom-btn',
          type: 'button',
          label: 'Custom',
          action: 'report-designer:save',
          intent: 'primary',
        },
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

  it('notifies when toolbar dispatch resolves ok:false', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: false, error: new Error('Toolbar failed') });
    const runtime = { env };
    const ownScopeData = {};
    const scope = {
      id: 'scope',
      path: '$',
      readOwn: () => ownScopeData,
      readVisible: () => ownScopeData,
      materializeVisible: () => ownScopeData,
      store: {
        subscribe: () => () => undefined,
        getSnapshot: () => ownScopeData,
      },
    } as any;

    render(
      <RuntimeContext.Provider value={runtime as any}>
        <ScopeContext.Provider value={scope}>
          <ReportToolbarRenderer
            {...({
              id: 'toolbar',
              path: 'page.toolbar',
              schema: { type: 'report-toolbar' },
              templateNode: {},
              node: {},
              props: {
                type: 'report-toolbar',
                itemsOverride: [
                  {
                    id: 'custom-btn',
                    type: 'button',
                    label: 'Custom',
                    action: 'report-designer:save',
                  },
                ],
              },
              meta: {},
              regions: {},
              events: {},
              helpers: { dispatch },
            } as any)}
          />
        </ScopeContext.Provider>
      </RuntimeContext.Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('warning', 'Toolbar failed');
    });
  });
});
