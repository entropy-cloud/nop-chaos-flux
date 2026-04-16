import type { SpreadsheetCommand, SpreadsheetCommandResult } from './commands.js';
import {
  createCommandHandlerRegistry,
  READ_ONLY_COMMANDS,
  type SpreadsheetDispatchStore,
} from './command-handlers/index.js';

export type { SpreadsheetDispatchStore } from './command-handlers/index.js';

const commandHandlers = createCommandHandlerRegistry();

export async function dispatchSpreadsheetCommand(
  store: SpreadsheetDispatchStore,
  command: SpreadsheetCommand
): Promise<SpreadsheetCommandResult> {
  const state = store.getState();

  if (state.readonly && !READ_ONLY_COMMANDS.has(command.type)) {
    return { ok: false, changed: false, error: 'Document is readonly' };
  }

  const handler = commandHandlers.get(command.type);
  if (!handler) {
    return { ok: false, changed: false, error: `Unknown command: ${command.type}` };
  }

  try {
    return await handler(store, command);
  } catch (err) {
    return { ok: false, changed: false, error: err };
  }
}
