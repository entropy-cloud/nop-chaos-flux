import { describe, expect, it, beforeEach } from 'vitest';
import { READ_ONLY_COMMANDS } from '../command-handlers/index.js';
import { createEmptyDocument, createSpreadsheetCore } from '../index.js';
import type { SpreadsheetCommand, SpreadsheetCore } from '../index.js';

/**
 * plan 598 (CX-18) Phase 1 pin: the readonly command gate. G4 retypes
 * READ_ONLY_COMMANDS from Set<string> to Set<SpreadsheetCommand['type']>
 * (compile-verified drift guard, mirrored on report's MUTATION_COMMAND_TYPES);
 * behavior must not change. Undo/redo are deliberately NOT whitelisted — they
 * modify history and are rejected in readonly mode.
 */

const coreHolder: { current: SpreadsheetCore } = { current: undefined as unknown as SpreadsheetCore };
const sheetIdHolder: { current: string } = { current: undefined as unknown as string };

beforeEach(() => {
  const doc = createEmptyDocument('cx18-readonly-gate');
  sheetIdHolder.current = doc.workbook.sheets[0].id;
  coreHolder.current = createSpreadsheetCore({ document: doc, readonly: true });
});

const WHITELIST_COMMANDS = [
  'spreadsheet:setActiveSheet',
  'spreadsheet:setSelection',
  'spreadsheet:setViewport',
  'spreadsheet:copyCells',
  'spreadsheet:selectAll',
  'spreadsheet:selectRow',
  'spreadsheet:selectColumn',
  'spreadsheet:find',
  'spreadsheet:findNext',
] as const;

function whitelistPayload(type: (typeof WHITELIST_COMMANDS)[number]): SpreadsheetCommand {
  switch (type) {
    case 'spreadsheet:setActiveSheet':
      return { type, sheetId: sheetIdHolder.current };
    case 'spreadsheet:setSelection':
      return { type, selection: { kind: 'none' } };
    case 'spreadsheet:setViewport':
      return { type, viewport: { scrollX: 0, scrollY: 0, zoom: 1 } };
    case 'spreadsheet:copyCells':
      return { type, range: { sheetId: sheetIdHolder.current, startRow: 0, startCol: 0, endRow: 1, endCol: 1 } };
    case 'spreadsheet:selectAll':
      return { type, sheetId: sheetIdHolder.current };
    case 'spreadsheet:selectRow':
      return { type, sheetId: sheetIdHolder.current, row: 0 };
    case 'spreadsheet:selectColumn':
      return { type, sheetId: sheetIdHolder.current, col: 0 };
    case 'spreadsheet:find':
      return { type, options: { query: 'x' } };
    case 'spreadsheet:findNext':
      return { type, options: { query: 'x' } };
  }
}

describe('readonly command gate pin (plan 598 G4)', () => {
  it('whitelists exactly the 9 view-safe commands', () => {
    expect([...READ_ONLY_COMMANDS].sort()).toEqual([...WHITELIST_COMMANDS].sort());
    expect(READ_ONLY_COMMANDS.size).toBe(9);
  });

  it('accepts every whitelisted command in readonly mode (gate does not reject)', async () => {
    for (const type of WHITELIST_COMMANDS) {
      const result = await coreHolder.current.dispatch(whitelistPayload(type));
      expect(result.error, `${type} must pass the readonly gate`).not.toBe('Document is readonly');
    }
  });

  it('rejects document mutations in readonly mode with the gate error text', async () => {
    const mutation = await coreHolder.current.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId: sheetIdHolder.current, address: 'A1', row: 0, col: 0 },
      value: 'x',
    });
    expect(mutation).toEqual({ ok: false, changed: false, error: 'Document is readonly' });

    const merge = await coreHolder.current.dispatch({
      type: 'spreadsheet:mergeRange',
      range: { sheetId: sheetIdHolder.current, startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
    });
    expect(merge).toEqual({ ok: false, changed: false, error: 'Document is readonly' });
  });

  it('rejects undo/redo in readonly mode (history-modifying commands are not view-safe)', async () => {
    const undo = await coreHolder.current.dispatch({ type: 'spreadsheet:undo' });
    expect(undo).toEqual({ ok: false, changed: false, error: 'Document is readonly' });

    const redo = await coreHolder.current.dispatch({ type: 'spreadsheet:redo' });
    expect(redo).toEqual({ ok: false, changed: false, error: 'Document is readonly' });
  });

  it('gate precedes handler lookup: unknown commands get the gate error in readonly mode', async () => {
    const unknown = await coreHolder.current.dispatch({
      type: 'spreadsheet:nonexistent',
    } as unknown as SpreadsheetCommand);
    expect(unknown).toEqual({ ok: false, changed: false, error: 'Document is readonly' });
  });
});
