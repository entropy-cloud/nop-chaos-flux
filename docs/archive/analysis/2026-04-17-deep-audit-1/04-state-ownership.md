# 维度04：状态所有权与单一事实来源

- 审核日期：2026-04-17
- 初审发现：3
- 维度复核结论：保留 3，补充 1

## 已通过独立复核

### [维度04-01] spreadsheet selection 存在本地与 core 双事实源

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts`, `use-spreadsheet-interactions.ts`, `spreadsheet-grid.tsx`, `spreadsheet-toolbar.tsx`
- 现状：本地 `selectedCell` 推送到 core，但 core `selection` 变化不回流本地。
- 建议：以 core `selection` 为单一事实源，本地只保留拖拽中的瞬时态。

### [维度04-02] spreadsheet `cellValue/commentText` 镜像已提交值却缺少回流同步

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-spreadsheet-shell.ts`, `use-cell-value-sync.ts`, `use-comments.ts`, `spreadsheet-toolbar.tsx`
- 现状：当前编辑框值既是草稿又充当 committed 值显示，但 core 变更不会同步回来。
- 建议：改为纯 draft 缓冲，或从 snapshot 派生显示值。

### [维度04-03] table expandable 的 `expandedRowKeys` 只做初始化，不做回流

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-renderers-data/src/table-renderer/use-table-controls.ts`, `packages/flux-renderers-data/src/schemas.ts`
- 建议：明确改成 controlled/local/scope 之一，不要保留模糊双写状态。

### [维度04-04] spreadsheet `editing` 的 owner 已偏向 renderer 本地状态

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/spreadsheet-core/src/core/internal-state.ts`, `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts`, `bridge.ts`, `docs/components/spreadsheet-page/design.md`
- 现状：文档写 editing 归 core，但 live code 主要靠本地 `editingCell/editValue`。
- 建议：要么让 core 真正拥有 editing，要么更新文档和 bridge 契约。
