# 299 Deep Audit 2026-05-15 Entry Boundary And Structural Doc Routing Plan

> Plan Status: completed
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

Status: completed
Targets: `packages/flow-designer-renderers/src/index.tsx`, related export modules/docs

- Item Types: `Decision | Proof`

- [x] Re-audit the current root entry to distinguish acceptable stable export assembly from true implementation leakage.
- [x] Record the final supported boundary for what may remain in the root entry versus what must move out.
- [x] Update owner docs/logs if that boundary becomes part of the documented live baseline; otherwise record `No owner-doc update required`.

Exit Criteria:

- [x] The plan records an explicit supported root-entry boundary based on the live repo, not the old audit headline alone.
- [x] Any remaining in-scope leakage is either confirmed for execution in Phase 2 or explicitly removed from scope through a recorded decision.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

Phase Notes:

- Re-audit confirmed the supported package boundary is a thin root entry that re-exports public renderer definitions, manifest helpers, schemas, and provider helpers, while compile/validate/lazy wiring should live in internal modules.
- The remaining in-scope leakage at audit time was the compile/validate/lazy renderer logic bundled into `packages/flow-designer-renderers/src/index.tsx`, so Phase 2 remained required.
- No owner-doc update was required beyond this plan and `docs/logs/2026/05-15.md` because the supported boundary is a structural code-routing concern rather than a new external contract.

### Phase 2 - Separate Stable Entry Exports From Implementation Logic

Status: completed
Targets: `packages/flow-designer-renderers/src/index.tsx`, any new internal modules, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix retained `02-07` by moving compile/validate/lazy implementation logic out of the package root entry when the Phase 1 baseline requires it.
- [x] Keep the root entry as a stable export surface rather than a new implementation sink.
- [x] Add focused proof or repo-observable verification for the final export boundary if behavior-sensitive paths move.
- [x] Update affected owner docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained `02-07` is fixed in live code, or a fresh live re-audit proves the remaining width is no longer a plan-owned defect and the scope change is recorded in this plan before closure.
- [x] The root entry no longer carries plan-owned implementation leakage beyond the explicit supported boundary from Phase 1.
- [x] Any needed focused verification exists and passes.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 2 execution notes.

Phase Notes:

- `packages/flow-designer-renderers/src/index.tsx` is now a façade entry that only re-exports public schemas, manifest/provider helpers, and registry helpers.
- Compile/validate/lazy renderer wiring moved into `packages/flow-designer-renderers/src/renderer-definitions.ts`, which now owns `compileDesignerConfig`, `validateDesignerConfigToolbar`, the lazy renderer wrappers, and `flowDesignerRendererDefinitions`.
- Focused public-surface proof now lives in `packages/flow-designer-renderers/src/public-surface.test.ts`, asserting that renderer-only helpers such as `compileDesignerConfig` and `validateDesignerConfigToolbar` stay off the root entry while the unstable surface retains internals.
- No owner-doc update was required beyond this plan and `docs/logs/2026/05-15.md`.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched files, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run any focused verification needed for the touched export boundary.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs, and verification output.
- [x] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [x] Focused verification for the in-scope boundary change has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

Phase Notes:

- Focused boundary proof passed via `pnpm exec vitest run packages/flow-designer-renderers/src/public-surface.test.ts` (`2` tests), which confirms the root entry keeps compile/validate helpers off the public surface while the unstable entry retains renderer internals.
- Package-local verification for the touched boundary also passed via `pnpm --filter @nop-chaos/flow-designer-renderers typecheck`, `pnpm --filter @nop-chaos/flow-designer-renderers build`, and `pnpm --filter @nop-chaos/flow-designer-renderers lint`.
- Workspace hard gates passed on the live baseline via `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`.
- Independent closure audit passed after the verification/log sync; see `Closure Audit Evidence`.

## Closure Gates

- [x] Retained `02-07` is fixed or explicitly adjudicated on the live baseline.
- [x] No in-scope confirmed structural drift is silently deferred.
- [x] Necessary focused verification exists for the touched entry boundary.
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

Status Note: Completed. Retained `02-07` is fixed on the live baseline by the root-entry façade split, focused and hard-gate verification passed, and independent closure audit found no remaining plan-owned blocker.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d5eb8c10ffee4HEGvqwkIfnnQ`
- Evidence: Re-read this plan, the plan-authoring guide, `packages/flow-designer-renderers/src/{index.tsx,renderer-definitions.ts,public-surface.test.ts}`, and `docs/logs/2026/05-15.md` after the final verification/log sync. Confirmed the root entry is a façade export surface, implementation leakage moved to `renderer-definitions.ts`, focused boundary proof exists and passed, workspace `pnpm typecheck` / `build` / `lint` / `test` are green on the live baseline, and no remaining in-scope structural drift is visible.

Follow-up:

- None currently.
