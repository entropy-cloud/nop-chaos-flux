# 维度 20：可访问性

## 第 1 轮（初审）

### [维度20-01] Report field panel 把拖拽项标成按钮，但没有任何键盘激活路径

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\report-field-panel.tsx:27-34`
- **证据片段**:
  ```tsx
  <div
    key={field.id}
    data-slot="report-field-panel-item"
    role="button"
    tabIndex={0}
    draggable
    onDragStart={() => onFieldDragStart(source.id, field.id, field.label)}
  >
  ```
- **严重程度**: P1
- **现状**: 每个字段项被公开成 `role="button"` 且可聚焦，但只实现了鼠标拖拽起始；没有 `onClick`、`onKeyDown` 或任何键盘可触发的激活语义。
- **风险**: 键盘和辅助技术用户会被明确告知这里是按钮，却根本无法通过 Enter/Space 等方式操作这个控件，构成实际的交互语义欺骗。
- **建议**: 要么提供真实的按钮激活路径并补键盘拖拽/插入语义，要么撤掉 button role，改成更真实的 drag source 语义并提供等价的非拖拽添加路径。
- **为什么值得现在做**: 这是 report designer 左侧主入口之一，当前问题直接阻断无鼠标用户使用字段面板。
- **误报排除**: 不是泛泛批评 drag-and-drop 难做。这里的 concrete defect 是代码主动赋予了 `button` 角色，却没有实现按钮应有的最小键盘行为。
- **复核状态**: 未复核

### [维度20-02] Spreadsheet grid 的 resize handle 是只支持鼠标的交互分隔条

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-grid.tsx:540-546,593-599`
- **证据片段**:
  ```tsx
  <div
    className="ss-col-resize-handle"
    data-slot="spreadsheet-column-resize-handle"
    role="separator"
    aria-orientation="vertical"
    onMouseDown={(e) => onColumnResizeStart(c, e)}
  />
  ```
- **严重程度**: P2
- **现状**: 列宽/行高 resize handle 被声明为可调整的 `separator`，但既不可聚焦，也没有任何键盘调整路径；唯一交互入口是 `onMouseDown`。
- **风险**: 这使可调整分隔条成为纯鼠标能力，键盘用户无法完成列宽/行高调整，而语义层又把它暴露成了应可操作的 separator。
- **建议**: 至少提供 focusable handle 与箭头键调整语义；如果短期无法支持键盘 resize，就不要把它暴露成可操作 separator，而应提供单独的可访问尺寸编辑入口。
- **为什么值得现在做**: spreadsheet grid 已经实现了丰富键盘导航，resize 仍停留鼠标-only 会让关键编辑能力出现明显 accessibility 断层。
- **误报排除**: 不是把所有视觉分隔符都要求键盘化。这里的节点明确绑定了 resize 行为，是实际交互控制而非装饰元素。
- **复核状态**: 未复核

### [维度20-03] Hyperlink 与 page setup dialogs 多个输入框只有 placeholder，没有程序化标签

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\toolbar\insert-controls.tsx:139-149`; `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\toolbar\page-controls.tsx:178-191,220-225`
- **证据片段**:
  ```tsx
  <Input
    placeholder="Display text"
    value={hyperlinkDisplay}
    onChange={(e) => setHyperlinkDisplay(e.target.value)}
    size="sm"
  />
  ```
- **严重程度**: P2
- **现状**: hyperlink dialog 的 display/url 输入框、page margins dialog 的四个数字输入、watermark dialog 的文本输入都没有 `Label`、`aria-label` 或 `aria-labelledby`；其中 margins 仅有视觉 `<span>` 文本，无法程序化关联到对应输入。
- **风险**: 屏幕阅读器用户将获得不稳定或缺失的控件名称，placeholder 消失后语义也会丢失；表单填写和错误定位都会变差。
- **建议**: 使用 `@nop-chaos/ui` 的 `Label` 与 `htmlFor` 关联，或至少补显式 `aria-label` / `aria-labelledby`；margin 四项应保证每个输入都有独立可读名称。
- **为什么值得现在做**: 这些 dialog 都是标准表单输入场景，修复成本很低，但对 assistive tech 可用性提升直接且明确。
- **误报排除**: 不是以 placeholder 代 label 的主观偏好争论。当前代码里确实不存在任何其他程序化命名来源。
- **复核状态**: 未复核

## 初审结论

- 保留 3 项真实可访问性缺陷。

## 维度复核结论

- 结论: 保留新增发现。
- 理由: 复核后，`20-01`、`20-02`、`20-03` 都有直接代码证据，且没有找到能完全抵消问题的等价可访问替代路径。`20-01` 虽然在别处已有更好的插入按钮方案，但被点名的 `report-field-panel.tsx` 仍把条目标成 `button` 且仅支持拖拽起始，因此该子项成立。`20-02` 的列宽/行高 handle 既声明了交互性 `separator`，又只接 `onMouseDown`，仓库内也未见独立的键盘尺寸编辑入口。`20-03` 中 hyperlink、page margins、watermark 对话框里的输入框也确实缺少稳定的程序化名称。

## 子项复核结论

- `20-01`: 保留。`report-field-panel.tsx` 中字段项仍为 `role="button" + tabIndex={0}`，但只有 `onDragStart`，没有 Enter、Space 或 click 激活路径。
- `20-02`: 保留。`spreadsheet-grid.tsx` 中列/行 resize handle 为 `role="separator"`，仅支持 `onMouseDown`，且未找到键盘 resize 或尺寸编辑替代入口。
- `20-03`: 保留。`insert-controls.tsx` 与 `page-controls.tsx` 中相关 `Input` 没有 `Label`、`aria-label` 或 `aria-labelledby`；`packages/ui/src/components/ui/input.tsx` 也未提供自动命名补偿。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                                                                                     | 一句话摘要                                                     |
| ----- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 20-01 | P1       | `packages/report-designer-renderers/src/report-field-panel.tsx:27-34`                                                                                    | Report field panel 把拖拽项标成按钮，但没有任何键盘激活路径    |
| 20-02 | P2       | `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:540-546,593-599`                                                                                | Spreadsheet grid 的 resize handle 是只支持鼠标的交互分隔条     |
| 20-03 | P2       | `packages/word-editor-renderers/src/toolbar/insert-controls.tsx:139-149`; `packages/word-editor-renderers/src/toolbar/page-controls.tsx:178-191,220-225` | 多个 word-editor dialog 输入框只有 placeholder，没有程序化标签 |
