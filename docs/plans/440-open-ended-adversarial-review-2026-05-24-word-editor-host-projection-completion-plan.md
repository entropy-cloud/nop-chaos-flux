# 440 Open-Ended Adversarial Review 2026-05-24 Word Editor Host Projection Completion Plan

> Plan Status: completed
> Last Reviewed: 2026-05-24
> Source: `docs/analysis/2026-05-24-open-ended-adversarial-review-01/{round-05.md,round-06.md}`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/411-open-ended-adversarial-review-2026-05-19-word-editor-truth-surface-and-host-contract-plan.md`, `docs/plans/436-open-ended-adversarial-review-2026-05-24-contract-and-host-truthfulness-routing-plan.md`

## Purpose

收口 Word Editor host projection 中当前仍未接线完成的 selection/runtime fields，让 selection formatting、toolbar active state、runtime page-position publication、manifest、and owner docs 重新回到单一 supported baseline。

## Current Baseline

- `R24-05`: `docs/analysis/2026-05-24-open-ended-adversarial-review-01/round-05.md` 已确认 canvas-editor range-style payload包含 `superscript` / `subscript`，editor store、manifest、toolbar、owner doc 也都声明这些字段，但 `editor-canvas.tsx` 的 `onRangeStyleChange` 没有把它们写入 store。
- `R24-06`: `round-06.md` 已确认 `editor-store.ts` 定义并公开了 `currentPage`，host runtime / manifest / owner doc 也都发布该字段，但 live canvas bridge 没有任何非测试路径调用 `setCurrentPage(...)`。
- 已完成计划 `411` 修复的是 earlier save/status/persisted truth-surface/manifest-provider families，不 owning 当前这两条“public field exists but bridge never writes it” residual。
- `R24-05` 与 `R24-06` 共享同一 closure surface：Word Editor host projection bridge completeness。它们都不是抽象架构问题，而是 renderer bridge 把已支持的 public field 漏传或未接线，导致 host scope/runtime/toolbar 对外发布假信息。

## Goals

- 修复 `R24-05` 与 `R24-06`。
- 让 Word Editor host projection、manifest、toolbar state、focused proof、以及 owner docs 对最终 selection/runtime 字段集使用同一 live baseline。

## Non-Goals

- 不重开 Plan `411` 已关闭的 save/status/persisted truth-surface families。
- 不扩大到新的 Word Editor feature design；若 `runtime.currentPage` 无法由现有 bridge 真实提供，closure 可以诚实地缩窄该 public field，而不是因此扩展为新 feature 计划。

## Scope

### In Scope

- `R24-05`, `R24-06`
- `packages/word-editor-core/src/editor-store.ts`
- `packages/word-editor-renderers/src/{editor-canvas.tsx,hooks/use-word-editor-state.ts,word-editor-manifest.ts,toolbar/font-controls.tsx}`
- Focused tests under `packages/word-editor-renderers/src/__tests__/`
- `docs/components/word-editor-page/design.md`
- `docs/architecture/word-editor/design.md` if host projection wording there must change during closure
- `docs/logs/2026/05-24.md`

### Out Of Scope

- unrelated Word Editor save/persisted-data work already owned by completed Plan `411`
- broad canvas-editor capability expansion beyond the fields required to honestly close `R24-05` / `R24-06`

## Execution Plan

### Phase 1 - Re-verify Host Projection Bridge Boundary

Status: completed
Targets: live Word Editor bridge/publication code, this plan, `docs/logs/2026/05-24.md`

- Item Types: `Decision | Proof`

- [x] Re-verify `R24-05` and `R24-06` against live bridge callbacks, store mutations, host runtime publication, manifest, and owner docs.
- [x] Record explicit non-overlap with completed Plan `411` if boundary wording needs tightening.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `R24-05` and `R24-06` remain accurately scoped as host-projection bridge completeness residuals.
- [x] No owner-doc update required.
- [x] `docs/logs/2026/05-24.md` is updated.

### Phase 2 - Complete Selection And Runtime Field Wiring

Status: completed
Targets: `packages/word-editor-core/src/editor-store.ts`, `packages/word-editor-renderers/src/{editor-canvas.tsx,hooks/use-word-editor-state.ts,word-editor-manifest.ts,toolbar/font-controls.tsx}`, focused tests, `docs/components/word-editor-page/design.md`, `docs/architecture/word-editor/design.md` if needed

- Item Types: `Fix | Decision | Proof`

- [x] Wire `superscript` and `subscript` from the live range-style payload into editor store selection state so host scope and toolbar active state reflect current formatting truthfully.
- [x] Adjudicate one honest closure for `runtime.currentPage`: the false public field was removed from runtime/manifest/docs because the current bridge still cannot publish it truthfully.
- [x] Add focused proof covering host-scope `selection.superscript` / `selection.subscript`, toolbar active state, and the final `runtime.currentPage` contract.
- [x] Update `docs/components/word-editor-page/design.md`, `docs/architecture/word-editor/design.md`, and `packages/word-editor-renderers/src/word-editor-manifest.ts` to the final live baseline.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `R24-05` and `R24-06` are fixed.
- [x] Focused proof covers superscript/subscript truthfulness and the final current-page publication contract.
- [x] `docs/components/word-editor-page/design.md`, `docs/architecture/word-editor/design.md` (if needed), and `packages/word-editor-renderers/src/word-editor-manifest.ts` are synced to the final live baseline.
- [x] `docs/logs/2026/05-24.md` is updated.

## Closure Gates

- [x] All in-scope confirmed live defects / contract drifts are fixed.
- [x] Word Editor host projection no longer publishes false selection/runtime fields.
- [x] Necessary focused verification is complete.
- [x] No in-scope residual is silently downgraded to deferred or follow-up.
- [x] Affected owner docs / public manifest are synced to the final live baseline, or each phase explicitly records `No owner-doc update required`.
- [x] Independent subagent / independent reviewer closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Draft Review Record

- Draft created after routing plan `436` split the original umbrella proposal into owner-specific plans.
- Independent split-plan review: `accept` (`ses_1a89922ceffepLXxJNLuTtqrOy`).

## Deferred But Adjudicated

None at draft time.

## Non-Blocking Follow-ups

- Expand scope only if another Word Editor bridge field must be repaired to close the same host-projection proof bundle or owner-doc sync; otherwise require explicit successor ownership.

## Closure

Status Note: `R24-05` and `R24-06` are fixed in live code, focused proof and current-session workspace verification passed, and an independent closure audit found no remaining plan-owned work.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit subagent `ses_1a8678678ffeji9P1UDeRQCJQj`
- Evidence: fresh-session audit re-checked `packages/word-editor-renderers/src/{editor-canvas.tsx,hooks/use-word-editor-state.ts,word-editor-manifest.ts}`, the focused tests under `packages/word-editor-renderers/src/__tests__/`, and the updated Word Editor owner docs, then confirmed selection projection now includes `superscript` / `subscript` and the false `runtime.currentPage` field was honestly removed from the public contract; current-session `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` all passed.

Follow-up:

- No remaining plan-owned work.
