# 186 Detail And Variant Async Sequencing Safety Plan

> Plan Status: completed
> Last Reviewed: 2026-05-02
> Source: `docs/plans/166-module-hygiene-and-designer-async-cleanup-plan.md`, `docs/plans/182-deep-audit-full-3-mechanical-fixes-plan.md`, live code in `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`, `detail-field.tsx`, `detail-draft-controller.ts`, `variant-field.tsx`, `docs/architecture/variant-field.md`
> Related: `docs/architecture/variant-field.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/action-interaction-state.md`, `docs/plans/180-report-preview-cancellation-and-stale-result-plan.md`

## Purpose

收口 advanced form family 中仍未完成的 async stale-result / sequencing 安全基线：`detail-view`、`detail-field`、`variant-field` 当前都已具备最小 `.catch()` 和 mounted/unmounted 保护，但还没有“latest request wins”的 session/request sequencing。结果是旧的 `transformInAction` / `validateValueAction` / `transformOutAction` / `detectVariantAction` / variant switch migration 仍可能在较慢完成后覆盖较新的用户意图。

## Current Baseline

- `docs/plans/166-module-hygiene-and-designer-async-cleanup-plan.md` Phase 2 已为 `detail-view` / `detail-field` 添加 `.catch()` 错误处理，但没有引入 request/session sequence guard。
- `packages/flux-renderers-form-advanced/src/detail-view/detail-draft-controller.ts` 当前只跟踪 `mountedRef`、`draftFormRef`、open/confirm/error state；没有 request id、session id、或 supersession helper。
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx` 的 `handleOpen()` / `handleConfirm()` 会 await transform/validate/transformOut 链路；只有 mounted safety，没有防止旧请求在较慢完成后打开旧 draft、写回旧 commit result、或覆盖当前错误状态。
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx` 有同类问题；它在 unmount 情况下会停写，但在“仍 mounted、已 superseded”的情况下仍可能接受旧结果。
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` 的 `runDetectVariantAction()` 只检查 `mountedRef`；连续 detect 时旧结果仍可能覆盖新结果。
- 同文件的 `handleVariantSwitch()` 在 async `transformInAction` 完成后直接写 `parentForm.setValue(...)`；快速切换 variant 时较慢的旧 migration 仍可能晚到覆盖最新选择。
- `docs/architecture/variant-field.md` 当前已经说明 live implementation 仍比 richer future ordering 更窄，但还没有把 stale-result / latest-wins sequencing 作为当前 baseline 的一部分。

## Goals

- 为 detail open/confirm 与 variant detect/switch 流程建立一致的 latest-request-wins sequencing 基线。
- 确保 superseded async completion 不会重新打开旧 draft、写回旧值、或覆盖当前选择/错误态。
- 只在需要时保留当前 mounted safety、logging 和 owner semantics，不把本计划扩大成通用 action-runtime abort 设计。
- 为这些路径增加 focused regression coverage，并同步 active owner docs。

## Non-Goals

- 不改变 detail/variant 的 owner model、working-value pipeline、或 broader transform ordering 设计。
- 不要求底层 `helpers.dispatch(...)` 立即提供通用 `AbortSignal` 语义；本计划先解决 stale-result sequencing。
- 不处理 `api-cache`、report preview、designer async、或 word-editor save 这类其它 async owner surface。
- 不扩展到所有 field renderer 的异步 adapter 行为；`Plan 170` 已处理普通 field adapter.out 的最小 stale guard。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-draft-controller.ts`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- any new shared helper introduced specifically for detail/variant sequencing
- focused tests covering overlapping open/confirm/detect/switch flows
- `docs/architecture/variant-field.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/architecture/action-interaction-state.md`

### Out Of Scope

- generic action-runtime abort propagation
- `packages/flux-runtime/src/async-data/api-cache.ts`
- report preview cancellation
- designer/workbench async cleanup already handled elsewhere
- renderer typing or subscription-precision work

## Execution Plan

### Phase 1 - Freeze The Sequencing Contract

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/detail-view/detail-draft-controller.ts`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, `docs/architecture/variant-field.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/action-interaction-state.md`

- [x] Re-audit the live detail/variant async flows and freeze one explicit contract for supersession: what is ignored, what is disposed, and what still logs.
- [x] Introduce a shared sequencing/session helper or equivalent local pattern so detail and variant flows do not each invent a separate stale-result convention.
- [x] Update owner docs to describe the final “latest request wins / stale result dropped” baseline for the in-scope flows.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] The plan records one repo-observable supersession contract for detail and variant async flows.
- [x] Shared sequencing infrastructure or an equivalent frozen pattern exists for later phases to consume.
- [x] `docs/architecture/variant-field.md`, `docs/architecture/value-adaptation-and-detail-field.md`, and/or `docs/architecture/action-interaction-state.md` are updated to the final baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Protect Detail Open And Confirm Flows

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-draft-controller.ts`, focused tests

- [x] Add session/request sequencing so a newer open request supersedes older `transformInAction` completions and disposes any stale draft form created by the older request.
- [x] Add confirm sequencing so stale `validateValueAction` / `transformOutAction` completions cannot commit into the parent once a newer session or close/reopen cycle supersedes them.
- [x] Preserve current mounted safety and error logging, but ensure stale completions are dropped even when the component is still mounted.
- [x] Add focused tests for rapid open/close/reopen and overlapping confirm flows in both `detail-view` and `detail-field` paths.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Superseded detail open/confirm completions can no longer reopen, re-error, or re-commit stale work into the active session.
- [x] Any stale draft form created by a superseded request is disposed rather than leaked.
- [x] Focused tests cover overlapping open/confirm flows and close/reopen supersession.
- [x] Relevant owner docs are updated to the final detail async baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Protect Variant Detect And Switch Flows

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, focused tests, `docs/architecture/variant-field.md`

- [x] Add sequencing to `detectVariantAction` so older detect responses cannot overwrite newer detection/selection state.
- [x] Add sequencing to async `transformInAction` variant switching so an older migration cannot write back after the user has already chosen a newer variant.
- [x] Keep the existing `matchedKey` / `userSelectedKey` / `detectedKey` precedence honest under the new latest-wins rule and document any resulting precedence decision.
- [x] Add focused tests for rapid variant switching and overlapping detect requests.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Superseded detect results can no longer override the latest active variant state.
- [x] Superseded async variant migrations can no longer overwrite the latest user choice in the parent owner.
- [x] Focused tests cover both overlapping detect and overlapping switch flows.
- [x] `docs/architecture/variant-field.md` is updated to the final async sequencing baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Verification And Closure Audit

Status: completed
Targets: in-scope packages, focused tests, this plan

- [x] Run focused verification for detail and variant supersession behavior.
- [x] Run required workspace verification after code changes land and record any unrelated baseline blockers separately from this plan's ownership.
- [x] Perform an independent closure audit.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Focused verification is recorded for each landed async sequencing slice.
- [x] Workspace/package verification was attempted after landing, and the remaining non-green checks are explicitly recorded as unrelated baseline debt outside this plan's ownership.
- [x] Independent closure audit confirms no remaining in-scope stale-result / sequencing gaps owned by this plan.
- [x] `docs/logs/` 对应日期条目已更新。

## Validation Checklist

> **关闭条件**：只有本 section 所有条目及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见本 guide 的 `When Closing The Plan` 和 `Closure Audit Rule`。

- [x] Detail open/confirm flows use latest-request-wins sequencing.
- [x] Variant detect/switch flows use latest-request-wins sequencing.
- [x] Stale async completions cannot reopen, overwrite, or recommit superseded state in the in-scope paths.
- [x] Relevant docs are updated to the final baseline.
- [x] Focused verification is complete.
- [x] Independent closure audit is complete and recorded.
- [x] Post-landing workspace/package verification was attempted and the remaining unrelated blockers are documented honestly.

## Closure

Status Note: Fresh independent closure audit confirms no remaining in-scope stale-result or sequencing gaps in `detail-field`, `detail-view`, or `variant-field`. The plan closes on landed in-scope behavior, focused regressions, and honest post-landing verification notes; unrelated broader workspace verification failures remain documented outside this plan's ownership.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent (`ses_216df323bffe6FJCQIfATCcbtb`)
- Evidence: audit verdict was `partially complete but not closable`; it confirmed Phase 3 variant coverage, but found one remaining in-scope detail gap where reopening a newer draft did not invalidate an older confirm token. That gap was then fixed in `packages/flux-renderers-form-advanced/src/detail-view/detail-draft-controller.ts` and covered by new focused regressions in `detail-field-commit.test.tsx`, `detail-view-transform.test.tsx`, and `detail-draft-controller.test.tsx`. A fresh post-fix closure audit is still required before `completed`.
- Reviewer / Agent: independent general subagent (`ses_216c4f367ffeJkqrMZz8ejGm9u`)
- Evidence: post-fix audit verdict was `can close`. It confirmed the `openDraft(...)` confirm-session invalidation fix is live, the detail and variant focused regressions cover stale open/confirm supersession behavior, and no remaining in-scope plan-owned sequencing gaps remain.

Follow-up:

- If lower-level action dispatch later grows first-class abort propagation, adopt that under a separate owner plan instead of reopening this sequencing plan.
- No remaining plan-owned work.
