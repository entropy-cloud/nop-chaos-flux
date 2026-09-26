# 510 Missing Components L2.6 — cascader 裁决文档（纯文档）

> Plan Status: active
> Last Reviewed: 2026-09-26
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §5 L2.6 行全文（「cascader 裁决文档（design doc only）——列式懒加载 UX 是否为产品必需；若否，tree-select 为永久答案并回写 matrix/survey。验收：决议文档落盘 + matrix/survey 回写完成（**human 签认**）。**`chained-select`/`input-formula`（P2）随本裁决一并定性**」）；§1 交付铁律
> Related: `docs/components/tree-select/design.md`；`docs/analysis/visual-quality/2026-09-24-missing-component-gap-analysis.md`（chained-select/nested-select 折叠判例）

## Purpose

收口 roadmap L2.6：裁决「列式级联选择（cascader）」是否作为独立 type 引入。产出裁决文档 `docs/analysis/cascader-vs-tree-select-decision.md`——列式懒加载 UX 的需求评估、tree-select（含 505 org 协议通路）能否承载同类场景、最终结论与回写。**不写任何组件代码。**

## Current Baseline

2026-09-26 live repo 核对：

- `docs/components/amis-baseline-matrix.md`：`nested-select`（:244）/`chained-select`（:245）在 `### 2. Folded Into Canonical Retained Families`（notRetained 细分节，:230 起）——「specialized select hierarchies should stay within retained select/tree-select families」，折叠进 tree-select；无 cascader 行。gap-analysis :107 的 chained-select 行现值「tree-select / composition / cascader P1——Only if cascader columns rejected」与 matrix 折叠口径存在张力，正是本裁决要收口的分歧。
- 懒加载能力面：`childrenSource` 同时存在于 `InputTreeSchema`（schemas.ts:216）与 `TreeSelectSchema`（:244-245）——tree-select 自身已具备逐级懒加载字段；505 交付的 org 协议通路（useOrgChildren）已 runtime。
- 506 交付的 input-city（省市区列式级联）已覆盖「地区级联」这一最高频 cascader 场景（dataset-coupled：数据集归 host——覆盖范围限地区，不含通用分类级联）。
- `docs/analysis/` 无 cascader 决议文档。

## Goals

- 裁决文档 `docs/analysis/cascader-vs-tree-select-decision.md` 落盘：场景枚举（多级联动非地区类：分类目录/组织域/商品属性等）、tree-select + childrenSource 承载力评估、列式 UX 的必要性论证、**结论**（引入独立 cascader type 与否）与回写清单。
- 随本裁决一并定性：`chained-select`（gap-analysis :107 现值与 matrix :245 折叠口径的分歧收口）与 `input-formula`（P2，gap-analysis :110 demand-gated 表——expressions already in core; editor/code-editor family）。
- 按结论回写四处：matrix（若不引入：在 Folded 节登记 cascader 裁决注记；若引入：立 demand-gated 行）、gap-analysis :107 行、control-gap-survey（`docs/analysis/2026-08-04-control-gap-survey.md:66` cascader 行——3 处独立信号/信心高/「级联是独立交互形态」，owner 现写 tree-select（形态不同）需按结论更新）、roadmap §13。
- **human 签认 gate**：结论与回写完成后，须用户签认方视为 roadmap L2.6 验收达成（roadmap 行明文「human 签认」；AGENTS.md Collaboration Discipline 同旨）——本计划 Closure Gates 以「签认请求已发出并记录用户响应」为闭环条件。

## Non-Goals

- 不实现任何 cascader/tree-select 代码。
- 不改动 input-city（506 已交付的地区级联）。

## Scope

### In Scope

- `docs/analysis/cascader-vs-tree-select-decision.md`（裁决文档）。
- `docs/components/amis-baseline-matrix.md` 回写（按结论）。
- gap-analysis（`docs/analysis/visual-quality/2026-09-24-missing-component-gap-analysis.md`）:107 行裁决回写注记。
- control-gap-survey（`docs/analysis/2026-08-04-control-gap-survey.md`）:66 cascader 行 owner/结论回写。
- roadmap §13 拆行回写（L2.6 → done）+ dev log。

### Out Of Scope

- 任何组件代码；roadmap O1 reconcile（归 L7.6）。

## Failure Paths

不适用（纯文档计划，无运行时行为；裁决的「反方证据」在文档 §场景枚举与承载力评估中表达）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯文档、无行为变更（roadmap §5 L2.6 行自带「design doc only」定位）。

## Execution Plan

### Phase 1 - 裁决文档落盘

Status: completed
Targets: `docs/analysis/cascader-vs-tree-select-decision.md`

- Item Types: `Decision`

- [x] 裁决文档：场景枚举 → tree-select + childrenSource 承载力评估（runtime 证据）→ 列式 UX 必要性论证（正反方）→ 结论（cascader 认定独立交互形态、demand-gated 不立即实现）→ 回写清单（引用 506 input-city 判例与 505 协议通路）

Exit Criteria:

- [x] 文档落盘且含明确结论与回写清单（最终态行文，≤40KB）；承载力评估/场景枚举引用可核对的 runtime 与文档证据（文件路径/行为）

### Phase 2 - 按结论回写 + 收口

Status: in progress（回写已落地；剩余：human 签认 → roadmap done 回写 → closure audit）
Targets: matrix、gap-analysis、control-gap-survey、roadmap §13、dev log

- Item Types: `Decision`、`Proof`

- [x] matrix/gap-analysis/control-gap-survey 按结论回写（含 chained-select 维持折叠 + input-formula 维持 demand-gated 定性）
- [ ] **human 签认**：向用户提交裁决摘要请求签认；记录响应（签认/修改意见）于本 plan——签认前 roadmap §13 不回写 `done`
- [ ] roadmap §13 L2.6 回写 `done`（human 签认后；grep 复核）+ dev log

Exit Criteria:

- [ ] 四处回写 diff 可见；human 签认记录在案；roadmap/dev log 落盘一致

## Draft Review Record

- Reviewer / Agent: 独立 fresh 子 agent（general-purpose，2026-09-26，两轮）
- Verdict: `pass`（零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed: Round 1 `fail`（4M/3m）：M1 Source 截断（human 签认 + chained-select/input-formula 定性缺失）→ Source 全文引用 + 签认 gate + 定性条目；M2 survey 回写目标 → control-gap-survey:66 行入 In Scope/Goals/Phase 2/Gate 全链路；M3 matrix 节号行号双错 → :244/:245 与 Folded 节修正；M4 判例计划号 507→506 三处统一；m1 残句改能力面准确陈述；m2 Item Types 拆分注记；m3 Exit Criteria 证据要求。Round 2 确认闭合；3 项新 Minor（:16 行属误标、Targets 漏列、input-formula 落点 :110）已顺手修入。

## Closure Gates

> 纯文档计划：`pnpm typecheck/build/lint/test/check/e2e` 豁免（无代码变更）。

- [x] 裁决文档已落盘且含明确结论与回写清单
- [x] matrix/gap-analysis/control-gap-survey 回写与结论一致（含 chained-select 维持折叠 + input-formula 维持 demand-gated 定性）
- [ ] **human 签认已获得并记录于本 plan**（roadmap L2.6 行明文验收；无法以 sub-agent audit 替代）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- （收口时填写，或明确写无）

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待填>>
- Evidence: <<待填>>

Follow-up:

- <<收口时填写，或明确写 no remaining plan-owned work>>
