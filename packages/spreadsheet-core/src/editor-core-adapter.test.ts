import { beforeEach, describe, expect, it } from 'vitest';
import { clearEditorDomains, getEditorDomain } from '@nop-chaos/editor-core';
import {
  SPREADSHEET_DOMAIN_COMMANDS,
  SPREADSHEET_DOMAIN_KIND,
  createSpreadsheetDomainAdapter,
  hasSpreadsheetDocChanges,
  registerSpreadsheetDomain,
} from './editor-core-adapter.js';
import { commandHandlers } from './core-dispatch.js';
import { createSpreadsheetCore } from './core.js';
import type { SpreadsheetDocument } from './types.js';

function makeDoc(cellValue: string): SpreadsheetDocument {
  return {
    workbook: {
      sheets: [
        {
          id: 's1',
          name: 'Sheet1',
          rows: 20,
          cols: 10,
          cells: { A1: { value: cellValue } },
        },
      ],
    },
  } as unknown as SpreadsheetDocument;
}

beforeEach(() => {
  clearEditorDomains();
});

describe('spreadsheet domain adapter (editor-core contract)', () => {
  it('kind is spreadsheet and domainCommands equals the dispatch registry key set', () => {
    const adapter = createSpreadsheetDomainAdapter(makeDoc('x'));
    expect(adapter.kind).toBe(SPREADSHEET_DOMAIN_KIND);
    expect([...SPREADSHEET_DOMAIN_COMMANDS].sort()).toEqual([...commandHandlers.keys()].sort());
    expect(SPREADSHEET_DOMAIN_COMMANDS.length).toBeGreaterThan(0);
  });

  it('diff returns null when structurally identical, next snapshot otherwise', () => {
    const adapter = createSpreadsheetDomainAdapter(makeDoc('x'));
    const a = makeDoc('x');
    const b = makeDoc('y');
    expect(adapter.diff(a, a)).toBeNull();
    expect(adapter.diff(a, b)).toEqual(b);
  });

  it('hasSpreadsheetDocChanges matches diff nullability', () => {
    const a = makeDoc('x');
    const b = makeDoc('y');
    expect(hasSpreadsheetDocChanges(a, a)).toBe(false);
    expect(hasSpreadsheetDocChanges(a, b)).toBe(true);
  });

  it('applyDiff round-trips snapshot pairs symmetrically', () => {
    const adapter = createSpreadsheetDomainAdapter(makeDoc('x'));
    const a = makeDoc('x');
    const b = makeDoc('y');
    const forward = adapter.diff(a, b)!;
    const inverse = adapter.diff(b, a)!;
    expect(adapter.applyDiff(a, forward)).toEqual(b);
    expect(adapter.applyDiff(adapter.applyDiff(a, forward), inverse)).toEqual(a);
  });

  it('serialize/validate delegate (JSON stringify / always-ok baseline)', () => {
    const doc = makeDoc('x');
    const adapter = createSpreadsheetDomainAdapter(doc);
    expect(JSON.parse(adapter.serialize(doc))).toEqual(doc);
    expect(adapter.validate(doc).ok).toBe(true);
  });
});

describe('registerSpreadsheetDomain (editor-core domain registry)', () => {
  it('registers kind spreadsheet retrievable via getEditorDomain', () => {
    const initial = makeDoc('seed');
    registerSpreadsheetDomain(initial);
    const domain = getEditorDomain(SPREADSHEET_DOMAIN_KIND);
    expect(domain).toBeDefined();
    expect(domain!.load()).toEqual(initial);
    expect(domain!.domainCommands!.length).toBe(commandHandlers.size);
  });

  it('re-registration overwrites (editor-core.md §3 ruling)', () => {
    registerSpreadsheetDomain(makeDoc('a'));
    registerSpreadsheetDomain(makeDoc('b'));
    expect(getEditorDomain(SPREADSHEET_DOMAIN_KIND)!.load()).toEqual(makeDoc('b'));
  });
});

describe('mid-transaction undo/redo operation-time semantics (P1.2 pin)', () => {
  it('redo after in-transaction drift restores the undo-time document (array-stack parity)', async () => {
    const core = createSpreadsheetCore({ document: makeDoc('A') });
    const cellA1 = (): unknown => {
      const doc = core.exportDocument();
      const sheet = doc.workbook.sheets?.[0];
      return sheet?.cells?.A1?.value;
    };
    const setCell = async (v: string) => {
      await core.dispatch({
        type: 'spreadsheet:setCellValue',
        cell: { sheetId: 's1', row: 0, col: 0 },
        value: v,
      } as never);
    };
    await setCell('B'); // A → B (one undo entry)
    await core.dispatch({ type: 'spreadsheet:beginTransaction' } as never);
    await setCell('C'); // in-transaction B → C (no push, document drifts)
    await core.dispatch({ type: 'spreadsheet:undo' } as never); // restores A (the only undo entry)
    expect(cellA1()).toBe('A');
    await core.dispatch({ type: 'spreadsheet:redo' } as never); // must restore C (doc at undo time), not the push-time snapshot
    expect(cellA1()).toBe('C');
  });
});
