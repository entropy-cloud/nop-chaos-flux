import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { cellAddress, createSpreadsheetCore, type SpreadsheetDocument } from '@nop-chaos/spreadsheet-core';
import type { SpreadsheetBridge } from '../bridge.js';
import { deriveHostSnapshot } from '../bridge.js';
import { useEditing } from './use-editing.js';

function makeDocument(): SpreadsheetDocument {
  return {
    id: 'doc-edit',
    kind: 'spreadsheet',
    name: 'edit-test',
    version: '1',
    workbook: {
      sheets: [
        {
          id: 'sheet-1',
          name: 'Sheet1',
          order: 0,
          cells: {
            A1: { address: 'A1', row: 0, col: 0, value: 10 },
            A2: { address: 'A2', row: 1, col: 0, value: 20, formula: '=A1*2' },
          },
        },
      ],
    },
  };
}

function EditingHarness(props: {
  bridge: SpreadsheetBridge;
  snapshot: ReturnType<typeof deriveHostSnapshot>;
  onReady: (api: ReturnType<typeof useEditing>) => void;
}) {
  const api = useEditing(props.snapshot, props.bridge, 'sheet-1', null, '');
  React.useEffect(() => {
    props.onReady(api);
  }, [api, props]);
  return <div data-testid="editing-harness" />;
}

function setup() {
  const core = createSpreadsheetCore({ document: makeDocument() });
  const dispatch = vi.fn(async () => ({ ok: true, changed: true }) as never);
  const bridge = {
    getSnapshot: () => deriveHostSnapshot(core.getSnapshot()),
    subscribe: () => () => undefined,
    dispatch,
    getCore: () => core,
  } as unknown as SpreadsheetBridge;
  let api: ReturnType<typeof useEditing> | undefined;
  render(
    <EditingHarness
      bridge={bridge}
      snapshot={deriveHostSnapshot(core.getSnapshot())}
      onReady={(fn) => (api = fn)}
    />,
  );
  return { core, dispatch, getApi: () => api! };
}

describe('useEditing 公式回显与提交路由（ux-r4）', () => {
  it('双击公式单元格回显 formula 原文而非计算值', () => {
    const { core, getApi } = setup();

    getApi().handleCellDoubleClick(1, 0);

    expect(core.getSnapshot().editing).toBeTruthy();
    expect(core.getEditValue()).toBe('=A1*2');
  });

  it('双击普通单元格回显 value', () => {
    const { core, getApi } = setup();

    getApi().handleCellDoubleClick(0, 0);

    expect(core.getEditValue()).toBe('10');
  });

  it('保存 `=` 前缀内容路由到 setCellFormula', async () => {
    const { core, dispatch, getApi } = setup();

    getApi().handleCellDoubleClick(1, 0);
    core.updateEditValue('=B1+5');
    await getApi().handleEditSave();

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'spreadsheet:setCellFormula',
        formula: '=B1+5',
        cell: expect.objectContaining({ address: cellAddress(1, 0) }),
      }),
    );
  });

  it('保存普通内容仍路由到 setCellValue', async () => {
    const { core, dispatch, getApi } = setup();

    getApi().handleCellDoubleClick(0, 0);
    core.updateEditValue('42');
    await getApi().handleEditSave();

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'spreadsheet:setCellValue', value: '42' }),
    );
  });
});
