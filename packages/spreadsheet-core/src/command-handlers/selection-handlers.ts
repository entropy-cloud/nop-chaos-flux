import type { CommandHandler } from './types.js';
import type {
  SetActiveSheetCommand,
  SetSelectionCommand,
  SelectAllCommand,
  SelectRowCommand,
  SelectColumnCommand,
} from '../commands.js';

export const handleSetActiveSheet: CommandHandler<SetActiveSheetCommand> = (store, command) => {
  const state = store.getState();
  const sheet = state.document.workbook.sheets.find((s) => s.id === command.sheetId);
  if (!sheet) return { ok: false, changed: false, error: `Sheet not found: ${command.sheetId}` };
  store.setState({ activeSheetId: command.sheetId, selection: { kind: 'none' }, editing: undefined });
  return { ok: true, changed: true };
};

export const handleSetSelection: CommandHandler<SetSelectionCommand> = (store, command) => {
  store.setState({ selection: command.selection, editing: undefined });
  return { ok: true, changed: true };
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
  if (command.extend && current.kind === 'row' && current.sheetId === command.sheetId && current.rows) {
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
  if (command.extend && current.kind === 'column' && current.sheetId === command.sheetId && current.columns) {
    const columns = [...new Set([...current.columns, command.col])].sort((a, b) => a - b);
    store.setState({ selection: { kind: 'column', sheetId: command.sheetId, columns } });
  } else {
    store.setState({ selection: { kind: 'column', sheetId: command.sheetId, columns: [command.col] } });
  }
  return { ok: true, changed: true };
};

export function registerSelectionHandlers(registry: Map<string, CommandHandler>) {
  registry.set('spreadsheet:setActiveSheet', handleSetActiveSheet as CommandHandler);
  registry.set('spreadsheet:setSelection', handleSetSelection as CommandHandler);
  registry.set('spreadsheet:selectAll', handleSelectAll as CommandHandler);
  registry.set('spreadsheet:selectRow', handleSelectRow as CommandHandler);
  registry.set('spreadsheet:selectColumn', handleSelectColumn as CommandHandler);
}
