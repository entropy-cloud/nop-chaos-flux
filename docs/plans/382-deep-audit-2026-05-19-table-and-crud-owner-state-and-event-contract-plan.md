# 382 Deep Audit 2026-05-19 Table And CRUD Owner-State And Event Contract Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `04-01`、`09-02`、`09-04`：让 table/CRUD owner state 与 event payload 回到 supported contract。

## Current Baseline

- 空数组 owner state 会被 fallback defaults 覆盖。
- table pagination events 缺 UI event / semantic payload。
- CRUD query submit/reset payload 为空。

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

Status: planned
Targets: table/CRUD code, tests, owner doc

- Item Types: `Fix | Proof`
- [ ] Fix empty-array owner-state fallback behavior.
- [ ] Restore supported semantic event payloads for table and CRUD events.
- [ ] Update the table/CRUD component docs plus `renderer-runtime.md` to the final supported contract.

Exit Criteria:

- [ ] `04-01`, `09-02`, and `09-04` are fixed.
- [ ] Focused proof covers owner-state and event-payload results.
- [ ] `docs/components/table/design.md`, `docs/components/crud/design.md`, and `docs/architecture/renderer-runtime.md` are updated, or `No change required` is explicitly adjudicated.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained findings are fixed.
- [ ] Required owner-doc updates are landed.
- [ ] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: not yet run
