# 299 Deep Audit 2026-05-15 Entry Boundary And Structural Doc Routing Plan

> Plan Status: planned
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-deep-audit-full/{02-module-responsibility.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/287-deep-audit-2026-05-14-structural-hotspots-owner-routing-plan.md`

## Purpose

收口 2026-05-15 deep audit 中仍保留但低优先级的 structural/governance entry-boundary item：`flow-designer-renderers` package root entry 泄露实现逻辑。

## Current Baseline

- `02-07` 仍 live as P2：`packages/flow-designer-renderers/src/index.tsx` 仍同时承载 compile/validate/lazy wiring 与 package root exports。
- 审计汇总已把 `02-07` 列入 retained set，同时也把这类 structural issue 归为可暂缓项；但它仍需要明确 owner，而不是 ownerless backlog。
- 这项不属于 closure-critical runtime defect，更像 package entry boundary hardening/documented routing work。

## Goals

- Give retained `02-07` one explicit execution owner instead of leaving it as ownerless residual.
- Decide and implement the final package-entry boundary for `flow-designer-renderers`, or explicitly adjudicate a narrower documented residual if the live baseline shows part of the current width is acceptable.

## Non-Goals

- 不把本计划扩展成所有 oversized source file 的通用重构计划。
- 不接管 unrelated Flow Designer runtime/action defects。

## Scope

### In Scope

- `02-07`
- `packages/flow-designer-renderers/src/index.tsx`
- any new internal modules required to separate stable exports from implementation logic
- relevant docs/logs if the supported entry-boundary contract changes

### Out Of Scope

- unrelated Flow Designer behavior fixes
- any retained ID not listed above

## Execution Plan

### Phase 1 - Re-Audit The Entry Boundary

Status: planned
Targets: `packages/flow-designer-renderers/src/index.tsx`, related export modules/docs

- Item Types: `Decision | Proof`

- [ ] Re-audit the current root entry to distinguish acceptable stable export assembly from true implementation leakage.
- [ ] Record the final supported boundary for what may remain in the root entry versus what must move out.
- [ ] Update owner docs/logs if that boundary becomes part of the documented live baseline; otherwise record `No owner-doc update required`.

Exit Criteria:

- [ ] The plan records an explicit supported root-entry boundary based on the live repo, not the old audit headline alone.
- [ ] Any remaining in-scope leakage is either confirmed for execution in Phase 2 or explicitly removed from scope through a recorded decision.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

### Phase 2 - Separate Stable Entry Exports From Implementation Logic

Status: planned
Targets: `packages/flow-designer-renderers/src/index.tsx`, any new internal modules, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix retained `02-07` by moving compile/validate/lazy implementation logic out of the package root entry when the Phase 1 baseline requires it.
- [ ] Keep the root entry as a stable export surface rather than a new implementation sink.
- [ ] Add focused proof or repo-observable verification for the final export boundary if behavior-sensitive paths move.
- [ ] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained `02-07` is fixed in live code, or a fresh live re-audit proves the remaining width is no longer a plan-owned defect and the scope change is recorded in this plan before closure.
- [ ] The root entry no longer carries plan-owned implementation leakage beyond the explicit supported boundary from Phase 1.
- [ ] Any needed focused verification exists and passes.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-15.md` includes Phase 2 execution notes.

### Phase 3 - Verification And Closure Audit

Status: planned
Targets: touched files, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [ ] Run any focused verification needed for the touched export boundary.
- [ ] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [ ] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [ ] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs, and verification output.
- [ ] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [ ] Focused verification for the in-scope boundary change has passed.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining plan-owned blocker.
- [ ] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [ ] Retained `02-07` is fixed or explicitly adjudicated on the live baseline.
- [ ] No in-scope confirmed structural drift is silently deferred.
- [ ] Necessary focused verification exists for the touched entry boundary.
- [ ] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Pending implementation, verification, and independent closure audit.

Closure Audit Evidence:

- Reviewer / Agent: Pending.
- Evidence: Pending.

Follow-up:

- None currently.
