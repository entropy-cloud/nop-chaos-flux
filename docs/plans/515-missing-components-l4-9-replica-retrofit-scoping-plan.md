# 515 Missing Components L4.9 — replica retrofit scoping（D1 原语接入旧复刻的适用性裁定与子计划分派）

> Plan Status: completed
> Last Reviewed: 2026-09-26
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §7 L4.9 行（Rule 4 例外：plan 族）+ §12 错峰规则；`docs/analysis/ui-review/C2-capability-gaps.md` 回写③⑤⑦⑧⑫⑬（D1 原语交付面与各 replica 缺口行）；两轮独立只读调研（2026-09-26，live repo 证据见 Current Baseline）
> Related: `docs/plans/513-missing-components-l4-substrate-and-quick-wins-plan.md`（快赢先行，本计划不依赖其实现）；`docs/plans/512-missing-components-l3-host-channels-plan.md`（L3.5 已落地——stripe/airtable 错峰 rebase 归本计划窗口）

## Purpose

收口 roadmap L4.9「replica retrofit」：把已交付的 D1 原语（option-row / keyboard / batch-bar，另 query-filter / result / command-palette 配套）接入七个旧 replica（antdpro / linear / notion / cal / stripe / airtable / sundial）。本计划是 plan 族的 **scoping plan**：产出逐 replica 适用性矩阵与子计划分派裁决（过独立 review），**不实现任何 retrofit**——实现归后续逐 replica 子计划（516+，分派结论回写 roadmap §13）。

**单计划边界依据**：scoping 是单一 Decision 结果面（一张矩阵 + 一份分派），符合 guide Rule 22「审计驱动队列先合并再拆」；逐 replica 实现彼此独立（不同 schema、不同 e2e 面），按 roadmap Rule 4 例外拆子计划。

## Current Baseline

2026-09-26 live repo 核对（独立调研证据，HEAD = plan 513 执行前）：

- **D1 原语全在库、40 张 replica schema 零采纳**：`option-row`（flux-react/src/option-row.ts + list/table `optionRow` 字段）、`keyboard` renderer（flux-renderers-basic/src/keyboard.tsx + flux-react/src/keyboard.ts 共享解析）、`batch-bar`（flux-renderers-data/src/batch-bar-definition.ts + batch-bar.tsx：selectionPath/countTemplate/actions region/clearTarget，空集渲染 null）；对 page-schemas/ 40 张 JSON grep `optionRow|batch-bar|keyboard|modifierSelect|selectAllMode` 零命中；唯一使用面在 component-lab。
- **antdpro**：antdpro-list.json:301-337 手工批量包络（`已选择 ${$crud.selectionCount} 项` 文本 + ghost「取消选择」按钮 + listActions 批量删除）——正是 batch-bar 的目标形态（回写③为包络证据、⑤为 Linear 选择集契约配对）；antdpro 交互 e2e 23 条在案。
- **linear**：linear-issues.json `rowSelection`（:2086 单处）+ `selectedRowKeys`（:2088/:2132，clearSelection args 等）+ chord G/O/M、J/K 指针移动、shift/meta 选区（peek 触发链 :1887+）——可由 `keyboard` renderer + `modifierSelect`/`selectAllMode` 表达（回写⑫⑬裁定缺口已由原语消解）；linear 交互 e2e 在案（linear 03/06/16 clipboard 断言等）。
- **airtable**：airtable-grid.json 十五键位键盘导航缺口（回写⑦ :223）——`keyboard` + table `editable` 双态（回写⑮）组合可补；批量栏「未启用」维持 N14 口径（回写⑧）。**簇注**：512 Deferred 的 syncLocation 迁移覆盖 stripe+airtable 两子计划，故 airtable 虽独立成簇，其子计划须含 URL 物化裁定项（与 stripe 错峰同批）。
- **notion / cal / sundial**：无 batch-bar 形态；retrofit 面为 optionRow 行态 / keyboard 辅助键（sundial todo-dialog、cal booking 等的具体适用点待逐 replica 子计划核实）。
- **stripe**：无批量栏形态（回写⑧ :262 零扩充裁定）；stripe-payments 已有 P6b ad-hoc URL 物化（L3.5 错峰对象）。
- **L3.5 错峰 rebase**：roadmap §12 规则「L3.5 与 L4.9 触碰相同 replica 的 query/filter schema（stripe/airtable），后动方 rebase 先动方」——L3.5 已落地（512，standard-crud syncLocation）；stripe/airtable 的既有 ad-hoc URL 物化**迁移到 L3.5 契约**是 plan 512 Deferred 登记的 successor（归本计划窗口裁定：迁移或声明豁免）。
- **复刻页无宿主 keydown 岛**（仅 flow-designer-example.tsx 有，与 replica 无关）——retrofit 为纯 schema 声明工作 + 对应 e2e 断言迁移。

## Goals

- 一份 scoping 裁决文档落盘 `docs/discussions/2026-09-26-l4-9-replica-retrofit-scoping.md`：七 replica × 四原语适用性矩阵（逐格四档 taxonomy：适用 / 不适用（理由） / 待子计划核实 / 适用但暴露原语缺口 → D1 输入池）、每 replica 的 retrofit 内容边界（改哪些 schema 面、动哪些 e2e 断言、保哪些现役行为）、子计划分派（预期 516+ 按 replica 聚簇分派，每子计划自带「必须自动化」档）、stripe/airtable URL 物化迁移 vs 声明豁免的裁定。
- 独立 review 共识（0B/0M）后回写 roadmap §13 L4.9 行（分派结构 + 子计划编号占位）。

## Non-Goals

- 不实现任何 retrofit（归 516+ 逐 replica 子计划）。
- 不改 D1 原语本体（原语已 closed；缺口按 demand 走 D1 输入池）。
- 不把 replica 重设计（视觉/信息架构不变——retrofit 只替换交互实现通道，用户可见行为保持；仅 toast 归属类副作用按原语义迁移）。

## Scope

### In Scope

- `docs/discussions/2026-09-26-l4-9-replica-retrofit-scoping.md`、roadmap §13 L4.9 行回写、后续子计划的 Source 链接。

### Out Of Scope

- replica page-schema / e2e 改动（归子计划）；原语包面改动；component-lab 实验页。

## Failure Paths

> 纯文档计划，不适用。

## Test Strategy

档位选择：`不适用：纯文档 scoping 裁决，无行为变更；适用性断言的自动化随各子计划（必须自动化档）落地。`

## Execution Plan

### Phase 1 - 适用性矩阵 + 子计划分派裁决（design gate）

Status: completed
Targets: `docs/discussions/2026-09-26-l4-9-replica-retrofit-scoping.md`、roadmap §13 L4.9 行

- Item Types: `Decision`

- [x] 矩阵落盘：7 replica × 4 原语逐格裁定，格 taxonomy 四档——`适用` / `不适用（理由）` / `待子计划核实` / `适用但暴露原语缺口 → D1 输入池`（每格带 page-schemas file:line 或理由）；每 replica 列出 retrofit 边界（schema 改动点 / e2e 断言迁移点 / 现役行为保持清单）
- [x] stripe/airtable URL 物化裁定：优先迁移到 L3.5 syncLocation 契约（518/519 内执行），两处已知语义差核对清单落盘（地址栏可见性/表单句柄恢复通道）；豁免出口 = 差异登记 D1 输入池 + ad-hoc 面保留注记
- [x] 子计划分派：516 antdpro / 517 linear / 518 airtable（keyboard 血缘核实义务在边界）/ 519 stripe+notion+cal+sundial；依赖 516→517→518→519 顺序（§12 只约束 L3.5↔L4.9，簇内无互相错峰——plan draft review r1 Major-1 关联更正）
- [x] 独立 review 共识（fresh 子 agent，0B/0M）记录于文档 Review 头注（pass-with-minors 4m 当轮落字）

Exit Criteria:

- [x] 矩阵零「待定」残留 + review 记录在案（scoping 文档 Review 头注）
- [x] roadmap §13 L4.9 行带分派注记（子计划编号 + 范围——随本批收口提交落盘）

## Draft Review Record

- Reviewer / Agent: 独立 fresh 子 agent（general-purpose，2026-09-26，未参与起草；≥9 处引用实核）
- Verdict: r1 `fail`（1M+3m，当轮全落字）→ r2 `pass-with-minors`（0B/0M/1m：Goals 三档 taxonomy 与 Phase 1 四档未对齐，已当轮修齐；审阅方明示无需第三轮）
- Rounds: 2
- Findings addressed: Major-1 linear-issues.json 引用更正（rowSelection :2086 单处 + selectedRowKeys :2088/:2132）；Minor-1 矩阵 taxonomy 补第四档「适用但暴露原语缺口 → D1 输入池」；Minor-2 airtable 簇注（syncLocation 迁移覆盖 stripe+airtable）；Minor-3 antdpro 回写③⑤分工注记

## Closure Gates

- [ ] Phase 1 裁决全部落地（矩阵/裁定/分派零待定）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] roadmap §13 L4.9 行回写与裁决一致
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（r1 `issues` 0B/1M/1m → Major-1 双轨 review 口径更正 + Minor-1 follow-ups 落字 → 凭审计证据翻转，2026-09-26）
- [ ] 纯文档计划：pnpm typecheck/build/lint/test/check 不适用（无代码变更；文档格式由 pre-commit prettier 承担）

## Deferred But Adjudicated

### 各 replica retrofit 实现

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: roadmap Rule 4 例外规定逐 replica 拆子 plan；本计划即分派载体
- Successor Required: `yes`
- Successor Path: 516+ 逐 replica 子计划（分派见 Phase 1 裁决）

## Non-Blocking Follow-ups

- 518/519 子计划执行时按 §3 两处语义差核对清单逐项裁定 URL 物化迁移或豁免（登记 D1 输入池出口）

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-26）
- Evidence: verdict r1 `issues`（0B/1M/1m）→ 条件修复（头注双轨化 / roadmap 更正 / 编号对齐 / follow-ups 落字）→ 凭审计「机械修复后即可标记 completed」结论翻转。审计实核 7/7 出处命中、分派与 roadmap diff 逐字一致、Deferred 诚实、五处一致性过。

Status Note: Phase 1 裁决全部落地（矩阵 7×4 四档 taxonomy 零待定、URL 物化裁定含两处语义差核对清单、516-519 分派 + 依赖序），双轨审查 + closure audit 通过；scoping 交付面为纯文档，逐 replica 实现显式移交 516-519。

Follow-up:

- no remaining plan-owned work（实现归 516-519 successor ownership）
