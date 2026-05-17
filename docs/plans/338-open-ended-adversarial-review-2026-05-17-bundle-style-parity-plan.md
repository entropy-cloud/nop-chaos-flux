# 338 Open-Ended Adversarial Review 2026-05-17 Bundle Style Parity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-17-open-ended-adversarial-review-01/round-01.md` (Finding 2)
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/296-deep-audit-2026-05-15-public-css-slot-and-facade-contract-plan.md`, `docs/architecture/styling-system.md`, `docs/architecture/container-spacing-design.md`

## Purpose

Close the residual facade CSS drift where `packages/flux-bundle/src/style.css` is a non-identical manual copy of the canonical spacing/form stylesheets and now exposes broader selectors plus missing rules.

## Current Baseline

- Plan `296` closed the earlier public CSS slot and stale-BEM selector defects, but it did not own byte-level or semantic parity between bundle CSS and canonical source files.
- `docs/architecture/container-spacing-design.md` is the current owner-doc baseline for scoped spacing and field-slot styling behavior on the touched surfaces.
- `packages/flux-bundle/src/style.css` still duplicates logic from `packages/flux-react/src/default-spacing.css` and `packages/flux-renderers-form/src/form-renderers.css` instead of composing from them.
- The duplicate is not behaviorally identical: bundle selectors such as `.nop-flux-root [data-slot='field-label']` are broader than `.nop-field [data-slot='field-label']`, and bundle CSS omits rules like `.nop-schema-root-fallback[data-mode='loading']`.
- No focused proof currently guards against future drift between the bundle stylesheet and canonical styling sources.

## Goals

- Converge bundle facade styling onto one supported baseline that matches canonical source behavior.
- Add focused proof that the bundle stylesheet cannot silently drift on the touched surfaces.

## Non-Goals

- No unrelated visual redesign.
- No broader Tailwind/theme-token refactor.
- No reopening of Plan `296`'s already-closed stale selector family except where this new residual overlaps touched lines.

## Scope

### In Scope

- `packages/flux-bundle/src/style.css`
- `packages/flux-react/src/default-spacing.css`
- `packages/flux-renderers-form/src/form-renderers.css`
- focused tests/docs on the supported bundle styling baseline

### Out Of Scope

- spreadsheet/report-designer shell CSS surfaces
- general facade TypeScript contract work already closed by Plan `320`
- unrelated styling-system vocabulary work

## Execution Plan

### Phase 1 - Freeze Canonical Bundle Styling Baseline

Status: completed
Targets: bundle stylesheet, canonical source stylesheets, styling docs/tests

- Item Types: `Decision | Proof | Fix`

- [x] Decide whether bundle styling should compose canonical CSS sources or maintain a generated/duplicated artifact with explicit parity proof.
- [x] Re-audit the touched selector families (`field-*`, `schema-root-fallback`, form-control wrappers) and record the supported facade baseline.
- [x] Update styling docs if the supported bundle composition model changes.

Exit Criteria:

- [x] One explicit supported bundle styling baseline is recorded.
- [x] The parity-sensitive selector families are enumerated in focused proof scope.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-17.md` records the decision.

### Phase 2 - Land Bundle Parity Fix And Focused Proof

Status: completed
Targets: touched CSS files, focused tests

- Item Types: `Fix | Proof`

- [x] Remove the semantic drift between bundle CSS and canonical source stylesheets on the in-scope selectors.
- [x] Add focused proof that bundle selectors neither broaden ownership beyond the canonical baseline nor omit required rules on the touched surfaces.

Exit Criteria:

- [x] Bundle CSS on the in-scope surfaces matches the supported canonical behavior.
- [x] Focused proof covers the field-slot scoping family and `schema-root-fallback` state styling.
- [x] Future manual drift on the touched selectors becomes test-detectable.
- [x] `docs/logs/2026/05-17.md` records execution notes.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Decision | Fix`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after in-scope changes land.
- [x] Run an independent closure audit with a fresh subagent.

Exit Criteria:

- [x] Focused verification for the bundle-style residual is green.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining bundle-style parity blocker.
- [x] This plan, its checklists, and `docs/logs/2026/05-17.md` are textually consistent.

## Closure Gates

- [x] The in-scope live defect (bundle stylesheet semantic drift) is fixed.
- [x] Bundle facade styling converges to one supported baseline on the touched selectors.
- [x] Necessary focused verification exists for parity-sensitive selectors.
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

- If Phase 1 concludes that generated bundle CSS is the only stable answer, the generation pipeline should be owned in a successor tooling plan rather than silently folded into unrelated styling work.

## Closure

Status Note: Completed. The facade bundle now composes the canonical spacing and form CSS sources directly, and parity-sensitive selectors are covered by focused proof.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ca4629e9ffekNeqpTEETPK9kh`.
- Evidence: Re-audited `packages/flux-bundle/src/style.css`, `packages/flux-bundle/src/index.test.tsx`, `docs/architecture/container-spacing-design.md`, and `docs/logs/2026/05-17.md`; returned `No findings`.

Follow-up:

- No remaining plan-owned work once the bundle stylesheet matches the supported canonical baseline.
