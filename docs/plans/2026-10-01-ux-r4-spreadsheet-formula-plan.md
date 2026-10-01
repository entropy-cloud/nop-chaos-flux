# UX-R4 电子表格公式求值与编辑交互

> Plan Status: completed
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（SP-1/SP-2/SP-3）、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` R4
> Related: `docs/components/spreadsheet-page/design.md`（owner doc）

## Purpose

把 `#/spreadsheet` 从"公式原文显示、永不求值"修复为"公式输入即计算、依赖变更联动重算、错误显式呈现"，附带修复 type-to-edit 交互与演示数据贫瘠问题。

## Current Baseline

- **SP-1 根因（已实锤）**：spreadsheet-core **没有任何公式求值引擎**。`applySetCellFormula`（`packages/spreadsheet-core/src/core/cell-operations.ts:32-56`）只把 formula 字符串存进 cell 文档；全仓 grep 无 evaluateFormula/recalc 等实现。网格显示读 `cell.value`（`spreadsheet-grid/table-shell.tsx:180`），键入的 `=SUM(B1:B2)` 原样成为 value → 显示原文。宿主"Set Formula on selected cell"按钮走同一存储通路 → 同样显示原文。
- 单元格文档模型：`CellDocument` 含 `value`/`formula` 双字段（`types.ts:103/:233` 附近），已有 formula 字段位——引擎产出可写回 value、保留 formula 供编辑回显。
- SP-2 type-to-edit：**已实现且工作**（独立复测推翻审计观察）——`spreadsheet-grid.tsx:390-403` 单字符键分支（`core.startEditing` + `onEditValueChange(event.key)`）、容器可聚焦（:342 tabIndex=0）、点击经 `handleGridCellClick→focusGridRoot`（:186-190）、overlay input 自动 focus（inline-controls.tsx:21-29）；独立 Playwright 探针四种场景（单击后键入 x / =、方向键移动后键入、双击对照）全部通过（探针存档 `_tmp/spreadsheet-type-to-edit-probe.mjs`）。审计原观察可能来自 IME composition（key='Process' 时 `event.key.length===1` 不成立）——Phase 3 修正审计报告 SP-2 行。
- SP-3：演示数据仅 5 个单元格（Alpha/42/Beta/7/Middle，`spreadsheet-demo.tsx:33-37`）；底部开发日志条外露（`data-testid="spreadsheet-demo-log"`，:227-236）。
- **提交通路事实（M2 依据）**：键盘/双击编辑提交走 `use-editing.ts:51-93` handleEditSave → `spreadsheet:setCellValue`（value=原文）；工具栏公式条走 `useCellValueSync`（use-spreadsheet-interactions.ts:323）→ 同样 setCellValue——`formula` 字段永不被用户键入触达。所有值变更 handler 统一经 `applySimpleDocumentMutation`（internal-state.ts:82-91），但 undo/redo/rollback 直接换 document 不经此路（history-handlers.ts:45-90）；唯一统一分发出口为 `dispatchSpreadsheetCommand`（core-dispatch.ts:12-32）。初始文档经 `createSpreadsheetCore({ document })` 装载（core.ts:41-47），不经任何命令。
- `pnpm check` 基线全绿（`docs/logs/2026/09-30.md` 记录）；spreadsheet-core/renderers 现有测试全绿。

## Goals

- spreadsheet-core 内建最小公式引擎：`=` 前缀公式解析（单元格引用 A1、区域 A1:B2、四则与幂/括号/一元负号、比较符、SUM/AVERAGE/MIN/MAX/COUNT/COUNTA/ROUND/ABS），循环引用显式 `#CIRC!`、未知函数 `#NAME?`、除零 `#DIV/0!`、坏引用 `#REF!`、语法错误 `#ERROR!`。
- 公式进入存储的通路（Decision，见 Failure Paths 前说明）：用户键入 `=` 前缀内容在提交时升格写入 `formula` 字段（编辑提交与公式条两条主入口路由），重算层对存量 `=` 前缀 value 防御性兼容；重算挂在统一分发出口 `dispatchSpreadsheetCommand`（天然覆盖键入/Set Formula/粘贴/删除/填充/排序/find-replace/undo/redo/transaction）；初始文档装载时执行一次全量求值（种子公式可见）。编辑态回显 formula 原文、显示态呈现计算值。
- type-to-edit：已实现且复测通过——组件级测试钉住行为防回归（不重做交互）。
- 演示页数据充实为带公式的示例表；开发日志条默认收起或移除。

## Non-Goals

- 不做完整 Excel 函数库（首版函数集见 Goals，其余函数按需后续扩展）。
- 不做跨 sheet 引用/易变函数（NOW/RAND）/数组公式。
- 不改 spreadsheet 文档 schema 公共结构（formula/value 字段已存在）。
- 不做性能级增量依赖图（全量重算在演示规模足够；增量求值归 follow-up）。

## Scope

### In Scope

- `packages/spreadsheet-core/src/`（公式引擎模块 + 命令通路集成重算）
- `packages/spreadsheet-renderers/src/`（type-to-edit 交互、编辑态公式回显、演示日志条）
- `apps/playground/src/pages/spreadsheet-page.tsx`（演示数据充实）
- `tests/e2e/spreadsheet*.spec.ts`（新增/扩展公式断言）
- owner doc 同步 + 审计报告 SP-1/2/3 补注

### Out Of Scope

- 增量依赖图重算、跨 sheet 引用、函数库扩展
- spreadsheet 工具栏格式化能力扩展

## Failure Paths

| 可测场景编号        | 触发                                      | 行为                          | 可重试 | 用户可见表现 |
| ------------------- | ----------------------------------------- | ----------------------------- | ------ | ------------ |
| sheet-formula-circ  | 公式直接/间接引用自身                     | 该单元格显示 `#CIRC!`，不挂死 | 否     | 错误文本入格 |
| sheet-formula-name  | 未知函数名（=FOO(1)）                     | `#NAME?`                      | 否     | 错误文本入格 |
| sheet-formula-div0  | 除数为 0                                  | `#DIV/0!`                     | 否     | 错误文本入格 |
| sheet-formula-ref   | 引用越界单元格（ZZ99 语法合法但越界文档） | `#REF!`                       | 否     | 错误文本入格 |
| sheet-formula-parse | 语法错误（=1+）                           | `#ERROR!`                     | 否     | 错误文本入格 |

## Test Strategy

档位选择：`必须自动化`

公式引擎属核心回归面：纯函数模块 Vitest 全覆盖（解析/求值/错误/重算/装载求值，先红后绿）；提交路由升格与重算挂点有集成测试；渲染交互（编辑回显、type-to-edit 防回归）组件级测试 + e2e 断言显示值。

## Execution Plan

### Phase 1 - 公式引擎纯模块

Status: completed
Targets: `packages/spreadsheet-core/src/formula/`（新模块：tokenizer/parser/evaluator）

- Item Types: `Proof`, `Fix`

- [x] 引擎测试先红：引用/区域/四则/比较/七函数/括号/错误值五类/循环引用
- [x] 实现 tokenizer + 递归下降 parser + evaluator（值解析器回调注入，core 集成时提供单元格取值）；数值/布尔/字符串字面量
- [x] `pnpm --filter @nop-chaos/spreadsheet-core test` 全绿

Exit Criteria:

- [x] 引擎用例先红后绿，覆盖 Goals 全部语法面与五类错误
- [x] 包测试全绿

### Phase 2 - core 集成重算与提交路由

Status: completed
Targets: `packages/spreadsheet-core/src/`（core-dispatch.ts、core.ts、command-handlers）、`packages/spreadsheet-renderers/src/`（use-editing.ts、use-spreadsheet-interactions.ts）

- Item Types: `Fix`, `Decision`

- [x] 重算挂点：`dispatchSpreadsheetCommand` 出口后全量重算（formula/`= ` 前缀 value 单元格求值写回 value，保留 formula 字段；含 undo/redo/transaction 恢复后的自洽）——集成测试先红后绿（改 B1 → =SUM(B1:B2) 联动、粘贴含公式区域、排序搬移公式格、undo 后一致）；执行补强：per-sheet 身份保持修复 + 多 sheet 引用保持测试
- [x] 装载求值：`createSpreadsheetCore` 对含 formula/`=` 前缀 value 的初始文档跑一次全量求值——先红后绿（种子公式打开即见计算值）
- [x] 提交路由升格：handleEditSave 与公式条（useCellValueSync）对 `=` 前缀 value 改调 setCellFormula；`startEditing` 编辑种子改取 formula 优先（编辑回显原文）——组件级测试先红后绿（use-editing.test.tsx 4 例 + use-cell-value-sync.test.tsx 3 例）
- [x] 编辑态回显 formula 原文、显示态呈现计算值（含防御性存量 `=` value 兼容路径测试）；执行补强：修复 editor 挂载 `input.select()` 全选种子字符缺陷（R2-2c-A9-156，光标置尾 + inline-controls.test.tsx 2 例钉住）
- [x] `pnpm --filter @nop-chaos/spreadsheet-core test` + `@nop-chaos/spreadsheet-renderers test` 全绿

Exit Criteria:

- [x] 重算/装载求值/提交路由用例先红后绿（覆盖联动、粘贴、排序、undo 一致性、种子公式）
- [x] 编辑回显与 type-to-edit 行为有测试钉住（type-to-edit 为防回归钉，非新实现）
- [x] 两包测试全绿

### Phase 3 - 演示充实与 e2e 断言

Status: completed
Targets: `apps/playground/src/pages/spreadsheet-page.tsx`, `tests/e2e/`, owner docs

- Item Types: `Fix`, `Proof`

- [x] 演示数据充实为带公式示例（合计行 SUM、均值 AVERAGE）；开发日志条收起/移除（改为默认折叠 `<details>`）
- [x] e2e：键入 `=SUM(B1:B2)` 回车 → 单元格显示计算值（ss-11）；改依赖单元格 → 联动（ss-12）；`#CIRC!` 错误入格（ss-13）；种子公式打开即见计算值（ss-1 扩展）——13/13 全过
- [x] owner doc 同步（`docs/components/spreadsheet-page/design.md`：9.1 公式引擎契约 + L72 type-to-edit 注记修正）；审计报告 SP-1/2/3 补注
- [x] 执行期补强（ss-7 暴露的新缺陷）：`spreadsheet:selectRow`/`selectColumn` extend 由"已点行并集"修正为 Excel 语义连续区间填充（`selection-handlers.ts` + `fillContiguous`）；3 个钉住旧缺陷语义的测试（new-commands-mutation / grid-selection / context-menu-structure）矫正为区间契约

Exit Criteria:

- [x] e2e 公式断言全过
- [x] 演示页打开即见带公式示例表
- [x] owner doc 与审计报告与 live 事实一致

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，plan review 共 2 轮）
- Verdict: `pass-with-minors`（第 1 轮 fail：4 Major——SP-2 基线与实测相反、提交通路缺口、重算挂点应统一出口、装载无求值；修订后第 2 轮零 Blocker/Major）
- Rounds: 2
- Findings addressed: R4-M1（SP-2 改写为已实现且复测通过，Goal 收敛为防回归钉）；R4-M2（Decision：`=` 前缀升格 formula 权威存储 + 存量 value 防御兼容，两条主入口路由）；R4-M3（重算挂 `dispatchSpreadsheetCommand` 统一出口，undo 一致性论证）；R4-M4（createSpreadsheetCore 装载求值项）。第 2 轮 4 条 Minor 已吸收（重算副作用护栏入 Phase 2、In Scope 措辞、排版笔误、探针存档说明）。

## Closure Gates

- [x] Phase 1/2/3 全部 completed 且 Exit Criteria 全勾
- [x] 新增失败路径测试存在且通过（先红后绿记录在 daily log）
- [x] 浏览器/e2e 实测证据存档（spreadsheet-demo.spec 13/13 + visual-tokens 回归，daily log 记录）
- [x] `pnpm typecheck`（42 tasks 全绿）
- [x] `pnpm build`（42 tasks 全绿）
- [x] `pnpm lint`（42 tasks 全绿）
- [x] `pnpm test`（78 tasks 全绿：core 306 / renderers 178 等）
- [x] `pnpm check`（exit 0，零新增红项；首轮 scanner/knip 新增命中已按零基线原则修复而非登记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Non-Blocking Follow-ups

- 增量依赖图重算（大文档性能）
- 函数库扩展（IF/lookup/文本函数等）
- 跨 sheet 引用
- `handleCellValueSave`（use-editing.ts）无条件走 setCellValue 的历史通路无 live 消费方，可清理或并入升格路由（closure audit Note 12 登记，非阻塞）

## Closure

Status Note: 2026-10-01 completed。R1-R4 修复轮第 4 项收口；执行期额外修复 2 个相邻实锤缺陷（type-to-edit 多字符截断 R2-2c-A9-156、行/列 shift 扩选非连续区间）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose，agent_7de2bc01-2115-466b-978e-60941bbbbce9），2026-10-01
- Evidence: VERDICT: approved（0 Blocker / 0 Major / 3 Minor 文本项，均不阻塞且已当场修正）。审计独立复跑 focused 验证：spreadsheet-core 306/306、spreadsheet-renderers 178/178；逐项核对代码实质（引擎/parser/evaluator/8 函数/5 错误值/循环检测/身份护栏/双挂点/提交升格）、e2e 断言存在性（ss-1/11/12/13）、演示页种子与折叠日志条、owner doc §9.1 与代码 4/4 抽查一致。审计指出 3 Minor：plan 内"两个测试"实为 3 个文件（已改）、daily log 预记 audit 结果（本次批准后即为真）、行号漂移（已去除陈旧行号引用）。
