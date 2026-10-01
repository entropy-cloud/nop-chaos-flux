import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SpreadsheetBridge } from '../bridge.js';
import { useCellValueSync } from './use-cell-value-sync.js';

function ValueSyncHarness(props: {
  bridge: SpreadsheetBridge;
  onReady: (sync: (value: string) => Promise<void>) => void;
}) {
  const sync = useCellValueSync({
    bridge: props.bridge,
    sheetId: 'sheet-1',
    selectedCell: { row: 0, col: 1 },
    readOnly: false,
  });
  React.useEffect(() => {
    props.onReady(sync);
  }, [sync, props]);
  return <div data-testid="value-sync-harness" />;
}

describe('useCellValueSync 提交路由升格（ux-r4）', () => {
  it('`= ` 前缀内容路由到 setCellFormula', async () => {
    const dispatch = vi.fn(async () => ({ ok: true, changed: true }));
    let sync: ((value: string) => Promise<void>) | undefined;
    render(<ValueSyncHarness bridge={{ dispatch } as unknown as SpreadsheetBridge} onReady={(fn) => (sync = fn)} />);

    await sync!('=SUM(B1:B2)');

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'spreadsheet:setCellFormula', formula: '=SUM(B1:B2)' }),
    );
  });

  it('普通内容仍走 setCellValue', async () => {
    const dispatch = vi.fn(async () => ({ ok: true, changed: true }));
    let sync: ((value: string) => Promise<void>) | undefined;
    render(<ValueSyncHarness bridge={{ dispatch } as unknown as SpreadsheetBridge} onReady={(fn) => (sync = fn)} />);

    await sync!('plain text');

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'spreadsheet:setCellValue', value: 'plain text' }),
    );
  });

  it('空 `=` 判定按 trim 后内容', async () => {
    const dispatch = vi.fn(async () => ({ ok: true, changed: true }));
    let sync: ((value: string) => Promise<void>) | undefined;
    render(<ValueSyncHarness bridge={{ dispatch } as unknown as SpreadsheetBridge} onReady={(fn) => (sync = fn)} />);

    await sync!('  =A1+1  ');

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'spreadsheet:setCellFormula' }));
  });
});
