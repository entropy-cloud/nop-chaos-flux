# 04 State Ownership

- 深挖轮次: 1
- 深挖发现数: 1

## 第 1 轮初审

### [维度04-01] Spreadsheet resize 以 React local state 维护持久化行列尺寸，绕过 core document 的 resize owner

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-interactions\use-resize.ts:11-20`, `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-interactions\use-resize.ts:56-72`, `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\use-spreadsheet-interactions.ts:199-206`, `C:\can\nop\nop-chaos-flux\packages\spreadsheet-core\src\command-handlers\sheet-handlers.ts:113-124`
- **行号范围**: `use-resize.ts:11-20,56-72`; `use-spreadsheet-interactions.ts:199-206`; `sheet-handlers.ts:113-124`
- **证据片段**:
  ```ts
  export function useResize() {
    const [resizeState, setResizeState] = useState<ResizeState>({
      isResizing: false,
      type: 'column',
      index: -1,
      startPos: 0,
      startSize: 0,
    });
    const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});
    const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  ```
  ```ts
  if (resizeState.type === 'column') {
    const delta = clientPos - resizeState.startPos;
    const newWidth = Math.max(30, resizeState.startSize + delta);
    setColumnWidths((prev) => ({ ...prev, [resizeState.index]: newWidth }));
  } else {
    const delta = clientPos - resizeState.startPos;
    const newHeight = Math.max(16, resizeState.startSize + delta);
    setRowHeights((prev) => ({ ...prev, [resizeState.index]: newHeight }));
  }
  ```
  ```ts
  export const handleResizeRow: CommandHandler<ResizeRowCommand> = (store, command) => {
    const state = store.getState();
    const nextDoc = applyResizeRow(state.document, command.sheetId, command.row, command.height);
    store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));
    return { ok: true, changed: true };
  };
  ```
- **严重程度**: P1
- **现状**: Spreadsheet renderer 的拖拽 resize 主路径把 `columnWidths` / `rowHeights` 写入 React local state，并把它们传给 grid 渲染；但 spreadsheet-core 已有 `spreadsheet:resizeRow` / `spreadsheet:resizeColumn` 命令和 document 中的 `RowDocument.height` / `ColumnDocument.width` 持久化 owner。当前拖拽 resize 没有通过 bridge/core command 提交，形成 local UI 尺寸与 core document 尺寸两套事实源。
- **风险**: 用户拖拽调整行高/列宽后，视觉上已经变化，但 core document、host scope、save/export、undo/redo 仍看不到该变更；刷新、重新挂载、report-designer 与 spreadsheet-core 同步、或外部通过 `spreadsheet:*` action 读取/保存时会回到旧尺寸，造成用户可见的数据丢失和 undo/history 不一致。
- **建议**: 将 resize 交互拆为临时 drag preview 与最终 commit：拖动中可保留 renderer-local preview，但 mouseup/endResize 时必须通过 `bridge.dispatch({ type: 'spreadsheet:resizeColumn' | 'spreadsheet:resizeRow', ... })` 提交到 spreadsheet-core；grid 尺寸应优先从 `snapshot.activeSheet.rows/columns` 派生，local preview 只覆盖正在拖动的瞬时显示。
- **双状态详情**: 第一份状态是 `useResize()` 中的 `columnWidths` / `rowHeights` React state；第二份状态是 spreadsheet-core document 中 `WorksheetDocument.rows[*].height` / `columns[*].width`，并由 `spreadsheet:resizeRow` / `spreadsheet:resizeColumn` 命令维护。
- **同步失败症状**: 拖拽 resize 后，当前 grid 立即显示新尺寸；但执行 save/export、撤销/重做、重新打开页面、或由 report-designer/spreadsheet host projection 消费 workbook 时，行列尺寸仍是旧值或默认值，用户看到的尺寸调整丢失。
- **为什么值得现在做**: Core 已经存在 resize 命令和 document 字段，修复不需要发明新 owner；只需把 renderer-local drag 结果接回现有 command path，即可同时修复持久化、history、host projection 与 report/spreadsheet 共享路径的一致性。
- **误报排除**: 这不是合理的纯 UI transient state。`resizeState` 本身作为拖拽中态可以留在 local state，但 `columnWidths` / `rowHeights` 表达的是用户对表格文档的持久编辑结果，而 core 文档已经有同一语义字段和命令 owner。也不是已被 211/217/223-230 收口的历史 surface、object-field、table controlled、flow tree-owner 或 report/word host-projection dual-state：本发现针对 live `spreadsheet-renderers` resize 主路径，未在 reopened decisions 中被裁定为已收口旧问题。
- **历史模式对应**: 对应本仓库高频的 “renderer-local state 与 domain core/store 双写或断写同一用户编辑事实” 模式，类似历史 Table controlled fallback、Report Designer spreadsheet split-brain、Flow host replace dirty/history 一类 single-truth 缺陷，但当前 residual 是 spreadsheet resize 的独立 live 路径。
- **参考文档**: `docs/architecture/report-designer/design.md`（spreadsheet runtime state、command bridge、Dirty 语义收敛规则）、`docs/components/spreadsheet-page/design.md`（worksheet document/selection/editing/history/viewport 归 spreadsheet core）、`docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的问题。深挖结束。

## 维度复核结论

- [维度04-01] 保留：live code 仍在 `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-interactions\use-resize.ts:19-20,56-72` 用 React local state 保存 `columnWidths` / `rowHeights`，`spreadsheet-grid.tsx:198-199,271,481,532` 又只消费这些 local 尺寸；同时 core 在 `spreadsheet-core\src\types.ts:73-83` 与 `command-handlers\sheet-handlers.ts:113-124` 已有 row/column 尺寸字段和 resize 命令，且文档要求 worksheet document / selection / history 归 spreadsheet core、写操作走 `spreadsheet:*` action，因此 P1 的单一事实来源违约成立。

需子项复核：P0/P1：[维度04-01]；跨包边界：[维度04-01]；文档-代码违约：[维度04-01]；不确定项：无。

## 子项复核结论

- [维度04-01] 保留：spreadsheet resize 仍用 renderer-local `columnWidths`/`rowHeights` 驱动 grid，而 core document 已有 row/column size 字段与 resize commands，拖拽结果未提交 canonical core owner，最终 P1 单一事实来源违约成立。

最终进入汇总：[维度04-01] P1。
