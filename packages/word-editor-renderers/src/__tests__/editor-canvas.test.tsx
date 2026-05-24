// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { EditorCanvas } from '../editor-canvas.js';

const mockedCore = vi.hoisted(() => ({
  createSavedDocumentDataMock: vi.fn((value) => ({
    ...value,
    savedAt: '2026-05-02T00:00:00.000Z',
  })),
  captureDocumentSnapshotMock: vi.fn(() => ({
    data: {
      header: [],
      main: [{ value: 'draft' }],
      footer: [],
      charts: [],
      codes: [],
    },
    paperSettings: {
      width: 595,
      height: 842,
      direction: 'vertical',
      margins: [100, 120, 100, 120],
    },
    savedAt: '2026-05-02T00:00:00.000Z',
  })),
}));

vi.mock('@nop-chaos/word-editor-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/word-editor-core')>();
  return {
    ...actual,
    createSavedDocumentData: mockedCore.createSavedDocumentDataMock,
    captureDocumentSnapshot: mockedCore.captureDocumentSnapshotMock,
  };
});

describe('EditorCanvas', () => {
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      configurable: true,
    });
    mockedCore.createSavedDocumentDataMock.mockClear();
    mockedCore.captureDocumentSnapshotMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalLocalStorage) {
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
      });
      return;
    }

    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('autosaves from the live canvas snapshot and store-owned paper settings', async () => {
    let onContentChange: (() => void) | undefined;
    const bridge = {
      mount: vi.fn((_container, _editorData, callbacks) => {
        onContentChange = callbacks.onContentChange;
      }),
      unmount: vi.fn(),
      getValue: vi.fn(() => ({ data: { header: [], main: [{ value: 'draft' }], footer: [] } })),
      getPaperSettings: vi.fn(() => null),
      getWordCount: vi.fn(() => Promise.resolve(0)),
    };
    const editorStore = {
      setDirty: vi.fn(),
      setBridge: vi.fn(),
      setReady: vi.fn(),
      setPaperSettings: vi.fn(),
      setWordCount: vi.fn(),
      setSelection: vi.fn(),
      setTotalPages: vi.fn(),
      setScale: vi.fn(),
      getState: vi.fn(() => ({
        paperSettings: { width: 1000, height: 700, direction: 'horizontal', margins: [1, 2, 3, 4] },
      })),
    };
    const autosaveSpy = vi.fn();

    render(
      <EditorCanvas
        editorStore={editorStore as any}
        bridge={bridge as any}
        initialDocument={{
          header: [],
          main: [],
          footer: [],
          charts: [{ id: 'initial-chart', chartName: 'Initial' } as any],
          codes: [{ id: 'initial-code', codeName: 'Initial' } as any],
        }}
        charts={[{ id: 'live-chart', chartName: 'Live' } as any]}
        codes={[{ id: 'live-code', codeName: 'Live' } as any]}
        onAutosave={autosaveSpy}
      />,
    );

    onContentChange?.();
    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();

    expect(mockedCore.captureDocumentSnapshotMock).toHaveBeenCalledWith(
      bridge,
      expect.objectContaining({
        paperSettings: { width: 1000, height: 700, direction: 'horizontal', margins: [1, 2, 3, 4] },
      }),
    );
    expect(autosaveSpy).toHaveBeenCalledTimes(1);
    expect(editorStore.setDirty).toHaveBeenCalledWith(true);
    expect(editorStore.setDirty.mock.calls.at(-1)).toEqual([true]);
  });

  it('does not remount the editor bridge when charts and codes props change', async () => {
    const bridge = {
      mount: vi.fn(),
      unmount: vi.fn(),
      getValue: vi.fn(() => ({ data: { header: [], main: [{ value: 'draft' }], footer: [] } })),
      getPaperSettings: vi.fn(() => null),
      getWordCount: vi.fn(() => Promise.resolve(0)),
    };
    const editorStore = {
      setDirty: vi.fn(),
      setBridge: vi.fn(),
      setReady: vi.fn(),
      setPaperSettings: vi.fn(),
      setWordCount: vi.fn(),
      setSelection: vi.fn(),
      setTotalPages: vi.fn(),
      setScale: vi.fn(),
      getState: vi.fn(() => ({
        paperSettings: { width: 595, height: 842, direction: 'vertical', margins: [100, 120, 100, 120] },
      })),
    };

    const { rerender } = render(
      <EditorCanvas
        editorStore={editorStore as any}
        bridge={bridge as any}
        charts={[{ id: 'chart-1', chartName: 'One' } as any]}
        codes={[{ id: 'code-1', codeName: 'One' } as any]}
      />,
    );

    expect(bridge.mount).toHaveBeenCalledTimes(1);
    expect(bridge.unmount).not.toHaveBeenCalled();

    rerender(
      <EditorCanvas
        editorStore={editorStore as any}
        bridge={bridge as any}
        charts={[{ id: 'chart-2', chartName: 'Two' } as any]}
        codes={[{ id: 'code-2', codeName: 'Two' } as any]}
      />,
    );

    expect(bridge.mount).toHaveBeenCalledTimes(1);
    expect(bridge.unmount).not.toHaveBeenCalled();
  });

  it('writes superscript and subscript from range-style changes into selection state', () => {
    let callbacks:
      | {
          onRangeStyleChange?: (payload: Record<string, unknown>) => void;
        }
      | undefined;
    const bridge = {
      mount: vi.fn((_container, _editorData, nextCallbacks) => {
        callbacks = nextCallbacks;
      }),
      unmount: vi.fn(),
      getValue: vi.fn(() => ({ data: { header: [], main: [], footer: [] } })),
      getPaperSettings: vi.fn(() => null),
      getWordCount: vi.fn(() => Promise.resolve(0)),
    };
    const editorStore = {
      setDirty: vi.fn(),
      setBridge: vi.fn(),
      setReady: vi.fn(),
      setPaperSettings: vi.fn(),
      setWordCount: vi.fn(),
      setSelection: vi.fn(),
      setTotalPages: vi.fn(),
      setScale: vi.fn(),
      getState: vi.fn(() => ({
        paperSettings: { width: 595, height: 842, direction: 'vertical', margins: [100, 120, 100, 120] },
      })),
    };

    render(<EditorCanvas editorStore={editorStore as any} bridge={bridge as any} />);

    callbacks?.onRangeStyleChange?.({
      bold: false,
      italic: false,
      underline: false,
      strikeout: false,
      superscript: true,
      subscript: true,
      font: null,
      size: 16,
      color: null,
      highlight: null,
      rowMargin: 0,
      undo: false,
      redo: false,
    });

    expect(editorStore.setSelection).toHaveBeenCalledWith(
      expect.objectContaining({ superscript: true, subscript: true }),
    );
  });

  it('prefers recovered persisted documents over schema initialDocument', () => {
    const bridge = {
      mount: vi.fn(),
      unmount: vi.fn(),
      getValue: vi.fn(() => ({ data: { header: [], main: [], footer: [] } })),
      getPaperSettings: vi.fn(() => null),
      getWordCount: vi.fn(() => Promise.resolve(0)),
    };
    const editorStore = {
      setDirty: vi.fn(),
      setBridge: vi.fn(),
      setReady: vi.fn(),
      setPaperSettings: vi.fn(),
      setWordCount: vi.fn(),
      setSelection: vi.fn(),
      setTotalPages: vi.fn(),
      setScale: vi.fn(),
      getState: vi.fn(() => ({
        paperSettings: { width: 595, height: 842, direction: 'vertical', margins: [100, 120, 100, 120] },
      })),
    };

    render(
      <EditorCanvas
        editorStore={editorStore as any}
        bridge={bridge as any}
        initialDocument={{
          header: [],
          main: [{ value: 'schema-seed' }],
          footer: [],
        }}
        recoveredDocument={{
          data: {
            header: [],
            main: [{ value: 'persisted-doc' }],
            footer: [],
            charts: [],
            codes: [],
          },
          paperSettings: {
            width: 595,
            height: 842,
            direction: 'vertical',
            margins: [100, 120, 100, 120],
          },
          savedAt: '2026-05-07T00:00:00.000Z',
        }}
      />,
    );

    expect(bridge.mount).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({ main: [{ value: 'persisted-doc' }] }),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('does not write autosave snapshots directly to localStorage on each content change', async () => {
    let onContentChange: (() => void) | undefined;
    const bridge = {
      mount: vi.fn((_container, _editorData, callbacks) => {
        onContentChange = callbacks.onContentChange;
      }),
      unmount: vi.fn(),
      getValue: vi.fn(() => ({ data: { header: [], main: [{ value: 'draft' }], footer: [] } })),
      getPaperSettings: vi.fn(() => null),
      getWordCount: vi.fn(() => Promise.resolve(0)),
      command: {
        executeAddWatermark: vi.fn(),
      },
    };
    const editorStore = {
      setDirty: vi.fn(),
      setBridge: vi.fn(),
      setReady: vi.fn(),
      setPaperSettings: vi.fn(),
      setWordCount: vi.fn(),
      setSelection: vi.fn(),
      setTotalPages: vi.fn(),
      setScale: vi.fn(),
      getState: vi.fn(() => ({
        paperSettings: { width: 595, height: 842, direction: 'vertical', margins: [100, 120, 100, 120] },
      })),
    };

    render(<EditorCanvas editorStore={editorStore as any} bridge={bridge as any} />);

    onContentChange?.();
    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();

    expect(globalThis.localStorage.setItem).not.toHaveBeenCalled();
    expect(mockedCore.captureDocumentSnapshotMock).toHaveBeenCalledTimes(1);
  });
});
