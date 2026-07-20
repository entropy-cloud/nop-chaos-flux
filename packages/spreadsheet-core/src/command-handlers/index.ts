import type { CommandHandler, CommandHandlerRegistry } from './types.js';
import { registerCellHandlers } from './cell-handlers.js';
import { registerClipboardHandlers } from './clipboard-handlers.js';
import { registerSheetHandlers } from './sheet-handlers.js';
import { registerStructureHandlers } from './structure-handlers.js';
import { registerSearchHandlers } from './search-handlers.js';
import { registerSelectionHandlers } from './selection-handlers.js';
import { registerHistoryHandlers } from './history-handlers.js';

export type { CommandHandler, CommandHandlerRegistry, SpreadsheetDispatchStore } from './types.js';

export function createCommandHandlerRegistry(): CommandHandlerRegistry {
  const registry = new Map<string, CommandHandler>();

  registerCellHandlers(registry);
  registerClipboardHandlers(registry);
  registerSheetHandlers(registry);
  registerStructureHandlers(registry);
  registerSearchHandlers(registry);
  registerSelectionHandlers(registry);
  registerHistoryHandlers(registry);

  return registry;
}

// View-safe commands whitelist — only these commands are allowed in readonly mode.
// Commands that mutate state (including undo/redo, which modify history) are rejected.
export const READ_ONLY_COMMANDS = new Set([
  'spreadsheet:setActiveSheet',
  'spreadsheet:setSelection',
  'spreadsheet:copyCells',
  'spreadsheet:selectAll',
  'spreadsheet:selectRow',
  'spreadsheet:selectColumn',
  'spreadsheet:find',
  'spreadsheet:findNext',
]);
