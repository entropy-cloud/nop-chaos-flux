// @vitest-environment happy-dom

import { Profiler } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import { createReportTemplateDocument } from '@nop-chaos/report-designer-core';
import {
  equalReportPageSnapshot,
  equalReportSpreadsheetSnapshot,
  equalReportSpreadsheetRuntimeSnapshot,
  selectReportPageSnapshot,
  selectReportSpreadsheetSnapshot,
  selectReportSpreadsheetRuntimeSnapshot,
} from './page-renderer.js';

function createStore<T>(initial: T) {
  let current = initial;
  const listeners = new Set<() => void>();

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return current;
    },
    update(next: T) {
      current = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe('report-designer page snapshot selectors', () => {
  it('skips rerenders when unrelated report snapshot fields change', () => {
    const spreadsheet = createEmptyDocument('report-selector-test');
    const document = createReportTemplateDocument(spreadsheet, 'Selector Report');
    const baseSnapshot = {
      document,
      spreadsheetSyncSource: undefined,
      dirty: false,
      canUndo: false,
      canRedo: false,
      selectionTarget: { kind: 'sheet' },
      inspector: { open: false },
      fieldDrag: null,
      preview: { running: false },
      activeMeta: null,
      fieldSources: [],
      transientRevision: 0,
    } as any;
    const store = createStore(baseSnapshot);
    let renderCount = 0;

    function Probe() {
      const snapshot = useSyncExternalStoreWithSelector(
        store.subscribe,
        store.getSnapshot,
        store.getSnapshot,
        selectReportPageSnapshot,
        equalReportPageSnapshot,
      );
      return <span data-testid="report-dirty">{String(snapshot.dirty)}</span>;
    }

    render(
      <Profiler
        id="report-page-probe"
        onRender={() => {
          renderCount += 1;
        }}
      >
        <Probe />
      </Profiler>,
    );
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('report-dirty').textContent).toBe('false');

    act(() => {
      store.update({ ...baseSnapshot, transientRevision: 1 });
    });

    expect(renderCount).toBe(1);

    act(() => {
      store.update({ ...baseSnapshot, dirty: true });
    });

    expect(renderCount).toBe(2);
    expect(screen.getByTestId('report-dirty').textContent).toBe('true');

    act(() => {
      store.update({ ...baseSnapshot, spreadsheetSyncSource: spreadsheet });
    });

    expect(renderCount).toBe(3);
  });

  it('skips rerenders when unrelated embedded spreadsheet fields change', () => {
    const spreadsheet = createEmptyDocument('report-spreadsheet-selector-test');
    const activeSheet = spreadsheet.workbook.sheets[0];
    const baseSnapshot = {
      document: spreadsheet,
      activeSheetId: activeSheet.id,
      activeSheet,
      selection: { kind: 'sheet', sheetId: activeSheet.id },
      history: { canUndo: false, canRedo: false },
      dirty: false,
      readonly: false,
      viewport: { zoom: 1 },
      layout: { visibleRange: { sheetId: activeSheet.id, startRow: 0, startCol: 0, endRow: 10, endCol: 10 } },
      transientRevision: 0,
    } as any;
    const store = createStore(baseSnapshot);
    let renderCount = 0;

    function Probe() {
      const snapshot = useSyncExternalStoreWithSelector(
        store.subscribe,
        store.getSnapshot,
        store.getSnapshot,
        selectReportSpreadsheetSnapshot,
        equalReportSpreadsheetSnapshot,
      );
      return <span data-testid="report-sheet-readonly">{String(snapshot.readonly)}</span>;
    }

    render(
      <Profiler
        id="report-spreadsheet-probe"
        onRender={() => {
          renderCount += 1;
        }}
      >
        <Probe />
      </Profiler>,
    );
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('report-sheet-readonly').textContent).toBe('false');

    act(() => {
      store.update({ ...baseSnapshot, transientRevision: 1 });
    });

    expect(renderCount).toBe(1);

    act(() => {
      store.update({ ...baseSnapshot, readonly: true });
    });

    expect(renderCount).toBe(2);
    expect(screen.getByTestId('report-sheet-readonly').textContent).toBe('true');
  });

  it('keeps report shell spreadsheet selector stable across selection and viewport churn', () => {
    const spreadsheet = createEmptyDocument('report-spreadsheet-runtime-selector-test');
    const activeSheet = spreadsheet.workbook.sheets[0];
    const baseSnapshot = {
      document: spreadsheet,
      activeSheetId: activeSheet.id,
      activeSheet,
      selection: { kind: 'sheet', sheetId: activeSheet.id },
      history: { canUndo: false, canRedo: false },
      dirty: false,
      readonly: false,
      viewport: { zoom: 1, scrollX: 0, scrollY: 0 },
      layout: { visibleRange: { sheetId: activeSheet.id, startRow: 0, startCol: 0, endRow: 10, endCol: 10 } },
    } as any;
    const store = createStore(baseSnapshot);
    let renderCount = 0;

    function Probe() {
      const snapshot = useSyncExternalStoreWithSelector(
        store.subscribe,
        store.getSnapshot,
        store.getSnapshot,
        selectReportSpreadsheetRuntimeSnapshot,
        equalReportSpreadsheetRuntimeSnapshot,
      );
      return <span data-testid="report-sheet-dirty">{String(snapshot.dirty)}</span>;
    }

    render(
      <Profiler
        id="report-spreadsheet-runtime-probe"
        onRender={() => {
          renderCount += 1;
        }}
      >
        <Probe />
      </Profiler>,
    );
    expect(renderCount).toBe(1);

    act(() => {
      store.update({
        ...baseSnapshot,
        selection: {
          kind: 'cell',
          sheetId: activeSheet.id,
          anchor: { sheetId: activeSheet.id, address: 'A1', row: 0, col: 0 },
        },
      });
    });

    act(() => {
      store.update({
        ...baseSnapshot,
        viewport: { zoom: 1, scrollX: 120, scrollY: 240 },
      });
    });

    act(() => {
      store.update({
        ...baseSnapshot,
        layout: {
          visibleRange: { sheetId: activeSheet.id, startRow: 10, startCol: 0, endRow: 20, endCol: 10 },
        },
      });
    });

    expect(renderCount).toBe(1);

    act(() => {
      store.update({
        ...baseSnapshot,
        history: { canUndo: true, canRedo: false },
      });
    });

    expect(renderCount).toBe(2);
  });
});
