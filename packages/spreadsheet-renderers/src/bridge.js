export function deriveHostSnapshot(runtime) {
    const activeSheet = runtime.document.workbook.sheets.find((s) => s.id === runtime.activeSheetId);
    let activeCell;
    let activeRange;
    if (runtime.selection.kind === 'cell' && runtime.selection.anchor) {
        activeCell = runtime.selection.anchor;
    }
    if (runtime.selection.kind === 'range' && runtime.selection.range) {
        activeRange = runtime.selection.range;
    }
    return {
        workbook: runtime.document.workbook,
        activeSheet,
        selection: runtime.selection,
        activeCell,
        activeRange,
        runtime: {
            canUndo: runtime.history.canUndo,
            canRedo: runtime.history.canRedo,
            readonly: runtime.readonly,
            dirty: runtime.dirty,
            zoom: runtime.viewport.zoom,
        },
    };
}
export function createSpreadsheetBridge(core) {
    return {
        getSnapshot() {
            const runtime = core.getSnapshot();
            return deriveHostSnapshot(runtime);
        },
        subscribe(listener) {
            return core.subscribe(listener);
        },
        dispatch(command) {
            return core.dispatch(command);
        },
        getCore() {
            return core;
        },
    };
}
//# sourceMappingURL=bridge.js.map