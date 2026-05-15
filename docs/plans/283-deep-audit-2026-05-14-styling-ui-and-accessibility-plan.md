# 283 Deep Audit 2026-05-14 Styling UI And Accessibility Plan

> Plan Status: completed
> Last Reviewed: 2026-05-14
> Source: `docs/analysis/2026-05-14-deep-audit-batch1/{summary.md,10-styling.md,11-ui-components.md,20-accessibility.md}`
> Related: `docs/plans/280-open-ended-adversarial-review-2026-05-14-remediation-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 `deep-audit-batch1` 中 package CSS leakage、faux-button UI primitive usage、以及当前批次仍成立的 keyboard-access defect。

## Current Baseline

- `10-01` 已修复：`packages/flux-renderers-form/src/form-renderers.css` 现在把 package-owned selectors 限定在 `.nop-form` root 下，并由 `packages/flux-renderers-form/src/__tests__/form-renderers-css.test.ts` 提供 focused proof。
- `10-02` 已修复：`packages/flux-code-editor/src/code-editor-styles.css` 现在把 internal slot selectors 限定在 `.nop-code-editor` root 下，并通过 package-owned CSS variables 提供样式边界；proof 位于 `packages/flux-code-editor/src/code-editor-styles.test.ts`。
- `11-01/11-02/11-03` 已修复：Code Editor toolbar、Flow Designer inspector、Condition Builder value chip 都已切换为真实 button semantics，并由各自 focused tests 覆盖。
- `20-01` 已修复：Word Editor dataset primary card 已具备 keyboard-focusable / keyboard-activatable semantics，并由 `packages/word-editor-renderers/src/__tests__/dataset-panel.test.tsx` 覆盖。
- `20-02` 不在本计划内：Plan `280` 已明确 owning spreadsheet sheet-tab add/remove/rename affordance，包括 rename entry path proof。

## Goals

- Close retained package CSS scope leakage and code-editor theme-boundary drift.
- Replace retained faux-button interaction surfaces with honest button semantics or owned UI primitives.
- Make the retained dataset primary action keyboard-accessible without overlapping Plan `280`.

## Non-Goals

- 不接管 `20-02` 或任何 Plan `280` spreadsheet default host/readOnly/rename owner surface。
- 不吸收 runtime owner/public contract/structural-test/plan-baseline work。
- 不做 unrelated visual redesign。

## Scope

### In Scope

- `10-01/10-02`
- `11-01/11-02/11-03`
- `20-01`
- 相关 docs: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`, `docs/logs/2026/05-14.md`

### Out Of Scope

- `20-02` owned by Plan `280`
- `03-*`, `04-*`, `05-*`, `06-*`, `07-*`, `08-*`, `09-*`, `12-*`, `13-*`, `14-*`, `15-*`, `16-*`, `17-*`, `18-*`, `19-*`

## Execution Plan

### Phase 1 - Package CSS Scope Closure

Status: completed
Targets: `packages/flux-renderers-form/src/form-renderers.css`, `packages/flux-code-editor/src/code-editor-styles.css`, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix `10-01` by removing unsupported bare global `[data-slot]` selectors from the package-owned form renderer stylesheet and scoping rules to owned roots.
- [x] Fix `10-02` by scoping code-editor slot selectors to the package-owned root and replacing retained hard-coded colors with package-owned variables/tokens where the current defect requires it.
- [x] Add or update focused proof for the final CSS boundary on supported paths.
- [x] Update affected styling docs if the supported CSS ownership boundary changes; otherwise record `No owner-doc update required`.

Exit Criteria:

- [x] Retained IDs `10-01/10-02` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof for the repaired CSS surfaces exists and passes, covering owned-root selector scoping and the retained code-editor theme variable boundary.
- [x] Affected styling docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-14.md` includes Phase 1 execution notes.

### Phase 2 - Faux-Button And Dataset Accessibility Closure

Status: completed
Targets: `packages/flux-code-editor/src/**`, `packages/flow-designer-renderers/src/**`, `packages/flux-renderers-form-advanced/src/**`, `packages/word-editor-renderers/src/panels/dataset-panel.tsx`, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix `11-01/11-02/11-03` by replacing faux-button interaction surfaces with proper `Button` semantics or equivalent package-owned button-rendered controls.
- [x] Fix `20-01` by making the dataset panel primary dataset action keyboard-focusable and keyboard-activatable with honest semantics.
- [x] Add or update focused DOM/accessibility tests covering keyboard activation and primary-action semantics on the repaired surfaces.
- [x] Update affected accessibility/component docs if the supported user-visible contract changes; otherwise record `No owner-doc update required`.

Exit Criteria:

- [x] Retained IDs `11-01/11-02/11-03` and `20-01` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused DOM/accessibility proof exists and passes for every repaired interactive surface, including code-editor toolbar activation, Flow Designer inspector branch-card activation, Condition Builder chip removal activation, and dataset-panel primary-card keyboard activation.
- [x] No change in this phase overlaps Plan `280` sheet-tab rename ownership.
- [x] Affected docs are updated, or `No owner-doc update required` is explicit.
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
- [x] Independent closure audit confirms no remaining plan-owned blocker and no overlap conflict with Plan `280`.
- [x] Affected docs/logs are updated.

## Closure Gates

- [x] All in-scope retained styling/UI/a11y defects are fixed, or a fresh live re-audit recorded in this plan proves a given item is no longer live on the current baseline.
- [x] No in-scope confirmed defect is silently deferred.
- [x] Required focused verification exists for every changed surface.
- [x] Affected docs are synced to the live baseline.
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

Status Note: Completed after re-auditing the live styling/UI/a11y surfaces, confirming the repaired CSS and interaction semantics, and recording the final workspace-green verification baseline.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d8f7224dffen1zS1a0bDLlidY`
- Evidence: Independent closure audit confirmed the repaired CSS boundaries and keyboard/button semantics are live, found no remaining Plan `283` blocker, and required only plan/log text-consistency updates before closure.

Follow-up:

- None.
