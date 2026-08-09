# 1931-3 Industrial SCADA Oversized Test File Split

> Plan Status: completed
> Last Reviewed: 2026-08-09
> Source: `docs/audits/2026-08-08-1931-multi-audit-industrial-hmi-component-audit.md` §[P1-1] (Dim 02)
> Related: `docs/plans/2026-08-08-1931-4-industrial-scada-editor-target-reconciliation-error-recovery.md` (successor {2}; depends on this plan landing first so its regression tests land in already-split files)

## Purpose

Restore the `check:oversized-code-files` hard gate to its documented "0 industrial files >700" baseline by splitting the two `flux-renderers-industrial` test files that the remediation test wave (plans 1809-2/3, 1910-2, 0121-1) pushed over the 700-line hard limit. Public test behavior is unchanged — only the mechanical split.

## Current Baseline

Re-verified against live repo at draft time:

- `scripts/check-oversized-code-files.mjs:11-13,89-114` applies a **700-line hard limit** to ALL tracked `.ts`/`.tsx` files (no test-file exemption) and flips exit code to 1 for any over-limit file. The script is a workspace-level gate; `pnpm check:oversized-code-files` currently exits **1**.
- The 1712 audit recorded **0 industrial files >700** for this package. The remediation test wave regressed it to **2**:
  - `packages/flux-renderers-industrial/src/serialization/serialization-validate.test.ts` → **786 lines** (`wc -l`; the checker reports 787). Was 656 at the 1712 audit (+130). 7 `describe` blocks: `validateScadaConfig` (main, :13), `error branch matrix` (:376), `numeric finiteness + recursion depth` (:476), `legacy recursion + subshape` (:539), `coverage gaps` (:642), `assertShape finite number` (:689), `breadth/total-node DoS guards` (:742).
  - `packages/flux-renderers-industrial/src/renderer/scada-points-bridge.test.tsx` → **709 lines** (checker reports 710). Was 652 at the 1712 audit (+57). 3 `describe` blocks: `flux scope path extraction` (:52), `scada-canvas points bridge (I10.3)` (:237), `generation-memoize + merge priority` (:611).
- The validation layer these tests cover has ALREADY been split into per-shape modules under `src/serialization/validators/` (`animation.ts`, `binding.ts`, `helpers.ts`, `index.ts`, `point-declaration.ts`, `state-declaration.ts`, `symbol-event.ts`, `symbol-node.ts`) plus `legacy-scan.ts` — so a per-domain test split mirrors an established production-side structure.
- `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` / `lint` / `test` are all **PASS** (test suite is ~107 files / 1439 tests). The split is therefore conventional, not a structural anomaly.

## Goals

- Both `serialization-validate.test.ts` and `scada-points-bridge.test.tsx` are reduced below the 700-line hard limit, split along their existing `describe`-block / per-domain boundaries into sibling files.
- `pnpm check:oversized-code-files` lists **0** files under `packages/flux-renderers-industrial/`.
- All existing assertions survive unchanged (same count, same outcomes) — this is a mechanical relocation of test code, not a rewrite.

## Non-Goals

- No production-code changes (`src/**/*.ts` excluding `*.test.*`).
- No split of files in the 500–700 **warn** band (`editor-engine.test.ts:662`, `scada-canvas-lifecycle.test.tsx:639`, `engine/scada-engine.ts:547`, etc.) — those are under the hard limit and out of scope.
- No new test coverage (coverage growth belongs to successor plan {2} which adds failing-first regression tests into the freshly-split files).

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/serialization/serialization-validate.test.ts` and its split outputs.
- `packages/flux-renderers-industrial/src/renderer/scada-points-bridge.test.tsx` and its split outputs.

### Out Of Scope

- Every other `flux-renderers-industrial` test/source file.
- Production code under `src/serialization/` and `src/renderer/`.

## Test Strategy

本档选择：**建议有测**

Pure mechanical test relocation with no production behavior change. The risk surface is "the move breaks imports / Vitest discovery / a shared fixture". Proof = the full `flux-renderers-industrial` test suite stays at ≥1439 passing tests (same set, same outcomes) after the split, plus the mechanical oversized gate turning green. No new behavioral assertions are in scope (those belong to plan {2}).

## Execution Plan

> Order matters: this plan is the **{1}** prerequisite for plan `{1931-4}`. Land it first so plan {2}'s failing-first regression tests land in already-split files instead of re-inflating the two files over the gate.

### Phase 1 - Split `serialization-validate.test.ts` by validator domain

Status: completed
Targets: `packages/flux-renderers-industrial/src/serialization/serialization-validate.test.ts` → sibling per-domain test files

- Item Types: `Fix`

- [x] Re-audit the live file (line numbers above were accurate at draft time; re-confirm the 7 `describe` boundaries before cutting).
- [x] Split by the audit's suggested per-domain mapping, mirroring the existing `src/serialization/validators/{symbol-node,animation,binding,point-declaration,state-declaration,symbol-event}.ts` production split + a `legacy-scan` bucket. A concrete, conventional target layout (executor confirms final grouping against the live `describe` inventory):
  - `serialization-validate.test.ts` — keep the top-level `validateScadaConfig` orchestrator + shared setup only (hard-gate target ≤700; the orchestrator `describe` spans ~:13–375, so sub-split it only if needed to stay comfortably under — the hard gate, not a fixed line budget, is the constraint).
  - `serialization-validate-symbol-node.test.ts` — symbol-node / shape assertions.
  - `serialization-validate-animation.test.ts` — animation assertions.
  - `serialization-validate-binding.test.ts` — binding / scale assertions.
  - `serialization-validate-point-declaration.test.ts` — point-declaration assertions.
  - `serialization-validate-state-declaration.test.ts` — state-declaration assertions.
  - `serialization-validate-symbol-event.test.ts` — symbol-event assertions.
  - `serialization-validate-error-and-dos.test.ts` — the `error branch matrix` + `numeric finiteness/recursion depth` + `legacy recursion/subshape` + `coverage gaps` + `assertShape finite` + `breadth/total-node DoS` describes (group adjacent regression-suite blocks together).
- [x] Preserve every assertion verbatim (no rewrite, no weakened expectation, no removed case). Move shared fixtures/helpers to the file that owns them, or to a small shared `serialization-validate-helpers.ts` if ≥2 files need them — do not duplicate.
- [x] Delete the now-empty original lines; ensure no orphaned imports remain (lint will catch).

Exit Criteria:

> Write only repo-observable results + the local check that unblocks Phase 2. No full `pnpm build` here (Closure Gates owns that).

- [x] `serialization-validate.test.ts` and every split output is ≤ 700 lines (`wc -l`).
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial test` green with the **same** (or higher) test count — no test silently dropped during the move.
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial lint` green (no unused-import / no-unused-var residuals from the cut).

### Phase 2 - Split `scada-points-bridge.test.tsx` by domain

Status: completed
Targets: `packages/flux-renderers-industrial/src/renderer/scada-points-bridge.test.tsx` → sibling per-domain test files

- Item Types: `Fix`

- [x] Re-audit the live file's 3 `describe` blocks (`flux scope path extraction` :52, `points bridge (I10.3)` :237, `generation-memoize + merge priority` :611) before cutting; the `(I10.3)` block is large and likely needs sub-splitting along its internal `it`/case groups.
- [x] Split along the audit's suggested domain boundaries (executor confirms final grouping against the live inventory):
  - `scada-points-bridge.test.tsx` — keep shared setup + the `generation-memoize + merge priority` describe (or relocate it; pick whichever yields balanced file sizes).
  - `scada-points-bridge-scope-path.test.tsx` — the `flux scope path extraction` describe (订阅判定).
  - `scada-points-bridge-lifecycle.test.tsx` — lifecycle / mount / unmount cases from the `(I10.3)` block.
  - `scada-points-bridge-expression.test.tsx` — expression compilation / evaluation cases.
  - `scada-points-bridge-error.test.tsx` — error-channel / diagnostic cases.
- [x] Preserve every assertion verbatim; relocate shared fixtures without duplication.

Exit Criteria:

- [x] `scada-points-bridge.test.tsx` and every split output is ≤ 700 lines (`wc -l`).
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial test` green with the same (or higher) test count.
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial lint` green.

## Draft Review Record

> Filled by independent sub-agent (fresh session) per the Plan Review Rule.

- Reviewer / Agent: independent sub-agent fresh session `ses_01b887451ffeWgq6muZpODU9eY`
- Verdict: `pass` (zero Blocker / zero Major; 2 optional Minors — missing optional `## Failure Paths` note for pure refactor [acceptable, optional section], and a softened orchestrator soft-line target — addressed)
- Rounds: 1
- Findings addressed: none required for promotion (Minors optional); softened the orchestrator-file soft target to "hard gate, not a fixed line budget". Reference-accuracy independently re-verified against live repo (gate exit 1; 2 industrial files >700 at the cited line counts; `describe` inventories exact; `validators/` + `legacy-scan.ts` exist). Bundling/split ruling: AGREE — 2-plan split is the natural seam (independent closure surfaces).

## Closure Gates

> Plan closes when the gate is green and the suite is regression-free. Pure test refactor — `pnpm test` is the load-bearing check.

- [x] Both original files and all split outputs are ≤ 700 lines.
- [x] `pnpm check:oversized-code-files` lists **0** files under `packages/flux-renderers-industrial/` (gate no longer exits 1 on industrial contributors).
- [x] No in-scope live defect or hard-gate failure downgraded to deferred.
- [x] Independent sub-agent closure audit completed and recorded (executor session must not self-audit this item).
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

_None expected. If a split output still lands 500–700 (warn band), that is acceptable (warn band is not a hard gate) — record it here with `Classification: optimization candidate` if it occurs._

## Non-Blocking Follow-ups

- The other `flux-renderers-industrial` files in the 500–700 warn band (`editor-engine.test.ts`, `scada-canvas-lifecycle.test.tsx`, `state-visual.test.ts`, `compound.test.ts`, `scada-engine.ts`, etc.) are under the hard limit; no action required for this plan.

## Closure

Status Note: Plan closed — both oversized industrial test files split below the 700-line hard gate, oversized gate green for the package, full workspace typecheck/build/lint/test green, test count preserved at 1439.

Closure Audit Evidence:

- Auditor / Agent: independent closure-audit sub-agent (fresh session, MISSION_DRIVER:2026-08-08-193117-mission-driver), did not execute the implementation.
- Live repo verification of split outputs (`wc -l`): `serialization-validate.test.ts` 71, `serialization-validate-animation.test.ts` 45, `serialization-validate-binding.test.ts` 100, `serialization-validate-error-and-dos.test.ts` 424, `serialization-validate-point-declaration.test.ts` 59, `serialization-validate-state-declaration.test.ts` 80, `serialization-validate-symbol-event.test.ts` 52, `serialization-validate-symbol-node.test.ts` 38; `scada-points-bridge.test.tsx` 549, `scada-points-bridge-scope-path.test.tsx` 147, `scada-points-bridge-diagnostics.test.tsx` 516 — all ≤ 700.
- `node scripts/check-oversized-code-files.mjs` exits 1 due to 14 pre-existing **non-industrial** files >700 (flux-i18n, flux-compiler, flux-renderers-form, etc. — unchanged by this plan, out of scope); **0 files under `packages/flux-renderers-industrial/` appear in the >700 ERROR band** (industrial entries only in the 500–700 WARN band, which is out of scope). The package-specific gate goal ("0 industrial files >700") is met.
- `pnpm --filter @nop-chaos/flux-renderers-industrial test` green: 115 test files, 1439 tests passed — matches the plan baseline of ~107 files / 1439 tests (file count up from split, test count unchanged → no assertion silently dropped).
- Workspace gates (turbo cache-hit green): `pnpm typecheck` 32/32, `pnpm build` 32/32, `pnpm lint` 32/32 (1 pre-existing unrelated warning in `flux-renderers-scheduling`), `pnpm test` 59/59.
- Anti-hollow: split files are real relocated assertions (e.g. `serialization-validate-error-and-dos.test.ts` 424 lines, `scada-points-bridge.test.tsx` 549 lines), not empty shells; Vitest discovers all 115 files post-split.
- Deferred honesty: `Deferred But Adjudicated` is empty (no warn-band file classified as blocking); no in-scope defect or hard-gate failure downgraded.

Follow-up:

- No plan-owned remaining work. Successor `docs/plans/2026-08-08-1931-4-...` (plan {2}) may now land its failing-first regression tests into the already-split files.
