# 509 Missing Components L2.5 — input-number money format 协议（纯文档）

> Plan Status: completed
> Last Reviewed: 2026-09-26
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §5（L2.5 行——「既有控件扩展：登记 improvement-analysis + input-number design.md 增节 + input-number example 增补——**不建新 type**；显示/校验分歧时再议」）；§1 交付铁律
> Related: `docs/components/input-number/design.md`（owner doc，§2 现有 `formatter`/`parser` 不采纳裁决）

## Purpose

收口 roadmap L2.5：定义 `input-number` 的货币显示协议（schema 字段名沿用源 `format: 'currency'`，命名 pass 过 naming-conventions 后在协议节钉死），落点为**纯文档**——①登记 `existing-components-improvement-analysis.md`（既有控件扩展）；②input-number design.md 增节（协议 + 采纳边界）；③协议示意以 design.md 协议节 JSON 代码块承载（example.json 维持不动）。不写任何实现代码（「显示/校验分歧时再议」——实现归后续 demand-gated 小 plan）。

## Current Baseline

2026-09-26 live repo 核对：

- `docs/components/input-number/design.md` **§2 决策表**现有裁决：`kilobitSeparator` 不采纳（formatter 层职责）、`formatter`/`parser` 不采纳（后续——display/form 双轨需独立 adapter 协议）。money format 是该「后续 adapter 协议」的具体实例，需先立协议再谈实现。
- `docs/components/existing-components-improvement-analysis.md` 现无 money/format 条目。
- `docs/components/input-number/` 只有 design.md + example.json，无代码外交付。

## Goals

- `existing-components-improvement-analysis.md` 登记 money format 条目（现状/缺口/协议要点/验收口径）。
- input-number design.md 增「§ money format 协议（已裁决，待实现）」节：显示层协议（currency 符号/千分位/精度）、值契约不变（form value 仍为 number）、实现前置条件（display-form 双轨 adapter）、与既有 `precision` 的关系。
- example.json 维持不动（协议示意在 design.md 协议节以 JSON 代码块承载，避免未实现契约漂移）。

## Non-Goals

- 不实现 `format: 'currency'`（无 host demand；显示/校验分歧——校验器读 number 还是格式化文本——未裁决前不实现）。
- 不建新 type；不改动任何 renderer/schema/组件代码。

## Scope

### In Scope

- `docs/components/existing-components-improvement-analysis.md` 增条目。
- `docs/components/input-number/design.md` 增协议节。
- `docs/components/input-number/example.json` **维持不动**（单一扁平 JSON 对象、无注释机制、兄弟 example 单对象惯例；向未实现协议的 example 写入 props 会被误读为已实现契约——协议示意改在 design.md 协议节以 JSON 代码块承载）。

### Out Of Scope

- 实现代码；L2.6；ui 包改动。

## Failure Paths

不适用（纯文档计划，无运行时行为；协议自身的显示/校验分歧裁决在 design.md 协议节内表达）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯文档、无行为变更（L2.5 未列入 roadmap §10 末纯文档预声明清单，按 plan guide「纯文档/无行为变更」独立成立；预声明清单缺 L2.5 属 roadmap 侧笔误，随 dev log 登记）。

## Execution Plan

### Phase 1 - 协议文档落点（improvement-analysis + design.md + improvement-roadmap；example.json 维持不动）

Status: completed
Targets: improvement-analysis、input-number design.md、improvement-roadmap（example.json 维持不动）

- Item Types: `Decision`

- [x] improvement-analysis（2026-06-20 v2 快照）登记 money format 条目：落 §7.1 横切工作项表（沿用 E0a…X5 编号惯例，跳过已占用编号——E3 已被占用，登记为 X6），设计状态用 §0.4 `DESIGN-ACK-NOT-IMPL`；并在活页登记册 `existing-components-improvement-roadmap.md` 同步挂工作项 X6（demand-gated 实现追踪）
- [x] input-number design.md（**§2 决策表**后新增 §2.1）增协议节，除 currency 三要素/值契约不变/双轨 adapter 前置/precision 关系/实现触发条件外，必须显式和解：
  - 与 `kilobitSeparator` 不采纳裁决（design.md §2）的关系——money 协议把千分位纳入显示层，说明为何值契约不变仍然成立；
  - 与 `formatter`/`parser` 不采纳（后续）裁决的关系——money 协议是该「后续 adapter 协议」的具体实例，通用 formatter/parser 是否仍维持不采纳；
  - 与已实现 `prefix`/`suffix` 的关系——取代/组合/共存，避免货币符号双真值源；
  - schema 字段名经 naming pass 钉死。

Exit Criteria:

- [x] 落点 diff 可见（improvement-analysis / design.md / improvement-roadmap；`git diff` 无 example.json）；口径一致（currency 符号/千分位/精度三要素、form value 仍 number）

### Phase 2 - 收口回写（closure audit 之后）

Status: completed
Targets: roadmap §13、dev log

- Item Types: `Proof`

- [x] roadmap §13 L2.5–L2.6 组合行拆分：L2.5 单列 `done`（closure audit 通过后执行，对齐 roadmap:12 顺序规则）、L2.6 保持 `proposed`；grep 复核 + dev log

Exit Criteria:

- [x] roadmap 拆行后 L2.5 = `done`、L2.6 = `proposed`；dev log 落盘一致（簿记补正 2026-09-26：8c74ee8a6 已证实落盘）

## Draft Review Record

- Reviewer / Agent: 独立 fresh 子 agent（general-purpose，2026-09-26，三轮）
- Verdict: `pass`（零 Blocker / 零 Major）
- Rounds: 3
- Findings addressed: Round 1 `fail`（4M/5m）：M1 协议字段命名自相矛盾 → 统一 `format: 'currency'` + naming pass 钉死；M2 roadmap 组合行回写不可行且顺序违规 → Phase 2 改 closure audit 之后 + L2.5/L2.6 拆行；M3 协议节与 §2 两裁决行及 prefix/suffix 和解缺失 → 四项和解显式列为交付内容；M4 example.json 注释性示例不可执行 → 维持不动（协议示意以 design.md JSON 块承载）；m1–m5（节号/happy-dom 归因/analysis 落点与词汇/Failure Paths 缺节/Deferred 分类）全落实。Round 2 N1（Major example 执行项矛盾）+ N2–N4 修入；Round 3 确认零残留，达成共识。

## Closure Gates

> 纯文档计划：按 plan guide 模板注记，`pnpm typecheck/build/lint/test/check/e2e` 全部豁免（无代码变更）。

- [x] 协议落点（improvement-analysis + design.md + improvement-roadmap）已落盘且口径一致（example.json 维持不动）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

### money format 实现

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 协议已定义、无 host demand、显示/校验分歧未裁决——roadmap L2.5 行自带声明「显示/校验分歧时再议」。
- Successor Required: yes
- Successor Path: host 需求出现时立实现小 plan（消费 design.md 协议节）

## Closure

Status Note: 纯文档协议三落点交付并经独立 closure audit 两轮通过（round 1 `issues` 2M：roadmap §13 提前回写违反顺序规则 + precision 关系未落条文；3m：analysis 表列数/活页行格式/双编号——全部修复；round 2 diff 级复核 `approved` 0B/0M，附条件项 analysis 分隔行/活页缩进已随收口清理）。协议核心承诺（form value 恒 number、双轨 adapter 前置、precision/prefix-suffix 和解、naming pass）全部落盘；money format 实现登记 Deferred（out-of-scope，demand-gated successor）。纯文档无代码变更，全绿状态不受影响。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-26，两轮）
- Evidence: round 1 `issues`（M1 roadmap §13 提前回写 + M2 precision 条文缺失 + m1/m2/m3 簿记）→ 全部修复 → round 2 diff 级复核 `approved`（实核 :230 合并行回退、design.md:55 precision 条文、analysis 2 列对齐、活页条目式 X6 单 ID；dev log 披露在案）。

Follow-up:

- no remaining plan-owned work（簿记补正 2026-09-26）
