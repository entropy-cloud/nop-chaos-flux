# 382 Deep Audit 2026-05-19 Table And CRUD Owner-State And Event Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `04-01`、`09-02`、`09-04`：让 table/CRUD owner state 与 event payload 回到 supported contract。

## Current Baseline

- `04-01` 已修复：table 与 CRUD summary 现在保留显式空数组 owner state，不再把 `[]` 误当成“缺失 state”并回退到 defaults。
- `09-02` / `09-04` 已在当前 live baseline 中成立：table pagination 会透传 UI event 并发布 `table:page-change` 语义 payload；CRUD query submit/reset 会发布带 `type/query/page/pageSize/pagination` 的语义 payload。
- 剩余工作是把 owner-doc / plan / log 同步到这个已落地 baseline，并完成 closure audit 与 repo-wide gates。

## Goals

- 修复 `04-01`、`09-02`、`09-04`。
- 让 table/CRUD owner state 与 event payload contracts 回到单一 supported baseline。

## Non-Goals

- 不处理 table schema authoring, row a11y, or performance findings。

## Scope

### In Scope

- `04-01`, `09-02`, `09-04`
- `packages/flux-renderers-data/src/table-renderer/*`
- `packages/flux-renderers-data/src/crud-renderer-ownership.ts`
- related focused tests
- `docs/components/table/design.md`
- `docs/components/crud/design.md`
- `docs/architecture/renderer-runtime.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- `12-03`, `12-04`, `15-03`, `20-04`

## Execution Plan

### Phase 1 - Fix Owner State And Event Payload Contracts

Status: completed
Targets: table/CRUD code, tests, owner doc

- Item Types: `Fix | Proof`
- [x] Fix empty-array owner-state fallback behavior.
- [x] Restore supported semantic event payloads for table and CRUD events.
- [x] Update the table/CRUD component docs plus `renderer-runtime.md` to the final supported contract.

Exit Criteria:

- [x] `04-01`, `09-02`, and `09-04` are fixed.
- [x] Focused proof covers owner-state and event-payload results.
- [x] `docs/components/table/design.md`, `docs/components/crud/design.md`, and `docs/architecture/renderer-runtime.md` are updated, or `No change required` is explicitly adjudicated.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed after landing the empty-array owner-state fix, confirming the existing semantic event-payload baseline, updating owner docs, and re-running focused plus repo-wide verification.

Closure Audit Evidence:

- Reviewer / Agent: independent subagent closure audit `ses_1bd9ed593ffeVpkho4lb4wPR6p`
- Evidence: `Verdict: acceptable`, `Findings: none`, `Plan 382 can be marked completed now: yes`
