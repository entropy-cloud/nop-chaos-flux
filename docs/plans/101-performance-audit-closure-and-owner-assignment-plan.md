# 101 Performance Audit Closure And Owner Assignment Plan

> Plan Status: completed
> Last Reviewed: 2026-04-16
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/analysis/2026-04-16-performance-audit.md`
> Related: `docs/plans/75-reaction-and-renderer-perf-fix-plan.md`, `docs/plans/77-renderer-hot-path-perf-and-memory-continuation-plan.md`, `docs/plans/94-spreadsheet-command-dispatch-pattern-refactor-plan.md`, `docs/plans/102-playground-loading-and-bundle-boundary-remediation-plan.md`, `docs/plans/103-flux-react-hot-path-remediation-plan.md`, `docs/plans/104-formula-runtime-hot-path-remediation-plan.md`, `docs/plans/105-spreadsheet-performance-and-virtualization-plan.md`, `docs/plans/106-runtime-and-form-invalidation-performance-plan.md`, `docs/plans/107-collection-renderer-scalability-plan.md`, `docs/plans/108-form-field-consumer-performance-plan.md`, `docs/plans/109-flow-designer-performance-hygiene-plan.md`, `docs/plans/110-api-request-and-cache-hygiene-plan.md`

## Purpose

将 `docs/analysis/2026-04-16-performance-audit.md` 中仍然成立的 confirmed defects 全部映射到清晰的 owner plans，并以此消除“一个 omnibus plan 试图吞下整个性能审计”的执行风险。

本计划本身不直接拥有跨 repo 的实现落地；它拥有的是：审计条目分派、owner 边界、closure 依赖关系、以及 successor plans 的完整性。

## Current Baseline

- 2026-04-16 performance audit 已完成 re-audit，当前文档明确区分了 confirmed defects、bundle risk、measure-first candidates、和 documented baselines。
- 已关闭工作不得重开：Plan 75、Plan 77。
- 已有独立 owner 的工作不得被新 omnibus plan 吞并：Plan 94。
- 先前把所有 defect 放进一个 101 owner plan 的做法过宽，不符合 `00-plan-authoring-and-execution-guide.md` 的“一份计划只负责一个明确结果面”规则。
- 当前真正需要的是一个 portfolio-style closure plan，加上一组可执行 successor owner plans。

## Goals

- 为审计中的每个 confirmed defect 指定唯一 owner plan 或明确写成已有 plan-owned baseline。
- 为每个 owner plan 写出可执行的 Goals / Non-Goals / Scope / Execution Plan / Validation Checklist。
- 把 measure-first candidates 明确保留在 plan 外，除非执行中出现新的 profiling / bundle evidence。

## Non-Goals

- 不直接实现性能修复代码。
- 不把 successor plan 的实现完成误记为本计划已完成。
- 不将 tuning candidate 伪装成 confirmed defect owner work。

## Scope

### In Scope

- `docs/analysis/2026-04-16-performance-audit.md`
- `docs/plans/102-110*.md`
- 必要时对 `docs/logs/` 的 plan 记录同步要求

### Out Of Scope

- 任何代码实现本身
- Plan 75 / 77 / 94 已有 owner 的 closure 重写

## Execution Plan

### Phase 1 - Audit Finding Ownership Map

Status: completed
Targets: `docs/analysis/2026-04-16-performance-audit.md`, this plan

- [x] 将所有 confirmed defects 逐项映射到唯一 owner：已有 closed owner、已有 active owner、或新的 successor owner。
- [x] 将 measure-first candidates 逐项标注为非当前 owner work，防止 successor plans 隐式吸收它们。

Exit Criteria:

- [x] 审计中的每个 confirmed defect 都有唯一 owner plan。
- [x] 没有任何 confirmed defect 处于“未分派 / 多重 owner / 隐式 owner”状态。

### Phase 2 - Successor Plan Authoring

Status: completed
Targets: `docs/plans/102-110*.md`

- [x] 为 bundle boundary、flux-react、formula、spreadsheet、runtime/form invalidation、collection renderer、form-field consumer、flow-designer、api/cache hygiene 分别创建窄 owner plans。
- [x] 每份 successor plan 都要明确 predecessor / non-goals / overlap boundary，避免重开 Plan 75 / 77 / 94 / 89 / 90 / 91。

Exit Criteria:

- [x] successor plans 已全部落地到 `docs/plans/`。
- [x] 每份 successor plan 都满足 plan template 最小要求。

### Phase 3 - Closure Protocol And Handoff

Status: completed
Targets: this plan, successor plans

- [x] 写清 101 的 closure 条件：不是代码 landed，而是 successor ownership 完整且无 owner ambiguity。
- [x] 为 successor plans 写清独立 closure audit 要求。

Exit Criteria:

- [x] 101 的 closure 条件可观察、可审计。
- [x] successor plans 的 owner boundary 与 closure protocol 已明确。

## Owner Map

- `1.1`, `1.2`, `1.3`, `1.4`, `1.5`, `1.6` -> Plan 102
- `2.1`, `2.2`, `2.3`, `2.4`, `2.6`, `2.7`, `2.8` -> Plan 103
- `3.1`, `3.2`, `3.3`, `3.4`, `3.5`, `3.6`, `3.7`, `3.9` -> Plan 104
- `4.1`, `4.2`, `4.3`, `4.4`, `4.5`, `4.6`, `4.7`, `4.8`, `4.9` -> Plan 105
- `5.1`, `5.2`, `5.3`, `5.4`, `5.5`, `5.7`, `5.8`, `6.2` -> Plan 106
- `6.3`, `6.4`, `10.2` -> Plan 107
- `6.8`, `6.6` -> Plan 108
- `7.2`, `7.3`, `7.4`, `7.5` -> Plan 109
- `5.6`, `5.9`, `5.10`, `8.1`, `8.2`, `8.3`, `9.1`, `9.2` -> Plan 110
- Already closed / not reopened:
  - Plan 75 / Plan 77 owned closed slices
  - Plan 94 owns `core-dispatch.ts` refactor
- Measure-first / tuning candidates not currently owner-assigned:
  - `1.7`, `2.5`, `3.8`, `6.1`, `6.5`, `6.7`, `7.1`, `9.3`, `9.4`, `10.1`, `10.3`

## Validation Checklist

- [x] every confirmed defect in the audit has exactly one owner plan
- [x] no successor plan silently reopens Plan 75 / 77 / 94 work
- [x] measure-first candidates are explicitly kept outside current owner scope
- [x] successor plans 102-110 exist and follow the template
- [x] independent review confirms no ownership ambiguity remains

## Closure

Status Note: completed — the 2026-04-16 audit portfolio now has a unique owner for every confirmed defect, measure-first candidates are explicitly excluded from current owner scope, and successor plans 102-110 provide the executable remediation surfaces.

Closure Audit Evidence:

- Reviewer / Agent: independent explore subagents in fresh sessions
- Evidence: coverage / owner-boundary audits `ses_26b024338ffeQhmwiADkYeGTcS`, `ses_26afb5fb3ffeF1i8hX7XobMNj5`, `ses_26af4ced5ffe8Nys3Y5Oh4P9JJ`, `ses_26ade87a3ffe67bxHwX1fj8fb7` confirmed final owner coverage and drove the last boundary corrections.

Follow-up:

- successor plans 102-110 execute the actual remediation work
- if any successor plan proves too wide during execution, split it again and update the owner map in a follow-up owner-assignment revision
