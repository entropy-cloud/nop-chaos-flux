# 11 UI 组件使用合规性

## 复核统计

- 初审条目: 1
- 维度复核: 完成
- 子项复核: 0
- 保留: 1
- 降级: 0
- 驳回: 0

## 保留

### [维度11] playground report designer demo 仍使用原生 `<button>`

- **文件**: `apps/playground/src/pages/report-designer-demo.tsx:401-408`
- **证据片段**:
  ```tsx
  <button
    type="button"
    data-slot="report-demo-panel-toggle"
    aria-label={paletteCollapsed ? 'Expand palette' : 'Collapse palette'}
    onClick={() => setPaletteCollapsed((value) => !value)}
  >
  ```
- **严重程度**: P2
- **原生元素**: `<button>`
- **应替换为**: `@nop-chaos/ui` 的 `<Button>`
- **所在层**: `apps/playground`
- **替换可行性**: 高
- **现状**: 该按钮位于 app shell 页面，不属于 `ui` 包内部，也不是 file/color input 或 spreadsheet host-surface 例外。
- **风险**: 与仓库统一 UI 组件约定不一致，后续 demo/shell 页面更容易复制 raw button pattern。
- **建议**: 换成 `<Button variant="ghost" size="icon">` 或其他合适的 UI 组件变体。
- **为什么值得现在做**: 修复成本极低，且能消除一个明确规则违例。
- **误报排除**: item review确认 `packages/ui/src/index.ts` 已导出 `Button`，无合理保留原生按钮的必要。
- **历史模式对应**: shell/demo 页面漏用共享 UI 组件
- **参考文档**: `AGENTS.md`
- **复核状态**: `维度复核通过`

## 合理例外

- `word-editor-renderers` 中的 `input[type=file]` 和 `input[type=color]` 属于浏览器原生能力例外。
- `spreadsheet-renderers` 中的 raw `table` / `input` / `button` 属于高性能宿主表面例外。
- `ui` 包内部的原生元素不计入本维度。
