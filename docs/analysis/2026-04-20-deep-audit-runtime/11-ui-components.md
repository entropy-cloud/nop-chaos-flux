# 维度11：UI 组件使用合规性

## 审核日期: 2026-04-20

## 发现清单（经初审+维度复核+补充发现）

### [P3] node-error-boundary 使用原生 `<button>`

- **文件**: `packages/flux-react/src/node-error-boundary.tsx:61`
- **原生元素**: `<button>`
- **应替换为**: `<Button variant="ghost" size="sm">`
- **替换可行性**: 中（flux-react 已依赖 @nop-chaos/ui，零额外成本）
- **保留理由**: Error boundary 自包含设计有一定合理性，但技术上违规且修复成本极低

### [P3] spreadsheet-grid 单元格编辑使用原生 `<input type="text">`

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:208`
- **原生元素**: `<input type="text" className="ss-cell-edit-input">`
- **应替换为**: `<Input>` (如果 UI 提供 `variant="bare"` 无装饰变体)
- **替换可行性**: 低（UI Input 默认表单样式与单元格内嵌场景冲突）
- **理由**: 初审遗漏。@nop-chaos/ui 有 Input 且包已依赖，但默认样式不适合内嵌编辑场景。可考虑为 UI 库增加无装饰变体。

## 合理例外（不计入违规）

| 文件 | 元素 | 例外原因 |
|------|------|---------|
| `word-editor-renderers/toolbar/insert-controls.tsx:75` | `<input type="file">` | UI 库无 FileInput 替代 |
| `word-editor-renderers/toolbar/font-controls.tsx:86,93` | `<input type="color">` | UI 库无 ColorPicker 替代 |
| `spreadsheet-renderers/src/spreadsheet-grid.tsx` | `<table>/<tr>/<td>` | 高性能宿主表面 |
| `flux-renderers-data/table-renderer/table-body-rows.tsx:389,418` | `<tr>` spacer | 虚拟化 spacer 行，aria-hidden |

## 整体评估

**渲染器层（flux-renderers-*）完全合规** — 无不合规的原生 HTML 使用。依赖隔离清晰（@base-ui 仅被 @nop-chaos/ui 直接依赖）。全量 91 处 UI 组件导入均使用统一的 `from '@nop-chaos/ui'` 路径。仅 2 个 P3 级边界情况。
