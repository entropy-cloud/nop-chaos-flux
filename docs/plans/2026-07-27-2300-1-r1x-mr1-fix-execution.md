# R1.x — MR1 P1/P2 Fix Execution (Structure + Runtime)

> Plan Status: completed
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` MR1 → R1.1–R1.10
> Related: R1.0 expander (`docs/plans/2026-07-27-2100-3-r10-p1-fix-expander-structure-runtime.md`)
> Mission: audit-remediation

## Purpose

Execute all 10 concrete fix items scoped by R1.0 (R1.1–R1.10). These are the P1/P2 findings from the MA1 (Structure) and MA2 (Runtime Correctness) audits — final adjudication already completed by the R1.0 expander. This plan makes the actual code and documentation changes.

## Current Baseline

- R1.0 expander completed: all 10 MA1+MA2 findings adjudicated as `Fix` (8) or `Docs` (1) — no deferred items.
- Fix items defined in `docs/backlog/audit-remediation-roadmap.md` as R1.1–R1.10, all status `todo`.
- arm-index findings linked to R1.x numbers.
- `pnpm typecheck`/`build`/`test` green baseline.
- All 10 items are independent (no inter-item dependencies, all S-sized).

## Goals

- Complete all 10 R1.x code/doc changes.
- Verify each change individually: local typecheck for code items, manual verification for doc/CSS items.
- Full repo-wide `pnpm typecheck`, `pnpm build`, `pnpm test` green after all changes.
- Update `docs/backlog/audit-remediation-roadmap.md` MR1 items status to `done`.
- Update `docs/audits/arm-index.md` findings status from `open` → `fixed`.

## Non-Goals

- No new audit findings or adjudication (R1.0 already completed).
- No MA3/MA4/MA5/MA6/MA7 findings (scope of R2.0/R3.0 expanders).
- No cross-dimension conflict resolution (R4.0).
- No full verification regression beyond typecheck/build/test.

## Scope

### In Scope

- R1.1: Remove 4 redundant fields (`validation`, `validationDefaults`, `deepFields`, `compilation`) from `RendererDefinition` in `flux-core/src/types/renderer-core.ts`
- R1.2: Rename `nop-hairline--*` BEM modifier to `nop-hairline-*` across CSS, renderers, tests, playground
- R1.3: Add `deepFields`, `compilation`, `validationDefaults`, `frameRootTag` to `docs/references/renderer-interfaces.md` field mapping
- R1.4: Remove `cancelPendingDebounce`/`scheduleDebounce` re-export from `flux-action-core/src/index.ts`
- R1.5: Add `displayName`/`category` to 19 form-advanced renderer definitions
- R1.6: Add `displayName`/`category` to 7 date renderer definitions
- R1.7: Add `data-slot="diff-view"` to DiffViewRenderer root element
- R1.8: Extract ~609 lines of DiffView CSS from `styles.css` to `diff-view/diff-view.css`
- R1.9: Add structured error routing comments to 20 async void-promises in runtime packages
- R1.10: Add structured error routing comments to 15 async void-promises in core packages

### Out Of Scope

- Any finding from MA3/MA4/MA5/MA6/MA7
- Non-fix refactoring or additional cleanup beyond the scoped items
- Cross-dimension conflict resolution (R4.0)

## Test Strategy

档位选择：`建议有测` — 每项 fix 执行后验证局部 typecheck。R1.8 (CSS extraction) 验证样式不退化。全量 typecheck/build/test 在 closure gates 汇总。

## Execution Plan

### Phase 1 — Core package contract fixes

Status: completed
Targets: `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-action-core/src/index.ts`

- Item Types: `Fix`

- [x] **(Fix)** R1.1: Remove lines 286–289 (`validation`, `validationDefaults`, `deepFields`, `compilation`) from `RendererDefinition` interface.
- [x] **(Fix)** R1.4: Remove line 39 (`export { cancelPendingDebounce, scheduleDebounce }`) from `flux-action-core/src/index.ts`.

Exit Criteria:

- [x] `RendererDefinition` interface no longer redeclares fields inherited from `RendererDefinitionShape`
- [x] `flux-action-core/src/index.ts` no longer re-exports debounce functions from `flux-core`
- [x] `pnpm --filter @nop-chaos/flux-core typecheck && pnpm --filter @nop-chaos/flux-action-core typecheck` passes

### Phase 2 — Renderer definition and styling hygiene

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/`, `packages/flux-renderers-form/src/renderers/date-renderer-definitions.ts`, `packages/ui/src/styles/mobile.css`, `packages/flux-renderers-content/src/diff-view/`

- Item Types: `Fix`

- [x] **(Fix)** R1.2: Globally rename `nop-hairline--*` to `nop-hairline-*` in `packages/ui/src/styles/mobile.css`, 4 renderer files, 5 test files, 2 playground demos.
- [x] **(Fix)** R1.5: Add `displayName`/`category` to all 19 form-advanced renderer definitions.
- [x] **(Fix)** R1.6: Add `displayName`/`category` to all 7 date renderer definitions.
- [x] **(Fix)** R1.7: Add `data-slot="diff-view"` to DiffViewRenderer root `<div>`.
- [x] **(Fix)** R1.8: Extract ~609 lines DiffView CSS from `styles.css` into `diff-view/diff-view.css`; `styles.css` retains `@import "./diff-view/diff-view.css"`.

Exit Criteria:

- [x] No `nop-hairline--*` occurrences remain in source files
- [x] All 19 form-advanced + 7 date renderer definitions have `displayName`/`category`
- [x] DiffViewRenderer root element has `data-slot="diff-view"`
- [x] DiffView CSS extracted cleanly (no style regression)
- [x] `pnpm typecheck` passes

### Phase 3 — Async annotations and documentation

Status: completed
Targets: `packages/flux-runtime/src/`, `packages/flux-react/src/`, `packages/flux-action-core/src/`, `packages/flux-compiler/src/`, `packages/flux-core/src/`, `packages/flux-formula/src/`, `docs/references/renderer-interfaces.md`

- Item Types: `Fix` (R1.9, R1.10) + `Docs` (R1.3)

- [x] **(Fix)** R1.9: Add structured error routing comments to all 20 async void-promise patterns in runtime packages. Comment format: `// Errors routed through <mechanism> — <rationale>`.
- [x] **(Fix)** R1.10: Add structured error routing comments to all 15 async void-promise patterns in core packages. Same comment format.
- [x] **(Docs)** R1.3: Add `deepFields`, `compilation`, `validationDefaults`, `frameRootTag` to `docs/references/renderer-interfaces.md` field mapping table under "Runtime registration" group.

Exit Criteria:

- [x] All 35 async void-promise locations have structured error routing comments
- [x] `renderer-interfaces.md` field mapping includes all 4 new fields under "Runtime registration"
- [x] `pnpm typecheck` passes

## Draft Review Record

- Reviewer / Agent: `ses_05cbe54fdffebMbI7jmPtc1x4Y`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor: Phase 2/3 Exit Criteria include `pnpm typecheck` (full) per phase, redundant vs Closure Gates (Rule 18 permits focused-per-phase only when later phase depends on it).
  - Minor: Phase 3 item types include "Docs" — not one of the 4 prescribed classifications (`Fix`/`Decision`/`Proof`/`Follow-up`). R1.3 could be classified as `Fix` (doc gap fix).

## Closure Gates

- [x] All 10 R1.x fix items completed with verified changes
- [x] `docs/backlog/audit-remediation-roadmap.md` MR1 items (R1.1–R1.10) status updated to `done`
- [x] `docs/audits/arm-index.md` corresponding findings status updated from `open` → `fixed`
- [x] No in-scope fix deferred without explicit adjudication
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm test`
- [x] Closure audit by independent sub-agent (fresh session) completed — _Per AGENTS.md Collaboration Discipline: executor must not self-audit._

## Deferred But Adjudicated

_None — all 10 items confirmed as in-scope Fix/Docs items by R1.0 expander._

## Non-Blocking Follow-ups

- _None_

## Closure

Status Note: All 3 phases executed. All 10 R1.x fix items completed. `pnpm typecheck` (58/58), `pnpm build` (31/31), `pnpm test` (58/58) all pass. Roadmap and arm-index updated. Closure audit completed by independent sub-agent — all items verified against live repo. Plan fully closed.

Closure Audit Evidence:

- Auditor / Agent: independent closure auditor (fresh session, `AI_STEP_RESULT` based closure audit)
- Evidence: All 3 Phases confirmed completed via plan text audit. Phase 1 (core contract fixes) verified in live repo: `RendererDefinition` interface cleaned, `flux-action-core/src/index.ts` debounce re-exports removed. Phase 2 (renderer/styling hygiene) verified: `nop-hairline--*` → `nop-hairline-*` rename complete, 19+7 renderer definitions have `displayName`/`category`, DiffView `data-slot` added, CSS extracted. Phase 3 (async annotations/docs) verified: 35 async void-promises annotated, `renderer-interfaces.md` field mapping updated. `pnpm typecheck`/`build`/`test` all green (58/58, 31/31, 58/58). Roadmap `docs/backlog/audit-remediation-roadmap.md` and `docs/audits/arm-index.md` updated. No deferred in-scope items. All closure gates checked. Plan structurally and semantically consistent.

Follow-up:

- _No remaining MR1 plan-owned work_
