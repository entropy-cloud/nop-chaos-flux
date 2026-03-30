import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { hasRendererSlotContent, resolveRendererSlotContent, useCurrentActionScope } from '@nop-chaos/flux-react';
import { createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import { deriveHostSnapshot } from './bridge.js';
import { buildSpreadsheetStatusLabel, getRuntimeActiveSheetCellCount, getRuntimeActiveSheetName } from './page-model.js';
function toActionResult(response) {
    if (response && typeof response === 'object' && 'ok' in response) {
        return {
            ok: Boolean(response.ok),
            data: response,
        };
    }
    return {
        ok: true,
        data: response,
    };
}
function createSpreadsheetActionProvider(dispatch) {
    return {
        kind: 'host',
        listMethods() {
            return [];
        },
        async invoke(method, payload) {
            const args = payload && typeof payload === 'object' && !Array.isArray(payload)
                ? payload
                : {};
            const result = await dispatch({
                type: `spreadsheet:${method}`,
                ...args,
            });
            return toActionResult(result);
        },
    };
}
function renderFallbackBody(snapshot) {
    const activeSheetName = getRuntimeActiveSheetName(snapshot);
    const cellCount = getRuntimeActiveSheetCellCount(snapshot);
    return (_jsxs("div", { className: "nop-spreadsheet-page__fallback", children: [_jsx("p", { children: "Spreadsheet canvas region is not configured." }), _jsxs("p", { children: ["Active sheet: ", activeSheetName, "."] }), _jsxs("p", { children: ["Cell entries: ", cellCount, "."] })] }));
}
export function SpreadsheetPageRenderer(props) {
    const titleContent = resolveRendererSlotContent(props, 'title');
    const resolvedDocument = props.props.document;
    const resolvedConfig = props.props.config;
    const resolvedReadonly = props.props.readonly;
    const spreadsheetCore = useMemo(() => createSpreadsheetCore({
        document: resolvedDocument,
        config: resolvedConfig,
        readonly: resolvedReadonly,
    }), [resolvedConfig, resolvedDocument, resolvedReadonly]);
    const actionScope = useCurrentActionScope();
    const spreadsheetProvider = useMemo(() => createSpreadsheetActionProvider((command) => spreadsheetCore.dispatch(command)), [spreadsheetCore]);
    useEffect(() => {
        if (!actionScope) {
            return;
        }
        return actionScope.registerNamespace('spreadsheet', spreadsheetProvider);
    }, [actionScope, spreadsheetProvider]);
    const [snapshot, setSnapshot] = useState(() => spreadsheetCore.getSnapshot());
    useEffect(() => {
        setSnapshot(spreadsheetCore.getSnapshot());
        return spreadsheetCore.subscribe(() => {
            setSnapshot(spreadsheetCore.getSnapshot());
        });
    }, [spreadsheetCore]);
    const spreadsheet = useMemo(() => deriveHostSnapshot(snapshot), [snapshot]);
    const hostData = useMemo(() => ({
        spreadsheetCore,
        spreadsheetSnapshot: snapshot,
        spreadsheet,
    }), [spreadsheet, spreadsheetCore, snapshot]);
    const toolbarContent = props.regions.toolbar?.render({ data: hostData });
    const bodyContent = props.regions.body?.render({ data: hostData });
    const dialogsContent = props.regions.dialogs?.render({ data: hostData });
    return (_jsxs("section", { className: "nop-spreadsheet-page", children: [_jsxs("header", { className: "nop-spreadsheet-page__header", children: [_jsx("h2", { children: hasRendererSlotContent(titleContent) ? titleContent : 'Spreadsheet Designer' }), _jsx("p", { children: buildSpreadsheetStatusLabel(spreadsheet) })] }), hasRendererSlotContent(toolbarContent) ? _jsx("div", { className: "nop-spreadsheet-page__toolbar", children: toolbarContent }) : null, _jsx("main", { className: "nop-spreadsheet-page__body", children: hasRendererSlotContent(bodyContent) ? bodyContent : renderFallbackBody(snapshot) }), hasRendererSlotContent(dialogsContent) ? _jsx("div", { className: "nop-spreadsheet-page__dialogs", children: dialogsContent }) : null] }));
}
//# sourceMappingURL=page-renderer.js.map