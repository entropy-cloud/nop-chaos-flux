// @vitest-environment happy-dom

import { Profiler } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  equalSpreadsheetPageSnapshot,
  selectSpreadsheetPageSnapshot,
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

describe('spreadsheet page snapshot selector', () => {
  it('skips rerenders when unrelated runtime fields change', () => {
    const document = createEmptyDocument('spreadsheet-selector-test');
    const activeSheet = document.workbook.sheets[0];
    const baseSnapshot = {
      document,
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
        selectSpreadsheetPageSnapshot,
        equalSpreadsheetPageSnapshot,
      );
      return <span data-testid="spreadsheet-dirty">{String(snapshot.dirty)}</span>;
    }

    render(
      <Profiler
        id="spreadsheet-page-probe"
        onRender={() => {
          renderCount += 1;
        }}
      >
        <Probe />
      </Profiler>,
    );
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('spreadsheet-dirty').textContent).toBe('false');

    act(() => {
      store.update({ ...baseSnapshot, transientRevision: 1 });
    });

    expect(renderCount).toBe(1);

    act(() => {
      store.update({ ...baseSnapshot, dirty: true });
    });

    expect(renderCount).toBe(2);
    expect(screen.getByTestId('spreadsheet-dirty').textContent).toBe('true');
  });
});
