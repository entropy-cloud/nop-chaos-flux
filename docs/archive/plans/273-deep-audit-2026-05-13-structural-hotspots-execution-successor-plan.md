# 273 Deep Audit 2026-05-13 Structural Hotspots Execution Successor Plan

> Plan Status: completed
> Last Reviewed: 2026-05-14
> Source: `docs/plans/262-deep-audit-2026-05-13-structural-owner-successor-plan.md`, `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`, `docs/analysis/2026-05-12-deep-audit-full/final-review-results-01-05.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the still-live structural hotspots that remained after Plan 262 completed its re-audit and split the surviving large-file/owner-boundary work into an explicit execution successor.

## Current Baseline

- Plan 262 already closed the fixed/no-longer-live subset (`01-02`, `02-03`, `02-04`).
- `02-01` is now closed in this execution slice: `packages/flux-compiler/src/schema-compiler/node-compiler.ts` no longer breaches the `>700` hard threshold after extracting runtime-value tree compilation into `packages/flux-compiler/src/schema-compiler/runtime-value-compilation.ts`, and targeted `@nop-chaos/flux-compiler` typecheck/tests remain green.
- The remaining retained IDs have now been re-audited against the live repo rather than assumed from the 2026-05-13 snapshot.
- `02-02` / `02-07` (`input.tsx`) remain large but are below the `>700` hard gate, stay within one renderer-family owner surface, and do not currently reproduce a public-contract or hard-gate defect.
- `02-08` (`variant-field.tsx`) remains large but the live owner-sensitive correctness bugs were already closed in Plans `268` and `278`; the remaining file-width concern is now a refactor candidate rather than a live defect.
- `02-09` (`runtime-factory.ts`), `02-12` (`reaction-runtime.ts`), and `02-13` (`import-stack.ts`) remain warning-sized, but the live runtime-boundary docs already treat them as focused runtime subsystem/assembly owners rather than unsupported owner drift.
- `02-11` (`spreadsheet-grid.tsx`) remains a large complete-control renderer shell, but it already delegates into package-local helpers and no longer represents a current contract break.
- `12-03` is no longer a live plan-owned defect: the current owner doc explicitly allows compiler-side deep-region extraction helpers, so `tables.ts` is now best treated as watch-only architecture debt unless/until a renderer-owned registration model is formally introduced.

## Goals

- Re-audit the surviving structural hotspots against the live repo.
- Separate near-term extraction slices from longer-lived architecture debt.
- Land the first closure-ready structural refactors with focused proof.

## Non-Goals

- Re-open the already adjudicated fixed/no-longer-live subset closed in Plan 262.

## Scope

### In Scope

- `02-01`, `02-02`, `12-03`, `02-07`, `02-08`, `02-09`, `02-11`, `02-12`, `02-13`

### Out Of Scope

- Fixed/no-longer-live Plan 262 items: `01-02`, `02-03`, `02-04`

## Execution Plan

### Phase 1 - Re-audit And Slice Structural Hotspots

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/*`, `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, `packages/flux-runtime/src/{runtime-factory.ts,async-data/reaction-runtime.ts,import-stack.ts}`, `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`

- Item Types: `Decision | Fix | Proof`

- [x] Re-audit each in-scope hotspot against the live repo.
- [x] Group the surviving work into closure-ready extraction/refactor slices.
- [x] Record whether any item remains architecture debt but not a current closure blocker for the first implementation slice.

Exit Criteria:

- [x] Every in-scope retained ID has an explicit execution decision.
- [x] The first structural execution slice is clearly defined.
- [x] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [x] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [x] All in-scope retained findings are adjudicated.
- [x] No confirmed live structural defect is silently deferred.
- [x] Remaining work has explicit successor ownership or landed fixes.

## Closure

Status Note: completed. `02-01` is closed by extracting runtime-value tree compilation out of `node-compiler.ts`, removing it from the `>700` hard-gate failure set. The remaining retained items were re-audited against the live repo and explicitly adjudicated as watch-only residuals or optimization candidates rather than still-live plan-owned defects.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit task `ses_1db9dfb9dffeD2UEnCHWQAkcNA`
- Evidence: the independent audit re-checked Plans `262/263/264/265/266/268/273/276`, the linked successor plans `274-278`, and `docs/logs/2026/05-14.md`. It confirmed `02-01` is repo-observably closed in code, `node-compiler.ts` is no longer a `>700` hard-gate failure, and the remaining retained IDs in this plan are explicitly adjudicated as non-blocking residual structural debt rather than silently left live.

Follow-up:

- no remaining plan-owned work

## Deferred But Adjudicated

### `02-02` / `02-07` - `input.tsx` renderer-family width

- Classification: `optimization candidate`
- Why Not Blocking Closure: `packages/flux-renderers-form/src/renderers/input.tsx` remains below the `>700` hard threshold, continues to sit inside one high-frequency input-renderer family owner surface, and does not currently reproduce a contract or verification failure. Further splitting is still worthwhile, but it is refactor hygiene rather than a live closure blocker after the 2026-05-14 re-audit.
- Successor Required: `no`
- Successor Path: n/a

### `02-08` - `variant-field.tsx` controller/UI width

- Classification: `optimization candidate`
- Why Not Blocking Closure: the live correctness defects that made `variant-field` risky were already closed under Plans `268` and `278`; the remaining single-file width is now refactor debt, not an active owner-boundary break.
- Successor Required: `no`
- Successor Path: n/a

### `02-09` / `02-12` / `02-13` - runtime subsystem file width

- Classification: `watch-only residual`
- Why Not Blocking Closure: the live runtime module-boundary docs already name `runtime-factory.ts` as the runtime assembly layer and keep reaction/import behavior inside focused runtime submodules. These files are still warning-sized and worth future extraction if they grow again, but the current 2026-05-14 baseline does not show a plan-owned contract drift or hard-gate failure.
- Successor Required: `no`
- Successor Path: n/a

### `02-11` - `spreadsheet-grid.tsx` complete-control shell width

- Classification: `optimization candidate`
- Why Not Blocking Closure: `spreadsheet-grid.tsx` remains a large complete-control renderer, but it already delegates to package-local helpers and does not currently violate the supported renderer/runtime contract. The residual is maintainability pressure rather than a live break.
- Successor Required: `no`
- Successor Path: n/a

### `12-03` - compiler-side deep-region helper ownership

- Classification: `watch-only residual`
- Why Not Blocking Closure: `docs/architecture/field-metadata-slot-modeling.md` now explicitly allows compiler-side deep-region extraction helpers and recommends a focused helper/registry pattern. The current `tables.ts` shape therefore no longer constitutes an active owner-doc mismatch, even though a more renderer-owned registration model may still be an architecture improvement later.
- Successor Required: `no`
- Successor Path: n/a

## Non-Blocking Follow-ups

None yet.
