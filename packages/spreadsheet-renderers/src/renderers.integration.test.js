import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry, useRenderScope } from '@nop-chaos/flux-react';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import { defineSpreadsheetPageSchema, registerSpreadsheetRenderers } from './index.js';
const env = {
    fetcher: async () => ({ ok: true, status: 200, data: null }),
    notify: () => undefined,
};
const actionButtonRenderer = {
    type: 'action-button',
    component: (props) => (_jsx("button", { type: "button", onClick: () => void props.events.onClick?.(), children: String(props.props.label ?? props.meta.label ?? 'Action') })),
    fields: [{ key: 'onClick', kind: 'event' }],
};
function A1ValueProbe() {
    const scope = useRenderScope();
    const scopeData = scope.readOwn();
    const activeSheet = scopeData.spreadsheetSnapshot?.document?.workbook?.sheets?.find((sheet) => sheet.id === scopeData.spreadsheetSnapshot?.activeSheetId);
    const a1Value = activeSheet?.cells?.A1?.value;
    return _jsx("span", { "data-testid": "a1-value", children: a1Value == null ? '' : String(a1Value) });
}
const a1ProbeRenderer = {
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
        render(_jsx(SchemaRenderer, { schema: schema, env: env, registry: registry, formulaCompiler: createFormulaCompiler() }));
        fireEvent.click(screen.getByRole('button', { name: 'Set A1' }));
        await waitFor(() => {
            expect(screen.getByTestId('a1-value').textContent).toBe('42');
        });
    });
});
//# sourceMappingURL=renderers.integration.test.js.map