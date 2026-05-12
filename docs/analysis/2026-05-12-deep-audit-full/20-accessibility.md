# 维度 20：可访问性 (WCAG)

## 范围与状态

- 审核范围：审计源文件记录的 label/error 关联、键盘焦点、ARIA state、可访问名称、图表文本替代与虚拟化 active descendant 完整性问题。
- 资料来源：仅使用同目录 `stage-1-full-findings-16-20.md`、`raw-findings-07-20.md`、`final-review-results-16-20.md`、`summary.md`。
- 最终状态：保留 11 项，驳回 0 项。
- 严重程度分布：P2 9 项，P3 2 项。

## 深挖轮次与收敛说明

- 第 1 轮初审重建发现 20-01 至 20-07。
- 第 2-5 轮追加 raw findings 发现 20-08 至 20-11。
- `summary.md` 记录第 5 轮仍有新增，因此本次按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 最终复核摘要

最终复核保留全部 11 项。高风险聚集在复合控件 label/error 关联、提交失败首错聚焦、interactive table row semantics、chart data equivalent、DingFlow popover focus/menu semantics、spreadsheet virtual grid `aria-activedescendant`。20-08 降级为 P3，因为 `title` 可能提供名称但不够稳定；20-11 保持 P3。

## 最终保留项

### [20-01] `FieldFrame` label 在 composite controls 上未程序化关联

- 文件：`packages/flux-react/src/field-frame.tsx:162-168`, `225-250`
- 证据片段：`isGroup` 时使用 `fieldset/legend`，否则 root tag 可能为 `label` 或 `div`，label tag 为 `span`；control wrapper 有 `aria-describedby`，但 snippet 未显示 stable `aria-labelledby` 关联实际 focus target。
- 严重程度：P2
- 当前行为：非 group 且 `rootTag="div"` 或 composite children 时，label 是 `span`，无 `htmlFor/aria-labelledby` 关联；control wrapper 有 error attrs，但 visible label 不稳定关联实际 focus target。
- 风险：screen reader 可能无法为复合控件/自定义 renderer 输出读出 field label。
- 建议：生成 stable label ID，并应用到实际 focusable control 或 group root；单一具体控件路径使用 `<label htmlFor>`。
- 误报排除：基础 input 在外层 `<label>` 或 child id 匹配时可能正常；问题是 composite/rootTag div 路径。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 FieldFrame labels 在 composite/rootTag=`div` controls 上未程序化关联。

### [20-02] Select/RadioGroup errors 未稳定关联 focus targets

- 文件：`packages/flux-renderers-form/src/renderers/input.tsx:166-180`, `317-335`
- 证据片段：Select trigger 使用 `aria-describedby`/`aria-errormessage` 指向 `${name}-source-error`；RadioGroup 设置 `aria-invalid`，source error 渲染为 `span role="alert"`，snippet 未显示 stable ID 被 group 引用。
- 严重程度：P2
- 当前行为：Select 只把 source errors 关联到 trigger；validation errors 可能由 FieldFrame 关联到 wrapper。RadioGroup source errors 没有 stable ID，也未被 group 引用。
- 风险：AT 用户 focus 字段时可能听不到错误，或 `aria-errormessage` target 不稳定。
- 建议：每个 field error/source-error 使用 stable ID，并把 `aria-describedby/aria-errormessage` 加到具体 focus target 或 group root。
- 误报排除：visual errors 与 `role="alert"` 可能异步 announce；问题是 focus-target association。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 Select/RadioGroup error associations 分裂在 wrapper 与 focus target 之间。

### [20-03] Submit validation failure 不聚焦首个 invalid field

- 文件：`packages/flux-runtime/src/form-runtime-submit-flow.ts:150-175`, `233-245`
- 证据片段：submit flow 调用 `validateForm('submit')`，`!validation.ok` 时构造 `validationFailure` 返回 errors 与 fieldErrors；snippet 未显示 focus first invalid field。
- 严重程度：P2
- 当前行为：submit 标记/touch fields 并返回 errors，但未触发首个 invalid field focus。
- 风险：键盘和 screen reader 用户提交失败后可能停留在 submit button，无法立即定位第一个问题。
- 建议：添加 form-level focus-invalid-field hook 或 runtime/React bridge，在 submit failure 后 focus 第一个 visible invalid control。
- 误报排除：error state 已发布；缺失的是 focus movement。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 submit validation failure 不 focus first invalid field。

### [20-04] Condition-builder AND/OR selected state 只用视觉样式表达

- 文件：`packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx:266-295`; `packages/flux-renderers-form-advanced/src/wrapped-field-action.tsx:108-118`
- 证据片段：AND/OR active state 仅改变 `className`，例如 active 时 `bg-primary text-primary-foreground shadow-sm`；底层 `WrappedFieldAction` 渲染 `span role="button"`、`tabIndex`、`aria-disabled`。
- 严重程度：P2
- 当前行为：AND/OR state 只通过 class changes 表示；底层 `role="button"` 没有 `aria-pressed/aria-checked/role="radio"` 等 selected state。
- 风险：screen reader 用户无法知道当前 conjunction 选择。
- 建议：使用 toggle group/radio group pattern，或给 active AND/OR buttons 添加 `aria-pressed`。
- 误报排除：buttons 可键盘访问；缺失的是 selected-state semantics。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 condition-builder AND/OR selected state visual-only。

### [20-05] Remove subgroup button 缺 stable accessible name

- 文件：`packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx:251-261`; `packages/flux-renderers-form-advanced/src/wrapped-field-action.tsx:108-118`
- 证据片段：remove action 使用 `WrappedFieldAction`，设置 `title={removeGroupLabel}`，children 为 `×`；底层为 `span role="button"`。
- 严重程度：P2
- 当前行为：remove action 是 `×` + `title`，没有 explicit `aria-label`。
- 风险：accessible name 可能变成 “×”，或依赖不稳定的 title fallback。
- 建议：添加 `aria-label={removeGroupLabel}`，必要时将视觉 `×` 标为装饰。
- 误报排除：`title` 可提供 tooltip，但不是可靠的 icon-only action accessible-name strategy。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 condition-builder remove subgroup action 缺 explicit accessible name。

### [20-06] Interactive table rows 缺 role/name/state semantics

- 文件：`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:93-125`; `packages/ui/src/components/ui/table.tsx:42-49`
- 证据片段：row interactive 时 `<TableRow>` 设置 `data-interactive`、`data-expanded`、`tabIndex={0}` 与 `onClick`；UI TableRow 仍渲染 `<tr data-slot="table-row" ...>`。
- 严重程度：P2
- 当前行为：rows 可 keyboard-focusable/activatable，但仍是 `<tr>`，没有 role、accessible name 或 `aria-expanded`，虽然发出 `data-expanded`。
- 风险：AT 可能不知道 row 是 interactive control，也不知道 expanded/collapsed state。
- 建议：row interactive 时补 semantics，例如 expand-by-row-click 添加 `aria-expanded` 和 action name；或将 activation 移入命名 button/control。
- 误报排除：独立 expand button 有 aria-label；本条针对 row itself 被设为 interactive 的路径。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 interactive table rows 缺 control semantics 与 expanded state。

### [20-07] Chart renderer 缺数据文本替代

- 文件：`packages/flux-renderers-data/src/chart-renderer.tsx:117-119`, `256-303`
- 证据片段：chart accessible name 来自 `title?.trim()` 或 `t('flux.common.chart')`；chart canvas div 使用 `aria-label={chartAccessibleName}`，但 snippet 未显示 textual data summary/table/description。
- 严重程度：P2
- 当前行为：非空 chart 有 accessible name，但没有 textual data summary、table、description 或 screen-reader-only 数据等价物。
- 风险：screen reader 用户知道存在图表，但无法获取 bars/lines/pie segments 表达的数据。
- 建议：从 `source/series` 生成 offscreen table/summary，或支持 authored `description/dataTable` slot。
- 误报排除：`aria-label` 只命名 chart，不描述 chart data。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 chart 有 accessible name，但无 data equivalent。

### [20-08] Word editor icon-only toolbar buttons 只有 title，没有稳定 accessible name

- 文件：`packages/word-editor-renderers/src/toolbar/shared.tsx:39-51`
- 证据片段：`ToolbarButton` 渲染 `Button`，设置 `title={title}` 与 `aria-pressed={active}`，children 为 icon；snippet 未显示 `aria-label`。
- 严重程度：P3
- 当前行为：`ToolbarButton` 在无 label 时只渲染 SVG icon 和 `title`，没有 `aria-label`。
- 风险：undo/redo/bold/italic/insert 等 icon-only toolbar action 对 screen reader 可能无稳定名称。
- 建议：icon-only 时设置 `aria-label={title}`，并将装饰 icon 标为 `aria-hidden`。
- 误报排除：第 1 轮 a11y findings 覆盖 field/table/chart/condition-builder；本条是 word editor toolbar 独立问题。
- 最终复核 verdict：降级保留。
- 修订标题/理由：final review 将其降为 P3，理由是 `title` 可能提供名称，但不如 explicit `aria-label` 稳定。

### [20-09] DingFlow add-node popover 缺 keyboard dismissal、focus management 和 menu semantics

- 文件：`packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx:26-52`; `packages/flow-designer-renderers/src/dingflow/ding-flow-canvas-overlay.tsx:121-128`
- 证据片段：popover 使用 fixed backdrop `<div onClick={onClose}>` 与 fixed content div，内部 map 渲染 `Button`；overlay 仅条件渲染 `DingFlowAddNodeMenu`，传入 `onSelect/onClose`。
- 严重程度：P2
- 当前行为：popover 是 fixed content + mouse-only backdrop；没有 `role="menu"/menuitem`、Escape 关闭、初始 focus、焦点恢复或 focus trap。
- 风险：键盘用户打开 add-node chooser 后可能无法明确进入/退出该 transient menu，screen reader 也缺少菜单语义。
- 建议：使用 `Popover/DropdownMenu` from `@nop-chaos/ui`；或补齐 focus management、Escape close、`role="menu"`、命名 menu items 和 trigger focus restore。
- 误报排除：不重复 condition-builder a11y；该问题发生在 flow designer DingFlow overlay。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 DingFlow add-node popover 缺 keyboard dismissal/focus management/menu semantics。

### [20-10] Spreadsheet grid virtualization 可能让 `aria-activedescendant` 指向未挂载 cell id

- 文件：`packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:237-247`, `382-395`
- 证据片段：grid 只计算 visible/frozen row/col indices；container `role="grid"` 总是基于 `selectedCellAddress` 设置 `aria-activedescendant={`spreadsheet-cell-${selectedCellAddress}`}`。
- 严重程度：P2
- 当前行为：grid 只挂载 visible/frozen cells，但 container 总是将 selected cell address 写入 `aria-activedescendant`。
- 风险：若选中 cell 不在当前 virtualized viewport，active descendant ID 不存在，assistive tech 失去当前活动格引用。
- 建议：设置 `aria-activedescendant` 前确保 active cell 已挂载；或先 scroll into visible range；或只对 mounted cell 使用 active-descendant。
- 误报排除：不重复 table row semantics；这是 spreadsheet virtual grid 的 active descendant 完整性问题。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 Spreadsheet grid 可能让 `aria-activedescendant` 指向未挂载 virtualized cell。

### [20-11] Word document preview back buttons 为 icon-only 且缺少 `aria-label`

- 文件：`packages/word-editor-renderers/src/preview/doc-preview-page.tsx:61-71`, `87-98`
- 证据片段：两处 back `Button` 均为 `variant="outline"`、`size="icon-sm"`、`title={t('flux.wordEditor.back')}`，children 为 `<ArrowLeft className="w-4 h-4" />`；snippet 未显示 `aria-label`。
- 严重程度：P3
- 当前行为：preview page 的两个 back button 仅有 icon 和 `title`，没有 `aria-label`。
- 风险：assistive tech 对 title fallback 支持不一致，按钮名称可能不稳定。
- 建议：两处添加 `aria-label={t('flux.wordEditor.back')}`，并将 icon 标为装饰。
- 误报排除：`WordEditorPage` back button 已有 label；本条专指 preview page。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 Word document preview back buttons 依赖 `title` 而非 explicit `aria-label`。

## 驳回项

无。
