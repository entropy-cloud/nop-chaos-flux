# 270 Deep Audit 2026-05-13 Host Contract Error Fidelity And Performance Successor Plan

> Plan Status: in progress
> Last Reviewed: 2026-05-13
> Source: `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`, `docs/plans/267-deep-audit-2026-05-13-priority-remediation-plan.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the retained host-input narrowing, field-slot contract, error-fidelity, diagnostics, and main-path performance findings from the 2026-05-13 deep audit batch.

## Current Baseline

- Plan 267 routes the host-contract/error/performance bucket here.
- The in-scope items cross report-designer, word-editor, runtime request/submit/error paths, and one package-owned CSS registration path.
- Live re-audit is complete for all in-scope IDs.
- `12-02`, `13-01`, `13-02`, `13-03`, `15-03`, `15-04`, `15-05`, `18-03`, `19-01`, `19-02`, and `19-03` are now fixed with focused proof in the relevant package test suites and targeted package typecheck reruns.
- `15-01` is no longer live: the current `packages/report-designer-renderers/src/page-renderer.tsx` main path no longer uses `JSON.stringify(...)` document change detection.
- `12-04` is now fixed: shared `title` typing has been widened through `packages/flux-core/src/types/schema.ts`, and the `report-designer`, `spreadsheet`, and `word-editor` host schema inputs now type `title` as `string | SchemaInput` to match their live `value-or-region` renderer contract.

## Goals

- Re-audit the retained host/error/performance findings against live code.
- Land the highest-priority correctness fixes with focused proof.
- Separate true closure blockers from lower-priority optimization candidates without losing ownership.

## Non-Goals

- Absorb accessibility/test-gate or doc-plan hygiene work.

## Scope

### In Scope

- `12-02`, `12-04`, `13-01`, `13-02`, `13-03`, `15-01`, `15-03`, `15-04`, `15-05`, `18-03`, `19-01`, `19-02`, `19-03`

### Out Of Scope

- Findings owned by Plans 262, 264, 265, 266, 268, 269, and 271

## Execution Plan

### Phase 1 - Re-audit Host Contracts And Failure Paths

Status: completed
Targets: `packages/report-designer-renderers/src/*`, `packages/word-editor-core/src/*`, `packages/word-editor-renderers/src/*`, `packages/flux-runtime/src/*`, `packages/flux-action-core/src/*`

- Item Types: `Decision | Fix | Proof`

- [x] Re-audit each retained ID against live code, focused tests, and owner docs.
- [x] Land the first closure-ready host/error/performance fixes.
- [x] Record whether any remaining item is a true optimization candidate versus a closure blocker.

Exit Criteria:

- [x] Every in-scope retained ID has an explicit owner decision.
- [x] Any landed fix has focused proof.
- [x] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [x] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [x] All in-scope retained findings are adjudicated.
- [x] No confirmed host-contract, error-fidelity, or main-path performance defect is silently deferred.
- [x] Remaining work has explicit successor ownership or landed fixes.
- [ ] Independent closure audit is completed and recorded with evidence.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None yet.

## Non-Blocking Follow-ups

None yet.

## Closure

Status Note: all in-scope retained IDs now have landed fixes or explicit adjudication. Keep the plan below `completed` until independent closure audit and full workspace closure-gate verification are recorded.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: focused proof already landed for `12-02`, `12-04`, `13-01`, `13-02`, `13-03`, `15-03`, `15-04`, `15-05`, `18-03`, `19-01`, `19-02`, and `19-03`; independent closure audit still pending.

Follow-up:

- Pending only: independent closure audit and final closure-gate verification
