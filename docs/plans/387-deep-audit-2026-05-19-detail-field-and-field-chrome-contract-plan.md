# 387 Deep Audit 2026-05-19 Detail-Field And Field-Chrome Contract Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `09-01`、`09-03`、`12-01`：让 detail-field 与 field-chrome surface 回到 renderer contract 与 field metadata baseline。

## Current Baseline

- detail-field control root 丢弃 schema `className`。
- detail renderer 直读 `FormRuntime` store。
- shared field metadata 未显式覆盖 `FieldFrame` chrome inputs。

## Goals

- 修复 `09-01`、`09-03`、`12-01`。
- 同步 detail/field-chrome contract docs。

## Non-Goals

- 不处理 validation owner lifecycle；那由 Plan `386` owning。

## Scope

### In Scope

- `09-01`, `09-03`, `12-01`
- relevant detail-field / field metadata files
- focused tests
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- broader form validation findings

## Execution Plan

### Phase 1 - Restore Detail And Field-Chrome Contract

Status: planned
Targets: detail-field code, tests, owner docs

- Item Types: `Fix | Proof`
- [ ] Restore schema `className` handling and stop direct store reads.
- [ ] Make the field-chrome metadata contract explicit.
- [ ] Update the owner docs named in Plan `371`.

Exit Criteria:

- [ ] `09-01`, `09-03`, and `12-01` are fixed.
- [ ] Focused proof covers the final detail-field and field-chrome contract.
- [ ] `docs/architecture/renderer-runtime.md` and `docs/architecture/field-metadata-slot-modeling.md` are updated.
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
