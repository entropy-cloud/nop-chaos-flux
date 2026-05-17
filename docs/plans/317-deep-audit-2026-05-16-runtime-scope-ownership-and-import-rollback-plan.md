# 317 Deep Audit 2026-05-16 Runtime Scope Ownership And Import Rollback Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{07-lifecycle.md,19-error-fidelity.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/310-open-ended-adversarial-review-2026-05-15-s2-source-prop-lifecycle-plan.md`, `docs/plans/311-open-ended-adversarial-review-2026-05-15-s2-import-action-security-plan.md`

## Purpose

收口 `flux-react` / `flux-runtime` 交界处的 retained owner-resource teardown drift：node-owned/import-owned/root/fragment scopes 缺少对称 release/dispose，以及 import-stack failure rollback 未释放自动创建的 owned action scope。

## Current Baseline

- 这些问题集中在 retained owner-resource lifecycle，不等同于 `310` / `311` 已关闭的 source-prop lifecycle 或 import/action security surfaces。
- `19-02` 与 `07-02/07-04` 是同一 runtime owner-teardown family，适合在同一 plan 下收口。
- `07-03` 经复核已降级为同 runtime 下 early-release residual；如果执行后仍不修复，必须留下明确 adjudication，而不是在 closure 文本里一笔带过。

## Goals

- Ensure every runtime-owned action scope or retained child scope created in the touched surfaces has a symmetric release/dispose path.
- Make import-stack failure rollback release owned resources, not only namespace/controller attachments.
- Keep long-lived runtime replacement / cache-eviction behavior honest with the documented owner lifecycle contract.

## Non-Goals

- 不接管 source-prop subscription precision or BFS/cycle fixes。
- 不重构整个 runtime scope system。
- 不把 unrelated error-reporting semantics 混入本 plan。

## Scope

### In Scope

- `07-01`
- `07-02`
- `07-03`
- `07-04`
- `19-02`
- `packages/flux-react/src/{use-node-scopes.ts,node-renderer.tsx,render-nodes.tsx,schema-renderer.tsx}`
- `packages/flux-runtime/src/import-stack.ts`
- relevant owner docs and focused tests

### Out Of Scope

- `19-01`
- `19-03`
- `08-03`

## Execution Plan

### Phase 1 - Re-audit Owned Resource Families

Status: completed
Targets: touched `flux-react` / `flux-runtime` owner-resource files, relevant existing tests

- Item Types: `Decision | Proof | Fix`

- [x] Inventory every scope/resource created in-scope and record its current create/release symmetry.
- [x] Distinguish true owner leaks (`07-01`, `07-02`, `07-04`, `19-02`) from the narrower early-release residual (`07-03`).
- [x] Add or update focused proof for unmount, cache-eviction, and rollback paths before implementing fixes.

Exit Criteria:

- [x] Every in-scope resource family has an explicit create/release matrix in this plan or tests.
- [x] Focused proof exists for both normal cleanup and failure rollback paths.
- [x] `docs/logs/2026/05-17.md` records the baseline matrix.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.

### Phase 2 - Land Symmetric Release / Dispose Semantics

Status: completed
Targets: `use-node-scopes.ts`, `node-renderer.tsx`, `schema-renderer.tsx`, `render-nodes.tsx`, `import-stack.ts`

- Item Types: `Fix | Proof`

- [x] Fix `07-01` so node-owned `ActionScope` instances are explicitly released.
- [x] Fix `07-02` and `19-02` so import-owned scopes are released on both normal cleanup and install failure rollback.
- [x] Fix `07-04` so fragment-scope cache eviction disposes retained child scopes.
- [x] Resolve `07-03`, or populate `Deferred But Adjudicated` with concrete evidence, supported limitation, owner, and reopen trigger.

Exit Criteria:

- [x] No in-scope owned action scope or retained child scope is left without a symmetric release/dispose path.
- [x] Install failure rollback releases owned scopes as well as namespace/controller attachments.
- [x] Focused proof is green for unmount, replacement, cache eviction, and rollback.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.

Exit Criteria:

- [x] Focused verification for all in-scope defect families has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining owner-resource blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`07-01`, `07-02`, `07-04`, `19-02`) are fixed, and `07-03` is either fixed or explicitly recorded in `Deferred But Adjudicated` with evidence and reopen trigger.
- [x] Runtime scope/resource teardown semantics converge to one supported baseline.
- [x] Necessary focused verification exists for every touched defect family.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed on the 2026-05-17 live baseline. `07-03` now has direct same-runtime replacement proof in `packages/flux-react/src/__tests__/schema-renderer.test.tsx`, and the owner-teardown family closes with symmetric release/dispose semantics plus import rollback cleanup.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ce657a57ffehya0nv61esDKO2`
- Evidence: Closure evidence now includes the landed same-runtime replacement proof in `packages/flux-react/src/__tests__/schema-renderer.test.tsx` plus the already-green rollback/cache-eviction tests; the prior `07-03` closure gap is closed on the live repo.

Follow-up:

- None currently.
