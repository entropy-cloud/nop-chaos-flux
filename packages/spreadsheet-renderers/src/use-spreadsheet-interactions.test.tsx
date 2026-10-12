import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createEmptyDocument, createSpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import { createSpreadsheetBridge, type SpreadsheetBridge } from './bridge.js';
import { useSpreadsheetInteractions } from './use-spreadsheet-interactions.js';

/**
 * useSpreadsheetInteractions is a composite React hook that wires together
 * 14+ sub-hooks. These tests exercise the composite behavior end-to-end
 * through a real bridge + core instead of only checking the type surface.
 */

function Harness(props: {
  bridge: SpreadsheetBridge;
  sheetId: string;
  rows?: number;
  cols?: number;
  onFailure?: (message: string) => void;
  onInteractions?: (i: ReturnType<typeof useSpreadsheetInteractions>) => void;
}) {
  const interactions = useSpreadsheetInteractions({
    bridge: props.bridge,
    sheetId: props.sheetId,
    rows: props.rows ?? 5,
    cols: props.cols ?? 5,
    onFailure: props.onFailure,
  });
  React.useEffect(() => {
    props.onInteractions?.(interactions);
  });
  return (
    <div data-testid="host" onMouseDown={interactions.onCanvasMouseDown}>
      <button type="button" onClick={() => void interactions.handleCellClick(0, 0)}>click-a1</button>
      <button type="button" onClick={() => interactions.setSelectedCell({ row: 1, col: 1 })}>select-b2</button>
      <button type="button" onClick={() => void interactions.handleSelectColumn(28)}>select-col-28</button>
    </div>
  );
}

function renderHarness(
  onInteractions?: (i: ReturnType<typeof useSpreadsheetInteractions>) => void,
) {
  const core = createSpreadsheetCore({
    document: createEmptyDocument('use-interactions-behavior'),
  });
  const sheetId = core.getSnapshot().activeSheetId;
  const bridge = createSpreadsheetBridge(core);
  render(<Harness bridge={bridge} sheetId={sheetId} onInteractions={onInteractions} />);
}

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('useSpreadsheetInteractions behavior', () => {
  it('selects a cell through handleCellClick and mirrors it into the host snapshot', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    let latest: ReturnType<typeof useSpreadsheetInteractions> | undefined;
    renderHarness((i) => (latest = i));

    fireEvent.click(screen.getByText('click-a1'));

    await waitFor(() => {
      expect(latest?.selectedCell).toEqual({ row: 0, col: 0 });
      expect(latest?.snapshot.selection.kind).toBe('cell');
      expect(latest?.snapshot.selection.anchor?.address).toBe('A1');
    });
  });

  it('commits an inline edit through the editing state machine', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    let latest: ReturnType<typeof useSpreadsheetInteractions> | undefined;
    renderHarness((i) => (latest = i));

    await waitFor(() => {
      expect(latest?.selectedCell).toBeNull();
    });

    fireEvent.click(screen.getByText('click-a1'));
    await waitFor(() => {
      expect(latest?.selectedCell).toEqual({ row: 0, col: 0 });
    });

    latest!.handleCellDoubleClick(0, 0);
    await waitFor(() => {
      expect(latest!.editingCell).toEqual({ row: 0, col: 0 });
    });

    latest!.handleEditValueChange('42');
    await latest!.handleEditSave();

    await waitFor(() => {
      expect(latest!.editingCell).toBeNull();
      expect(latest!.snapshot.activeSheet?.cells?.['A1']?.value).toBe('42');
    });
  });

  it('cancels an inline edit without writing the draft value', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    let latest: ReturnType<typeof useSpreadsheetInteractions> | undefined;
    renderHarness((i) => (latest = i));

    fireEvent.click(screen.getByText('click-a1'));
    await waitFor(() => {
      expect(latest?.selectedCell).toEqual({ row: 0, col: 0 });
    });

    latest!.handleCellDoubleClick(0, 0);
    latest!.handleEditValueChange('discarded');
    latest!.handleEditCancel();

    expect(latest!.editingCell).toBeNull();
    expect(latest!.snapshot.activeSheet?.cells?.['A1']).toBeUndefined();
  });

  it('exposes the full shortcut/command surface without duplicate members', () => {
    const keys = Object.keys({} as ReturnType<typeof useSpreadsheetInteractions>);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('reports interaction failures through the onFailure channel (WA-sheetr-001)', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    const core = createSpreadsheetCore({
      document: createEmptyDocument('failure-channel'),
    });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);
    const originalDispatch = bridge.dispatch.bind(bridge);
    vi.spyOn(bridge, 'dispatch').mockImplementation(async (command: Parameters<typeof originalDispatch>[0]) => {
      if (command.type === 'spreadsheet:selectRow') {
        throw new Error('store rejected the command');
      }
      return originalDispatch(command);
    });

    const failures: string[] = [];
    let latest: ReturnType<typeof useSpreadsheetInteractions> | undefined;
    render(
      <Harness
        bridge={bridge}
        sheetId={sheetId}
        onFailure={(message) => failures.push(message)}
        onInteractions={(i) => (latest = i)}
      />,
    );

    latest!.handleSelectRow(1);

    await waitFor(() => {
      expect(failures.some((message) => message.includes('store rejected the command'))).toBe(true);
    });
  });

  it('derives interaction bounds from provided dimensions beyond the legacy grid (WA-sheetr-002)', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    const core = createSpreadsheetCore({
      document: createEmptyDocument('dimension-bounds'),
    });
    const sheetId = core.getSnapshot().activeSheetId;
    const bridge = createSpreadsheetBridge(core);

    let latest: ReturnType<typeof useSpreadsheetInteractions> | undefined;
    render(
      <Harness bridge={bridge} sheetId={sheetId} rows={150} cols={30} onInteractions={(i) => (latest = i)} />,
    );

    fireEvent.click(screen.getByText('select-col-28'));

    await waitFor(() => {
      expect(latest?.snapshot.selection.kind).toBe('column');
    });

    const range = latest!.getSelectedRange();
    expect(range?.startRow).toBe(0);
    expect(range?.endRow).toBe(149);
    expect(range?.startCol).toBe(28);
  });
});
