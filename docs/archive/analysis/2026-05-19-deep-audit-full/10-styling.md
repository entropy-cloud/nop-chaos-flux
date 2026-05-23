# 维度 10: 样式系统合规性

## 第 1 轮（初审）

### [维度10-01] report-field-panel 包级 CSS 使用裸 data-slot 选择器

- **文件**: `packages/report-designer-renderers/src/report-field-panel.css:1-12`; `packages/report-designer-renderers/src/field-panel-renderer.tsx:123-125`
- **证据片段**:

  ```css
  [data-slot='report-field-panel-shell'] {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  [data-slot='report-field-panel-stack'] {
  ```

- **严重程度**: P2
- **违规类别**: bare-data-slot-selector / package CSS scoping
- **现状**: CSS 全文件以裸 `[data-slot='report-field-panel-*']` 选择器定义包级视觉；live renderer 已有 `.nop-report-field-panel` root。
- **风险**: 全局装载 CSS 可能跨包命中同名 slot，裸 slot 名变成隐式全局 API。
- **建议**: 选择器加 `.nop-report-field-panel` root scope。
- **为什么值得现在做**: 文件小且 root marker 已存在，修复低风险。
- **误报排除**: 不是仅凭工具命中；存在可用 root scope 且 owner docs 不要求裸全局生效。
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`
- **复核状态**: 维度复核通过

### [维度10-02] spreadsheet toolbar 外壳样式落入 canvas hybrid CSS

- **文件**: `packages/spreadsheet-renderers/src/canvas-styles.css:248-256`
- **证据片段**:
  ```css
  [data-slot='spreadsheet-toolbar'] {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 8px;
    background: #f6f7fa;
    border-bottom: 1px solid rgb(226, 232, 240);
  ```
- **严重程度**: P2
- **违规类别**: spreadsheet / theme / package CSS scoping
- **现状**: toolbar 外壳使用 bare data-slot 和硬编码视觉值，放在 canvas hybrid exception CSS 内。
- **风险**: spreadsheet high-density canvas 例外扩散到普通 shell UI，绕过 token/Tailwind/shadcn 样式边界。
- **建议**: 将 toolbar shell 样式迁出或 root scope，并使用 CSS variables/Tailwind semantic tokens。
- **为什么值得现在做**: spreadsheet CSS exception 是高风险扩散边界。
- **误报排除**: 不反对 grid/cell hybrid CSS，只针对非高密度 toolbar shell。
- **参考文档**: `docs/architecture/report-designer/spreadsheet-canvas-css.md`, `docs/architecture/theme-compatibility.md`
- **复核状态**: 维度复核通过

## 深挖第 2 轮追加

### [维度10-03] spreadsheet find/replace、cell/comment editor overlay 样式也在 canvas CSS 中裸选择

- **文件**: `packages/spreadsheet-renderers/src/canvas-styles.css:355-407`
- **证据片段**:
  ```css
  [data-slot='spreadsheet-find-replace-panel'],
  [data-slot='spreadsheet-cell-editor'],
  [data-slot='spreadsheet-comment-editor'] {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    flex-direction: column;
  ```
- **严重程度**: P2
- **违规类别**: spreadsheet / overlay shell / bare-data-slot-selector
- **现状**: find/replace、cell editor、comment editor overlay 使用 bare data-slot 定义布局、边框、背景、阴影、输入视觉。
- **风险**: overlay shell 不属于核心 cell canvas exception，继续混在 canvas CSS 中会扩大 hybrid 例外范围。
- **建议**: 增加 root scope或拆到 shell/overlay 样式文件；输入与 panel chrome 优先复用 UI/Tailwind token。
- **为什么值得现在做**: 与 toolbar 同类，集中收敛 canvas CSS 边界。
- **误报排除**: 不报告 `ss-cell` / grid table 等高密度规则。
- **参考文档**: `docs/architecture/report-designer/spreadsheet-canvas-css.md`
- **复核状态**: 维度复核通过

## 维度复核结论

- [维度10-01]: 保留 (P2)。report field panel CSS 裸 slot 未 scoped。
- [维度10-02]: 保留 (P2)。spreadsheet toolbar shell 样式超出 canvas exception。
- [维度10-03]: 保留 (P2)。spreadsheet overlay shell 样式同类问题。

## 子项复核结论

- 低风险 P2 批量复核通过。建议后续 sweep sheet tab bar 等非 grid/cell shell CSS。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                 | 一句话摘要                                            |
| ----- | -------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| 10-01 | P2       | `packages/report-designer-renderers/src/report-field-panel.css:1-12` | report field panel package CSS 裸 data-slot 未 scoped |
| 10-02 | P2       | `packages/spreadsheet-renderers/src/canvas-styles.css:248-256`       | spreadsheet toolbar shell 样式混入 canvas exception   |
| 10-03 | P2       | `packages/spreadsheet-renderers/src/canvas-styles.css:355-407`       | spreadsheet overlay shell 样式混入 canvas exception   |
