# 383 Deep Audit 2026-05-19 Table Schema Authoring Contract Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `12-03` 与 `12-04`：让 table public schema 回到 author-facing slot contract，而不是暴露 internal suffixes 或缺失 nested fields。

## Current Baseline

- table public schema 暴露 internal `loadingSlot` suffix。
- nested column slots 在 TS schema 中缺少 author-facing fields。

## Goals

- 修复 `12-03`、`12-04`。
- 同步 table schema authoring docs。

## Non-Goals

- 不处理 table runtime owner-state or event payload findings。

## Scope

### In Scope

- `12-03`, `12-04`
- `packages/flux-renderers-data/src/schemas.ts`
- related schema definitions/tests
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- runtime event and accessibility findings

## Execution Plan

### Phase 1 - Fix Table Authoring Schema Surface

Status: planned
Targets: table schema files, tests, owner doc

- Item Types: `Fix | Proof`
- [ ] Remove internal-suffix authoring leakage from the public table schema.
- [ ] Add the author-facing nested slot fields the table surface requires.
- [ ] Update `docs/architecture/field-metadata-slot-modeling.md` to the final authoring contract.

Exit Criteria:

- [ ] `12-03` and `12-04` are fixed.
- [ ] Focused proof covers the final public schema shape.
- [ ] `docs/architecture/field-metadata-slot-modeling.md` is updated.
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
