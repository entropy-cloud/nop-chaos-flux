// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry, useScopeSelector } from '@nop-chaos/flux-react';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import { defineSpreadsheetPageSchema, registerSpreadsheetRenderers } from './index.js';

const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

const actionButtonRenderer: RendererDefinition = {
  type: 'action-button',
  component: (props) => (
    <button type="button" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? props.meta.label ?? 'Action')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

function A1ValueProbe() {
  const a1Value = useScopeSelector((data: any) => {
    const snapshot = data.spreadsheetSnapshot;
    if (!snapshot) return undefined;
    const activeSheet = snapshot.document?.workbook?.sheets?.find(
      (s: any) => s.id === snapshot.activeSheetId,
    );
    return activeSheet?.cells?.A1?.value;
  });
  return <span data-testid="a1-value">{a1Value == null ? '' : String(a1Value)}</span>;
}

const a1ProbeRenderer: RendererDefinition = {
  type: 'a1-value-probe',
  component: A1ValueProbe,
};

afterEach(() => {
  cleanup();
});

describe('spreadsheet-page namespaced actions integration', () => {
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
      ],
    });

    const registry = createDefaultRegistry([actionButtonRenderer, a1ProbeRenderer]);
    registerSpreadsheetRenderers(registry);
    const SchemaRenderer = createSchemaRenderer();

    render(
      <SchemaRenderer
        schema={schema}
        env={env}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set A1' }));

    await waitFor(() => {
      expect(screen.getByTestId('a1-value').textContent).toBe('42');
    });
  });
});

