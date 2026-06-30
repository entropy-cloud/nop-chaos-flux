import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { PageControls } from './page-controls.js';

vi.mock('@nop-chaos/word-editor-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/word-editor-core')>();
  return {
    ...actual,
    PageMode: actual.PageMode ?? {
      PAGING: 'paging',
      CONTINUITY: 'continuity',
    },
  };
});

function createStore(overrides?: {
  pageMode?: string;
  paperSettings?: {
    width: number;
    height: number;
    direction: 'vertical' | 'horizontal';
    margins: [number, number, number, number];
  };
}) {
  const state = {
    scale: 1,
    pageMode: overrides?.pageMode ?? 'paging',
    paperSettings: {
      width: 595,
      height: 842,
      direction: 'vertical' as const,
      margins: [100, 120, 100, 120] as [number, number, number, number],
      ...(overrides?.paperSettings ?? {}),
    },
  };

  return {
    subscribe: () => () => undefined,
    getState: () => state,
    setPaperSettings: vi.fn((next) => {
      state.paperSettings = next;
    }),
    setPageMode: vi.fn((next) => {
      state.pageMode = next;
    }),
  };
}

describe('PageControls', () => {
  it('hydrates page margins from current store state on open and writes back on apply', async () => {
    cleanup();
    resetFluxI18n();
    initFluxI18n();

    const store = createStore({
      paperSettings: {
        width: 595,
        height: 842,
        direction: 'vertical',
        margins: [11, 22, 33, 44],
      },
    });
    const executeSetPaperMargin = vi.fn();
    const bridge = {
      command: {
        executePageScaleAdd: vi.fn(),
        executePageScaleMinus: vi.fn(),
        executePageScaleRecovery: vi.fn(),
        executePageMode: vi.fn(),
        executePaperSize: vi.fn(),
        executePaperDirection: vi.fn(),
        executeSetPaperMargin,
        executeAddWatermark: vi.fn(),
        executeDeleteWatermark: vi.fn(),
        executePrint: vi.fn(),
      },
    } as any;

    render(<PageControls bridge={bridge} store={store as any} />);

    fireEvent.click(screen.getByTitle('设置页边距'));

    const dialog = await screen.findByRole('dialog');
    const inputs = within(dialog).getAllByRole('spinbutton') as HTMLInputElement[];
    expect(inputs.map((input) => input.value)).toEqual(['11', '22', '33', '44']);

    fireEvent.change(inputs[0], { target: { value: '77' } });
    fireEvent.change(inputs[1], { target: { value: '88' } });
    fireEvent.change(inputs[2], { target: { value: '99' } });
    fireEvent.change(inputs[3], { target: { value: '111' } });

    fireEvent.click(within(dialog).getByRole('button', { name: '确认' }));

    await waitFor(() => {
      expect(store.setPaperSettings).toHaveBeenCalledWith({
        width: 595,
        height: 842,
        direction: 'vertical',
        margins: [77, 88, 99, 111],
      });
      expect(executeSetPaperMargin).toHaveBeenCalledWith([77, 88, 99, 111]);
    });
  });

  it('toggles page mode through the shared editor store', async () => {
    cleanup();
    resetFluxI18n();
    initFluxI18n();

    const store = createStore({ pageMode: 'paging' });
    const executePageMode = vi.fn();
    const bridge = {
      command: {
        executePageScaleAdd: vi.fn(),
        executePageScaleMinus: vi.fn(),
        executePageScaleRecovery: vi.fn(),
        executePageMode,
        executePaperSize: vi.fn(),
        executePaperDirection: vi.fn(),
        executeSetPaperMargin: vi.fn(),
        executeAddWatermark: vi.fn(),
        executeDeleteWatermark: vi.fn(),
        executePrint: vi.fn(),
      },
    } as any;

    render(<PageControls bridge={bridge} store={store as any} />);

    fireEvent.click(screen.getAllByTitle('切换分页模式')[0]!);

    expect(store.setPageMode).toHaveBeenCalledWith('continuity');
    expect(executePageMode).toHaveBeenCalledWith('continuity');
  });

  it('gives page-margin dialog stable accessible names and removes unsupported watermark authoring surface', async () => {
    cleanup();
    resetFluxI18n();
    initFluxI18n();

    const store = createStore();
    const bridge = {
      command: {
        executePageScaleAdd: vi.fn(),
        executePageScaleMinus: vi.fn(),
        executePageScaleRecovery: vi.fn(),
        executePageMode: vi.fn(),
        executePaperSize: vi.fn(),
        executePaperDirection: vi.fn(),
        executeSetPaperMargin: vi.fn(),
        executePrint: vi.fn(),
      },
    } as any;

    render(<PageControls bridge={bridge} store={store as any} />);

    fireEvent.click(screen.getAllByTitle('设置页边距')[0]!);
    const marginDialog = await screen.findByRole('dialog');
    expect(within(marginDialog).getByRole('spinbutton', { name: 'Top margin' })).toBeTruthy();
    expect(within(marginDialog).getByRole('spinbutton', { name: 'Right margin' })).toBeTruthy();
    expect(within(marginDialog).getByRole('spinbutton', { name: 'Bottom margin' })).toBeTruthy();
    expect(within(marginDialog).getByRole('spinbutton', { name: 'Left margin' })).toBeTruthy();
    expect(screen.queryByTitle('Watermark')).toBeNull();
  });

  it('localizes built-in toolbar chrome through flux.wordEditor keys', () => {
    cleanup();
    resetFluxI18n();
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });

    const store = createStore();
    const bridge = {
      command: {
        executePageScaleAdd: vi.fn(),
        executePageScaleMinus: vi.fn(),
        executePageScaleRecovery: vi.fn(),
        executePageMode: vi.fn(),
        executePaperSize: vi.fn(),
        executePaperDirection: vi.fn(),
        executeSetPaperMargin: vi.fn(),
        executePrint: vi.fn(),
      },
    } as any;

    render(<PageControls bridge={bridge} store={store as any} />);

    expect(screen.getByTitle('设置页边距')).toBeTruthy();
    expect(screen.getByTitle('打印')).toBeTruthy();
    expect(screen.getByTitle('切换分页模式')).toBeTruthy();
  });
});
