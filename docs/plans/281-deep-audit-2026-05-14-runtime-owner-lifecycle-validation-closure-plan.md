# 281 Deep Audit 2026-05-14 Runtime Owner Lifecycle Validation Closure Plan

> Plan Status: planned
> Last Reviewed: 2026-05-14
> Source: `docs/analysis/2026-05-14-deep-audit-batch1/{summary.md,04-state-ownership.md,07-lifecycle.md,08-validation.md}`
> Related: `docs/plans/279-resolved-boolean-props-contract-plan.md`, `docs/plans/280-open-ended-adversarial-review-2026-05-14-remediation-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 `deep-audit-batch1` 中 runtime owner、truth-surface、render-phase lifecycle、以及 validation owner retained defects，并把相应 owner docs 同步到最终 live baseline。

## Current Baseline

- `04-01/02/03/04/06/08` 仍显示 Word Editor / Report Designer 在 dirty baseline、selection truth、saved truth、和 recovery baseline 上存在 retained owner/truth defects。
- `07-02/03` 仍显示 render-phase owner construction with external subscriptions、以及 constructor-launched async side effects。
- `08-01/02/03/04` 仍显示 subtree supersession、hidden-to-visible system revalidation、owner bootstrap state、以及 array validating stuck defects。
- 本计划不接管 reactive precision、async failure feedback、performance/observability、public contract、styling/UI/a11y、test hard-gate、或 plan baseline 文本治理。
- Plan `280` 已接管 spreadsheet default host/readOnly root-scoped behavior、detail-view viewer invalidation、data-source structural publication、Flow Designer xyflow stale-local-node、以及 table filtered pagination defect；同一 spreadsheet interaction surface 上的 `04-07`（field-drop history split）与 `07-01`（`useResize` render-phase preview reset）也由 Plan `280` 一并处理，本计划不接管这些 surfaces。
- Plan `279` 已接管 boolean-like prop normalization；本计划若触碰同文件，只允许消费最终 resolved boolean contract，不实现平行 coercion 或 fallback。

## Goals

- Close retained owner-truth defects from dimension `04`.
- Close retained lifecycle defects from dimension `07`.
- Close retained validation-owner defects from dimension `08`.

## Non-Goals

- 不接管 `05-*`, `06-*`, `15-*`, `19-*`。
- 不接管 `03-*`, `09-*`, `12-*`, `13-*`, `17-*`, `18-*`。
- 不接管 `10-*`, `11-*`, `20-*`。
- 不接管 `02-*`, `14-*`, `16-*`。

## Scope

### In Scope

- `04-01/02/03/04/06/08`
- `07-02/03`
- `08-01/02/03/04`
- 相关 owner docs: `docs/architecture/form-validation.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/scope-ownership-and-isolation.md`, `docs/logs/2026/05-14.md`

### Out Of Scope

- All Plan `280` defect families
- All Plan `279` boolean-normalization surfaces
- Any retained ID not listed in `In Scope`

## Execution Plan

### Phase 1 - Truth Surface Closure

Status: planned
Targets: `packages/word-editor-renderers/src/**`, `packages/report-designer-renderers/src/**`, `packages/report-designer-core/src/**`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `04-01/02/03/04/06/08` so dirty/saved/selection truth surfaces and recovery baselines no longer compete on supported paths.
- [ ] Add or update focused tests proving the repaired truth-surface behavior.
- [ ] Update affected owner docs if the supported truth-surface contract changes; otherwise explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained IDs `04-01/02/03/04/06/08` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused tests covering dirty/history/recovery truth surfaces exist in the touched package suites and pass.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-14.md` includes Phase 1 execution notes.

### Phase 2 - Lifecycle And Validation Owner Closure

Status: planned
Targets: `packages/spreadsheet-renderers/src/**`, `packages/flux-react/src/**`, `packages/flux-runtime/src/**`, `packages/report-designer-renderers/src/**`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `07-02/03` so no in-scope owner is created in render-phase and no constructor-launched async effect survives abandoned renders.
- [ ] Fix `08-01/02/03/04` so subtree supersession, hidden-to-visible revalidation, owner bootstrap state, and array validating cleanup match the current owner-doc baseline.
- [ ] Add or update focused tests proving the repaired lifecycle and validation-owner behavior.
- [ ] Update affected owner docs if the supported lifecycle or validation baseline changes; otherwise explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained IDs `07-02/03` and `08-01/02/03/04` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused tests covering render-phase purity, owner construction/disposal, subtree supersession, and validating cleanup exist in the touched package suites and pass.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-14.md` includes Phase 2 execution notes.

### Phase 3 - Verification And Closure Audit

Status: planned
Targets: touched packages, touched docs, this plan

- Item Types: `Proof | Fix | Decision`

- [ ] Run all focused tests added or modified in Phases 1-2.
- [ ] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [ ] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-14.md`.
- [ ] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code, touched docs, and verification output.
- [ ] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [ ] Focused verification for all touched defect families has passed.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining plan-owned blocker and no overlap conflict with Plans `279` or `280`.
- [ ] Affected docs/logs are updated, or `No owner-doc update required` is explicit.

## Closure Gates

- [ ] All in-scope retained runtime-owner, lifecycle, and validation-owner defects are fixed, or a fresh live re-audit recorded in this plan proves a given item is no longer live on the current baseline.
- [ ] No in-scope confirmed defect is silently deferred.
- [ ] Required focused verification exists for every touched defect family.
- [ ] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [ ] Independent closure audit confirms no remaining in-scope blocker.
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

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- Pending closure audit.
