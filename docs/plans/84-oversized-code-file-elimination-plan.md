# 84 Oversized Code File Elimination Plan

> Plan Status: planned
> Last Reviewed: 2026-04-13
> Source: live repo audit of tracked code files over 500 lines, `AGENTS.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/references/refactoring-guidelines.md`
> Related: `docs/plans/76-repo-refactor-hotspots-remediation-plan.md`, `docs/plans/62-core-runtime-orchestration-refactor-plan.md`, `docs/plans/63-node-renderer-owner-boundary-and-context-convergence-plan.md`, `docs/plans/70-composite-value-fields-and-validation-integration-plan.md`, `docs/plans/82-architecture-contract-implementation-convergence-plan.md`

## Purpose

Eliminate the current set of oversized code files so the live repo no longer has tracked code files over 500 lines, while keeping behavior, verification coverage, and owner boundaries intact.

## Current Baseline

- A live repo audit on 2026-04-13 found 31 tracked code files over 500 lines.
- The largest remaining files are concentrated in package-level integration tests, runtime test suites, a few core/orchestrator files, and debugger/support utilities.
- `docs/references/refactoring-guidelines.md` already defines 500-900 lines as a range that should usually be split, and `> 900` lines as requiring split by subdomain.
- `AGENTS.md` now tells implementers to evaluate splitting any existing code file already over 500 lines before adding more code.
- The plan authoring guide currently enforces plan structure and closure discipline, but does not itself add a repo-wide guardrail against oversized code files.
- Existing owner plans sometimes intentionally land new coverage into package-level `index.test.ts[x]` files, which has allowed continued growth even after targeted hotspot work landed.

Current live oversized code files from the 2026-04-13 audit:

- `packages/flux-runtime/src/index.test.ts` - 6398
- `packages/flux-renderers-form/src/index.test.tsx` - 3600
- `packages/flux-runtime/src/__tests__/runtime-actions-advanced.test.ts` - 1845
- `packages/flux-runtime/src/__tests__/runtime-validation.test.ts` - 1750
- `packages/flux-renderers-data/src/index.test.tsx` - 1529
- `packages/report-designer-core/src/index.test.ts` - 1119
- `packages/flux-react/src/schema-renderer-runtime.test.tsx` - 1087
- `packages/flux-renderers-basic/src/index.test.tsx` - 998
- `packages/flux-renderers-form/src/__tests__/composite-form.test.tsx` - 943
- `packages/flux-runtime/src/form-runtime.ts` - 844
- `packages/flow-designer-core/src/core.ts` - 814
- `packages/flux-runtime/src/__tests__/form-runtime-performance.test.ts` - 740
- `packages/ui/src/components/ui/sidebar.tsx` - 722
- `packages/spreadsheet-core/src/core.test.ts` - 674
- `packages/flux-react/src/test-support.tsx` - 636
- `packages/nop-debugger/src/panel/styles.ts` - 634
- `packages/flux-runtime/src/__tests__/request-runtime.test.ts` - 634
- `packages/nop-debugger/src/panel.test.tsx` - 620
- `packages/spreadsheet-core/src/core.ts` - 614
- `packages/flux-runtime/src/action-runtime.ts` - 596
- `packages/nop-debugger/src/controller.ts` - 590
- `packages/spreadsheet-core/src/new-commands.test.ts` - 585
- `packages/flux-renderers-form/src/renderers/condition-builder/config-integration.test.tsx` - 585
- `packages/word-editor-core/src/__tests__/dataset-store.test.ts` - 546
- `packages/flux-runtime/src/__tests__/runtime-scope-actions.test.ts` - 543
- `packages/flux-runtime/src/__tests__/runtime-sources.test.ts` - 538
- `packages/report-designer-core/src/core.ts` - 537
- `packages/spreadsheet-core/src/commands.ts` - 518
- `packages/flow-designer-core/src/core.test.ts` - 515
- `packages/flux-runtime/src/request-runtime.ts` - 508
- `packages/nop-debugger/src/diagnostics.ts` - 501

## Goals

- Reduce the live repo to zero tracked code files over 500 lines.
- Split oversized files along owner or responsibility boundaries instead of using mechanical line-count-only slicing.
- Preserve or improve existing focused verification so the refactor does not weaken coverage semantics.
- Leave durable guardrails in instructions/docs so future work does not drift back into oversized-file accumulation.

## Non-Goals

- Do not perform a repo-wide style rewrite or rename-only cleanup unrelated to oversized-file elimination.
- Do not force every package into the same directory structure if a smaller local extraction achieves the boundary goal.
- Do not mark the plan completed until the live repo audit itself proves there are no tracked code files over 500 lines.
- Do not silently weaken comprehensive integration coverage just to reduce line counts.

## Scope

### In Scope

- All tracked code files currently over 500 lines from the 2026-04-13 audit.
- Successor focused tests/helpers/modules required to replace oversized files.
- `AGENTS.md`, `docs/references/refactoring-guidelines.md`, and this plan if wording updates are needed to keep the guardrail durable.
- Daily log entries and any architecture docs that must move with owner-boundary changes.

### Out Of Scope

- Docs-only size cleanup under `docs/`.
- Generated artifacts, vendored code, or `dist/` output.
- Feature work unrelated to oversized-file elimination.

## Execution Plan

### Workstream 1 - Runtime Test Suite Decomposition Completion

Status: planned
Targets: `packages/flux-runtime/src/index.test.ts`, `packages/flux-runtime/src/__tests__/runtime-actions-advanced.test.ts`, `packages/flux-runtime/src/__tests__/runtime-validation.test.ts`, `packages/flux-runtime/src/__tests__/form-runtime-performance.test.ts`, `packages/flux-runtime/src/__tests__/request-runtime.test.ts`, `packages/flux-runtime/src/__tests__/runtime-scope-actions.test.ts`, `packages/flux-runtime/src/__tests__/runtime-sources.test.ts`, runtime test fixtures/helpers

- [ ] Re-audit the current topic distribution of each oversized runtime test file and map every describe block to an owner-aligned destination suite.
- [ ] Finish the partial decomposition left by plan 76 so `index.test.ts` shrinks below 500 lines instead of remaining a compatibility aggregation bucket.
- [ ] Extract shared runtime test setup only where it reduces duplication without hiding assertion intent.
- [ ] Keep runtime-focused suites grouped by semantic owner such as request execution, validation, action dispatch, source publication, and form runtime.
- [ ] Preserve or improve verification fidelity for every moved scenario.

Exit Criteria:

- [ ] Every runtime test file listed in this workstream is under 500 lines.
- [ ] No moved runtime scenario is left only in comments, TODOs, or broad helper abstractions.
- [ ] Focused runtime test commands and package-level verification remain green.

### Workstream 2 - Renderer Family Test Harness Decomposition

Status: planned
Targets: `packages/flux-renderers-form/src/index.test.tsx`, `packages/flux-renderers-data/src/index.test.tsx`, `packages/flux-renderers-basic/src/index.test.tsx`, `packages/flux-react/src/schema-renderer-runtime.test.tsx`, `packages/flux-renderers-form/src/__tests__/composite-form.test.tsx`, `packages/flux-renderers-form/src/renderers/condition-builder/config-integration.test.tsx`, `packages/flux-react/src/test-support.tsx`

- [ ] Audit the oversized renderer and react test files by component family, runtime contract, and test-fixture responsibility.
- [ ] Move package-level integration cases into focused files named by component or behavior rather than continuing to grow package `index.test.tsx` entrypoints.
- [ ] Keep one coherent comprehensive integration scenario where it is genuinely valuable, but split helper builders, fixtures, and orthogonal behavior groups so the comprehensive file itself stays under 500 lines.
- [ ] Extract test-support utilities from `test-support.tsx` into focused helper modules if the current file mixes multiple independent concerns.
- [ ] Update any existing plans that still point new coverage at oversized package-level test files, or record explicit supersession/follow-up notes from this owner plan.

Exit Criteria:

- [ ] Every renderer/react test file listed in this workstream is under 500 lines.
- [ ] Package-level test entry files are no longer the default dumping ground for new renderer coverage.
- [ ] Comprehensive scenarios remain explicit and readable instead of being replaced by opaque helper indirection.

### Workstream 3 - Core And Runtime Source File Extraction

Status: planned
Targets: `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/request-runtime.ts`, `packages/flow-designer-core/src/core.ts`, `packages/report-designer-core/src/core.ts`, `packages/spreadsheet-core/src/core.ts`, `packages/spreadsheet-core/src/commands.ts`

- [ ] Read each oversized implementation file end-to-end and identify extraction seams based on owner boundaries, not just utility-shaped fragments.
- [ ] Split orchestration from helper logic so public entry files remain readable orchestrators rather than mixed implementation buckets.
- [ ] Keep exported APIs stable unless a narrower public surface is explicitly required and documented.
- [ ] Update package architecture docs when file extraction changes live ownership boundaries in a meaningful way.

Exit Criteria:

- [ ] Every implementation file listed in this workstream is under 500 lines.
- [ ] New extracted modules have single-purpose ownership and do not introduce reverse dependencies or boundary drift.
- [ ] Relevant focused tests plus package verification are green after extraction.

### Workstream 4 - Debugger, UI, And Support Module Decomposition

Status: planned
Targets: `packages/ui/src/components/ui/sidebar.tsx`, `packages/nop-debugger/src/panel/styles.ts`, `packages/nop-debugger/src/panel.test.tsx`, `packages/nop-debugger/src/controller.ts`, `packages/nop-debugger/src/diagnostics.ts`

- [ ] Separate styling primitives, controller responsibilities, diagnostics formatting, and panel behavior tests into focused modules where the current files mix concerns.
- [ ] Preserve public import surfaces for `@nop-chaos/ui` and `@nop-chaos/nop-debugger` unless a smaller internal split is sufficient.
- [ ] Keep snapshot/assertion readability high when splitting debugger panel tests.

Exit Criteria:

- [ ] Every debugger/UI/support file listed in this workstream is under 500 lines.
- [ ] Public package entry behavior stays unchanged from a consumer perspective unless explicitly documented.
- [ ] Focused debugger/UI test commands and package verification are green.

### Workstream 5 - Domain Test Suite Decomposition

Status: planned
Targets: `packages/report-designer-core/src/index.test.ts`, `packages/spreadsheet-core/src/core.test.ts`, `packages/spreadsheet-core/src/new-commands.test.ts`, `packages/word-editor-core/src/__tests__/dataset-store.test.ts`, `packages/flow-designer-core/src/core.test.ts`

- [ ] Split oversized domain test files by domain capability rather than by arbitrary chunk size.
- [ ] Extract shared domain fixtures only when reuse is real and test intent remains obvious.
- [ ] Keep command/runtime/model boundaries readable in test naming and file placement.

Exit Criteria:

- [ ] Every domain test file listed in this workstream is under 500 lines.
- [ ] Test names and file names still reveal the covered domain behavior after the split.
- [ ] Focused domain package verification is green.

### Workstream 6 - Guardrails, Audit Command, And Closure

Status: planned
Targets: `AGENTS.md`, `docs/references/refactoring-guidelines.md`, this plan, daily log, optional lightweight audit script or documented audit command

- [ ] Confirm the live instruction set clearly tells implementers not to keep extending code files already over 500 lines.
- [ ] Decide whether `docs/plans/00-plan-authoring-and-execution-guide.md` should remain process-focused only, or should also cross-reference the oversized-file guardrail in a short note.
- [ ] Add or document a repeatable repo audit command so closure and future audits can verify the rule mechanically.
- [ ] Record closure evidence in the daily log and, if needed, create successor plans for any file that cannot be reduced without a broader architecture decision.

Exit Criteria:

- [ ] Repo instructions contain a durable, explicit oversized-code-file guardrail.
- [ ] The team has one documented way to re-run the oversized-file audit.
- [ ] Any remaining exception would be explicitly documented and moved out of scope before closure; otherwise there must be zero oversized code files.

## Validation Checklist

- [ ] A fresh live repo audit reports zero tracked code files over 500 lines.
- [ ] Runtime, renderer, debugger, and domain package splits preserve behavior and verification quality.
- [ ] Relevant architecture docs are updated where owner boundaries changed.
- [ ] `docs/logs/2026/04-13.md` or the then-current daily log records what landed and the key decisions.
- [ ] Focused verification has been completed for each touched package.
- [ ] Independent sub-agent or independent reviewer closure audit has been completed and recorded with evidence.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Risks And Rollback

- The main risk is weakening test semantics by over-extracting helpers or replacing explicit scenarios with opaque fixture factories.
- Core package orchestrator splits can accidentally move code across the documented package boundary if extraction is done mechanically.
- Some oversized files may expose unresolved architecture ambiguity; if so, the ambiguity must become explicit follow-up work rather than being hidden by a partial split.
- Roll back by keeping extraction commits narrow, verifying each workstream independently, and preserving the original behavior under focused tests before deleting legacy structure.

## Closure

Status Note: Fill when the repo audit proves zero tracked code files over 500 lines and all plan-owned verification/guardrail work is complete.

Closure Audit Evidence:

- Reviewer / Agent: <<independent reviewer or fresh sub-agent>>
- Evidence: <<fresh repo audit output, focused verification summary, daily log link>>

Follow-up:

- No remaining plan-owned oversized code files, or explicit successor plan links for any scope moved out before closure.
