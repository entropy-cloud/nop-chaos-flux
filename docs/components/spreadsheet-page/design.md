# Spreadsheet Page 组件设计

## 1. 组件定位

- `spreadsheet-page` 是可独立复用的工作表编辑宿主 renderer。
- 它负责创建 spreadsheet runtime、注册 `spreadsheet:*` 命名空间动作，并组织 toolbar、body 和 dialogs。
- 本文档只拥有 `spreadsheet-page` 单 renderer 契约；Spreadsheet/Report workbench 的 family-level 架构与 host abstraction 由 `docs/architecture/report-designer/` 文档族负责。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已落地 `document`、`config`、`readOnly`、`toolbar`、`body`、`dialogs`。
- `statusbar` 等工作台补充区域仍可后续加入，但不影响当前根壳层契约。
- 如果问题涉及 spreadsheet canvas 在整个 report/spreadsheet family 中的边界、契约或平台扩展定位，应先回到 `docs/architecture/report-designer/README.md`。

## 3. Flux 中的 renderer/type 定义

- `type: 'spreadsheet-page'`
- `sourcePackage: '@nop-chaos/spreadsheet-renderers'`
- `rendererClass: 'domain-host-renderer'`
- `rendererTraits`: `workbench-shell`, `builder-facing`
- 当前 definition fields: `title` 为 `value-or-region`；`statusPath`、`document`、`config`、`readOnly` 为 `prop`；`toolbar`、`body`、`dialogs` 为 `region`

## 4. schema 设计

- `document` 是核心必填输入。
- `config`、`readOnly` 为宿主配置。
- `toolbar`、`body`、`dialogs` 为主要 regions。
- 目标设计中，如需让宿主外部读取 spreadsheet host 摘要，应使用 `statusPath`，而不是把完整 host snapshot 暴露到 page 全局 scope。
- `config` 当前正式支持面收敛为 `defaultRowHeight?`、`defaultColumnWidth?`、`maxUndoDepth?`；`minRowHeight` / `minColumnWidth` 不再属于公开 authoring contract。

## 5. 字段分类

- Canonical core contract:
- `document`、`config`、`readOnly`: spreadsheet-page host owner 的核心输入
- `toolbar`、`body`、`dialogs`: renderer definition `fields` 声明的 region surfaces
- `title`: renderer definition `fields` 声明的 `value-or-region` surface
- Derived convenience projection:
- `statusPath`: 对宿主外部暴露的窄摘要发布入口，不是内部 host projection 的第二真源
- Compatibility alias:
- 当前 active baseline 无额外 spreadsheet-page top-level compatibility alias；若未来引入 mirror 字段，必须先在 owner doc 中分类

## 6. regions 与 slot 约定

- `toolbar` 用于顶部命令区。
- `body` 用于 spreadsheet canvas 或其他主工作区扩展。
- `dialogs` 用于附加弹层挂载点。

## 7. 运行期状态归属

- worksheet document、selection、editing、history 和 viewport 归 spreadsheet core。
- schema 片段通过宿主数据快照读取运行时摘要，不直接操作内部 store。
- `spreadsheet-page` 属于 `Domain Host Owner`：内部读面是 host snapshot projection，宿主外部若需要只读观察，应通过窄 `statusPath` 摘要发布。
- 默认 spreadsheet page host 的交互维度以 active sheet 的已用边界为准，并保持 `100x26` 作为最小空白工作表基线；默认壳层不能把更大的 live workbook 静默裁剪回固定 demo 尺寸。

## 8. 事件、动作与组件句柄能力

- 顶层交互通过 `spreadsheet:*` 命名空间动作进行。
- 页面本体可以长期保持无专用 imperative ref，统一走动作通道。
- spreadsheet host action provider 必须完整保留 core `SpreadsheetCommandResult` 的取消语义；当前 supported baseline 下，resolved `{ ok: false, cancelled: true }` 会继续以 `ActionResult.cancelled` 向上传递，而不是被重分类为普通失败。
- grid viewport 变更现在也属于 canonical spreadsheet command surface：scroll/zoom 同步通过 `spreadsheet:setViewport` 回写 core viewport snapshot，host scope 与 `statusPath` 只读取这条统一 viewport baseline。
- 当前 row/column resize 的支持基线是 shared-context-menu size-edit path，而不是 keyboard-focusable resize handle。
- fill handle 是 canvas 内部的 pointer-only drag affordance，不发布 `button` / focus target 语义；支持的非-pointer fill path 仍是 selection + shared context menu actions。
- keyboard path 固定为：row/column header button 聚焦后，使用 `Context Menu` key 或 `Shift+F10` 打开共享 context menu；grid 先把 selection/anchor 归一化到对应单行或单列，再决定 row-height / column-width action 的启用状态。
- `row-height` / `column-width` 仅在 exactly-one row 或 exactly-one column 选择时启用；多选 header 时对应 action 必须 disabled。
- 最终尺寸变更通过 canonical `spreadsheet:resizeRow` / `spreadsheet:resizeColumn` command surface 提交。旧 mouse-drag handle 仍可保留，但它不再暴露 interactive `role="separator"` / focus target 语义。
- 默认 spreadsheet page host 的 outside-click edit-save 也必须走与 Enter/blur 相同的 save result contract：如果 bridge save 失败或取消，编辑器保持打开并发布对应失败/取消状态，而不是静默吞掉结果。
- 默认 shared grid/header/sheet-tab/find-replace/cell-editor 文案必须走 `flux-i18n`，不能在 renderer 内硬编码英文或中文字符串；ARIA label 与 placeholder 也属于同一 i18n contract。
- Spreadsheet toolbar 中表示当前样式/对齐状态的 toggle 类按钮必须把视觉 active state 同步为 `aria-pressed`，不能只依赖 `data-toolbar-active` 或 outline/ghost variant 传达状态。
- Sheet tab rename 必须提供完整键盘等价路径：active sheet tab 可通过 `F2` 进入 rename，rename input 必须带基于当前 sheet 名称的可访问名称，而不是只依赖 pointer-only double-click 或无名 textbox。
- Report/Spreadsheet 绑定单元格不能只靠背景色表达语义：绑定 cell 必须同时发布非颜色 marker，并把绑定字段信息并入 `gridcell` 可访问名称或描述。
- Excel-like cell editing baseline is selection-first, not auto-edit-on-focus: single click / focus only updates the active cell; editing begins through double-click, `Enter`, `F2`, or direct text entry that replaces the current cell content draft.
- The supported cell-value editing surface is the inline editor rendered inside the active grid cell. The toolbar must not render a separate cell-value input or formula-bar-like duplicate editor by default.
- In report-designer surfaces, richer cell metadata and binding configuration remain owned by the right inspector/property panel. Inline grid editing only covers the cell's displayed value text and must not introduce a second competing property-edit surface under the toolbar.
- Spreadsheet cell inline editing is an explicit high-density canvas exception to the general `@nop-chaos/ui` input usage rule: when the shared `Input` size/border contract cannot fit the fixed cell box without changing row height, the spreadsheet package may use a dedicated inline editor input that matches the canvas cell metrics exactly. This exception is limited to grid-cell inline editing only and must stay documented plus regression-tested.

### 8.1 Excel-Like Cell Interaction Contract

This section defines the intended user-visible spreadsheet interaction model. When live behavior differs, this contract wins.

**Selection mode**

- Single click on a cell moves the active cell to that position.
- Single click does **not** enter edit mode.
- Mouse drag from a cell extends the selection range.
- Single click on a different cell while another cell is being edited first resolves the current edit (save/cancel by existing result contract), then moves the active cell.
- Row/column headers remain selection surfaces, not value-edit surfaces.

**Keyboard navigation while not editing**

- `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` move the active cell.
- `Shift + Arrow*` is the expected future range-extension model; until fully implemented, ordinary arrow navigation must still keep the active cell stable and predictable.
- `Enter` enters inline edit mode for the active cell.
- `F2` enters inline edit mode for the active cell.
- Typing a printable character while a cell is selected enters inline edit mode and seeds the draft with that character, replacing the previous displayed value draft baseline just like Excel's overwrite-on-direct-entry behavior.

**Entering edit mode**

- Mouse path: double-click enters inline edit mode for the clicked cell.
- Keyboard paths: `Enter`, `F2`, or direct text entry enter inline edit mode for the active cell.
- Focus must move into the inline editor immediately after edit mode opens so subsequent typing edits text, not the grid shell.

**While editing**

- The inline editor lives inside the active cell box.
- Arrow keys operate on text caret/navigation inside the editor, not spreadsheet selection movement.
- `Enter` commits the draft.
- `Escape` cancels the draft.
- Blur / outside click follows the same save-result contract as other commit paths.

**Report Designer specialization**

- Spreadsheet inline editing only covers the cell's displayed value text.
- Richer cell semantics such as binding metadata, report field wiring, and other domain properties belong to the right inspector/property panel.
- Report Designer must not add a second toolbar-lower editor or formula-bar-style duplicate editing surface unless the owner docs are explicitly revised to support that model.

## 9. 数据源、表达式、导入能力接入点

- `document` 和 `config` 可由 loader 或宿主适配层提供。
- 导入导出等能力应由 namespace actions 或外部 toolbar 组合提供。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-spreadsheet-page` marker。
- Canvas 内部样式遵循 `ss-* + inline style + data-*` 的性能优先策略，外壳仍遵循普通 styling system。
- 包级 spreadsheet canvas CSS 必须限制在 spreadsheet/report host markers 下，例如 `.nop-spreadsheet-page` 或 `[data-slot='report-designer-spreadsheet-canvas']`；不能用裸 `data-slot='spreadsheet-*'` 选择器向工作台外泄漏样式。

## 11. 实现拆分建议

- runtime bridge、host snapshot、toolbar/body shell 和 spreadsheet namespace provider 分层实现。
- `SpreadsheetToolbarProps` 继续作为稳定顶层契约，由 `packages/spreadsheet-renderers/src/spreadsheet-toolbar.tsx` 顶层 shell 编排。
- 当前 live 实现已拆到 `packages/spreadsheet-renderers/src/spreadsheet-toolbar/` 子模块：`toolbar-groups.tsx` 负责 action groups，`find-replace-panel.tsx` 负责 find/replace UI，`toolbar-status.tsx` 负责状态展示，`types.ts` 保持共享 prop/type 契约。cell value editor 已从 toolbar shell 移除，值编辑 baseline 以 grid cell inline editor 为准。
- 当前公开的 search/find-replace host contract 以 `matchWholeCell` / `useRegex` 为 option vocabulary；未落地的 `includeFormulas` 不属于支持的对外搜索语义。

## 12. 风险、取舍与后续阶段

- 最大风险是把 canvas 内部性能敏感实现和外壳层普通 Tailwind 风格混在一起。
- 工作台扩展区域需要在不破坏核心壳层的前提下分阶段增加。

## 13. 相关文档

- `docs/architecture/report-designer/README.md` - family 入口与 owner boundary
- `docs/architecture/report-designer/design.md` - 平台扩展架构总览
- `docs/architecture/report-designer/spreadsheet-canvas-css.md` - canvas 样式性能边界
