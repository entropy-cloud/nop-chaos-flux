import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSheetCommands } from './use-sheet-commands.js';

function createSnapshot() {
  return {
    workbook: {
      sheets: [{ id: 'sheet-1', name: 'Sheet1' }],
    },
    activeSheet: {
      id: 'sheet-1',
      merges: [],
    },
  } as any;
}

function createBridge(dispatch: ReturnType<typeof vi.fn>) {
  return {
    dispatch,
  } as any;
}

describe('useSheetCommands', () => {
  it('reports resolved cancelled and failed undo results honestly', async () => {
    const dispatch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, cancelled: true })
      .mockResolvedValueOnce({ ok: false, error: new Error('Undo failed softly') });
    const addLog = vi.fn();

    const { result } = renderHook(() =>
      useSheetCommands(
        createSnapshot(),
        createBridge(dispatch),
        'sheet-1',
        { row: 0, col: 0 },
        () => null,
        addLog,
      ),
    );

    await act(async () => {
      await result.current.handleUndo();
    });
    await act(async () => {
      await result.current.handleUndo();
    });

    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'spreadsheet:undo' });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'spreadsheet:undo' });
    expect(addLog).toHaveBeenNthCalledWith(1, 'Undo cancelled');
    expect(addLog).toHaveBeenNthCalledWith(2, 'Undo failed softly');
  });

  it('reports resolved cancelled and successful redo results honestly', async () => {
    const dispatch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, cancelled: true })
      .mockResolvedValueOnce({ ok: true });
    const addLog = vi.fn();

    const { result } = renderHook(() =>
      useSheetCommands(
        createSnapshot(),
        createBridge(dispatch),
        'sheet-1',
        { row: 0, col: 0 },
        () => null,
        addLog,
      ),
    );

    await act(async () => {
      await result.current.handleRedo();
    });
    await act(async () => {
      await result.current.handleRedo();
    });

    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'spreadsheet:redo' });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'spreadsheet:redo' });
    expect(addLog).toHaveBeenNthCalledWith(1, 'Redo cancelled');
    expect(addLog).toHaveBeenNthCalledWith(2, 'Redo');
  });
});
