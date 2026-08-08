# Spreadsheet Host 设计（spreadsheet-core + spreadsheet-renderers）

> Status: active（owner doc）
> Last Reviewed: 2026-08-08（D3.2 大面审计新建，plan `2026-08-08-1315-1` Phase 5 落地）
> Sources: `packages/spreadsheet-core/src/`、`packages/spreadsheet-renderers/src/`、`docs/audits/host-surface/ss-{1..10}-*.md`
> 前身基准: `docs/architecture/report-designer/spreadsheet-canvas-css.md`（样式面）+ `docs/architecture/report-designer/contracts.md`（host 契约面）——D3.2 裁决：spreadsheet 专属契约基线新建本目录（report-designer 侧两文件继续作为 report-designer 宿主视角文档保留）

## 1. 包结构与职责边界

- **`@nop-chaos/spreadsheet-core`**：纯领域核心（zustand vanilla store，无 react 依赖）。文档模型、命令面（commands/commands-base/commands-style）、命令 handler（command-handlers/）、类型工具（types.ts）、内部状态机（core/）。
- **`@nop-chaos/spreadsheet-renderers`**：host 渲染层。`spreadsheet-page` 注册渲染器（page-renderer.tsx + renderers.tsx）、网格（spreadsheet-grid/ + spreadsheet-grid.tsx）、工具栏（spreadsheet-toolbar/ + spreadsheet-toolbar.tsx）、sheet tab 栏（sheet-tab-bar.tsx）、交互组合钩子（use-spreadsheet-interactions.ts + spreadsheet-interactions/）、宿主契约（spreadsheet-manifest.ts + spreadsheet-host-method-contracts-{core,formatting}.ts + spreadsheet-manifest-shapes.ts）、桥（bridge.ts）、样式（canvas-styles.css）。
- 分层：renderers 只经 `bridge.dispatch`/`core` API 与 core 通信；core 不依赖 renderers。

## 2. 宿主契约面（host contract）

- `SPREADSHEET_MANIFEST_V1`：family `spreadsheet`，version `1.0`，projection（workbook/activeSheet/selection/activeCell/activeRange/runtime 七字段）+ capabilities（66 方法：core 36 + formatting 30）。
- `resolveSpreadsheetManifest(version)`：`1.0`/`1`/`latest` 三别名；未知版本返回 undefined。
- `spreadsheetHostContract`：family + defaultVersion + resolveManifest + capabilityPublication（region-scoped：toolbar/body/dialogs + transitiveInheritance）。
- `createSpreadsheetActionProvider(dispatch)`：host 命名空间 provider——`listMethods()` = 契约方法全集（同一常量，双向一致）；`invoke(method, payload)` 先 `validateHostMethodPayload`（args shape 校验），失败返回 `{ok:false,error}`；dispatch 后 `toSpreadsheetActionResult` 归一（Error/code/对象 message 兜底）。
- `createSpreadsheetBridge(core)`：快照缓存 + subscribe 转发 + dispatch 转发 + getCore。
- **result shape 契约**：host 契约 `result` 字段（如 find/findNext 的 `findResultShape`）声明的是**实际命令返回值形状**（与 `FindResult` 类型一致），action-provider 当前不校验 result——声明面必须与实现保持同步（D3.2 修复 110）。
- 消费方：action namespace 经 `actionScope.registerNamespace('spreadsheet', provider)`（page-renderer.tsx）；宿主页可经 `useHostScope` 读取 projection。

## 3. 命令面与文档模型

- 命令 = `spreadsheet:<method>` 字符串判别（`isSpreadsheetCommand` 前缀检测）。
- 文档模型：`SpreadsheetDocument` → `WorkbookDocument.sheets[]` → `WorksheetDocument`（cells: Record<address, CellDocument>、rows/columns 尺寸覆盖、merges、frozen、filters、tabColor、protected）。`CellDocument` 字段：value/formula/type/style/styleId/comment/linkUrl/protected/richText/numberFormat。
- **numberFormat 属 CellDocument 字段**（非 CellStyle）：`applySetCellNumberFormat` 写 cell 层（D3.2 修复 109）。
- 命令 handler 统一 `applySimpleDocumentMutation`：pushUndo（事务守卫内不单独入栈，仅清 redo）→ document 替换 → dirty:true。
- **readonly 白名单**（`READ_ONLY_COMMANDS`）：setActiveSheet/setSelection/setViewport/copyCells/selectAll/selectRow/selectColumn/find/findNext——视图安全命令；其余命令 readonly 模式返回 `{ok:false, error:'Document is readonly'}`。
- 视图命令（setSelection/setViewport）直写 runtime state，不入 undo 栈。

## 4. 事务与 undo 语义

- undo/redo：全量文档快照栈（maxUndoDepth 默认 100，config.maxUndoDepth 可配）；undo/redo 恢复快照 + `clearTransientState`（selection 清 none + editing 清空）+ dirty:true。
- 事务（Begin/Commit/RollbackSpreadsheetTransaction）：begin 克隆文档快照到 transactionDoc；事务期间命令不独立入栈；commit 将事务前快照压入 undo 栈（undo 恢复事务前状态）；rollback 恢复快照 + 清 redo + 清 transient。
- 用途：跨命令原子操作（如非连续多行删除 = begin → 逐行 deleteRow → commit，单 undo 条目，D3.2 修复 108 配套）。
- 已知简化：undo 回到已保存点不恢复 dirty=false；no-op 命令（如无冻结时 unfreeze）经 applySimpleDocumentMutation 也会污染 undo 栈与 dirty（P3 记录，治理候选）。

## 5. 选择 / 视图 / 冻结模型

- 选择六态：none/cell/range/row/column/sheet（`SpreadsheetSelection`，sheetId + anchor + range + rows/columns 列表）。
- 行/列选择 = **显式索引列表**（shift-click 累积点击行，非连续范围）：`getSelectedAxisInfo` 的 `count` = 列表长度（不是 span，D3.2 修复 108）；`start`/`end` = min/max（锚点语义）。
- 多选结构命令：非连续索引 → 逐索引倒序 dispatch + 事务包裹（use-context-menu-actions.ts）。
- viewport：`SpreadsheetRuntimeSnapshot.viewport`（scrollX/scrollY/zoom）；scroll 事件双向同步（handleScroll dispatch setViewport + effect 回写 scrollTop/Left）。
- 冻结：`sheet.frozen: {row?, col?}`（行/列可选）；渲染侧 viewport 将冻结行列排入可见索引 + spacer 补偿滚动度量 + **sticky 支撑**（冻结 tr `top: 22 + rowOffsets[row]`，冻结列 cell `left: 40 + colOffsets[col]`，D3.2 修复 107）；表头 sticky 由 CSS 锚定（`.nop-spreadsheet-page`/`[data-slot='report-designer-spreadsheet-canvas']` 双前缀）。

## 6. 渲染与样式契约

- **布局渲染器**：`spreadsheet-page` 注册 renderer 为 domain-host-renderer（workbench-shell/builder-facing traits），fields 8 项（title/statusPath/document/config/readOnly/toolbar/body/dialogs），actionScopePolicy `new`。
- **widget 自绘面**：网格/工具栏为完整自样式 UI 控件——样式锚定 `canvas-styles.css`（`ss-*` 类 + data-slot 属性选择器 + CSS 变量，无 React ThemeProvider）。
- DOM 契约：稳定 data-slot 输出（spreadsheet-grid/row-header/column-header/corner-header/toolbar/group/separator/status/cell-address/frozen-badge/find-\*/cell-editor-input/edit-status/sheet-bar 等）+ 数据标记（data-cell-active/selected/range-highlight/bound/comment/frozen/merged/editing/drop-target/fill-preview + data-row/data-col）。
- 虚拟化：viewport 窗口（findFirstVisible 二分 + OVERSCAN 5 + spacer 行/列），offsets 数组 useMemo 缓存；默认网格按文档占用扩展（max(100, lastRow+1) × max(26, lastCol+1)）。
- 宿主页样式锚定：独立宿主（playground spreadsheet-demo）用 `.nop-spreadsheet-page` 前缀 + flex 列布局（工具栏 flex-shrink-0、网格 flex:1 min-h-0、tab 栏）。

## 7. 键盘与交互契约

- 双层键盘：grid 根 keydown（方向键移动 + clamp、Enter/F2/键入开编辑、editingCell 短路）+ window keydown 快捷键（Ctrl+C/X/V/Z/Y/B/I/U/F、Delete/Backspace 清选、**Escape 关闭面板——先于 isEditableTarget 守卫 + 焦点归还 grid 根**，D3.2 修复 ss-8）。
- 输入目标排除：`isEditableTarget`（input/textarea/select/contenteditable/role=textbox）。
- 拖选/填充/缩放：window mousemove + mouseup 驱动（无 pointercancel 守卫——桌面向网格，P3 记录）；fill 预览 ref + rAF 批处理。
- 剪贴板：内存 `ClipboardData`（copy/cut 快照 + paste 应用），无 navigator.clipboard 权限层（当前无权限面，P3 记录）。

## 8. 设计限制（明确非缺陷）

- **公式为存储型**：`setCellFormula` 存/删 `cell.formula` 字段，无求值引擎；公式单元格无 value 时渲染空。宿主/导出侧需自行求值。无 formula bar UI（公式仅 host contract 可达）。
- numberFormat 命令已落地（D3.2 修复 109），但渲染侧无数字格式显示/UI。
- toolbar cell editor/comment editor UI 已移除（report-designer-demo.spec.ts 用例 7 守卫）——`cellValue`/`setCellValue`/`commentText`/`setCommentText` 状态管线残留（死管线，DR-4 裁决：移除或恢复 UI）。
- undo 为全量快照模型（大数据文档每命令 O(doc) 内存/时间）。
- autoFitRow/autoFitColumn 命令返回显式错误（需宿主测量支持）。
- 查找无索引（全表扫描）；FindNext 无独立 UI 按钮（面板 Find 每次从头找）。

## 9. 已知登记（P3 卡内记录汇总）

- 硬编码英文：resize dialog aria-label（overlay-controls.tsx:106）、选区/编辑/查找日志消息（默认宿主无 onLog 消费，非用户可见）；用户可见类（编辑保存状态/页头状态/查找结果）已路由 DR-3/DR-5/DR-6。
- 死 CSS：ss-frozen-separator-col/row、ss-selection-border。
- Home/End/PageUp/PageDown 与 Shift+方向键选区扩展缺失。
- 详见 `docs/audits/host-surface/ss-{1..10}-*.md` 各卡 P3 清单与 `docs/audits/round2-dr-adjudication.md`。
