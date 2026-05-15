# 281 Deep Audit 2026-05-14 Runtime Owner Lifecycle Validation Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-14
> Source: `docs/analysis/2026-05-14-deep-audit-batch1/{summary.md,04-state-ownership.md,07-lifecycle.md,08-validation.md}`
> Related: `docs/plans/279-resolved-boolean-props-contract-plan.md`, `docs/plans/280-open-ended-adversarial-review-2026-05-14-remediation-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 `deep-audit-batch1` 中 runtime owner、truth-surface、render-phase lifecycle、以及 validation owner retained defects，并把相应 owner docs 同步到最终 live baseline。

## Current Baseline

- 已落地一个 Word Editor truth-surface slice：`packages/word-editor-renderers/src/hooks/use-word-editor-state.ts`, `editor-canvas.tsx`, `word-editor-action-provider.ts` 与相关 focused tests 已收口空 host document fallback、autosave dirty、以及 failed host save recovery baseline 行为。
- 独立 closure audit 重新核对后确认 `07-02/03` 仍 live：`packages/flux-react/src/schema-renderer.tsx`, `packages/flux-runtime/src/runtime-owned-factories.ts`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-core/src/core.ts` 仍存在 render-phase owner construction / constructor-launched async side effects。
- 独立 closure audit 重新核对后确认 `08-02/03/04` 仍 live：`packages/flux-runtime/src/form-runtime-field-ops.ts`, `packages/flux-runtime/src/runtime-owned-factories.ts`, `packages/flux-runtime/src/form-runtime-array.ts` 仍存在 hidden-to-visible system revalidation、owner bootstrap state、以及 array validating cleanup gap。
- Report Designer retained truth-surface items `04-03` / `04-06` 也仍 live：`packages/report-designer-renderers/src/host-data.ts` 仍并行发布 aggregated undo/redo aliases，`packages/report-designer-core/src/core-dispatch.ts` save path 仍未推进 saved baseline owner。
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

Status: completed
Targets: `packages/word-editor-renderers/src/**`, `packages/report-designer-renderers/src/**`, `packages/report-designer-core/src/**`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix the landed Word Editor subset of `04-01/02/03/04/06/08` so dirty/saved/selection truth surfaces and recovery baselines no longer compete on the supported Word Editor paths.
- [x] Add or update focused tests proving the repaired truth-surface behavior.
- [x] Update affected owner docs if the supported truth-surface contract changes; otherwise explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained IDs `04-01/02/03/04/06/08` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused tests covering dirty/history/recovery truth surfaces exist in the touched package suites and pass.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-14.md` includes Phase 1 execution notes.

### Phase 2 - Lifecycle And Validation Owner Closure

Status: completed
Targets: `packages/spreadsheet-renderers/src/**`, `packages/flux-react/src/**`, `packages/flux-runtime/src/**`, `packages/report-designer-renderers/src/**`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix `07-02/03` so no in-scope owner is created in render-phase and no constructor-launched async effect survives abandoned renders.
- [x] Fix `08-01/02/03/04` so subtree supersession, hidden-to-visible revalidation, owner bootstrap state, and array validating cleanup match the current owner-doc baseline.
- [x] Add or update focused tests proving the repaired lifecycle and validation-owner behavior.
- [x] Update affected owner docs if the supported lifecycle or validation baseline changes; otherwise explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained IDs `07-02/03` and `08-01/02/03/04` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused tests covering render-phase purity, owner construction/disposal, subtree supersession, and validating cleanup exist in the touched package suites and pass.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-14.md` includes Phase 2 execution notes.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, touched docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-14.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code, touched docs, and verification output.
- [x] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [x] Focused verification for all touched defect families has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned blocker and no overlap conflict with Plans `279` or `280`.
- [x] Affected docs/logs are updated, or `No owner-doc update required` is explicit.

## Closure Gates

- [x] All in-scope retained runtime-owner, lifecycle, and validation-owner defects are fixed, or a fresh live re-audit recorded in this plan proves a given item is no longer live on the current baseline.
- [x] No in-scope confirmed defect is silently deferred.
- [x] Required focused verification exists for every touched defect family.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent closure audit confirms no remaining in-scope blocker.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: The plan is complete on the live baseline. The Word Editor truth-surface slice remains in place, and the retained Report Designer/runtime owner defects were closed by moving page/core startup side effects to commit-safe entrypoints, splitting report-designer history truth surfaces by owner, adding an explicit save baseline, restoring direct commit/submit supersession, remapping array validation abort controllers, and moving external page-store sync attachment out of render allocation. Focused package proof passed, repo-level `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` all passed, and the final workspace `pnpm test` run reported `49 successful, 49 total`.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d8700315ffeGNtG5oDdXO3NrH`
- Evidence: Independent closure audit re-read this plan, the linked `04-state-ownership.md`, `07-lifecycle.md`, and `08-validation.md` analysis files, `docs/logs/2026/05-14.md`, the touched live code/docs/tests under `packages/flux-runtime`, `packages/flux-react`, `packages/report-designer-core`, and `packages/report-designer-renderers`, plus the saved workspace `pnpm test` output at `C:\Users\a758371\.local\share\opencode\tool-output\tool_e277fa5280015r8KYFKtmd8CWm`. The audit found no remaining live Plan `281` blocker, no ownership conflict with Plans `279` or `280`, and confirmed the workspace `pnpm test` summary `Tasks: 49 successful, 49 total`.

Follow-up:

- None.
