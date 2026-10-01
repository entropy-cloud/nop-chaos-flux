import { recalcDocument } from './formula/recalc-document.js';
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
  command: SpreadsheetCommand,
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
    const result = await handler(store, command);
    // 全量重算（ux-r4）：文档变更命令后重算公式（含 undo/redo 恢复后的自洽）。
    // recalcDocument 值无变化时返回原引用，不产生额外 setState。
    if (result.ok && result.changed) {
      const nextState = store.getState();
      const nextDoc = recalcDocument(nextState.document);
      if (nextDoc !== nextState.document) {
        store.setState({ document: nextDoc });
      }
    }
    return result;
  } catch (err) {
    return { ok: false, changed: false, error: err };
  }
}
