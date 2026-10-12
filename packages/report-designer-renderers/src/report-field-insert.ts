// plan 547 (host-1): field-insert write-through — extracted from
// page-renderer.tsx to keep that file under the 700-line gate. A confirmed
// insert must write the `${fieldId}` binding into the target cell BEFORE the
// metadata dispatch; the pre-fix host implementation only published designer
// metadata, so the visible document never changed while being marked dirty.
// Aligned with the demo reference (report-designer-demo insertFieldAtCell:
// setCellValue then dropFieldToTarget).
import { cellAddress, type SpreadsheetCommandResult } from '@nop-chaos/spreadsheet-core';
import type { FieldDragPayload, ReportDesignerCore, ReportSelectionTarget } from '@nop-chaos/report-designer-core';

interface FieldInsertInput {
  spreadsheetCore: {
    dispatch: (command: {
      type: 'spreadsheet:setCellValue';
      cell: { sheetId: string; address: string; row: number; col: number };
      value: string;
    }) => Promise<SpreadsheetCommandResult>;
  };
  core: ReportDesignerCore;
  selectionTarget: ReportSelectionTarget | null | undefined;
  fieldId: string;
  payload: FieldDragPayload;
}

export async function insertFieldWithBinding(input: FieldInsertInput): Promise<void> {
  const { spreadsheetCore, core, selectionTarget, fieldId, payload } = input;
  const target = selectionTarget;
  if (target?.kind !== 'cell' && target?.kind !== 'range') {
    return;
  }

  // SpreadsheetCellRef/SpreadsheetRange carry sheetId — no extra activeSheet
  // lookup needed.
  const cell =
    target.kind === 'cell'
      ? target.cell
      : {
          sheetId: target.range.sheetId,
          address: cellAddress(target.range.startRow, target.range.startCol),
          row: target.range.startRow,
          col: target.range.startCol,
        };
  // Bail on a failed/cancelled cell write so the metadata dispatch never
  // marks the designer dirty for an insert whose visible half did not land
  // (parity with the demo reference's abort path).
  const writeResult = await spreadsheetCore.dispatch({
    type: 'spreadsheet:setCellValue',
    cell,
    value: `\${${fieldId}}`,
  });
  if (!writeResult.ok || writeResult.cancelled) {
    return;
  }

  await core.dispatch({
    type: 'report-designer:dropFieldToTarget',
    source: 'field-panel',
    field: payload,
    target,
  });
}
