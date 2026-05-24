# 438 Open-Ended Adversarial Review 2026-05-24 Flow Designer Transaction Truthfulness Plan

> Plan Status: completed
> Last Reviewed: 2026-05-24
> Source: `docs/analysis/2026-05-24-open-ended-adversarial-review-01/{round-02.md,round-03.md}`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/434-open-ended-adversarial-review-2026-05-23-flow-designer-tree-recovery-plan.md`, `docs/plans/410-open-ended-adversarial-review-2026-05-19-flow-designer-host-contract-plan.md`, `docs/plans/436-open-ended-adversarial-review-2026-05-24-contract-and-host-truthfulness-routing-plan.md`

## Purpose

收口 Flow Designer transaction recovery 与 public transaction result semantics 的双重 residual，让 tree-mode rollback 和公开 `designer:*Transaction` actions 一起回到诚实、可验证的 transaction contract。

## Current Baseline

- `R24-02`: `docs/analysis/2026-05-24-open-ended-adversarial-review-01/round-02.md` 已确认 tree mode `rollbackTransaction()` 仍只恢复 projected graph，不恢复 owner `TreeDocument`，与 `docs/architecture/flow-designer/tree-mode.md:411-416` 当前 baseline 冲突。
- `R24-03`: `round-03.md` 已确认 public `designer:commitTransaction` / `designer:rollbackTransaction` actions 在 missing/invalid transaction id 时仍返回 `{ ok: true }`，把 public action contract 变成 false-success surface。
- 已完成计划 `434` 只 owning tree mode `save()` / `restore()` owner-tree recovery residual，不 owning transaction rollback 或 public transaction result truthfulness。
- 这两条 finding 共享同一 transaction closure surface：一个是 valid transaction rollback 的 owner-truth语义，一个是 invalid transaction rollback/commit 的 public result truthfulness。它们共同决定调用方对 transaction contract 的真实可依赖边界。

## Goals

- 修复 `R24-02` 与 `R24-03`。
- 让 Flow Designer transaction recovery、public action results、focused proof、以及 owner docs 使用同一最终 supported transaction contract。

## Non-Goals

- 不重开 `save()` / `restore()` owner-tree residual或更早的 host summary / toolbar routing family。
- 不做 generic transaction API redesign beyond restoring honest result semantics for the current public actions.

## Scope

### In Scope

- `R24-02`, `R24-03`
- `packages/flow-designer-core/src/{core.ts,core/transactions.ts,designer-core-types.ts}`
- `packages/flow-designer-renderers/src/{designer-action-provider.ts,designer-manifest.ts,designer-command-adapter.ts}`
- Focused tests under `packages/flow-designer-core/src/__tests__` and `packages/flow-designer-renderers/src/`
- `docs/architecture/flow-designer/{tree-mode.md,api.md}`
- `docs/logs/2026/05-24.md`

### Out Of Scope

- tree-mode `save()` / `restore()` work already owned by completed Plan `434`
- unrelated Flow Designer host summary, toolbar, or canvas contract work
- transaction API expansion beyond the in-scope rollback/result truthfulness residuals

## Execution Plan

### Phase 1 - Re-verify Transaction Boundary

Status: completed
Targets: live transaction code paths, this plan, `docs/logs/2026/05-24.md`

- Item Types: `Decision | Proof`

- [x] Re-verify `R24-02` and `R24-03` against live transaction reducers, core methods, public action provider, and owner docs.
- [x] Record explicit non-overlap with completed Plan `434` and earlier Flow Designer host-contract plans if boundary wording needs tightening.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `R24-02` and `R24-03` remain accurately scoped as one transaction-truthfulness closure surface.
- [x] No owner-doc update required.
- [x] `docs/logs/2026/05-24.md` is updated.

### Phase 2 - Restore Tree Rollback And Honest Public Results

Status: completed
Targets: `packages/flow-designer-core/src/{core.ts,core/transactions.ts,designer-core-types.ts}`, `packages/flow-designer-renderers/src/{designer-action-provider.ts,designer-manifest.ts,designer-command-adapter.ts}`, focused tests, `docs/architecture/flow-designer/{tree-mode.md,api.md}`

- Item Types: `Fix | Proof`

- [x] Extend tree-mode transaction snapshots so rollback restores owner `TreeDocument` together with projected graph state.
- [x] Make public transaction actions distinguish successful commit/rollback from missing or invalid transaction ids with structured non-success results.
- [x] Align touched core types / manifest docs with the final action result shape where required.
- [x] Add focused proof for tree-mode rollback owner-tree parity and for public action results on valid, missing, and stale transaction ids.
- [x] Update `docs/architecture/flow-designer/api.md`; `docs/architecture/flow-designer/tree-mode.md` already matched the final owner-truth baseline and required no change.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `R24-02` and `R24-03` are fixed.
- [x] Focused proof confirms tree-mode rollback restores owner truth and public transaction actions no longer report false success.
- [x] `docs/architecture/flow-designer/{tree-mode.md,api.md}` are updated if needed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-24.md` is updated.

## Closure Gates

- [x] All in-scope confirmed live defects / contract drifts are fixed.
- [x] Flow Designer transaction recovery and public action results now expose one final honest supported contract.
- [x] Necessary focused verification is complete.
- [x] No in-scope residual is silently downgraded to deferred or follow-up.
- [x] Affected owner docs are synced to the final live baseline, or each phase explicitly records `No owner-doc update required`.
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

- Expand scope only if another transaction-path defect is required to close the same rollback/result proof bundle; otherwise require explicit successor ownership.

## Closure

Status Note: `R24-02` and `R24-03` are fixed in live code, focused proof and current-session workspace verification passed, and an independent closure audit found no remaining plan-owned work.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit subagent `ses_1a8678678ffeji9P1UDeRQCJQj`
- Evidence: fresh-session audit re-checked `packages/flow-designer-core/src/{core.ts,core/transactions.ts,designer-core-types.ts}`, `packages/flow-designer-renderers/src/{designer-action-provider.ts,designer-manifest.ts}`, focused proof in `core.test.ts` and `designer-provider-and-manifest.test.tsx`, and the updated Flow Designer owner docs, then confirmed rollback restores owner `TreeDocument` truth and public transaction actions no longer report false success; current-session `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` all passed.

Follow-up:

- No remaining plan-owned work.
