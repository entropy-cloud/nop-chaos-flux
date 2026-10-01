# UX-R9 Report Designer 检查器与首屏内容

> Plan Status: draft
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（RD-1/2/3）、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` R9
> Related: `apps/playground/src/pages/report-designer-demo.tsx`（demo owner）、`packages/report-designer-core/`（config 契约）、`packages/spreadsheet-core/`（cell style 命令面）

## Purpose

把 Report Designer 演示从"打开全空、检查器纯占位文本、绑定单元格 9px 难读"修复为"打开即见示例报表、选中绑定单元格后检查器提供可用的样式操作、工具栏可辨识"。

## Current Baseline

- **RD-1（代码实锤）**：`report-designer-demo.tsx:104` `createEmptyDocument('demo-spreadsheet')` — 画布电子表格全空；`createReportTemplateDocument` 仅生成模板骨架（无示例内容）。对标 Univer/Handsontable demo 均预置完整示例。
- **RD-2（代码实锤）**：`designerConfig.inspector.byTarget` 的 cell/sheet/row/column/range body 全部为静态占位文本（:130-176，如 cell='Cell selected' + 'Use drop from the field panel to bind a dataset field.'）。spreadsheet-core 已有完整 cell style 命令面（`spreadsheet:setCellFontWeight/Style/TextDecoration/TextAlign/FontSize/FontColor` 等，cell-handlers.ts:217-231）——检查器接入即可提供真实样式操作。
- **RD-3（部分核实）**：绑定单元格文本 9px 灰字难读（画布样式）；工具栏无分组标签/提示（执行期定位工具栏实现后定修复形态）。
- 现有测试：`report-designer-demo.test.tsx` 全绿基线。

## Goals

- 打开即见示例报表：demo 电子表格预置销售示例（标题行+表头+绑定字段示例+数据行），RD-1 消除空屏。
- cell 检查器：选中单元格后提供可用的样式操作（加粗/斜体/下划线/对齐/字号，经既有 `spreadsheet:setCell*` 命令面），绑定信息可读展示——替换纯占位文本。
- sheet/row/column/range 检查器：占位文本改为有信息量的引导（保留必要的 drop 引导，但补充选中对象的具体信息，如 sheet 名/选区地址）。
- 绑定单元格可读性：9px 灰字提升（画布样式，遵守 spreadsheet canvas 令牌契约）。
- 既有套件全绿 + 新行为测试钉住。

## Non-Goals

- report-designer-core 文档模型/命令语义变更（检查器仅消费既有命令面与 config 契约）。
- 工具栏重构（RD-3 仅做可辨识度提升——tooltip/aria 标签/分组间距；完整工具栏重设计归后续）。
- 新检查器字段类型（仅使用 registry 已注册的 renderer 形态）。

## Scope

### In Scope

- `apps/playground/src/pages/report-designer-demo.tsx`（示例数据、inspector byTarget bodies、绑定文本样式）
- `packages/report-designer-renderers/`（仅当绑定单元格文本样式落在渲染器侧时）
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

Status: planned
Targets: `report-designer-demo.tsx`

- Item Types: `Proof`, `Fix`

- [ ] rd1 用例先红：打开页面画布无示例内容 → 修复：spreadsheetDoc 预置销售示例（标题+表头+示例行，含一个绑定字段示例单元格）
- [ ] rd2 用例先红：cell 检查器无样式控件 → 修复：cell body 接入样式操作控件（经 spreadsheet 命令面；控件形态以 registry 已注册 renderer 为准），e2e 断言加粗生效
- [ ] sheet/row/column/range body 信息化（选中对象名/地址动态部分若 config 契约不支持表达式则静态引导+具体操作指引）
- [ ] playground 套件全绿

Exit Criteria:

- [ ] rd1/rd2 用例先红后绿
- [ ] 套件全绿

### Phase 2 - 绑定可读性与工具栏可辨识

Status: planned
Targets: `report-designer-demo.tsx`（或绑定文本渲染落点）

- Item Types: `Proof`, `Fix`

- [ ] rd3 用例先红：绑定单元格文本 computed font-size ≤10px 或过淡 → 修复：字号/颜色提升（遵守 canvas 令牌契约，css 落点以 live 核实为准）
- [ ] 工具栏可辨识：按钮 title/aria-label 补全（定位工具栏实现后定形态）
- [ ] 套件全绿

Exit Criteria:

- [ ] rd3 用例先红后绿
- [ ] 套件全绿

## Draft Review Record

- Reviewer / Agent: 待独立子 agent review（共识后执行）
- Verdict: pending
- Rounds: 0
- Findings addressed: —

## Closure Gates

- [ ] Phase 1/2 全部 completed 且 Exit Criteria 全勾
- [ ] 新增失败路径测试存在且通过（先红后绿记录在 daily log）
- [ ] 浏览器/e2e 实测证据存档
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增红项）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Non-Blocking Follow-ups

- 工具栏分组重设计（RD-3 深层）
- 检查器属性维度扩展（数字格式/边框等）

## Closure

Status Note: —

Closure Audit Evidence:

- Auditor / Agent: —
- Evidence: —
