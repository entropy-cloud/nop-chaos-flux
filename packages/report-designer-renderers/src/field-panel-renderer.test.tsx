// @vitest-environment happy-dom
import React from 'react';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import * as FluxCore from '@nop-chaos/flux-core';
import type { FieldSourceSnapshot } from '@nop-chaos/report-designer-core';
import { registerReportDesignerRenderers } from './index.js';
import { ReportFieldPanelRenderer } from './field-panel-renderer.js';
import { REPORT_FIELD_DRAG_MIME } from './report-field-panel.js';
import './report-field-panel.css';

let mockScopeData: Record<string, unknown> = {};
let mockActionScope: { resolve: (action: string) => unknown } | undefined;
let mockRuntime: Record<string, unknown> = {};

vi.mock('@nop-chaos/flux-react', async () => {
  const actual = await vi.importActual<typeof import('@nop-chaos/flux-react')>('@nop-chaos/flux-react');
  return {
    ...actual,
    useCurrentActionScope: () => mockActionScope,
    useOwnScopeSelector: (selector: (data: Record<string, unknown>) => unknown) =>
      selector(mockScopeData),
    useRendererRuntime: () => mockRuntime,
  };
});

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
        fields: [{ id: 'field-3', label: 'Total Sales' }],
      },
    ],
  },
];

afterEach(() => {
  cleanup();
  mockScopeData = {};
  mockActionScope = undefined;
  mockRuntime = {};
});

function renderFieldPanel(
  schemaOverrides: Record<string, unknown> = {},
  scopeData: Record<string, unknown> = {},
) {
  mockScopeData = scopeData;
  const registry = createDefaultRegistry();
  registerReportDesignerRenderers(registry);
  const SchemaRenderer = createSchemaRenderer();

  const schema = {
    type: 'report-field-panel' as const,
    ...schemaOverrides,
  };

  render(
    <SchemaRenderer
      schemaUrl="test://report/field-panel"
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
    const shell = document.querySelector('[data-slot="report-field-panel-shell"]');
    expect(shell).toBeTruthy();
    expect(shell?.className).toContain('nop-report-field-panel');
    expect(shell?.querySelector('[data-slot="report-field-panel-stack"]')).toBeTruthy();
    expect(shell?.querySelector('[data-slot="report-field-panel-source"]')).toBeTruthy();
    expect(shell?.querySelector('[data-slot="report-field-panel-group"]')).toBeTruthy();
  });

  it('renders custom emptyLabel when no field sources', () => {
    renderFieldPanel({ emptyLabel: 'Nothing here', fieldSources: [] });

    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('renders default empty label when no field sources and no emptyLabel', () => {
    renderFieldPanel({ fieldSources: [] });

    expect(screen.getByText('未注册字段源。')).toBeTruthy();
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

  it('disables keyboard insertion when there is no current selection target', () => {
    renderFieldPanel({ fieldSources: sampleFieldSources });

    const buttons = screen.getAllByRole('button', { name: /当前选择|current selection/i });
    for (const button of buttons) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('hides keyboard insertion controls when keyboardInsertEnabled is false', () => {
    renderFieldPanel({ fieldSources: sampleFieldSources, keyboardInsertEnabled: false });

    expect(screen.queryByRole('button', { name: /当前选择|current selection/i })).toBeNull();
  });

  it('disables keyboard insertion for sheet targets because host contract only supports cell and range', () => {
    renderFieldPanel(
      { fieldSources: sampleFieldSources },
      { selectionTarget: { kind: 'sheet', sheetId: 'sheet-1' } },
    );

    const buttons = screen.getAllByRole('button', { name: /当前选择|current selection/i });
    for (const button of buttons) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('writes the canonical drag payload for draggable field rows', () => {
    renderFieldPanel({ fieldSources: sampleFieldSources });

    const setData = vi.fn();
    const dataTransfer = {
      effectAllowed: 'all',
      setData,
    } as unknown as DataTransfer;

    fireEvent.dragStart(screen.getByText('User Name').closest('li') as Element, { dataTransfer });

    expect(setData).toHaveBeenCalledWith(
      REPORT_FIELD_DRAG_MIME,
      JSON.stringify({
        type: 'field',
        sourceId: 'source-1',
        fieldId: 'field-1',
        label: 'User Name',
        data: {
          id: 'field-1',
          label: 'User Name',
        },
      }),
    );
  });

  it('dispatches field insertion to the current selection target', async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true });
    const createScope = vi.fn(() => ({ id: 'field-scope' }));
    const resolved = {
      method: 'dropFieldToTarget',
      provider: { invoke },
    };
    const resolve = vi.fn((action: string) =>
      action === 'report-designer:dropFieldToTarget' ? resolved : undefined,
    );
    mockActionScope = { resolve };
    mockRuntime = { runtimeId: 'test-runtime' };
    mockScopeData = {
      selectionTarget: {
        kind: 'cell',
        cell: { sheetId: 'sheet-1', address: 'A1', row: 0, col: 0 },
      },
    };

    render(
      <ReportFieldPanelRenderer
        {...({
          id: 'field-panel',
          path: 'page.body.0',
          schema: { type: 'report-field-panel' },
          templateNode: { validationOwnerPlan: undefined },
          node: { scope: {} },
          props: {
            type: 'report-field-panel',
            fieldSources: sampleFieldSources,
            keyboardInsertEnabled: true,
          },
          meta: {},
          regions: {},
          events: {},
          helpers: {
            createScope,
          },
        } as any)}
      />,
    );

    const insertButton = screen.getByRole('button', {
      name: '将字段 User Name 插入到当前选择',
    });
    expect((insertButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(insertButton);

    await waitFor(() => {
      expect(resolve).toHaveBeenCalledWith('report-designer:dropFieldToTarget');
      expect(createScope).toHaveBeenCalledWith(
        {
          field: {
            type: 'field',
            sourceId: 'source-1',
            fieldId: 'field-1',
            label: 'User Name',
            data: expect.objectContaining({ id: 'field-1', label: 'User Name' }),
          },
          target: {
            kind: 'cell',
            cell: { sheetId: 'sheet-1', address: 'A1', row: 0, col: 0 },
          },
        },
        {
          scopeKey: 'report-field-panel:source-1:field-1',
          pathSuffix: 'fieldPanel.source-1.field-1',
        },
      );
      expect(invoke).toHaveBeenCalledWith(
        'dropFieldToTarget',
        {
          field: {
            type: 'field',
            sourceId: 'source-1',
            fieldId: 'field-1',
            label: 'User Name',
            data: expect.objectContaining({ id: 'field-1', label: 'User Name' }),
          },
          target: {
            kind: 'cell',
            cell: { sheetId: 'sheet-1', address: 'A1', row: 0, col: 0 },
          },
        },
        {
          runtime: mockRuntime,
          scope: { id: 'field-scope' },
          actionScope: mockActionScope,
        },
      );
    });
  });

  it('notifies when keyboard insertion fails', async () => {
    const reportRuntimeHostIssueSpy = vi.spyOn(FluxCore, 'reportRuntimeHostIssue');
    const notify = vi.fn();
    const invoke = vi.fn().mockRejectedValue(new Error('Insert failed'));
    const createScope = vi.fn(() => ({ id: 'field-scope' }));
    mockActionScope = {
      resolve: vi.fn(() => ({
        method: 'dropFieldToTarget',
        provider: { invoke },
      })),
    };
    mockRuntime = { runtimeId: 'test-runtime', env: { notify } };
    mockScopeData = {
      selectionTarget: {
        kind: 'cell',
        cell: { sheetId: 'sheet-1', address: 'A1', row: 0, col: 0 },
      },
    };

    render(
      <ReportFieldPanelRenderer
        {...({
          id: 'field-panel',
          path: 'page.body.0',
          schema: { type: 'report-field-panel' },
          templateNode: { validationOwnerPlan: undefined },
          node: { scope: {} },
          props: {
            type: 'report-field-panel',
            fieldSources: sampleFieldSources,
            keyboardInsertEnabled: true,
          },
          meta: {},
          regions: {},
          events: {},
          helpers: {
            createScope,
          },
        } as any)}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: '将字段 User Name 插入到当前选择',
      }),
    );

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('warning', 'Insert failed');
      expect(reportRuntimeHostIssueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          phase: 'action',
          path: 'page.body.0',
          details: { operation: 'report-field-panel-insert' },
        }),
      );
    });

    reportRuntimeHostIssueSpy.mockRestore();
  });

  it('notifies when keyboard insertion resolves ok:false', async () => {
    const reportRuntimeHostIssueSpy = vi.spyOn(FluxCore, 'reportRuntimeHostIssue');
    const notify = vi.fn();
    const invoke = vi.fn().mockResolvedValue({ ok: false, error: new Error('Resolved insert failed') });
    const createScope = vi.fn(() => ({ id: 'field-scope' }));
    mockActionScope = {
      resolve: vi.fn(() => ({
        method: 'dropFieldToTarget',
        provider: { invoke },
      })),
    };
    mockRuntime = { runtimeId: 'test-runtime', env: { notify } };
    mockScopeData = {
      selectionTarget: {
        kind: 'cell',
        cell: { sheetId: 'sheet-1', address: 'A1', row: 0, col: 0 },
      },
    };

    render(
      <ReportFieldPanelRenderer
        {...({
          id: 'field-panel',
          path: 'page.body.0',
          schema: { type: 'report-field-panel' },
          templateNode: { validationOwnerPlan: undefined },
          node: { scope: {} },
          props: {
            type: 'report-field-panel',
            fieldSources: sampleFieldSources,
            keyboardInsertEnabled: true,
          },
          meta: {},
          regions: {},
          events: {},
          helpers: {
            createScope,
          },
        } as any)}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: '将字段 User Name 插入到当前选择',
      }),
    );

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('warning', 'Resolved insert failed');
      expect(reportRuntimeHostIssueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          phase: 'action',
          path: 'page.body.0',
          details: { operation: 'report-field-panel-insert' },
        }),
      );
    });

    reportRuntimeHostIssueSpy.mockRestore();
  });

  it('ships package-owned field panel styling markers', () => {
    renderFieldPanel({ fieldSources: sampleFieldSources });

    expect(document.querySelector('[data-slot="report-field-panel-source"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="report-field-panel-items"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="report-field-panel-item"]')).toBeTruthy();
  });

  it('passes root meta attributes through the shell', () => {
    renderFieldPanel({ testid: 'field-panel-root' });

    expect(document.querySelector('[data-testid="field-panel-root"]')).toBeTruthy();
  });
});
