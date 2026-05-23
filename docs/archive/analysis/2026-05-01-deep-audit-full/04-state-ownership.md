# 04 状态所有权与单一事实来源

## 复核结论

- 保留: 3
- 降级: 1
- 驳回: 0

## 保留

### report spreadsheet 选择态未在清空时同步清理

- 文件: `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`
- 结论: 保留，P1
- 依据: spreadsheet 选择桥接到 `core.setSelectionTarget(...)`，但 `selectedCell` 为空时仅清 `prevSelectedCell.current`，未调用 `setSelectionTarget(undefined)`。

### table quick edit 同时维护本地值和 row scope 值

- 文件: `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`
- 结论: 保留，低严重度
- 依据: `draftValue` / `savedValue` 与 `rowScope.update('record.<field>')` 同时存在；取消/恢复路径又把 scope 值写回本地 state。

### tree mode `treeDocument` props-to-state 双事实源

- 文件: `packages/flow-designer-renderers/src/designer-page.tsx`
- 结论: 保留，P1
- 依据: 组件既把 `inputTreeDocument` 同步进本地 state，又通过 command adapter 持续修改这份本地 state。

## 已降级

### spreadsheet formula bar `cellValue` 局部镜像

- 文件: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-spreadsheet-shell.ts`
- 结论: 已降级
- 依据: `cellValue` 有真实镜像风险，但 `commentText` 属合理瞬态编辑草稿；整项不宜按“整个 shell 双状态”上报。
