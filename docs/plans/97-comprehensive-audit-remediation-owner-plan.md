# 97 Comprehensive Audit Remediation Owner Plan

> Plan Status: planned
> Last Reviewed: 2026-04-16
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/analysis/2026-04-16-comprehensive-project-audit.md`, `docs/references/maintenance-checklist.md`, `docs/logs/2026/04-16.md`
> Related: `docs/plans/24-word-editor-development-plan.md`, `docs/plans/84-oversized-code-file-elimination-plan.md`, `docs/plans/94-spreadsheet-command-dispatch-pattern-refactor-plan.md`, `docs/plans/96-final-architecture-doc-code-closure-plan.md`

## Purpose

Close the currently valid findings in `docs/analysis/2026-04-16-comprehensive-project-audit.md` by landing the needed code/doc/test/tooling changes, while keeping the scope frozen to the live baseline already verified on 2026-04-16.

This plan owns the full audit baseline, but not as a moving target. If execution reveals new problems outside that baseline, those must move to successor plans instead of silently expanding this one.

## Current Baseline

- The audit file has already been re-verified against the live repo and no longer contains the earlier false positives about oversized history docs, missing hidden-field docs, or stale `field-frame` paths.
- The valid documentation findings are: missing dedicated Word Editor owner docs, `form-validation.md` being oversized as an active owner doc, duplicated routing ownership between `AGENTS.md` and `docs/index.md`, and unresolved owner-doc wording around `dialog` versus `openDialog` authoring preference.
- The valid code-hygiene findings are fixed to these concrete paths: `packages/word-editor-renderers/src/WordEditorPage.tsx`, `packages/flux-code-editor/src/source-resolvers.ts`, `packages/flux-code-editor/src/types.ts`, `packages/flux-code-editor/src/code-editor-renderer.tsx`, `packages/flux-react/src/hooks.ts`, `packages/flux-renderers-basic/src/icon.tsx`, `packages/flow-designer-renderers/src/designer-icon.tsx`, `packages/flux-renderers-basic/src/tabs.tsx`, `packages/flux-renderers-data/src/table-renderer.tsx`, and `packages/flux-renderers-form/src/renderers/condition-builder/ConditionBuilder.tsx`.
- The valid test/tooling findings are fixed to these areas: `packages/ui/src/` has no tests, `packages/flux-core/src/` has a narrow current test baseline, only `packages/flux-formula/vitest.config.ts` has thresholds, and `packages/flux-runtime/vitest.config.js` is a stale artifact.
- The valid package-config findings are fixed to these files: `packages/word-editor-renderers/package.json`, `packages/flux-core/package.json`, `packages/flux-react/package.json`, `packages/nop-debugger/package.json`, `packages/flow-designer-core/tsconfig.json`, `packages/flow-designer-renderers/tsconfig.json`, `packages/tailwind-preset/package.json`, `packages/tailwind-preset/tsconfig.build.json`, and `packages/nop-debugger/tsconfig.build.json`.
- The oversized-code baseline for this plan is frozen to the 10 files reported by `node scripts/check-oversized-code-files.mjs` on 2026-04-16: `apps/playground/src/pages/DingTalkFlowDemo.tsx`, `apps/playground/src/pages/PerformanceTablePage.tsx`, `packages/nop-debugger/src/panel/styles-css.ts`, `packages/flux-renderers-form/src/__tests__/form-array-validation.test.tsx`, `packages/report-designer-core/src/__tests__/designer-core.test.ts`, `packages/report-designer-renderers/src/renderers.integration.test.tsx`, `packages/flow-designer-renderers/src/designer-command-adapter.ts`, `packages/spreadsheet-core/src/core-dispatch.ts`, `packages/flux-runtime/src/index.test.ts`, and `packages/flux-formula/src/parser.ts`.
- The styling/theming baseline is fixed to the Flow Designer files explicitly cited by the audit plus `packages/nop-debugger/src/panel/styles-css.ts` as debugger theme-portability debt.

## Goals

- Make every currently valid audit finding false for the right reason through live code/docs/tests/config changes.
- Keep the audit baseline frozen so closure is determined by repo-observable evidence, not by continuously re-scoping the plan.
- Update the audit doc and owner docs in reverse as slices land so the repository does not keep stale warnings after fixes are in.
- Close the plan only after an independent closure audit confirms the baseline findings are either resolved or explicitly moved to a named successor plan.

## Non-Goals

- Do not reopen false-positive audit items that were already removed from the audit.
- Do not absorb new unrelated findings discovered during execution; they require successor plans.
- Do not use wording-only reframing as a substitute for code/test/config closure.
- Do not let repo-wide cleanup aesthetics expand this plan beyond the frozen baseline list.

## Scope

### In Scope

- The specific valid audit findings and file paths listed in `## Current Baseline`
- The reverse updates to `docs/analysis/2026-04-16-comprehensive-project-audit.md`, owner docs, and daily logs required to keep the audit current

### Out Of Scope

- Historical doc-size cleanup for `docs/logs/`, `docs/analysis/`, or `docs/discussions/`
- New oversized files introduced after the frozen 2026-04-16 baseline
- New architecture or feature work not required to make the audited statements false

## Audit Mapping

This plan owns the following audit items exactly as they exist in `docs/analysis/2026-04-16-comprehensive-project-audit.md`:

- Oversized-file baseline: audit Section 2.3 plus the frozen 10-file baseline listed in `## Current Baseline`
- Documentation: D-06, D-07, D-08, D-09
- Code quality: C-01, C-02, C-03, C-04, C-05, C-06, C-07, C-08, C-09, C-10, C-11
- Testing/tooling: T-01, T-02, T-03, T-04
- Build/dependency: B-01, B-02, B-03, B-04, B-05, B-06
- Styling/theming: S-01, S-02, S-03, S-04, S-05, S-06, debugger theme-portability debt

## Execution Plan

### Workstream 1 - Word Editor Owner Docs

Status: planned
Targets: `docs/architecture/word-editor/`, `docs/components/word-editor-page/`, `docs/index.md`, any directly related Word Editor owner docs

- [ ] Add dedicated Word Editor architecture owner docs covering `word-editor-core` and `word-editor-renderers`.
- [ ] Add a `word-editor-page` component contract doc.
- [ ] Route both docs from `docs/index.md` so they are discoverable from the main docs entry point.
- [ ] Update the audit doc once the new owner docs are landed.

Exit Criteria:

- [ ] `docs/architecture/` contains dedicated Word Editor owner docs.
- [ ] `docs/components/` contains a `word-editor-page` contract doc.
- [ ] `docs/index.md` points readers to those docs.
- [ ] Audit item D-06 no longer describes the live repo.

### Workstream 2 - Active Owner Doc Size Closure For Form Validation

Status: planned
Targets: `docs/architecture/form-validation.md`, any successor docs created by the split, `docs/index.md`, related references if routing changes

- [ ] Split or restructure `docs/architecture/form-validation.md` so the active owner surface no longer exceeds the repo’s owner-doc size guidance.
- [ ] Ensure the resulting doc set has one clear owner-routing entry and no parallel stale baseline.
- [ ] Update the audit doc once the final owner-doc structure lands.

Exit Criteria:

- [ ] The main active `form-validation` owner doc surface is no longer above the 50 KB guidance.
- [ ] Any split-out successor docs are linked from the main owner entry.
- [ ] No outdated duplicated baseline remains in the original file.
- [ ] Audit item D-07 no longer describes the live repo.

### Workstream 3 - Routing Authority And Dialog Naming Doc Closure

Status: planned
Targets: `AGENTS.md`, `docs/index.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/flux-core.md`

- [ ] Make the docs-routing authority explicit: `docs/index.md` should own the docs navigation baseline, while `AGENTS.md` should either point to it or keep only a deliberately reduced operational subset.
- [ ] Remove or reduce duplicated routing tables enough that future updates do not require maintaining two equal owner sources.
- [ ] Update owner docs so new schema authoring preference between `dialog` and `openDialog` is stated explicitly, while also documenting current coexistence.
- [ ] Update the audit doc after these doc-ownership changes land.

Exit Criteria:

- [ ] `docs/index.md` is explicitly the docs navigation owner, and `AGENTS.md` no longer acts as an equal parallel routing source.
- [ ] `docs/architecture/action-scope-and-imports.md` and/or `docs/architecture/flux-core.md` explicitly state which dialog-opening action name new authoring should prefer.
- [ ] Audit items D-08 and D-09 no longer describe the live repo.

### Workstream 4 - Word Editor Logs And Code-Editor Resolver Error Handling

Status: planned
Targets: `packages/word-editor-renderers/src/WordEditorPage.tsx`, `packages/flux-code-editor/src/source-resolvers.ts`, related focused tests

- [ ] Remove the three audited production `console.log` calls from `WordEditorPage.tsx`.
- [ ] Replace the four audited `catch(() => {})` branches in `source-resolvers.ts` with observable error handling.
- [ ] Extract one shared resolver helper in `source-resolvers.ts` so the repeated request flow cited by C-11 is no longer duplicated.
- [ ] Remove the audited `dispatch(... as any)` and `reduce((obj: any, ...))` type escapes from `source-resolvers.ts`.
- [ ] Add or update focused tests for resolver failure handling.

Exit Criteria:

- [ ] `WordEditorPage.tsx` no longer contains the three audited production `console.log` calls.
- [ ] `source-resolvers.ts` no longer contains the four audited silent catches.
- [ ] `source-resolvers.ts` uses a shared helper for the repeated async resolver flow instead of four near-identical implementations.
- [ ] `source-resolvers.ts` no longer contains the audited `dispatch(... as any)` or `reduce((obj: any, ...))` type-escape patterns.
- [ ] Audit items C-01, C-02, C-03, C-04, and C-11 no longer describe the live repo.

### Workstream 5 - Code-Editor Type Narrowing And Renderer Cast Cleanup

Status: planned
Targets: `packages/flux-code-editor/src/types.ts`, `packages/flux-code-editor/src/code-editor-renderer.tsx`, `packages/flux-react/src/hooks.ts`, `packages/flux-renderers-basic/src/tabs.tsx`, `packages/flux-renderers-data/src/table-renderer.tsx`, `packages/flux-renderers-form/src/renderers/condition-builder/ConditionBuilder.tsx`, related tests/helpers

- [ ] Remove or narrow the audited `any` fields in `flux-code-editor/src/types.ts`.
- [ ] Remove or narrow the audited `as any` / `err: any` / dynamic result-path escape hatches in `code-editor-renderer.tsx`.
- [ ] Eliminate the audited `as unknown as S` bridge in `flux-react/src/hooks.ts`, or isolate the generic coercion behind one typed helper with focused tests and no repeated call-site double-cast.
- [ ] Remove the audited `props.props as unknown as SpecificSchema` cast pattern from `tabs.tsx`, `table-renderer.tsx`, and `ConditionBuilder.tsx` through narrower prop/schema helpers.

Exit Criteria:

- [ ] Audit items C-05 and C-07 no longer describe the live `flux-code-editor` code paths.
- [ ] `packages/flux-react/src/hooks.ts` no longer contains the audited `as unknown as S` bridge pattern at the live hook call boundary.
- [ ] `tabs.tsx`, `table-renderer.tsx`, and `ConditionBuilder.tsx` no longer rely on the audited `props.props as unknown as SpecificSchema` pattern.
- [ ] Audit items C-08 and C-09 no longer describe the live repo.

### Workstream 6 - Shared Icon Helper Consolidation

Status: planned
Targets: `packages/flux-renderers-basic/src/icon.tsx`, `packages/flow-designer-renderers/src/designer-icon.tsx`, extracted shared helper module, focused tests

- [ ] Extract `toIconLookupKey`, `normalizeIconName`, and `toLucideKey` into one shared helper.
- [ ] Update both icon renderers to use the shared helper.
- [ ] Add focused tests for normalization behavior if missing.

Exit Criteria:

- [ ] The duplicated icon normalization logic exists in one shared implementation.
- [ ] Both audited icon renderers use that shared implementation.
- [ ] Audit item C-10 no longer describes the live repo.

### Workstream 7 - UI And Flux-Core Test Baseline

Status: planned
Targets: `packages/ui/src/`, `packages/flux-core/src/`, related Vitest files/helpers

- [ ] Add a minimal smoke/render baseline for `@nop-chaos/ui`.
- [ ] Expand `@nop-chaos/flux-core` tests beyond the current six-file baseline cited by the audit.
- [ ] Keep the new tests owner-aligned and representative rather than padding counts.

Exit Criteria:

- [ ] `packages/ui/src/**/*.test.*` is no longer empty.
- [ ] `@nop-chaos/flux-core` has more than the six audited test files and covers at least one additional owner-relevant surface.
- [ ] Audit items T-01 and T-02 no longer describe the live repo.

### Workstream 8 - Coverage Policy And Stale Vitest Artifact

Status: planned
Targets: package Vitest configs as needed, `packages/flux-runtime/vitest.config.js`, any shared test-config docs if needed

- [ ] Decide and land the next-step coverage-threshold policy beyond `flux-formula` for the packages this repo wants to gate now.
- [ ] Delete `packages/flux-runtime/vitest.config.js`.
- [ ] Update the audit doc once the policy and stale-artifact cleanup are landed.

Exit Criteria:

- [ ] At least one additional package besides `flux-formula` has a live coverage-threshold gate in its committed Vitest config.
- [ ] `packages/flux-runtime/vitest.config.js` no longer exists.
- [ ] Audit items T-03 and T-04 no longer describe the live repo.

### Workstream 9 - Dependency And Package-Config Hygiene

Status: planned
Targets: `packages/word-editor-renderers/package.json`, `packages/flux-core/package.json`, `packages/flux-react/package.json`, `packages/nop-debugger/package.json`, `packages/flow-designer-core/tsconfig.json`, `packages/flow-designer-renderers/tsconfig.json`, `packages/tailwind-preset/package.json`, `packages/tailwind-preset/tsconfig.build.json`, `packages/nop-debugger/tsconfig.build.json`

- [ ] Move `@types/use-sync-external-store` out of runtime dependencies in `word-editor-renderers`.
- [ ] Declare the appropriate React package dependency surface for `flux-core` type imports.
- [ ] Re-audit `react-dom` usage in `flux-react` and `nop-debugger` and remove the dependency if it is unused.
- [ ] Remove the redundant no-emit-era tsconfig overrides from the two Flow Designer packages.
- [ ] Resolve the `tailwind-preset` source-export versus build-output ambiguity into one explicit model.
- [ ] Remove the `@nop-chaos/ui -> packages/ui/dist/index.d.ts` path mapping from `packages/nop-debugger/tsconfig.build.json` unless a concrete build blocker proves it unavoidable; if unavoidable, document that blocker and move the unresolved debt to a successor plan.

Exit Criteria:

- [ ] Audit item B-01 no longer describes `word-editor-renderers/package.json`.
- [ ] Audit item B-02 no longer describes `flux-core/package.json`.
- [ ] Audit item B-03 no longer describes the live dependency state of `flux-react` and `nop-debugger`, or any unresolved remainder has moved to a successor plan.
- [ ] Audit item B-04 no longer describes the two Flow Designer tsconfig files.
- [ ] Audit item B-05 no longer describes `tailwind-preset` packaging semantics.
- [ ] Audit item B-06 no longer describes `nop-debugger/tsconfig.build.json`, or any unresolved remainder has moved to a successor plan.

### Workstream 10 - Frozen Oversized-File Baseline Cleanup

Status: planned
Targets: `apps/playground/src/pages/DingTalkFlowDemo.tsx`, `apps/playground/src/pages/PerformanceTablePage.tsx`, `packages/nop-debugger/src/panel/styles-css.ts`, `packages/flux-renderers-form/src/__tests__/form-array-validation.test.tsx`, `packages/report-designer-core/src/__tests__/designer-core.test.ts`, `packages/report-designer-renderers/src/renderers.integration.test.tsx`, `packages/flow-designer-renderers/src/designer-command-adapter.ts`, `packages/spreadsheet-core/src/core-dispatch.ts`, `packages/flux-runtime/src/index.test.ts`, `packages/flux-formula/src/parser.ts`

- [ ] Reduce the frozen 10-file oversized baseline below the 500-line threshold without weakening behavior or test readability.
- [ ] Prioritize the three production hotspots the audit already called out as highest-value: `styles-css.ts`, `designer-command-adapter.ts`, and `core-dispatch.ts`.
- [ ] Keep `parser.ts` readable while bringing it below threshold.
- [ ] Re-run `node scripts/check-oversized-code-files.mjs` after the baseline list is cleared.

Exit Criteria:

- [ ] None of the 10 frozen baseline files remain above 500 lines.
- [ ] `node scripts/check-oversized-code-files.mjs` passes, or any newly appearing non-baseline files are explicitly recorded as out of scope and moved to a successor plan before closure.
- [ ] The audit’s oversized-file statements no longer describe the frozen baseline.

### Workstream 11 - Flow Designer And Debugger Theme-Portability Closure

Status: planned
Targets: `packages/flow-designer-renderers/src/designer-inspector.tsx`, `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-renderers/src/designer-palette.tsx`, `packages/flow-designer-renderers/src/designer-toolbar.tsx`, audited DingFlow files, `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx`, `packages/nop-debugger/src/panel/styles-css.ts`, relevant owner docs

- [ ] Replace the audited Flow Designer hardcoded semantic colors/backgrounds with CSS-variable or theme-token driven values.
- [ ] Keep inline styles only for dynamic geometry/positioning that are not really theme values.
- [ ] Make debugger palette values host-overridable through a documented variable/token surface, or move any unresolved debugger-theming remainder to a successor plan.
- [ ] Update the relevant owner docs once the theme-portability model lands.

Exit Criteria:

- [ ] The audited Flow Designer files no longer depend on the hardcoded semantic colors/backgrounds cited by S-01 through S-06.
- [ ] `packages/nop-debugger/src/panel/styles-css.ts` no longer hardcodes the debugger palette without a documented host-overridable variable/token contract, or any unresolved remainder has moved to a successor plan.
- [ ] The audit’s styling/theming findings no longer describe the live repo.

### Workstream 12 - Audit Sync And Closure Audit

Status: planned
Targets: `docs/analysis/2026-04-16-comprehensive-project-audit.md`, touched owner docs, `docs/logs/2026/04-16.md`, this plan

- [ ] Keep the audit doc synchronized as each workstream lands so resolved findings do not remain listed as active issues.
- [ ] Re-audit every audit item listed in `## Audit Mapping` against the live repo before closure.
- [ ] Run one independent closure-audit pass; if it disagrees with the implementation self-audit, keep revising and rerun independent review until one reconciled conclusion is recorded.
- [ ] Record the final closure evidence in the daily log and plan closure section.

Exit Criteria:

- [ ] The audit doc no longer reports any unresolved item still owned by this plan.
- [ ] Audit Section 2.3 and the frozen 10-file oversized baseline have been rechecked alongside the mapped D/C/T/B/S findings.
- [ ] An independent closure audit has been completed and recorded with explicit evidence.
- [ ] The daily log records the final reconciliation/closure pass.

## Documentation Follow-Up

- Update the audit doc as work lands; do not leave already-fixed findings in the active issue list.
- Update docs entry points whenever Word Editor docs or `form-validation` successor docs land.
- If routing ownership changes between `AGENTS.md` and `docs/index.md`, make the authority explicit in both places.
- If theming rules change, update the relevant owner docs in the same slice.

## Validation Checklist

- [ ] Every audit item listed in `## Audit Mapping`, including audit Section 2.3 and the frozen 10-file oversized baseline, has been re-audited and is either resolved or explicitly moved to a named successor plan
- [ ] Word Editor has dedicated architecture and component owner docs discoverable from the docs entry point
- [ ] `form-validation` active owner-doc surface is no longer above the size guidance
- [ ] The routing-authority and `dialog` / `openDialog` doc issues no longer match the audit
- [ ] `WordEditorPage.tsx` logs, `source-resolvers.ts` silent catches, code-editor type hotspots, hook/generic bridge issue, renderer cast hotspots, and duplicated icon helper issue are all closed
- [ ] `@nop-chaos/ui` and `@nop-chaos/flux-core` no longer match the audit’s weak test baseline claims
- [ ] Coverage threshold findings are closed by a committed additional package-level threshold gate, and the stale Vitest artifact finding is closed
- [ ] Dependency/package-config findings are closed or explicitly moved to a successor plan
- [ ] The 10-file frozen oversized baseline is cleared below threshold
- [ ] Flow Designer and debugger theming findings are closed or explicitly moved to a successor plan
- [ ] Independent closure audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Risks And Rollback

- The main risk is broad churn across many owners; keep each landing slice small and tied to one workstream.
- Oversized-file cleanup and theming cleanup can over-abstract if done mechanically; stop when the audited statement becomes false for the right reason.
- Doc splitting can create parallel baselines if old sections are left teaching stale ownership.
- Roll back by keeping each slice narrow, preserving focused tests, and moving any genuinely independent remainder to a successor plan.

## Closure

Status Note: complete this section only after every mapped audit item has been rechecked against the live repo, all validation items are satisfied, and an independent closure audit confirms there is no remaining plan-owned audit work.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- If any mapped audit item remains unresolved, move that remainder to a narrower successor plan before closure.
- Otherwise record that there is no remaining plan-owned work from the 2026-04-16 comprehensive audit baseline.
