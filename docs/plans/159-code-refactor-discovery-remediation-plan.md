# 159 Code Refactor Discovery Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: 全仓库 11 维度重构发现审计（`docs/skills/code-refactor-discovery-prompt.md`），实施/收口证据见历史 daily log 与 `docs/plans/285-deep-audit-2026-05-14-plan-baseline-normalization-plan.md`
> Related: `docs/plans/158-code-quality-redundancy-and-duplication-remediation-plan.md`, `docs/plans/84-oversized-code-file-elimination-plan.md`, `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md`, `docs/plans/125-flux-runtime-async-data-internal-reorganization-plan.md`

## Purpose

修复 2026-04-30 全仓库 11 维度代码重构发现审计中确认的结构性问题，并把未执行或已裁定取消的 slice 用当前 plan guide 的语义明确写清。

## Current Baseline

- Phase 1、2、3、5、6 的代码落地与验证结论已经记录在原始计划文本中，历史 closure 结论仍有效。
- 历史文本把已取消的目录结构归组 slice 写成 `completed`，并继续沿用旧式 `Validation Checklist`，与当前 guide 的 execution-slice / closure 语义不一致。
- 本次规范化不重开 refactor 实施；只把已完成、已取消、已 descoped 的内容改写成彼此一致的 live text。

## Goals

- 用当前 guide 语义准确记录 Plan `159` 哪些 slice 已 landing、哪些 slice 被取消、哪些子项被 descoped。
- 去掉“cancelled slice 仍写成 completed”以及旧式 closure checklist 结构。

## Non-Goals

- 不新增或回滚任何 2026-04-30 重构代码。
- 不重新打开已明确取消的目录结构归组工作。
- 不新增超出原计划的重构目标。

## Scope

### In Scope

- `packages/flux-runtime/src/async-data/`
- `packages/flux-renderers-form/src/`
- `packages/flux-renderers-form-advanced/src/`
- `packages/flux-renderers-data/src/`
- `packages/flow-designer-renderers/src/`
- `packages/flux-compiler/src/`
- `packages/report-designer-renderers/src/`
- 与上述落地对应的 owner-doc sync、test evidence、closure text

### Out Of Scope

- Plan `158`、`145` 等已完成计划所拥有的重复代码消除/文件合并职责
- `runtime-factory.ts` 同步 dispose 门控迁移
- 目录结构归组的机械性文件移动

## Execution Plan

### Phase 1 - 异步取消模式迁移

Status: completed
Targets: `packages/flux-runtime/src/async-data/{reaction-runtime.ts,source-registry.ts}`

- Item Types: `Fix | Proof | Decision`

- [x] Migrated async cancellation from local `disposed` booleans to `AbortController` / `AbortSignal` on the in-scope async-data paths.
- [x] Updated runtime cancellation checks and disposal paths to use abort semantics.
- [x] Added focused tests for dispose race / debounce / stale-drop / cancelled-result behavior.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] In-scope async-data cancellation no longer depends on the old `let disposed = false` pattern.
- [x] Focused tests verify the intended cancellation semantics.
- [x] `docs/architecture/flux-runtime-module-boundaries.md` was updated for the async-data cancellation baseline.
- [x] `docs/logs/` historical entries record the landing.

### Phase 2 - 双状态/双数据源修复

Status: completed
Targets: `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`, `packages/flow-designer-renderers/src/designer-page.tsx`

- Item Types: `Fix | Proof | Decision`

- [x] Added cancellation-safe or no-op fast paths for the in-scope adapter/state mirroring hotspots.
- [x] Reduced unnecessary local state in the audited object-field path.
- [x] Explicitly descoped the `table-quick-edit-controller.ts` subscription rewrite after the live feedback-loop audit showed it was not a safe fix.
- [x] Added focused tests covering adapter sync / cancellation semantics.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `field-utils.tsx` and the object-field path use the landed cancellation / no-op behavior described by the plan.
- [x] The `table-quick-edit-controller.ts` item is explicitly recorded as descoped with reason, not left as ambiguous unfinished work.
- [x] Focused tests verify the adapter synchronization/cancellation semantics.
- [x] `docs/logs/` historical entries record the landing.

### Phase 3 - 包边界修复（158 未覆盖）

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`, `packages/flux-renderers-form/src/renderers/{form.tsx,fieldset.tsx}`, `packages/flux-compiler/src/schema-compiler-registry.test.ts`

- Item Types: `Fix | Proof | Decision`

- [x] Re-homed the audited package-boundary imports to the proper package surfaces.
- [x] Removed the stale compiler test dependency on `@nop-chaos/flux-renderers-data`.
- [x] Verified no new reverse dependency drift was introduced.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] The in-scope package-boundary drifts are closed in live imports/tests.
- [x] No new forbidden dependency edge is introduced by the fix.
- [x] `docs/architecture/flux-runtime-module-boundaries.md` was updated for the boundary baseline.
- [x] `docs/logs/` historical entries record the landing.

### Phase 4 - 目录结构归组

Status: cancelled
Targets: `flux-runtime`, `flux-react`, `report-designer-renderers` directory grouping ideas

- Item Types: `Decision | Follow-up`

- [x] Re-audited the historical note and confirmed this slice was intentionally cancelled rather than landed.
- [x] Kept the cancellation reason in-file: the work was a mechanical readability reorganization with no contract/runtime closure value.
- [x] Removed the old contradictory `completed` labeling from this slice.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] The plan no longer mislabels the cancelled directory-grouping slice as completed.
- [x] The cancellation reason is explicit and observable in the live text.
- [x] No owner-doc update required beyond the plan/log baseline for this phase.
- [x] `docs/logs/2026/05-15.md` records the baseline normalization.

### Phase 5 - i18n 修复

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-inspector.tsx`

- Item Types: `Fix | Proof`

- [x] Replaced hardcoded Chinese inspector strings with `t('flux.flowDesigner.inspector.xxx')` lookups.
- [x] Updated both `zh-CN` and `en-US` translation surfaces for the inspector key set.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] The in-scope inspector UI text no longer relies on hardcoded Chinese strings.
- [x] The required translation surfaces are updated together.
- [x] No owner-doc update required beyond the plan/log baseline for this phase.
- [x] `docs/logs/` historical entries record the landing.

### Phase 6 - 兼容层收敛与清理

Status: completed
Targets: `packages/flux-compiler/src/action-compiler.ts`, `packages/report-designer-renderers/src/{host-data.ts,report-designer-manifest.ts}`

- Item Types: `Fix | Proof | Decision`

- [x] Removed the `extractLegacyPayload` compatibility helper.
- [x] Removed the stale `selection` / `target` aliases from the in-scope Report Designer host contracts.
- [x] Recorded the compatibility cleanup as a landed boundary simplification rather than an open-ended follow-up.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] The in-scope compatibility aliases/helpers are removed from the live baseline.
- [x] Focused verification and historical workspace/package proof are recorded for the cleanup.
- [x] `docs/architecture/flux-runtime-module-boundaries.md` was updated for the compatibility-layer cleanup.
- [x] `docs/logs/` historical entries record the landing.

## Closure Gates

- [x] All in-scope landed refactor-discovery fixes are still represented as completed slices.
- [x] The cancelled directory-grouping slice is explicitly marked `cancelled`, not mislabeled as completed.
- [x] Descoped or rejected sub-items are recorded with reasons instead of being left as ambiguous checklist residue.
- [x] Historical focused verification and workspace/package verification remain part of the closure evidence.
- [x] Affected owner docs are synced where the original phases changed documented boundaries; otherwise `No owner-doc update required` is explicit.
- [x] Independent closure audit confirms the normalized plan text has no remaining plan-baseline blocker.

## Deferred But Adjudicated

### Table Quick Edit External Subscription Rewrite

- Classification: `watch-only residual`
- Why Not Blocking Closure: the audited `useSyncExternalStore` rewrite created a feedback loop, while the existing `record` prop path already propagated external changes sufficiently for this plan's closure baseline.
- Successor Required: `no`
- Successor Path: `None`

### Directory Structure Regrouping

- Classification: `optimization candidate`
- Why Not Blocking Closure: the cancelled slice was a mechanical readability reorganization with no required runtime or contract correction for the audited defects.
- Successor Required: `yes`
- Successor Path: `TBD if human-maintained directory navigation becomes a demonstrated pain point`

## Non-Blocking Follow-ups

- `runtime-factory.ts` synchronous dispose gating remains outside this plan's ownership, as originally recorded.
- Broader large-test-file splits and future structural cleanup continue to require their own owner plans.

## Closure

Status Note: Completed. Plan `159` closed the in-scope async cancellation, double-state, package-boundary, i18n, and compatibility-layer findings from the 2026-04-30 refactor-discovery audit. The directory-regrouping slice was intentionally cancelled rather than landed, and the `table-quick-edit-controller` subscription rewrite was explicitly descoped after the live feedback-loop audit. This normalization pass only brings those facts into current plan-guide form.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent closure audit on 2026-05-15
- Evidence: Fresh closure audit over Plan `159`, the guide, and the recorded historical evidence confirmed the normalized file no longer mislabels the cancelled slice as completed, preserves the descoped `P2.3` rationale, and contains no leftover old-style checklist/closure contradiction.

Follow-up:

- No remaining Plan `159`-owned work.
