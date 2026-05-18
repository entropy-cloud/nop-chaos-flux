# 356 Open-Ended Adversarial Review 2026-05-18 Renderer Contract And Button Safety Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/round-02.md` (Findings 5, 6), `docs/analysis/2026-05-18-open-ended-adversarial-review-02/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/350-open-ended-adversarial-review-2026-05-18-priority-remediation-plan.md`, `docs/architecture/styling-system.md`, `docs/architecture/renderer-runtime.md`

## Purpose

收口 renderer contract / button safety surface 的 2 个 defects：Container/Flex layout renderers 与“marker classes only” styling contract 不一致，以及多个 wrapped buttons 缺少 `type="button"` 导致 accidental form submission 风险。

## Current Baseline

Outdated Note: the bullets below capture the pre-fix renderer-contract baseline. Final live status is recorded in the completed execution checklist, closure gates, and `docs/logs/2026/05-18.md`.

- `R2-5` 与 `R2-6` 都位于 renderer contract surface：一个是 layout renderer styling-owner baseline 漂移，一个是 button semantics 与 form embedding baseline 漂移。
- 当前 live baseline 下，`button.tsx` 自己显式写 `type="button"`，但 higher-level renderer wrappers 不一致；同时 `Container` / `Flex` 的实现与 `docs/architecture/styling-system.md` 的 current wording 存在 contract mismatch。
- 这两个问题需要同一 owner 同时处理 code side contract alignment 与 owner-doc adjudication，不能拆成“代码归一边、文档归另一边”。

## Goals

- Make wrapped button semantics safe on the supported form-embedding baseline.
- Converge layout renderer implementation and styling-system owner-doc wording to one honest baseline.
- Add focused proof for button default-type safety and the chosen layout-renderer contract baseline.

## Non-Goals

- 不接管 form init failure visibility；那部分由 Plan `353` owning。
- 不做 generic visual redesign 或 theme-system rewrite。
- 不接管 unrelated widget-internal styling classes outside the two in-scope defects。

## Scope

### In Scope

- `R2-5`
- `R2-6`
- `packages/flux-renderers-basic/src/{container.tsx,flex.tsx,button.tsx}`
- `packages/flux-renderers-form-advanced/src/{condition-builder.tsx,detail-surface.tsx,detail-view/detail-view.tsx,detail-view/detail-field.tsx,key-value.tsx,array-editor.tsx,array-field.tsx}`
- focused tests and relevant docs
- `docs/architecture/styling-system.md`
- `docs/architecture/renderer-runtime.md` if needed
- `docs/logs/2026/05-18.md`

### Out Of Scope

- `R2-7`
- `R3-4`
- unrelated widget-internal class cleanup with no contract effect

## Execution Plan

### Phase 1 - Freeze Renderer Contract Baseline

Status: completed
Targets: touched renderer files, styling docs, focused tests

- Item Types: `Decision | Proof`

- [x] Re-audit the styling-contract mismatch and wrapped-button semantics as one renderer contract family.
- [x] Decide one honest supported baseline for layout-renderer styling: implementation change, owner-doc change, or a combined convergence that closes the mismatch.
- [x] Add or update focused proof for wrapped button default-type safety and the chosen layout-renderer baseline.

Exit Criteria:

- [x] The plan records one explicit supported layout-renderer and button-semantics baseline.
- [x] Focused proof exists for both in-scope defects.
- [x] Owner-doc update needs are explicitly decided as `No owner-doc update required`; the supported styling-system contract already matched the chosen baseline and only the central button default needed to converge.
- [x] `docs/logs/2026/05-18.md` records the baseline decision.

### Phase 2 - Land Renderer Contract And Button Safety Fixes

Status: completed
Targets: touched renderer implementation files and styling docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix `R2-6` so all in-scope wrapped buttons have safe explicit button semantics on the supported baseline.
- [x] Fix `R2-5` by converging code and owner-doc wording to one honest supported layout-renderer styling baseline.
- [x] Keep focused proof green for both in-scope defects after the implementation/doc convergence.

Exit Criteria:

- [x] Wrapped button semantics no longer create accidental-submit risk on the supported baseline.
- [x] The known `R2-6` file set from the adversarial review has been fully audited and no remaining missing explicit `type="button"` remains in the supported wrapper surface.
- [x] Layout renderer implementation and styling-system owner-doc wording no longer disagree on the supported contract.
- [x] Focused proof is green for both in-scope defects.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit only if the code already matched the supported baseline after re-audit.
- [x] `docs/logs/2026/05-18.md` records the landed fix.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-18.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis, live code/docs/tests, and verification results.

Exit Criteria:

- [x] Focused verification for all in-scope defects has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned renderer contract/button-safety blocker.
- [x] This plan's statuses, checklists, closure gates, and daily-log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`R2-5`, `R2-6`) are fixed.
- [x] Renderer contract and button safety converge to one supported baseline.
- [x] Necessary focused verification exists for every touched defect family.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed. Safe submit semantics are now centralized in `@nop-chaos/ui/Button` with default `type="button"` while explicit submit remains preserved, and the layout-renderer styling baseline stays aligned with the existing styling-system contract without further owner-doc changes.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit `ses_1c66e86ebffeUQPLe8MOl7YoC6`.
- Evidence: the fresh reviewer re-checked `packages/ui/src/components/ui/button.tsx`, `button.test.tsx`, the audited wrapper surface, and existing layout styling contract proof, and reported `356` closure-ready with no remaining plan-owned blockers.

Follow-up:

- None.
