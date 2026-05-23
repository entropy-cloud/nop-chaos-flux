# 维度 10: 样式系统合规性

## 第 1 轮（初审）

### [维度10-01] `canvas-styles.css` 仍保留一批未锚定到 spreadsheet canvas surface 的裸 `[data-slot='spreadsheet-*']` 选择器，和 owner 文档要求的包级作用域锚定不一致

- **文件**: `packages/spreadsheet-renderers/src/canvas-styles.css:100-156`
- **证据片段**:
  ```css
  [data-slot='spreadsheet-column-header'],
  [data-slot='spreadsheet-row-header'],
  [data-slot='spreadsheet-corner-header'] {
    text-align: center;
    vertical-align: middle;
    font-size: 12px;
  }
  ```
- **严重程度**: P2
- **现状**: 同文件前半段已经使用 `.nop-spreadsheet-page [data-slot='spreadsheet-grid'] ...` 或 `[data-slot='report-designer-spreadsheet-canvas'] ...` 做 surface 锚定，但从列头/行头开始又退回到全局裸 `data-slot` 选择器。
- **风险**: 这些 package-owned 样式会跨越 renderer surface 泄漏到任何碰巧复用相同 `data-slot` 名称的 subtree，也让“spreadsheet canvas 是自包含样式子树”的文档承诺失真。
- **建议**: 把裸 `spreadsheet-*` selector 全部收束到 spreadsheet canvas 根作用域之下，至少与同文件前半段的 `.nop-spreadsheet-page [data-slot='spreadsheet-grid'] ...` / report-designer canvas 锚定规则保持一致。
- **为什么值得现在做**: 所有 suspect 都集中在单文件；修复只涉及 selector scope 收口，不需要改动 runtime 或 schema 契约。
- **误报排除**: `docs/architecture/report-designer/spreadsheet-canvas-css.md` 允许 canvas 内部使用 package-owned `data-slot='spreadsheet-*'` 选择器，但明确前提是“只在 spreadsheet canvas surface 内部使用”；本条问题正是缺少该 surface 锚定，而不是反对 spreadsheet 特例本身。
- **历史模式对应**: 对应 `audit-styling-suspects` 的 `bare-data-slot-selector` 模式，但已通过 owner docs 证明这次不是可接受的 intentionally-global selector。
- **参考文档**: `docs/architecture/styling-system.md:655-701`；`docs/architecture/report-designer/spreadsheet-canvas-css.md:110-117,197-204`；`docs/architecture/theme-compatibility.md`。
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度10-01]: 保留 (P2)。owner docs 已把 spreadsheet canvas 的 CSS 特例限定为“自包含 surface”，而 live selector 仍有一批未锚定的裸 `data-slot` 规则，结论成立。

## 子项复核结论

- [维度10-01]: 子项复核通过。建议按文件批量收束裸 selector。

## 最终保留项

| 编号  | 严重程度 | 文件                                                   | 一句话摘要                                                    |
| ----- | -------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| 10-01 | P2       | `packages/spreadsheet-renderers/src/canvas-styles.css` | spreadsheet canvas 仍存在未锚定 surface 的裸 data-slot 选择器 |
