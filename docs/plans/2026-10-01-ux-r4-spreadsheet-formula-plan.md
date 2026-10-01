# UX-R4 电子表格公式求值与编辑交互

> Plan Status: draft
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（SP-1/SP-2/SP-3）、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` R4
> Related: spreadsheet 相关 owner doc（落地时核对，`docs/components/` 下以实际目录为准）

## Purpose

把 `#/spreadsheet` 从"公式原文显示、永不求值"修复为"公式输入即计算、依赖变更联动重算、错误显式呈现"，附带修复 type-to-edit 交互与演示数据贫瘠问题。

## Current Baseline

- **SP-1 根因（已实锤）**：spreadsheet-core **没有任何公式求值引擎**。`applySetCellFormula`（`packages/spreadsheet-core/src/core/cell-operations.ts:32-56`）只把 formula 字符串存进 cell 文档；全仓 grep 无 evaluateFormula/recalc 等实现。网格显示读 `cell.value`（`spreadsheet-grid/table-shell.tsx:180`），键入的 `=SUM(B1:B2)` 原样成为 value → 显示原文。宿主"Set Formula on selected cell"按钮走同一存储通路 → 同样显示原文。
- 单元格文档模型：`CellDocument` 含 `value`/`formula` 双字段（`types.ts:103/:233` 附近），已有 formula 字段位——引擎产出可写回 value、保留 formula 供编辑回显。
- SP-2 type-to-edit：`use-editing.ts:27-31` 注释称"opened by grid keyboard typing"，但活页实测单击选中后直接键入未进入编辑（必须双击）——交互链路存在断点或条件门，执行期定位。
- SP-3：演示数据仅 5 个单元格（Alpha/42/Beta/7/Middle）；底部开发日志条（"Selected B2/Formula set on B3"）外露。
- `pnpm check` 基线全绿；spreadsheet-core/renderers 现有测试全绿（最近全绿基线）。

## Goals

- spreadsheet-core 内建最小公式引擎：`=` 前缀公式解析（单元格引用 A1、区域 A1:B2、四则与幂/括号/一元负号、比较符、SUM/AVERAGE/MIN/MAX/COUNT/COUNTA/ROUND/ABS），循环引用显式 `#CIRC!`、未知函数 `#NAME?`、除零 `#DIV/0!`、坏引用 `#REF!`。
- 提交（键入回车/Set Formula/删除/粘贴）后自动重算受影响单元格（demo 规模文档采用全量重算，语义正确优先）；编辑态回显 formula 原文、显示态呈现计算值。
- type-to-edit：选中单元格直接键入进入编辑（与主流电子表格一致）；若执行期证实现有链路已支持则记录证据关闭该项。
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

档位选择：`建议有测`

公式引擎为纯函数模块，Vitest 全覆盖（解析/求值/错误/重算，先红后绿）；渲染交互（type-to-edit、编辑回显）组件级测试 + e2e 断言显示值。

## Execution Plan

### Phase 1 - 公式引擎纯模块

Status: planned
Targets: `packages/spreadsheet-core/src/formula/`（新模块：tokenizer/parser/evaluator）

- Item Types: `Proof`, `Fix`

- [ ] 引擎测试先红：引用/区域/四则/比较/七函数/括号/错误值五类/循环引用
- [ ] 实现 tokenizer + 递归下降 parser + evaluator（值解析器回调注入，core 集成时提供单元格取值）；数值/布尔/字符串字面量
- [ ] `pnpm --filter @nop-chaos/spreadsheet-core test` 全绿

Exit Criteria:

- [ ] 引擎用例先红后绿，覆盖 Goals 全部语法面与五类错误
- [ ] 包测试全绿

### Phase 2 - core 集成重算与渲染交互

Status: planned
Targets: `packages/spreadsheet-core/src/`（cell-operations/command-handlers）、`packages/spreadsheet-renderers/src/`

- Item Types: `Fix`

- [ ] 提交通路集成：setCell/setCellFormula（及粘贴/删除影响 value 的通路）后触发全量重算（formula 单元格求值写回 value，保留 formula 字段）；集成测试先红后绿
- [ ] 编辑态回显 formula 原文（双击已有公式单元格显示 `=...` 而非缓存值）；显示态呈现计算值
- [ ] type-to-edit 断点定位与修复（或证据关闭）；组件级测试
- [ ] `pnpm --filter @nop-chaos/spreadsheet-core test` + `@nop-chaos/spreadsheet-renderers test` 全绿

Exit Criteria:

- [ ] 集成用例先红后绿（改 B1 → =SUM(B1:B2) 单元格联动更新）
- [ ] 编辑回显与 type-to-edit 行为有测试钉住
- [ ] 两包测试全绿

### Phase 3 - 演示充实与 e2e 断言

Status: planned
Targets: `apps/playground/src/pages/spreadsheet-page.tsx`, `tests/e2e/`, owner docs

- Item Types: `Fix`, `Proof`, `Follow-up`

- [ ] 演示数据充实为带公式示例（合计行 SUM、均值 AVERAGE、条件示例）；开发日志条收起/移除
- [ ] e2e：键入 `=SUM(B1:B2)` 回车 → 单元格显示 49（对应数值）；改 B1 → 联动；`#CIRC!` 错误入格
- [ ] owner doc 同步（公式引擎能力边界与错误值契约）；审计报告 SP-1/SP-2/SP-3 补注

Exit Criteria:

- [ ] e2e 公式断言全过
- [ ] 演示页打开即见带公式示例表
- [ ] owner doc 与审计报告与 live 事实一致

## Draft Review Record

- Reviewer / Agent: 待独立子 agent review
- Verdict: pending
- Rounds: 0
- Findings addressed: —

## Closure Gates

- [ ] Phase 1/2/3 全部 completed 且 Exit Criteria 全勾
- [ ] 新增失败路径测试存在且通过（先红后绿记录在 daily log）
- [ ] 浏览器/e2e 实测证据存档
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增红项）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Non-Blocking Follow-ups

- 增量依赖图重算（大文档性能）
- 函数库扩展（IF/lookup/文本函数等）
- 跨 sheet 引用

## Closure

Status Note: —

Closure Audit Evidence:

- Auditor / Agent: —
- Evidence: —
