# 401 Deep Audit 2026-05-19 Chart Slot Authoring Contract Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `12-02`：让 chart title 回到 value-or-region slot authoring contract。

## Current Baseline

- chart title is not modeled as a value-or-region slot。

## Goals

- 修复 `12-02`。
- 同步 slot authoring docs。

## Non-Goals

- 不处理 table schema findings。

## Scope

### In Scope

- `12-02`
- relevant data renderer definition/schema files
- `docs/components/chart/design.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- unrelated slot surfaces

## Execution Plan

### Phase 1 - Restore Chart Slot Authoring Contract

Status: planned
Targets: slot definitions, tests, owner doc

- Item Types: `Fix | Proof`
- [ ] Model chart title as a supported value-or-region slot.
- [ ] Update `docs/components/chart/design.md` and `docs/architecture/field-metadata-slot-modeling.md`.

Exit Criteria:

- [ ] `12-02` is fixed.
- [ ] Focused proof covers the final authoring contract.
- [ ] `docs/components/chart/design.md` and `docs/architecture/field-metadata-slot-modeling.md` are updated.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained finding is fixed.
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
