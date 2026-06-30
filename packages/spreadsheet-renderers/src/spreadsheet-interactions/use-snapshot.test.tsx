import React, { Profiler } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import { createSpreadsheetBridge } from '../bridge.js';
import { useSnapshotSelector } from './use-snapshot.js';

describe('spreadsheet snapshot selector', () => {
  it('skips rerenders when unrelated selection state changes', async () => {
    const documentModel = createEmptyDocument('snapshot-selector');
    const core = createSpreadsheetCore({ document: documentModel });
    const bridge = createSpreadsheetBridge(core);
    const sheetId = core.getSnapshot().activeSheetId;
    let renderCount = 0;

    function Probe() {
      const dirty = useSnapshotSelector(bridge, (snapshot) => snapshot.runtime.dirty);
      return <span data-testid="spreadsheet-dirty-probe">{String(dirty)}</span>;
    }

    render(
      <Profiler id="spreadsheet-snapshot-selector" onRender={() => {
        renderCount += 1;
      }}>
        <Probe />
      </Profiler>,
    );

    expect(renderCount).toBe(1);
    expect(screen.getByTestId('spreadsheet-dirty-probe').textContent).toBe('false');

    await act(async () => {
      await core.dispatch({
        type: 'spreadsheet:setSelection',
        selection: {
          kind: 'cell',
          sheetId,
          anchor: { sheetId, address: 'A1', row: 0, col: 0 },
        },
      });
    });

    expect(renderCount).toBe(1);

    await act(async () => {
      await core.dispatch({
        type: 'spreadsheet:setCellValue',
        cell: { sheetId, address: 'A1', row: 0, col: 0 },
        value: 'updated',
      });
    });

    expect(renderCount).toBe(2);
    expect(screen.getByTestId('spreadsheet-dirty-probe').textContent).toBe('true');
  });
});
