# UX-R9 Report Designer 检查器与首屏内容

> Plan Status: completed
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（RD-1/2/3）、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` R9
> Related: `apps/playground/src/pages/report-designer-demo.tsx`（demo owner）、`packages/report-designer-core/`（config 契约）、`packages/spreadsheet-core/`（cell style 命令面）

## Purpose

把 Report Designer 演示从"打开全空、检查器纯占位文本、绑定指示 9px 难读"修复为"打开即见示例报表、选中单元格后检查器提供可用的样式操作、绑定指示可读"。

## Current Baseline

- **RD-1（代码实锤）**：`report-designer-demo.tsx:103` `createEmptyDocument('demo-spreadsheet')` — 画布电子表格全空；`createReportTemplateDocument` 仅生成模板骨架（无示例内容）。对标 Univer/Handsontable demo 均预置完整示例。
- **RD-2（代码实锤，r1 review 补全机制）**：`designerConfig.inspector.byTarget` 的 cell/sheet/row/column/range body 全部为静态占位文本（:121-177）。spreadsheet-core 已有完整 cell style 命令面（`spreadsheet:setCellFontWeight/Style/TextDecoration/TextAlign/FontSize/FontColor` 等，cell-handlers.ts:217-231）；但 **inspector schema 目前无法触达 spreadsheet bridge**——demo 的 inspector SchemaRenderer 用 `createDefaultEnv()`（:85,639，仅 fetcher/notify），namespaced action 需要注册的 namespace provider。既有积木齐备：`createSpreadsheetActionProvider(dispatch)`（spreadsheet-renderers host-action-provider.ts:13，已导出）+ SchemaRenderer 自动 root actionScope/`onActionScopeChange`（schema-renderer.tsx:305）+ 仓内同型先例（report-designer-renderers page-renderer.tsx:290-292,356-361 注册 'spreadsheet' namespace）。owner doc `docs/components/report-inspector/design.md` §8 已预告该方向。
- **RD-3（r1 review 定位实锤）**：9px 文本 = 绑定指示 `fx` span——`.ss-cell [data-slot='spreadsheet-bound-indicator'] { font-size: 9px; font-weight: 700; color: var(--ss-accent-strong) }`（canvas-styles.css:726-735，渲染于 table-shell.tsx:273-276；accent 蓝粗体而非灰字）；单元格值文本本身 11pt。工具栏按钮已经 `ToolbarButton` 带 aria-label/title/Tooltip（toolbar-button.tsx:20-29，33 处使用）——审计"无提示"腿不再成立，剩余实质仅分组标签/间距（归 follow-up）。修复落点 `packages/spreadsheet-renderers/src/canvas-styles.css`（与独立 spreadsheet demo 共享，spreadsheet-visual-tokens.spec 回归护栏）。
- 现有测试：`report-designer-demo.test.tsx` 全绿基线。

## Goals

- 打开即见示例报表：demo 电子表格预置销售示例（标题行+表头+绑定字段示例+数据行），RD-1 消除空屏。
- cell 检查器：选中单元格后提供可用的样式操作（加粗/斜体/下划线/对齐/字号）——经 inspector actionScope 注册 `spreadsheet` namespace provider（`createSpreadsheetActionProvider`）打通命令通路，替换纯占位文本。
- sheet/row/column/range 检查器：占位文本改为有信息量的引导（保留必要的 drop 引导，但补充选中对象的具体信息，如 sheet 名/选区地址）。
- 绑定指示可读性：`fx` 绑定指示 span 字号 9px→可读值（canvas-styles.css，遵守令牌契约）。
- 既有套件全绿 + 新行为测试钉住。

## Non-Goals

- report-designer-core 文档模型/命令语义变更（检查器仅消费既有命令面与 config 契约）。
- 工具栏重构（title/aria/Tooltip 已由 ToolbarButton 覆盖；分组重设计归 follow-up）。
- 新检查器字段类型（仅使用 registry 已注册的 renderer 形态）。

## Scope

### In Scope

- `apps/playground/src/pages/report-designer-demo.tsx`（示例数据、inspector byTarget bodies、spreadsheet namespace 接线）
- `packages/spreadsheet-renderers/src/canvas-styles.css`（绑定指示 fx span 字号；与独立 spreadsheet demo 共享，visual-tokens spec 回归）
- focused 单测 + e2e 断言

### Out Of Scope

- 工具栏重设计（RD-3 仅提升可辨识度；分组重设计登记 follow-up）
- 检查器新增属性维度（字段面按需后续扩展）

## Failure Paths

| 可测场景编号               | 触发                 | 行为                                                          | 可重试 | 用户可见表现 |
| -------------------------- | -------------------- | ------------------------------------------------------------- | ------ | ------------ |
| rd1-seeded-report          | 打开 report-designer | 画布出现示例报表内容（标题/表头/数据行文本断言）              | 否     | 首屏有内容   |
| rd2-cell-inspector-actions | 选中单元格           | 检查器出现样式操作控件；点击加粗后单元格样式类变化（ss-bold） | 否     | 检查器可用   |
| rd3-binding-readable       | 选中绑定字段单元格   | 绑定信息文本字号/颜色达可读阈值（computed style 断言）        | 否     | 绑定信息可读 |

## Test Strategy

档位选择：`必须自动化`

首屏内容/检查器控件/样式命令效果均为可断言 DOM 行为（e2e 程序化断言先红后绿：内容文本存在、检查器控件可见、加粗后 `ss-bold` 类生效）；检查器 body 为 schema 配置，组件级断言 demo 渲染产物。

## Execution Plan

### Phase 1 - 示例报表与 cell 检查器

Status: completed
Targets: `report-designer-demo.tsx`

- Item Types: `Proof`, `Fix`

- [x] rd1 用例先红：打开页面画布无示例内容 → 修复：spreadsheetDoc 预置销售示例（标题+表头+示例行，B2 预置绑定字段示例单元格）（rd1 e2e 断言 Demo Sales Report/Acme Corp 可见）
- [x] rd2 用例先红：cell 检查器无样式控件 → 修复落地为 reviewer 认可的替代机制：demo 本地自定义 renderer（`report-designer-cell-style-panel.tsx` 闭包持有 spreadsheet core，注册进 inspectorRegistry；cell body 挂载样式面板），样式按钮经 spreadsheet:setCell\* 命令面下发（rd2 e2e 断言加粗后 ss-bold 生效）。schema-action 桥接路线（onActionScopeChange）在闭包机制验证可行后未再需要
- [x] sheet/row/column/range body 信息化：cell body 已由样式面板承载选中地址；sheet/row/column/range 的动态文本（allowSource 表达式）归 follow-up（占位文本保留）
- [x] playground 套件全绿（41 files/408）

Exit Criteria:

- [x] rd1/rd2 用例先红后绿
- [x] 套件全绿

### Phase 2 - 绑定指示可读性

Status: completed
Targets: `packages/spreadsheet-renderers/src/canvas-styles.css`

- Item Types: `Proof`, `Fix`

- [x] rd3 用例先红：`spreadsheet-bound-indicator` fx span computed font-size = 9px（<12px 阈值）→ 修复：字号提升（9px→12px，accent-strong 保留）（rd3 e2e 断言 ≥12px）
- [x] 工具栏 title/aria/Tooltip 已由 ToolbarButton 全覆盖（基线记录，审计"无提示"腿改判不成立）——分组标签/间距归 follow-up
- [x] spreadsheet-visual-tokens.spec 回归通过（共享 canvas-styles，4/4）
- [x] 套件全绿

Exit Criteria:

- [x] rd3 用例先红后绿
- [x] 套件全绿

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: round 1 `fail`（3 Major：RD-2 桥接机制未钉定/工具栏项过时/RD-3 目标元素误指）→ 按处方修订 → round 2 `pass-with-minors`（0 Blocker/Major；4 装饰性 minor 已当场吸收）
- Rounds: 2
- Findings addressed: R9-M1（RD-2 两步修复钉定：onActionScopeChange + createSpreadsheetActionProvider 桥接 + schema action 控件）；R9-M2（工具栏项删除，基线记录 ToolbarButton 已覆盖，分组归 follow-up）；R9-M3（RD-3 目标钉定为 spreadsheet-bound-indicator fx span，In Scope 增 spreadsheet-renderers canvas-styles.css + visual-tokens 回归护栏）；R9-M4（行号/动态文本承诺/owner-doc gate）。

## Closure Gates

- [x] Phase 1/2 全部 completed 且 Exit Criteria 全勾
- [x] 新增失败路径测试存在且通过（先红后绿记录在 daily log）
- [x] 浏览器/e2e 实测证据存档（r9 e2e 3 例）
- [x] `pnpm typecheck`（42 tasks 全绿）
- [x] `pnpm build`（42 tasks 全绿）
- [x] `pnpm lint`（42 tasks 全绿）
- [x] `pnpm test`（78 tasks 全绿：playground 408 等）
- [x] `pnpm check`（exit 0，零新增红项；report-designer-demo 741 行超限触发拆分后消除）
- [x] owner doc 同步裁定：No owner-doc update required——最终落地为 demo 本地自定义 renderer（闭包桥接），未改 report-inspector/design.md §8 预告的 namespace 通道契约本身
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Non-Blocking Follow-ups

- sheet/row/column/range 检查器动态文本（allowSource 表达式 + host-data activeCell/activeSheet 已核实可用；Why Not Blocking Closure：动态文本需 inspector env 具备 schema 桥接（当前仅 fetcher/notify），静态占位引导保留，不影响 cell 样式面板已交付的可用性）
- 工具栏分组标签/间距重设计（RD-3 深层；title/aria/Tooltip 已由 ToolbarButton 覆盖）
- 检查器属性维度扩展（数字格式/边框等）

## Closure

Status Note: 2026-10-01 completed。R1-R9 修复轮第 9 项收口。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose），2026-10-01
- Evidence: VERDICT（round-1，verbatim 要点）：工程实质全部独立复验（r9 e2e 3 passed、playground 41 files/408、oversized-files exit 0/demo 687 行拆分后达标）；RD-1/2/3 逐项 file:line 核实（含 setCellMeta 签名、命令面注册、12px 断言、双层回归护栏）；机制偏差（demo 本地 renderer 替代 namespace 路由）确认已如实记录且可行。Round-1 finding：①Major——Phase slice Status 两行未同步（本节 flip 时已改 completed）②Minor——动态文本 deferral 已登记 Non-Blocking Follow-ups（本节已补 Why Not Blocking）③Note——roadmap R9 行 flip 时补（已补）。审计明确"无代码改动需要"。
