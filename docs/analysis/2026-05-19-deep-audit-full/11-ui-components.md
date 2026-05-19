# 维度 11: UI 组件使用合规性

## 第 1 轮（初审）

### [维度11-01] ReportFieldPanel 拖拽句柄使用原生 button

- **文件**: `packages/report-designer-renderers/src/report-field-panel.tsx:31-48`
- **证据片段**:
  ```tsx
  {group.fields.map((field) => (
    <div
      key={field.id}
      data-slot="report-field-panel-item"
    >
      <button
        type="button"
        data-slot="report-field-panel-drag-handle"
        draggable
  ```
- **严重程度**: P2
- **原生元素**: `<button>`
- **应替换为**: `Button` from `@nop-chaos/ui`
- **所在层**: `report-designer-renderers`
- **替换可行性**: 中
- **现状**: 同文件已导入并使用 `Button`，但 drag handle 仍用 raw button。
- **风险**: 绕过统一 focus-visible、slot、size/variant 与 disabled/interaction contract，容易复制 raw button 样式。
- **建议**: 改为 `Button type="button" variant="ghost"`，保留 drag attrs 与 `data-slot`。
- **为什么值得现在做**: 非测试、非 ui 内部、非高性能 host surface，替换收益明确。
- **误报排除**: 不属于 wrapped secondary action 裁定，也不是 raw HTML 合理例外。
- **参考文档**: `AGENTS.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 维度复核通过

## 深挖第 2 轮追加

### [维度11-02] virtual table spacer rows 使用 raw `<tr>`

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:277-329`
- **证据片段**:
  ```tsx
  return items.length > 0 ? (
    <tr aria-hidden style={{ height: items[0].start }} />
  ) : null;
  ...
  const bottomPad = rowVirtualizer.getTotalSize() - lastItem.end;
  return bottomPad > 0 ? <tr aria-hidden style={{ height: bottomPad }} /> : null;
  ```
- **严重程度**: 初审 P3，复核驳回
- **原生元素**: `<tr>`
- **应替换为**: 初审建议 `TableRow`
- **所在层**: data renderer widget
- **替换可行性**: 初审认为高
- **现状**: virtual spacer rows 使用 raw `<tr>`。
- **风险**: 初审认为 table internal structure 混用 UI abstraction 与 raw DOM。
- **建议**: 初审建议改 `TableRow`。
- **为什么值得现在做**: 初审认为替换成本低。
- **误报排除**: 复核确认 spacer row 是 `aria-hidden` 几何占位，使用 `TableRow` 会引入正常 row marker/styling，符合 raw HTML 校准例外。
- **参考文档**: `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 已驳回

## 维度复核结论

- [维度11-01]: 保留 (P2)。raw drag handle button 有等价 UI Button，替换收益明确。
- [维度11-02]: 驳回。virtual spacer row 是几何占位 raw DOM 例外。

## 子项复核结论

无。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                  | 一句话摘要                                  |
| ----- | -------- | --------------------------------------------------------------------- | ------------------------------------------- |
| 11-01 | P2       | `packages/report-designer-renderers/src/report-field-panel.tsx:31-48` | ReportFieldPanel drag handle 绕过 UI Button |
