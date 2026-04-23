# 128 Composite Field Owner Doc Alignment Plan

> Plan Status: completed
> Last Reviewed: 2026-04-22
> Source: `docs/architecture/data-domain-owner.md`, `docs/architecture/form-validation.md`, `docs/architecture/unified-runtime-indexing-and-path-binding.md`, `docs/architecture/object-field.md`, `docs/architecture/array-field.md`, `docs/architecture/variant-field.md`, `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/array-field-runtime.ts`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field-runtime.ts`, `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.ts`
> Related: `docs/plans/127-data-domain-owner-doc-alignment-and-operational-rules-plan.md`

## Purpose

把 `object-field`、`array-field`、`variant-field` 三份架构文档收敛到当前正式 owner baseline：它们默认是 parent-owned projected editors，不是默认 child data domains；同时把 path binding、validation ownership、item identity、variant lifecycle 的描述压到与 live implementation 一致，不再混入 staged-owner 或未落地 adapter pipeline 的 overclaim。

## Current Baseline

- `docs/architecture/data-domain-owner.md` 已明确 `object-field` / `array-field` / `variant-field` 默认不是 child data domains，而是 parent-owned projected/path-bound editors。
- `docs/architecture/form-validation.md` 已明确 `inherit-owner` / `create-owner` / `no-owner`，并把 parent-owned inline editor 归到 parent owner。
- `docs/architecture/unified-runtime-indexing-and-path-binding.md` 已把 owner-local absolute path、`ownerRootPath`、scalar alias、projected path rebasing 说清楚。
- live code 中这三个控件都不是独立 child owners；它们创建 projected `FormRuntime` / `ScopeRef` 视图，把 registration、validation、writes 都转发回 parent owner。
- 当前 docs gap 在于：三份文档还没有统一翻译到 `inherit-owner` / parent `rootPath` / owner-local path 语言上，且 `variant-field`、`array-field` 有部分未落地能力写得像 current baseline。

## Goals

- 让三份 composite field docs 与 `Data Domain Owner` baseline 直接对齐。
- 明确 projected `FormRuntime` view 与独立 owner/runtime 的区别。
- 移除或降级任何与 live implementation 不符的 transform/validate/sortable overclaim。

## Non-Goals

- 不修改 composite field runtime 或 schema implementation。
- 不把这轮工作扩展到 `detail-field` / `detail-view`、`surface-owner`、`table-row` 等已在其他计划中处理的文档。
- 不把 target architecture 提升成新的实现计划。

## Scope

### In Scope

- `docs/architecture/object-field.md`
- `docs/architecture/array-field.md`
- `docs/architecture/variant-field.md`
- `docs/logs/2026/04-22.md`

### Out Of Scope

- runtime/compiler/renderer source code changes
- other architecture docs except for minimal cross-reference sync if absolutely required

## Execution Plan

### Phase 1 - Reframe Composite Owner Semantics

Status: completed
Targets: `docs/architecture/object-field.md`, `docs/architecture/array-field.md`, `docs/architecture/variant-field.md`

- [x] Rewrote each doc to explicitly classify the control as parent-owned `inherit-owner` by default.
- [x] Clarified that projected `FormRuntime` / path-binding views may be created, but they are not new independent child owners.
- [x] Aligned path language to `ownerRootPath`, owner-local absolute path, scalar aliasing, and index-addressed validation/writeback where applicable.

Exit Criteria:

- [x] All three docs explicitly use parent-owned/projected-editor wording consistent with `docs/architecture/data-domain-owner.md`.
- [x] None of the docs imply that creating a projected form/view equals creating a child owner.

### Phase 2 - Remove Live-Behavior Overclaims

Status: completed
Targets: `docs/architecture/object-field.md`, `docs/architecture/array-field.md`, `docs/architecture/variant-field.md`

- [x] Marked `object-field` `validateValueAction` support as non-baseline because it is not actually wired today.
- [x] Marked `array-field` transform/validate/sortable claims as target-only or removed them from current-baseline examples/language.
- [x] Trimmed `variant-field`'s documented lifecycle to match current live behavior and corrected selector/path examples to live-safe baseline.
- [x] Explicitly stated that inactive variant branches are unmounted and do not participate in default parent-owned validation.

Exit Criteria:

- [x] No current-baseline wording remains that claims unwired array-field or variant-field lifecycle features are already implemented.
- [x] Current behavior and future direction are clearly separated wherever both are mentioned.

### Phase 3 - Evidence And Closure

Status: completed
Targets: `docs/logs/2026/04-22.md`, this plan file

- [x] Added a daily-log entry for the composite-field doc alignment slice.
- [x] Ran an independent docs/code closure audit and recorded the evidence here.
- [x] Closed the plan only after the audit confirmed the three docs match live composite-field behavior.

Exit Criteria:

- [x] Daily log entry exists with code/doc anchors.
- [x] Closure audit evidence is recorded from a fresh sub-agent session.
- [x] No remaining plan-owned doc drift remains.

## Validation Checklist

- [x] `object-field.md` clearly states parent-owned projected-editor semantics and avoids claiming an independent child owner.
- [x] `array-field.md` clearly states item identity continuity is separate from index-addressed parent-owned value/validation paths.
- [x] `variant-field.md` clearly states it is a parent-owned projected polymorphic editor and does not overclaim unwired validate/transformOut pipelines.
- [x] Current-vs-target wording is explicit wherever live code has not landed the richer behavior.
- [x] `docs/logs/2026/04-22.md` records the landing and evidence.
- [x] An independent closure audit is completed and recorded before plan closure.
- [x] No plan-owned code changes were required; workspace verification commands are not closure gates for this docs-only plan.

## Closure

Status Note: Completed as a docs-only alignment slice. `object-field`, `array-field`, and `variant-field` now all use the same parent-owned projected-editor vocabulary as the formal `Data Domain Owner` baseline, and the remaining richer composite-field behavior is explicitly left as out-of-scope future implementation work.

Closure Audit Evidence:

- Reviewer / Agent: fresh independent sub-agents
- Evidence: `ses_2487930c2ffeFpvg4hnNthDS0p` reported no blocking findings after the final wording fixes; `ses_24879307fffeNpIGU8su7cc0ip` recommended closure after daily-log evidence, confirming the edited docs match live anchors in `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`, `array-field.tsx`, `array-field-runtime.ts`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, `variant-field-runtime.ts`, and `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.ts`.

Follow-up:

- If broader composite runtime convergence is needed later, land it in a separate implementation plan.
- No remaining plan-owned work.
