// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { EditorCanvas } from '../editor-canvas.js';

const mockedCore = vi.hoisted(() => ({
  createSavedDocumentDataMock: vi.fn((value) => ({
    ...value,
    savedAt: '2026-05-02T00:00:00.000Z',
  })),
  loadDocumentMock: vi.fn(() => null),
}));

vi.mock('@nop-chaos/word-editor-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/word-editor-core')>();
  return {
    ...actual,
    createSavedDocumentData: mockedCore.createSavedDocumentDataMock,
    loadDocument: mockedCore.loadDocumentMock,
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
    mockedCore.loadDocumentMock.mockClear();
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

  it('autosaves using live charts and codes instead of initial document extras', async () => {
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

    expect(mockedCore.createSavedDocumentDataMock).toHaveBeenCalled();
    const savedArg = mockedCore.createSavedDocumentDataMock.mock.calls.at(-1)?.[0];
    expect(savedArg.data.charts).toEqual([{ id: 'live-chart', chartName: 'Live' }]);
    expect(savedArg.data.codes).toEqual([{ id: 'live-code', codeName: 'Live' }]);
    expect(savedArg.data.charts).not.toEqual([{ id: 'initial-chart', chartName: 'Initial' }]);
    expect(savedArg.data.codes).not.toEqual([{ id: 'initial-code', codeName: 'Initial' }]);
    expect(autosaveSpy).toHaveBeenCalledTimes(1);
  });
});
