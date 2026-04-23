# 131 Readonly Detail Open Support Plan

> Plan Status: completed
> Last Reviewed: 2026-04-22
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field-basic.test.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view-basic.test.tsx`
> Related: `docs/plans/129-detail-owner-and-surface-boundary-doc-alignment-plan.md`

## Purpose

为 `detail-field` / `detail-view` 落地一个小而完整的可感知行为改进：`readOnly` 场景允许打开 detail surface 查看内容，但不允许提交或写回。这个切片只收口“只读可打开、只读不可确认”的最小行为，不扩展到更大的 staged-owner runtime 改造。

## Current Baseline

- 当前 `detail-field` / `detail-view` 在 `readOnly=true` 时直接隐藏 trigger，并在 `handleOpen()` 里提前返回。
- `DetailDraftFooter` 当前只有 edit-only 的 `Cancel` + `Confirm` 形态，没有 close-only footer。
- 现有 focused tests 明确锁定了“只读时没有 trigger”的旧行为。
- `docs/architecture/value-adaptation-and-detail-field.md` 已把“只读 detail open”描述为 target capability，因此这次实现后需要同步该文档与 daily log。

## Goals

- 让 `detail-field` / `detail-view` 在 `readOnly=true` 时仍可打开 surface。
- 让只读 surface 只提供关闭能力，不提供确认/提交入口。
- 保证只读打开不会触发写回或提交。

## Non-Goals

- 不实现全局 readOnly 传播，把内部所有子字段统一强制变为 disabled/readOnly。
- 不把 `detail-*` 迁移到 shared staged-owner runtime。
- 不新增 `sheet` / `popover` / `hover` / `inline-below` 等 detail surface mode。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field-basic.test.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view-basic.test.tsx`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/logs/2026/04-22.md`

### Out Of Scope

- broader detail-owner runtime redesign
- generic readOnly propagation across nested child renderers
- unrelated detail-field/detail-view behavior changes

## Execution Plan

### Phase 1 - Implement Readonly Open Behavior

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx`

- [x] Let read-only detail renderers show their trigger and allow opening.
- [x] Add a close-only footer mode for read-only detail surfaces.
- [x] Ensure read-only surface flow does not expose confirm/writeback.

Exit Criteria:

- [x] `detail-field` and `detail-view` can open in read-only mode.
- [x] No `Confirm` action is reachable in read-only mode.

### Phase 2 - Update Focused Tests And Docs

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/detail-view/detail-field-basic.test.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view-basic.test.tsx`, `docs/architecture/value-adaptation-and-detail-field.md`

- [x] Replaced old readOnly-no-trigger tests with readOnly-open coverage.
- [x] Added assertions for close-only footer behavior and no confirm path.
- [x] Updated architecture wording so readOnly detail open is current baseline, while broader readOnly/view-only semantics remain scoped.

Exit Criteria:

- [x] Focused tests cover readOnly open behavior for both renderers.
- [x] Docs reflect the new live baseline without overclaiming broader readOnly propagation.

### Phase 3 - Verification And Closure

Status: completed
Targets: verification commands, `docs/logs/2026/04-22.md`, this plan file

- [x] Ran focused tests plus required verification commands.
- [x] Added a daily-log entry for the feature landing.
- [x] Ran independent closure audits and addressed the findings before closure.

Exit Criteria:

- [x] Required verification is green.
- [x] Daily log and closure evidence are recorded.
- [x] No remaining plan-owned work remains.

## Validation Checklist

- [x] Read-only `detail-field` opens and renders content.
- [x] Read-only `detail-view` opens and renders content.
- [x] Read-only detail surfaces expose close-only footer behavior.
- [x] Focused tests cover the new behavior.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] Relevant tests pass.
- [x] `docs/logs/2026/04-22.md` records the landing and evidence.
- [x] Independent closure audit is completed and recorded before plan closure.

## Closure

Status Note: Completed as a small implementation slice. Read-only `detail-field` / `detail-view` now open for viewing, switch to a close-only footer, and keep confirm/writeback unreachable while preserving the existing renderer-local draft form path.

Closure Audit Evidence:

- Reviewer / Agent: fresh independent sub-agents
- Evidence: `ses_24852fad3ffekioVYgY9MAOCjC` found two real follow-up issues during the first audit (`detail-view` data-only commit no-op and incomplete disabled guarding), both of which were fixed with focused tests before closure; `ses_248449864ffeVtH6F29TvMu2Qq` then reported no blocking findings, and `ses_248449804ffeeuc0BQfvj9Gzzd` recommended closure based on the final code, docs, focused Vitest pass, and green workspace `typecheck` / `build` / `lint` runs.

Follow-up:

- If future work needs strict nested readOnly propagation, viewer-only no-draft rendering, or shared staged-owner substrate changes, land them in separate implementation plans.
- No remaining plan-owned work.
