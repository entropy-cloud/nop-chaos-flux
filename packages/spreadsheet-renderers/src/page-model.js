export function getRuntimeActiveSheet(snapshot) {
    return snapshot.document.workbook.sheets.find((sheet) => sheet.id === snapshot.activeSheetId);
}
export function getRuntimeActiveSheetName(snapshot) {
    return getRuntimeActiveSheet(snapshot)?.name ?? 'Unknown';
}
export function getRuntimeActiveSheetCellCount(snapshot) {
    return Object.keys(getRuntimeActiveSheet(snapshot)?.cells ?? {}).length;
}
export function buildSpreadsheetStatusLabel(hostSnapshot) {
    return `Active sheet: ${hostSnapshot.activeSheet?.name ?? 'Unknown'} | Selection: ${hostSnapshot.selection.kind}`;
}
//# sourceMappingURL=page-model.js.map