import type { CommandHandler } from './types.js';
import type {
  SetActiveSheetCommand,
  SetSelectionCommand,
  SetViewportCommand,
  SelectAllCommand,
  SelectRowCommand,
  SelectColumnCommand,
} from '../commands.js';
import type { SpreadsheetSelection } from '../types.js';

// Field-level equality: this runs per pointer move during drag-select — the
// previous whole-object JSON.stringify comparison is the P1-prohibited
// interactive-tick serialization pattern (plan 2026-09-29-4 R2-P20).
function selectionsEqual(left: SpreadsheetSelection, right: SpreadsheetSelection): boolean {
  if (left.kind !== right.kind || left.sheetId !== right.sheetId) return false;
  if (left.anchor?.sheetId !== right.anchor?.sheetId) return false;
  if (left.anchor?.address !== right.anchor?.address) return false;
  if (left.anchor?.row !== right.anchor?.row) return false;
  const sameRanges =
    left.range?.startRow === right.range?.startRow &&
    left.range?.endRow === right.range?.endRow &&
    left.range?.startCol === right.range?.startCol &&
    left.range?.endCol === right.range?.endCol;
  if (!sameRanges) return false;
  return numberListsEqual(left.rows, right.rows) && numberListsEqual(left.columns, right.columns);
}

function numberListsEqual(a: readonly number[] | undefined, b: readonly number[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export const handleSetActiveSheet: CommandHandler<SetActiveSheetCommand> = (store, command) => {
  const state = store.getState();
  const sheet = state.document.workbook.sheets.find((s) => s.id === command.sheetId);
  if (!sheet) return { ok: false, changed: false, error: `Sheet not found: ${command.sheetId}` };
  store.setState({
    activeSheetId: command.sheetId,
    selection: { kind: 'none' },
    editing: undefined,
  });
  return { ok: true, changed: true };
};

export const handleSetSelection: CommandHandler<SetSelectionCommand> = (store, command) => {
  const state = store.getState();
  if (selectionsEqual(state.selection, command.selection)) {
    return { ok: true, changed: false, data: state.selection };
  }
  const editingCell = state.editing?.cell;
  const nextEditing =
    editingCell &&
    command.selection.kind === 'cell' &&
    command.selection.anchor?.row === editingCell.row &&
    command.selection.anchor?.col === editingCell.col
      ? state.editing
      : undefined;
  store.setState({ selection: command.selection, editing: nextEditing });
  return { ok: true, changed: true };
};

export const handleSetViewport: CommandHandler<SetViewportCommand> = (store, command) => {
  const state = store.getState();
  if (
    state.viewport.scrollX === command.viewport.scrollX &&
    state.viewport.scrollY === command.viewport.scrollY &&
    state.viewport.zoom === command.viewport.zoom
  ) {
    return { ok: true, changed: false, data: state.viewport };
  }

  store.setState({ viewport: command.viewport });
  return { ok: true, changed: true, data: command.viewport };
};

export const handleSelectAll: CommandHandler<SelectAllCommand> = (store, command) => {
  store.setState({
    selection: {
      kind: 'sheet',
      sheetId: command.sheetId,
    },
  });
  return { ok: true, changed: true };
};

export const handleSelectRow: CommandHandler<SelectRowCommand> = (store, command) => {
  const state = store.getState();
  const current = state.selection;
  if (
    command.extend &&
    current.kind === 'row' &&
    current.sheetId === command.sheetId &&
    current.rows
  ) {
    const rows = [...new Set([...current.rows, command.row])].sort((a, b) => a - b);
    store.setState({ selection: { kind: 'row', sheetId: command.sheetId, rows } });
  } else {
    store.setState({ selection: { kind: 'row', sheetId: command.sheetId, rows: [command.row] } });
  }
  return { ok: true, changed: true };
};

export const handleSelectColumn: CommandHandler<SelectColumnCommand> = (store, command) => {
  const state = store.getState();
  const current = state.selection;
  if (
    command.extend &&
    current.kind === 'column' &&
    current.sheetId === command.sheetId &&
    current.columns
  ) {
    const columns = [...new Set([...current.columns, command.col])].sort((a, b) => a - b);
    store.setState({ selection: { kind: 'column', sheetId: command.sheetId, columns } });
  } else {
    store.setState({
      selection: { kind: 'column', sheetId: command.sheetId, columns: [command.col] },
    });
  }
  return { ok: true, changed: true };
};

export function registerSelectionHandlers(registry: Map<string, CommandHandler>) {
  registry.set('spreadsheet:setActiveSheet', handleSetActiveSheet as CommandHandler);
  registry.set('spreadsheet:setSelection', handleSetSelection as CommandHandler);
  registry.set('spreadsheet:setViewport', handleSetViewport as CommandHandler);
  registry.set('spreadsheet:selectAll', handleSelectAll as CommandHandler);
  registry.set('spreadsheet:selectRow', handleSelectRow as CommandHandler);
  registry.set('spreadsheet:selectColumn', handleSelectColumn as CommandHandler);
}
