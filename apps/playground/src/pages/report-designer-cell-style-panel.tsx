/**
 * ux-r9 RD-2：Report Designer cell 样式面板——demo 本地自定义 renderer。
 *
 * 闭包持有 spreadsheet core（refs 对象由宿主组件回填），绕过 inspector env
 * 无桥接的限制（inspector env 仅 fetcher/notify）。样式操作经既有
 * spreadsheet:setCell* 命令面下发。
 */

import React, { useEffect, useState } from 'react';
import type { SpreadsheetCore } from '@nop-chaos/spreadsheet-core';
import { Button } from '@nop-chaos/ui';

export const reportCellStylePanelRefs: { spreadsheetCore: SpreadsheetCore | null } = {
  spreadsheetCore: null,
};

function CellStylePanel() {
  const core = reportCellStylePanelRefs.spreadsheetCore;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!core) return;
    return core.subscribe(() => setTick((value) => value + 1));
  }, [core]);

  if (!core) {
    return <div className="p-2 text-xs text-muted-foreground">Initializing…</div>;
  }
  const snapshot = core.getSnapshot();
  const anchor = snapshot.selection.kind === 'cell' ? snapshot.selection.anchor : null;
  if (!anchor) {
    return <div className="p-2 text-xs text-muted-foreground">Select a cell to style it.</div>;
  }
  const target = {
    sheetId: anchor.sheetId,
    address: anchor.address,
    row: anchor.row,
    col: anchor.col,
  };
  const style = (patch: Record<string, unknown>) => {
    void core.dispatch({ target, ...patch } as never);
  };
  return (
    <div className="flex flex-col gap-2 text-sm" data-slot="report-cell-style-panel">
      <div className="text-xs text-muted-foreground font-mono">{anchor.address}</div>
      <div className="flex flex-wrap gap-1.5" data-testid="report-cell-style-actions">
        <Button size="sm" variant="outline" data-testid="report-style-bold" onClick={() => style({ type: 'spreadsheet:setCellFontWeight', fontWeight: 'bold' })}>
          B
        </Button>
        <Button size="sm" variant="outline" data-testid="report-style-italic" onClick={() => style({ type: 'spreadsheet:setCellFontStyle', fontStyle: 'italic' })}>
          I
        </Button>
        <Button size="sm" variant="outline" data-testid="report-style-underline" onClick={() => style({ type: 'spreadsheet:setCellTextDecoration', textDecoration: 'underline' })}>
          U
        </Button>
        <Button size="sm" variant="outline" data-testid="report-style-center" onClick={() => style({ type: 'spreadsheet:setCellTextAlign', textAlign: 'center' })}>
          ⇔
        </Button>
        <Button size="sm" variant="outline" data-testid="report-style-fontsize" onClick={() => style({ type: 'spreadsheet:setCellFontSize', fontSize: 16 })}>
          16px
        </Button>
      </div>
      <span hidden data-testid="report-style-tick">{tick}</span>
    </div>
  );
}

export const reportCellStylePanelDefinition = {
  type: 'report-cell-style-panel',
  component: CellStylePanel,
  eventContracts: {},
} as never;
