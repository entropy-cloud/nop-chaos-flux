# 340 Open-Ended Adversarial Review 2026-05-17 Surface Error Isolation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-17-open-ended-adversarial-review-01/round-02.md` (Finding 1)
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/312-open-ended-adversarial-review-2026-05-15-s2-error-boundary-robustness-plan.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/surface-owner.md`

## Purpose

Close the live error-isolation gap where dialog/drawer surface body rendering is not wrapped in a node-level error boundary, allowing one surface renderer crash to escape its local failure domain.

## Current Baseline

- Plan `312` closed the narrower `renderErrorMessage()` coercion defect and explicitly left a different adjacent error-boundary residual (`schema-renderer.tsx` runtime/page/surface creation outside `SchemaRootErrorBoundary`) out of scope.
- `packages/flux-react/src/node-renderer.tsx` wraps ordinary node rendering in `NodeErrorBoundary`.
- `packages/flux-react/src/dialog-host.tsx` renders `renderSurfaceNode(surface.body ...)` for both dialog and drawer views without `NodeErrorBoundary` wrapping.
- No focused proof currently locks surface-body crash containment independently from root-boundary behavior.

## Goals

- Give surface body rendering the same local crash containment baseline as ordinary node rendering.
- Add focused proof that a dialog/drawer body crash stays inside the surface fallback domain instead of collapsing the root tree.

## Non-Goals

- No replacement of class-based error boundaries.
- No broader runtime/page creation error-boundary redesign beyond the surface-body isolation gap.
- No visual redesign of error fallbacks unless required by the supported baseline.

## Scope

### In Scope

- `packages/flux-react/src/dialog-host.tsx`
- `packages/flux-react/src/node-error-boundary.tsx` if the supported fallback composition requires a shared surface wrapper
- focused tests/docs on surface crash isolation

### Out Of Scope

- the already-closed `renderErrorMessage()` coercion family in Plan `312`
- general schema-root runtime creation isolation outside dialog/drawer body rendering
- dialog/drawer title and footer/action rendering unless Phase 1 proves the same missing-boundary path applies and the plan text is updated before implementation starts
- lifecycle-action cancellation work

## Execution Plan

### Phase 1 - Freeze Supported Surface Crash-Containment Baseline

Status: completed
Targets: dialog/drawer host rendering path, error-boundary docs/tests

- Item Types: `Decision | Proof | Fix`

- [x] Decide the supported fallback boundary for dialog/drawer body crashes (reuse `NodeErrorBoundary`, shared surface wrapper, or another explicit boundary shape).
- [x] Re-audit the dialog/drawer body render path and explicitly adjudicate title/actions rendering as either already safe or out of scope for this plan.
- [x] Update owner docs if the surface rendering contract wording changes.

Exit Criteria:

- [x] One explicit supported dialog/drawer body crash-containment baseline is recorded.
- [x] The in-scope dialog/drawer body render path is explicitly adjudicated, and any title/actions residual is either proven already safe or moved out of scope.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-17.md` records the decision.

### Phase 2 - Land Surface Isolation Fix And Focused Proof

Status: completed
Targets: `packages/flux-react/src/dialog-host.tsx`, focused tests

- Item Types: `Fix | Proof`

- [x] Implement the agreed surface-body crash containment fix.
- [x] Add focused tests proving a dialog/drawer child render crash is caught locally and does not escalate into `SchemaRootErrorBoundary` on the supported baseline.

Exit Criteria:

- [x] Surface-body crashes no longer collapse the root render tree on the in-scope paths.
- [x] Focused proof covers at least one dialog and one drawer crash scenario.
- [x] `docs/logs/2026/05-17.md` records execution notes.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched package, docs, this plan

- Item Types: `Proof | Decision | Fix`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after in-scope changes land.
- [x] Run an independent closure audit with a fresh subagent.

Exit Criteria:

- [x] Focused verification for the surface-isolation defect is green.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining surface error-isolation blocker.
- [x] This plan, its checklists, and `docs/logs/2026/05-17.md` are textually consistent.

## Closure Gates

- [x] The in-scope live defect (surface body crash escapes local boundary) is fixed.
- [x] Dialog/drawer rendering converges to one supported crash-containment baseline on the touched paths.
- [x] Necessary focused verification exists for local surface crash containment.
- [x] No in-scope live defect is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- Any broader runtime/page creation isolation work outside dialog/drawer rendering should live in a separate successor plan unless Phase 1 proves it is closure-critical here.

## Closure

Status Note: Completed. Dialog and drawer body rendering now reuse `NodeErrorBoundary` for local crash containment, and focused proof covers both surface kinds.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ca4629e9ffekNeqpTEETPK9kh`.
- Evidence: Re-audited `packages/flux-react/src/dialog-host.tsx`, `packages/flux-react/src/__tests__/dialog-host.test.tsx`, `docs/architecture/renderer-runtime.md`, and `docs/logs/2026/05-17.md`; returned `No findings`.

Follow-up:

- No remaining plan-owned work once surface-body crash containment is fixed and verified.
