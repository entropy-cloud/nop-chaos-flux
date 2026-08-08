# Host 面清单初稿（surface-inventory）

> Plan Status: active（D0 4 host 面范围核对交付物，plan `docs/plans/2026-08-08-0715-1-round2-d0-orchestration-baseline.md` Phase 2）
> Last Updated: 2026-08-08
> 用途: D3.1–D3.4 各 plan 的逐面审计卡清单依据（roadmap D3.x Phase Details 列举面全量收录，未增减）；每面一行对应未来一张（或一组）审计卡
> Source: roadmap D3.x Phase Details + live repo 核对

## flow-designer（D3.1，flow-designer-core + flow-designer-renderers）

| #     | 面（surface feature） | 审计要点（D3.1 plan 展开）                                                                        |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------- |
| fd-1  | canvas 渲染           | designer-canvas.tsx + canvas-bridge.tsx 渲染链路、主题样式、canvas-adapters.md 契约               |
| fd-2  | 节点                  | designer-node-card.tsx 渲染/选中/外观（designer-node-appearance.ts）                              |
| fd-3  | 边                    | designer-edge-row.tsx 渲染/交互/连接（edge-creation e2e 已覆盖建边）                              |
| fd-4  | 槽位                  | designer-xyflow-node.tsx slot affordance（Enter/Space 键盘路径，13-01 已修复）、tree mode 空槽位  |
| fd-5  | 面板                  | designer-inspector.tsx + designer-field.tsx 属性面板                                              |
| fd-6  | 树视图                | tree-domain/tree-structure/tree-validation/tree-session-impl + tree-mode.md 契约（tree-mode e2e） |
| fd-7  | 命令系统              | designer-command-adapter-graph/tree + designer-action-provider（command adapter 契约）            |
| fd-8  | 事务与 undo           | 命令事务链（core-edge/node/shell-commands + 撤销语义）                                            |
| fd-9  | 拖拽                  | 节点/边拖拽（含 pointercancel 守卫，2-14 家族先例）、drop 落点                                    |
| fd-10 | 键盘                  | 快捷键（useDesignerShortcuts）、键盘导航焦点管理                                                  |
| fd-11 | 剪贴板                | 复制/粘贴路径                                                                                     |
| fd-12 | 缩放平移              | minimap/pan/zoom（minimap-pan e2e）、resizable（resizable e2e）                                   |
| fd-13 | JSON.parse 失败路径   | designer JSON.parse 静默 null（19-3 遗留复核，0819-1 已部分修复）                                 |

## spreadsheet（D3.2，spreadsheet-core + spreadsheet-renderers）

| #     | 面（surface feature） | 审计要点（D3.2 plan 展开）                                                           |
| ----- | --------------------- | ------------------------------------------------------------------------------------ |
| ss-1  | 表格渲染              | spreadsheet-grid/ 虚拟表格渲染 + canvas-styles.css 样式契约                          |
| ss-2  | 单元格编辑            | 编辑状态/提交（SpreadsheetEditingState/EditSaveStatus + useSpreadsheetInteractions） |
| ss-3  | 工具栏                | spreadsheet-toolbar/（rd-\* 已清理，10-02）、toolbar-status/toolbar-groups           |
| ss-4  | 状态栏                | toolbar-status.tsx（sheet 状态展示）                                                 |
| ss-5  | 公式                  | SetCellFormulaCommand 命令链 + 公式语义（spreadsheet-core commands）                 |
| ss-6  | 冻结                  | FreezePanesCommand/UnfreezePanesCommand + SpreadsheetFrozenPane                      |
| ss-7  | 选择                  | SpreadsheetSelection 族（createDefaultSelection/选区工具）                           |
| ss-8  | 键盘导航              | 键盘移动/编辑路径                                                                    |
| ss-9  | 搜索                  | FindCommand/FindNextCommand/ReplaceCommand 族                                        |
| ss-10 | undo                  | UndoSpreadsheetCommand/RedoSpreadsheetCommand + 事务（Begin/Commit/Rollback）        |

## report-designer（D3.3，report-designer-core + report-designer-renderers）

| #    | 面（surface feature） | 审计要点（D3.3 plan 展开）                                                            |
| ---- | --------------------- | ------------------------------------------------------------------------------------- |
| rd-1 | 画布                  | page-renderer-\*.tsx（host projection/init/snapshots）+ report-spreadsheet-canvas.tsx |
| rd-2 | 字段拖拽              | report-field-panel.tsx + REPORT_FIELD_DRAG_MIME（drag payload 契约）                  |
| rd-3 | inspector             | report-designer-inspector.tsx + inspector-design.md 契约                              |
| rd-4 | 预览                  | 预览路径（designer 宿主场景）                                                         |
| rd-5 | 保存                  | host 保存链路（saveDocument 类路径）+ nop-report-profile.md                           |
| rd-6 | undo                  | 命令事务 + codec-design.md 编解码契约                                                 |
| rd-7 | 模板                  | ReportTemplateDocument/模板创建（createReportTemplateDocument）                       |

## word-editor（D3.4，word-editor-core + word-editor-renderers）

| #    | 面（surface feature） | 审计要点（D3.4 plan 展开）                                          |
| ---- | --------------------- | ------------------------------------------------------------------- |
| we-1 | 文档渲染              | word-editor-page.tsx + editor-canvas.tsx（CanvasEditorBridge 封装） |
| we-2 | 工具栏                | toolbar/（工具按钮族）                                              |
| we-3 | 选区                  | EditorSelectionState（editor-store.ts 选区状态）                    |
| we-4 | 数据集                | dataset-store.ts + dataset-model.ts（dataset e2e 已覆盖）           |
| we-5 | 恢复                  | document-io.ts recovery 路径（document-io-persist 测试族）          |
| we-6 | 导出                  | 导出路径（template-expr/template-model）                            |
| we-7 | 导入                  | 导入路径（document-io load）                                        |

## D3.1 增量登记（2026-08-08，plan `2026-08-08-0900-1` Phase 1 交付）

### 面级 e2e 覆盖矩阵（12 spec ↔ fd-1..fd-13）

| e2e spec                             | fd-1 | fd-2 | fd-3 | fd-4 | fd-5 | fd-6 | fd-7 | fd-8 | fd-9 | fd-10 | fd-11 | fd-12 | fd-13 |
| ------------------------------------ | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ----- | ----- | ----- | ----- |
| flow-designer-css-diag               | ✓    |      |      |      |      |      |      |      |      |       |       |       |       |
| flow-designer-dingtalk-visual        | ✓    | ✓    | ✓    |      |      |      |      |      |      |       |       | ✓     |       |
| flow-designer-edge-creation          |      |      | ✓    |      |      |      | ✓    |      |      | ✓     |       |       |       |
| flow-designer-label-text             |      | ✓    | ✓    |      |      |      |      |      |      |       |       |       |       |
| flow-designer-minimap-pan            |      |      |      |      |      |      |      |      |      |       |       | ✓     |       |
| flow-designer-resizable              |      |      |      |      | ✓    |      |      |      | ✓    | ✓     |       | ✓     |       |
| flow-designer-tree-mode              |      | ✓    | ✓    | ✓    |      | ✓    |      |      |      |       |       |       |       |
| flow-designer-ui                     |      |      |      |      | ✓    |      | ✓    |      |      |       |       |       | ✓     |
| flow-designer-collapsible            |      |      |      |      | ✓    |      |      |      |      |       |       |       |       |
| node-title-subtitle-gap              |      | ✓    |      |      |      |      |      |      |      |       |       |       |       |
| designer-summary-renderers           |      | ✓    | ✓    |      | ✓    |      | ✓    |      |      |       |       |       |       |
| taskflow-designer-ui                 | ✓    | ✓    | ✓    |      |      | ✓    | ✓    |      |      |       |       |       |       |
| flow-designer-undo-clipboard（新增） |      |      |      |      | ✓    |      | ✓    | ✓    |      | ✓     | ✓     |       |       |
| flow-designer-slot-drag（新增）      |      |      |      | ✓    |      | ✓    | ✓    |      | ✓    |       |       |       |       |

**缺口清单（= Phase 5 新增场景候选，2026-08-08 全部闭合）**：

- **fd-4 槽位**：槽位键盘激活（Enter/Space → 加号菜单）无真实浏览器场景（13-01 修复仅单元覆盖 `designer-xyflow-node.keyboard.test.tsx`）——**已闭合**：新增 `flow-designer-slot-drag.spec.ts`（tree mode plus button → Add node 菜单 → 选型 → 节点 +1，同一 onPlusButtonClick 链路的真实浏览器验证）；空槽位键盘路径维持单元级覆盖（playground 两 tree 示例无空分支，覆盖决策在案）。
- **fd-8 事务与 undo**：undo/redo 无任何 e2e 场景——**已闭合**：新增 `flow-designer-undo-clipboard.spec.ts`（Delete → Ctrl+Z 恢复 → Ctrl+Y 再删）。
- **fd-9 拖拽**：节点拖拽（moveNode）与 palette 拖放建节点无 e2e（resizable 面板拖拽为间接覆盖）——**已闭合**：`flow-designer-slot-drag.spec.ts` 鼠标拖拽节点（down/move/up 全生命周期 → transform 提交断言）。
- **fd-10 键盘**：快捷键映射（undo/delete/copy/paste）无 e2e（建边/面板箭头为间接覆盖）——**已闭合**：`flow-designer-undo-clipboard.spec.ts` 全快捷键映射真机解析。
- **fd-11 剪贴板**：复制/粘贴无任何 e2e——**已闭合**：`flow-designer-undo-clipboard.spec.ts` Ctrl+C/V（当场暴露并修复 P1 pasteClipboard 命令缺口，见 fd-11 卡 + bug 91）。
- **fd-13 JSON.parse**：失败路径仅单元覆盖——维持单元级覆盖（显式决策，见 fd-13 卡）。

### 已知遗留输入终态核对（2026-08-08 live）

- **19-3 JSON.parse 静默 null（fd-13）→ 收敛**：renderers 包唯一用户可见 JSON.parse 站点 `designer-page-body.tsx:193-255`（try/catch → `reportHostIssue` + 用户可见文案 `flux.flowDesigner.flowJsonParseError`），回归测试 `designer-page-json-export.test.tsx:20` 在案；`tree-validation.ts:100`/`tree-session-impl.ts` 等 core 站点为内部往返序列化（canonicalize 自产自销），非静默 null 风险。
- **15-2 NaN fail-closed（fd-4 相关）→ 收敛**：0150-3 已补 fail-closed 用例 `designer-xyflow-node.keyboard.test.tsx:121-139`（零尺寸矩形 → 有限 (0,0) 回退 + 调用计数锁定），无 NaN 传播路径；不另行登记 P1。
- **MA4.3 缺口（H7 回归基准）**：`createDesignerStoreAdapter`（MA43-P1-01）**已补测**（`adapters/designer-store-adapter.test.ts` 7 用例，2026-07-27 后补齐）；`resolveDesignerManifest`/`designerHostContract`/`DESIGNER_CAPABILITY_PUBLICATION` **仍零直接测试**（H7 缺口，Phase 2/3 回归项）；`DesignerCanvasContent` 仅间接测试（H7 记录项）。

## D3.2 增量登记（2026-08-08，plan `2026-08-08-1315-1` Phase 1 交付）

### 面级 e2e 覆盖矩阵（既有 spec ↔ ss-1..ss-10）

| e2e spec                                    | ss-1 | ss-2 | ss-3 | ss-4 | ss-5 | ss-6 | ss-7 | ss-8 | ss-9 | ss-10 |
| ------------------------------------------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ----- |
| report-designer-demo（用例 1 核心面渲染）   | ✓    |      | ✓    |      |      |      | ✓    |      |      |       |
| report-designer-demo（用例 3 行列头）       | ✓    |      |      |      |      |      |      |      |      |       |
| report-designer-demo（用例 4 sticky 滚动）  | ✓    |      |      |      |      |      |      |      |      |       |
| report-designer-demo（用例 5 cell 点击）    |      |      |      |      |      |      | ✓    |      |      |       |
| report-designer-demo（用例 6 工具栏本地化） |      |      | ✓    | ✓    |      |      |      |      |      |       |
| report-designer-demo（用例 7 编辑器移除）   |      | ✓    |      |      |      |      |      |      |      |       |
| report-designer-demo（用例 8 字段拖拽写值） | ✓    | ✓    |      |      |      |      |      |      |      |       |
| report-designer-demo（用例 9 sheet tab）    |      |      |      |      |      |      | ✓    |      |      |       |
| exploratory/subagent-a（工具栏 + 零 error） |      |      | ✓    |      |      |      |      |      |      |       |
| spreadsheet-demo（**新增，Phase 5 落地**）  | ✓    | ✓    | ✓    | ✓    | ✓    | ✓    | ✓    | ✓    | ✓    | ✓     |

> 以上既有 spec 宿主归属 = report-designer（`report-designer-demo.spec.ts` 9 用例）与 exploratory 兜底（1 用例）；**真缺口已闭合**：D3.2 Phase 5 新建独立宿主页（`apps/playground/src/pages/spreadsheet-demo.tsx` + `spreadsheet-page.tsx`，route `#/spreadsheet`）+ 独立 spec `spreadsheet-demo.spec.ts`（10 用例，每面 ≥1 场景，programmatic DOM 断言；同时构成 P1 修复 107/108 的 e2e 确认点），2026-08-08 全绿（10/10）。

### D3.2 收口增量（2026-08-08）

- **owner doc 落地**：`docs/architecture/spreadsheet/design.md` 新建（Phase 1 裁决，单文件 <40 KB，只写最终设计状态）；README §1 spreadsheet 行契约基准更新为「spreadsheet/design.md + report-designer 侧两文件（宿主视角保留）」。
- **新增 spec 登记**：`tests/e2e/spreadsheet-demo.spec.ts`（10 用例）；`playground-entry-pages.spec.ts` 补 spreadsheet 路由断言（ROUTE_ASSERTIONS）。

### 已知遗留输入终态核对（2026-08-08 live）

- **MA43-P1-06/07 → 收敛（纯复核非 re-fix）**：`resolveSpreadsheetManifest`/`spreadsheetHostContract` 直接测试在案（`spreadsheet-manifest.test.ts` 两 describe 块：resolveSpreadsheetManifest 三版本别名 + spreadsheetHostContract 绑定）；arm-index 标 fixed R2.37/R2.38 与 live 一致。
- **spreadsheet-core 默认工厂 4 函数零测试 → 复核确认仍零直接测试**（`createDefaultSelection`/`createDefaultViewport`/`createDefaultHistory`/`createDefaultLayout`，types.ts:267-289；`createDefaultViewport` 仅 core.ts:49 间接使用）→ H7 回归项，Phase 4 补测。
- **MA5 P3-03 同义反复测试 → 确认仍同义反复**（`use-spreadsheet-interactions.test.ts` 仅编译期 key 计数）→ Phase 4 重写为行为断言。
- **MA5 P3-06 no-op 回调 → 确认 live**（`use-spreadsheet-shell.ts:25-35` `setCellValue`/`setCommentText` 空回调，消费点 use-selection.ts:239-241/use-clipboard.ts:57/use-comments.ts:45；toolbar cell-editor UI 已移除但状态管线残留）→ ss-2/ss-7 面裁决。
- **MA5 P3-12 计数语义 → 确认 live**（`spreadsheet-grid/constants.ts:105-123` `getSelectedAxisInfo` count 返回 span `end-start+1` 而非实际选中数；消费点 spreadsheet-grid.tsx:75-76 + use-context-menu-actions.ts:104/137/168）→ ss-7 面 P1/P2 登记。

## D3.3 增量登记（2026-08-08，plan `2026-08-08-1315-2` Phase 1 交付）

### 面级 e2e 覆盖矩阵（既有 spec ↔ rd-1..rd-7）

| e2e spec                                        | rd-1 | rd-2 | rd-3 | rd-4 | rd-5 | rd-6 | rd-7 |
| ----------------------------------------------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| report-designer-demo（用例 1 核心面渲染）       | ✓    |      |      |      |      |      |      |
| report-designer-demo（用例 2 字段项+inspector） |      | ✓    | ✓    |      |      |      |      |
| report-designer-demo（用例 3 行列头）           | ✓    |      |      |      |      |      |      |
| report-designer-demo（用例 4 sticky 滚动）      | ✓    |      |      |      |      |      |      |
| report-designer-demo（用例 5 cell 点击）        |      |      | ✓    |      |      |      |      |
| report-designer-demo（用例 6 工具栏本地化）     | ✓    |      |      |      |      |      |      |
| report-designer-demo（用例 8 字段拖拽写值）     |      | ✓    |      |      |      |      |      |
| report-designer-demo（用例 9 sheet tab）        | ✓    |      |      |      |      |      |      |
| report-designer-host（**新增，Phase 5 落地**）  | ✓    | ✓    | ✓    | ✓    | ✓    | ✓    | ✓    |

**缺口清单（= Phase 5 新增场景候选，2026-08-08 全部闭合）**：

- **rd-4 预览**：无任何 e2e（demo 页无 preview adapter/入口）——**已闭合**：新增 `report-designer-host.spec.ts`（宿主页 toolbar Preview → mock preview adapter → running/完成态 + result 断言）。
- **rd-5 保存**：无任何 e2e（demo 页无 save 入口）——**已闭合**：新增 spec（edit → Save → dirty 清除断言；save 数据导出 data 断言）。
- **rd-6 undo**：无任何 e2e（demo 页无 report-designer undo 入口）——**已闭合**：新增 spec（edit → Undo 回退 → Redo 恢复，构成 P1-111 修复的 e2e 确认点）。
- **rd-7 模板**：无任何 e2e（模板创建/导入导出链路）——**已闭合**：新增 spec（无效 document → 空模板 fallback 态断言）。

### D3.3 收口增量（2026-08-08）

- **新增宿主页 + spec 登记**：`apps/playground/src/pages/report-designer-host-demo.tsx` + `report-designer-host-page.tsx`（route `#/report-designer-host`，真实 `report-designer-page` renderer 宿主）；`tests/e2e/report-designer-host.spec.ts`（5 用例，2026-08-08 全绿）；`playground-entry-pages.spec.ts` 补 report-designer-host 路由断言。
- **P1 修复登记（3 条 test-first，bug note 111–113）**：111 undo/redo/importTemplate 不回传画布（page-renderer syncSource guard + applied-clone ref）；112 StrictMode core dispose（ref-diff 托管）；113 toolbar `!` 取反模板死代码（直读 readStatePath）。
- **P2 路由登记（DR-7..DR-11）**：rd-4 预览 i18n / rd-5 保存 i18n / rd-6 undo i18n / rd-7 模板 i18n / rd-2 拖放 i18n（`round2-dr-adjudication.md` 11 条零悬挂）。
- **MA5 P3-09 收敛**：`as never` 类型修复（`SpreadsheetRuntimeSummaryInput` 窄接口）。

### 已知遗留输入终态核对（2026-08-08 live）

- **MA4.3 九条缺口（H7 回归基准）→ 全部收敛（纯复核非 re-fix）**：MA43-P0-01 `isReportDesignerCommand`（`__tests__/commands.test.ts:4-81` 直接测试）；MA43-P0-02/03 `resolveReportDesignerManifest`/`REPORT_DESIGNER_CAPABILITY_PUBLICATION`（`__tests__/report-designer-manifest-and-helpers.test.ts` 两 describe）；MA43-P0-04 `useReportDesignerHostScope`（同文件 renderHook）；MA43-P0-05 `readReportFieldDragPayload`（同文件 :176 起）；MA43-P1-02 `registerPreview`（`__tests__/adapters-and-helpers.test.ts:238`）；MA43-P1-03 readonly guard（`designer-core.test.ts:316-372`，含非 mutation 命令放行）；MA43-P1-04 `toReportDesignerActionResult`（`host-action-provider.test.ts:146-212`）；MA43-P1-05 `createReportFieldDragPayload`/`writeReportFieldDragPayload`（`__tests__/report-designer-manifest-and-helpers.test.ts:108-175`）——arm-index fixed 标注与 live 一致。
- **MA5 P3-09 `bridge.ts:75-86` `as never` → 收敛**：仍存在 → H1 面登记裁决 = **P2 低成本当场修复**（Phase 4：`buildAggregatedRuntimeSummary` 参数改窄接口 `SpreadsheetRuntimeSummaryInput`，bridge 传类型安全对象；行为由既有 `bridge.test.ts` deriveDesignerHostSnapshot 断言锁定）。
- **MA5 P2-03 inspector auto-open race → 收敛（复核）**：`page-renderer.tsx:383-403` 的 useEffect deps 已含 `actionScope`（修复方向 1 已落地），auto-open 与 namespace 注册同 commit 生效。

## 引用关系

- D3.1 plan 引用: 本清单 fd-1..fd-13 + `docs/audits/host-surface/README.md` §1/§2（flow-designer 行）。
- D3.2 plan 引用: ss-1..ss-10 + README §1/§2（spreadsheet 行，含 owner doc gap 与 e2e coverage gap 两 Decision）。
- D3.3 plan 引用: rd-1..rd-7 + README §1/§2（report-designer 行）。
- D3.4 plan 引用: we-1..we-7 + README §1/§2（word-editor 行）。
