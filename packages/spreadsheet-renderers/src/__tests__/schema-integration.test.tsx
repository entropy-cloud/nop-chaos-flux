import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createSchemaRenderer,
  createDefaultRegistry,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { createActionScope } from '@nop-chaos/flux-runtime';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createSpreadsheetActionProvider,
  defineSpreadsheetPageSchema,
  registerSpreadsheetRenderers,
  SPREADSHEET_MANIFEST_V1,
  spreadsheetRendererDefinitions,
} from '../index.js';
import { SPREADSHEET_HOST_METHODS } from '../spreadsheet-manifest.js';

const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

const actionButtonRenderer: RendererDefinition = {
  type: 'action-button',
  component: (props) => (
    <button type="button" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? 'Action')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

function A1ValueProbe() {
  const a1Value = useScopeSelector((data: any) => {
    const activeSheet = data.spreadsheet?.activeSheet;
    return activeSheet?.cells?.A1?.value;
  });
  return <span data-testid="a1-value">{a1Value == null ? '' : String(a1Value)}</span>;
}

const a1ProbeRenderer: RendererDefinition = {
  type: 'a1-value-probe',
  component: A1ValueProbe,
};

function ReadOnlyProbe() {
  const isReadOnly = useScopeSelector((data: any) => data.spreadsheet?.runtime?.readonly);
  return <span data-testid="read-only-value">{String(Boolean(isReadOnly))}</span>;
}

const readOnlyProbeRenderer: RendererDefinition = {
  type: 'read-only-probe',
  component: ReadOnlyProbe,
};

function TopLevelReadOnlyProbe() {
  const isReadOnly = useScopeSelector((data: any) => data.runtime?.readonly);
  return <span data-testid="top-level-read-only-value">{String(Boolean(isReadOnly))}</span>;
}

const topLevelReadOnlyProbeRenderer: RendererDefinition = {
  type: 'top-level-read-only-probe',
  component: TopLevelReadOnlyProbe,
};

function TopLevelA1ValueProbe() {
  const a1Value = useScopeSelector((data: any) => data.activeSheet?.cells?.A1?.value);
  return <span data-testid="top-level-a1-value">{a1Value == null ? '' : String(a1Value)}</span>;
}

const topLevelA1ProbeRenderer: RendererDefinition = {
  type: 'top-level-a1-probe',
  component: TopLevelA1ValueProbe,
};

function SpreadsheetStatusProbe() {
  const status = useScopeSelector((data: any) => data.spreadsheetStatus);
  return (
    <span data-testid="spreadsheet-status">
      {status ? `${status.kind}:${status.readonly}:${status.canUndo}` : ''}
    </span>
  );
}

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

afterEach(() => {
  cleanup();
});

describe('spreadsheet-page schema integration', () => {
  it('publishes only the supported spreadsheet config knobs on the renderer contract', () => {
    const definition = spreadsheetRendererDefinitions.find(
      (candidate) => candidate.type === 'spreadsheet-page',
    );

    expect(definition?.propContracts?.config?.shape).toEqual({
      kind: 'object',
      fields: {
        defaultRowHeight: { kind: 'number' },
        defaultColumnWidth: { kind: 'number' },
        maxUndoDepth: { kind: 'number' },
      },
      optional: ['defaultRowHeight', 'defaultColumnWidth', 'maxUndoDepth'],
    });
  });

  it('updates cell value via spreadsheet namespaced action', async () => {
    const document = createEmptyDocument('integration-spreadsheet');
    const sheetId = document.workbook.sheets[0].id;
    const schema = defineSpreadsheetPageSchema({
      type: 'spreadsheet-page',
      document,
      toolbar: [
        {
          type: 'action-button',
          label: 'Set A1',
          onClick: {
            action: 'spreadsheet:setCellValue',
            args: {
              cell: {
                sheetId,
                address: 'A1',
                row: 0,
                col: 0,
              },
              value: '42',
            },
          },
        },
        {
          type: 'a1-value-probe',
        },
        {
          type: 'top-level-a1-probe',
        },
      ],
    });

    const registry = createDefaultRegistry([
      actionButtonRenderer,
      a1ProbeRenderer,
      topLevelA1ProbeRenderer,
    ]);
    registerSpreadsheetRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://spreadsheet/renderers-integration"
        schema={schema}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: 'Set A1' })).toBeTruthy();
      },
      { timeout: 5000 },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set A1' }));

    await waitFor(() => {
      expect(screen.getByTestId('a1-value').textContent).toBe('42');
      expect(screen.getByTestId('top-level-a1-value').textContent).toBe('42');
    });
  }, 15000);

  it('passes readOnly schema prop into the spreadsheet runtime', async () => {
    const document = createEmptyDocument('read-only-spreadsheet');
    const schema = defineSpreadsheetPageSchema({
      type: 'spreadsheet-page',
      document,
      readOnly: true,
      body: [
        {
          type: 'read-only-probe',
        },
        {
          type: 'top-level-read-only-probe',
        },
      ],
    });

    const registry = createDefaultRegistry([
      actionButtonRenderer,
      a1ProbeRenderer,
      readOnlyProbeRenderer,
      topLevelReadOnlyProbeRenderer,
    ]);
    registerSpreadsheetRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://spreadsheet/renderers-integration"
        schema={schema}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('read-only-value').textContent).toBe('true');
      expect(screen.getByTestId('top-level-read-only-value').textContent).toBe('true');
    });
  });

  it('falls back to a safe empty spreadsheet document for malformed runtime props', async () => {
    const schema = {
      type: 'spreadsheet-page',
      document: { bad: true },
      config: { defaultRowHeight: 28, maxUndoDepth: 'bad' },
      readOnly: 'yes',
      body: [
        { type: 'read-only-probe' },
        { type: 'top-level-read-only-probe' },
        { type: 'a1-value-probe' },
      ],
    } as any;

    const registry = createDefaultRegistry([
      a1ProbeRenderer,
      readOnlyProbeRenderer,
      topLevelReadOnlyProbeRenderer,
    ]);
    registerSpreadsheetRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://spreadsheet/renderers-invalid-props"
        schema={schema}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('read-only-value').textContent).toBe('false');
      expect(screen.getByTestId('top-level-read-only-value').textContent).toBe('false');
      expect(screen.getByTestId('a1-value').textContent).toBe('');
    });
  });

  it('publishes spreadsheet host status through statusPath', async () => {
    const sheetDocument = createEmptyDocument('status-spreadsheet');
    const schema = defineSpreadsheetPageSchema({
      type: 'spreadsheet-page',
      document: sheetDocument,
      statusPath: 'spreadsheetStatus',
      body: [
        {
          type: 'read-only-probe',
        },
        {
          type: 'a1-value-probe',
        },
      ],
      toolbar: [
        {
          type: 'action-button',
          label: 'noop',
          onClick: {
            action: 'showToast',
            args: {
              message: 'noop',
            },
          },
        },
      ],
    });

    const statusProbeRenderer: RendererDefinition = {
      type: 'spreadsheet-status-probe',
      component: SpreadsheetStatusProbe,
    };

    const registry = createDefaultRegistry([
      pageRenderer,
      actionButtonRenderer,
      a1ProbeRenderer,
      readOnlyProbeRenderer,
      topLevelReadOnlyProbeRenderer,
      topLevelA1ProbeRenderer,
      statusProbeRenderer,
    ]);
    registerSpreadsheetRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://spreadsheet/renderers-integration"
        schema={{ type: 'page', body: [schema, { type: 'spreadsheet-status-probe' }] } as any}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('spreadsheet-status').textContent).toContain('spreadsheet:false');
    });

    expect(document.querySelector('.nop-spreadsheet-page')).toBeTruthy();
    expect(document.querySelector('[data-slot="spreadsheet-page-header"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="spreadsheet-page-body"]')).toBeTruthy();
  });

  it('renders the default spreadsheet host when body is omitted', async () => {
    const sheetDocument = createEmptyDocument('default-body-spreadsheet');
    const schema = defineSpreadsheetPageSchema({
      type: 'spreadsheet-page',
      document: sheetDocument,
    });

    const registry = createDefaultRegistry([]);
    registerSpreadsheetRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://spreadsheet/default-body"
        schema={schema}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-slot="spreadsheet-default-host"]')).toBeTruthy();
      expect(document.querySelector('[data-slot="spreadsheet-default-toolbar"]')).toBeTruthy();
      expect(document.querySelector('[data-slot="spreadsheet-grid"]')).toBeTruthy();
      expect(document.querySelector('[data-slot="spreadsheet-sheet-bar"]')).toBeTruthy();
    });
  });

  it('clears spreadsheet host status on unmount', async () => {
    const sheetDocument = createEmptyDocument('status-spreadsheet-unmount');
    const schema = defineSpreadsheetPageSchema({
      type: 'spreadsheet-page',
      document: sheetDocument,
      statusPath: 'spreadsheetStatus',
    });

    const statusProbeRenderer: RendererDefinition = {
      type: 'spreadsheet-status-probe',
      component: SpreadsheetStatusProbe,
    };

    const registry = createDefaultRegistry([pageRenderer, statusProbeRenderer]);
    registerSpreadsheetRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    const view = render(
      <SchemaRenderer
        schemaUrl="test://spreadsheet/renderers-integration-unmount"
        schema={{ type: 'page', body: [schema, { type: 'spreadsheet-status-probe' }] } as any}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
        data={{}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('spreadsheet-status').textContent).toContain('spreadsheet:false');
    });

    view.unmount();
    expect(screen.queryByTestId('spreadsheet-status')).toBeNull();
  });

  it('maps failed spreadsheet commands to top-level action result errors', async () => {
    const provider = createSpreadsheetActionProvider(async () => ({
      ok: false,
      changed: false,
      error: 'Sheet is protected',
      data: { code: 'protected' },
    }));

    const actionScope = createActionScope({ id: 'spreadsheet-test-scope' });
    const unregister = actionScope.registerNamespace('spreadsheet', provider);

    try {
      const resolved = actionScope.resolve('spreadsheet:setCellValue');
      expect(resolved?.method).toBe('setCellValue');

      const result = await resolved!.provider.invoke(
        resolved!.method,
        {
          cell: { sheetId: 'sheet-1', address: 'A1', row: 0, col: 0 },
          value: 'next',
        },
        {} as any,
      );
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe('Sheet is protected');
      expect(result.data).toEqual({ code: 'protected' });
    } finally {
      unregister();
    }
  });

  it('preserves non-Error spreadsheet command failures as error causes', async () => {
    const structuredError = {
      code: 'protected',
      message: 'Sheet is protected',
      sheetId: 'sheet-1',
    };
    const provider = createSpreadsheetActionProvider(async () => ({
      ok: false,
      changed: false,
      error: structuredError,
      data: { code: 'protected' },
    }));

    const actionScope = createActionScope({ id: 'spreadsheet-structured-error-scope' });
    const unregister = actionScope.registerNamespace('spreadsheet', provider);

    try {
      const resolved = actionScope.resolve('spreadsheet:setCellValue');
      const result = await resolved!.provider.invoke(
        resolved!.method,
        {
          cell: { sheetId: 'sheet-1', address: 'A1', row: 0, col: 0 },
          value: 'next',
        },
        {} as any,
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe('Sheet is protected');
      expect((result.error as Error).cause).toBe(structuredError);
      expect(result.data).toEqual({ code: 'protected' });
    } finally {
      unregister();
    }
  });

  it('preserves cancelled spreadsheet commands in top-level action results', async () => {
    const provider = createSpreadsheetActionProvider(async () => ({
      ok: false,
      changed: false,
      cancelled: true,
    }));

    const actionScope = createActionScope({ id: 'spreadsheet-cancelled-scope' });
    const unregister = actionScope.registerNamespace('spreadsheet', provider);

    try {
      const resolved = actionScope.resolve('spreadsheet:setCellValue');
      const result = await resolved!.provider.invoke(
        resolved!.method,
        {
          cell: { sheetId: 'sheet-1', address: 'A1', row: 0, col: 0 },
          value: 'next',
        },
        {} as any,
      );

      expect(result.ok).toBe(false);
      expect(result.cancelled).toBe(true);
      expect(result.error).toBeUndefined();
    } finally {
      unregister();
    }
  });

  it('exposes the documented spreadsheet host methods through listMethods', () => {
    const provider = createSpreadsheetActionProvider(async () => ({ ok: true, changed: false }));

    expect(provider.listMethods?.()).toEqual(SPREADSHEET_HOST_METHODS);
    expect(Object.keys(SPREADSHEET_MANIFEST_V1.capabilities.methods)).toEqual(SPREADSHEET_HOST_METHODS);
  });

  it('rejects payloads that do not match the published spreadsheet host args contract', async () => {
    const dispatch = vi.fn(async () => ({ ok: true, changed: false }));
    const provider = createSpreadsheetActionProvider(dispatch);

    const result = await provider.invoke('setCellValue', { value: 'missing-cell' }, {} as any);

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe(
      'spreadsheet:setCellValue payload does not match the published host args contract.',
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('rejects payloads for no-args spreadsheet host methods', async () => {
    const dispatch = vi.fn(async () => ({ ok: true, changed: false }));
    const provider = createSpreadsheetActionProvider(dispatch);

    const result = await provider.invoke('undo', { unexpected: true }, {} as any);

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe(
      'spreadsheet:undo payload does not match the published host args contract.',
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('rejects invalid spreadsheet literal unions published by the host contract', async () => {
    const dispatch = vi.fn(async () => ({ ok: true, changed: false }));
    const provider = createSpreadsheetActionProvider(dispatch);

    const selectionResult = await provider.invoke(
      'setSelection',
      {
        selection: {
          kind: 'current',
          sheetId: 'sheet-1',
        },
      },
      {} as any,
    );
    const searchResult = await provider.invoke(
      'find',
      {
        options: {
          query: 'hello',
          searchScope: 'current',
        },
      },
      {} as any,
    );

    expect(selectionResult.ok).toBe(false);
    expect((selectionResult.error as Error).message).toBe(
      'spreadsheet:setSelection payload does not match the published host args contract.',
    );
    expect(searchResult.ok).toBe(false);
    expect((searchResult.error as Error).message).toBe(
      'spreadsheet:find payload does not match the published host args contract.',
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('rejects unknown keys for closed spreadsheet object contracts', async () => {
    const dispatch = vi.fn(async () => ({ ok: true, changed: false }));
    const provider = createSpreadsheetActionProvider(dispatch);

    const result = await provider.invoke(
      'setCellValue',
      {
        cell: { sheetId: 'sheet-1', address: 'A1', row: 0, col: 0, extra: true },
        value: 'next',
      },
      {} as any,
    );

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe(
      'spreadsheet:setCellValue payload does not match the published host args contract.',
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('accepts the published search option vocabulary and forwards it unchanged', async () => {
    const dispatch = vi.fn(async () => ({ ok: true, changed: false, data: null }));
    const provider = createSpreadsheetActionProvider(dispatch);

    const result = await provider.invoke(
      'find',
      {
        options: {
          query: 'hello',
          matchWholeCell: true,
          useRegex: true,
        },
      },
      {} as any,
    );

    expect(result.ok).toBe(true);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'spreadsheet:find',
      options: {
        query: 'hello',
        matchWholeCell: true,
        useRegex: true,
      },
    });
  });

  it('rejects legacy search option names that are no longer part of the published contract', async () => {
    const dispatch = vi.fn(async () => ({ ok: true, changed: false }));
    const provider = createSpreadsheetActionProvider(dispatch);

    const result = await provider.invoke(
      'find',
      {
        options: {
          query: 'hello',
          wholeCell: true,
          includeFormulas: true,
        },
      },
      {} as any,
    );

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe(
      'spreadsheet:find payload does not match the published host args contract.',
    );
    expect(dispatch).not.toHaveBeenCalled();
  });
});
