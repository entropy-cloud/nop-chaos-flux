import type { SpreadsheetCommand, SpreadsheetCommandResult } from '../commands.js';
import type { SpreadsheetInternalState } from '../core/internal-state.js';

export interface SpreadsheetDispatchStore {
  getState: () => SpreadsheetInternalState;
  setState: (
    update:
      | Partial<SpreadsheetInternalState>
      | ((s: SpreadsheetInternalState) => SpreadsheetInternalState),
  ) => void;
}

export type CommandHandler<T extends SpreadsheetCommand = SpreadsheetCommand> = (
  store: SpreadsheetDispatchStore,
  command: T,
) => SpreadsheetCommandResult | Promise<SpreadsheetCommandResult>;

export type CommandHandlerRegistry = Map<string, CommandHandler>;
