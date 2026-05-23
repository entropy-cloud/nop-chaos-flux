# 434 Open-Ended Adversarial Review 2026-05-23 Flow Designer Tree Recovery Plan

> Plan Status: completed
> Last Reviewed: 2026-05-23
> Source: `docs/analysis/2026-05-23-open-ended-adversarial-review-01/round-02.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/410-open-ended-adversarial-review-2026-05-19-flow-designer-host-contract-plan.md`, `docs/analysis/2026-05-07-open-ended-adversarial-review-01/round-02.md`

## Purpose

收口 Flow Designer tree mode 在 `save()` / `restore()` 路径上的 owner-truth recovery residual，让 save baseline 与 restore 语义不再停留在 graph-only 模式。

## Current Baseline

- `R23-02`: `docs/analysis/2026-05-23-open-ended-adversarial-review-01/round-02.md` 已确认 tree mode undo/redo 已回放 history entry 中的 `treeDocument`，但 `save()` / `restore()` 仍只记录和恢复 graph baseline。
- 历史上 `docs/analysis/2026-05-07-open-ended-adversarial-review-01/round-02.md` 已报过 tree mode undo/redo 不回写 owner tree；live code 现已在 undo/redo 上修复该问题，因此 `R23-02` 是同家族的相邻 residual，不是旧 finding 原样重报。
- 已完成计划 `410` 只处理 Flow Designer host summary / toolbar action path / manifest publication drift，不 owning tree-mode save/restore recovery semantics。

## Goals

- 修复 `R23-02`。
- 让 tree mode `save()` / `restore()` 与 owner-truth baseline、focused proof、owner docs重新一致。

## Non-Goals

- 不重开 undo/redo owner-tree history family本身。
- 不处理 tree mode `rollbackTransaction()` 等同家族候选，除非执行证明它与本计划修复不可分割并显式升级 scope。
- 不扩大到 Flow Designer 其他 host summary、manifest、toolbar、accessibility 问题。

## Scope

### In Scope

- `R23-02`
- `packages/flow-designer-core/src/{core.ts,core/history.ts}`
- `packages/flow-designer-renderers/src/designer-command-adapter.ts` if the command path needs explicit parity proof
- Focused tests under `packages/flow-designer-core/src/__tests__` and/or `packages/flow-designer-renderers/src/`
- `docs/architecture/flow-designer/{tree-mode.md,api.md,runtime-snapshot.md}` and `docs/components/designer-page/design.md` if live-baseline review proves they must change
- `docs/logs/2026/05-23.md`

### Out Of Scope

- undo/redo owner-tree fix already landed
- generic transaction rollback residuals unless scope is explicitly amended
- flow-designer host summary or toolbar routing work owned elsewhere

## Execution Plan

### Phase 1 - Re-verify Save/Restore Residual Boundary

Status: completed
Targets: this plan, live tree-mode recovery paths, `docs/logs/2026/05-23.md`

- Item Types: `Decision | Proof`

- [x] Re-verify that the current live residual is specifically `save()` / `restore()` owner-tree mismatch, not a reopen of the older undo/redo defect.
- [x] Record whether command adapter changes are truly needed or only serve proof/coverage.

Exit Criteria:

- [x] `R23-02` remains accurately scoped as a save/restore residual.
- [x] No owner-doc update required.
- [x] `docs/logs/2026/05-23.md` is updated.

### Phase 2 - Restore Tree Owner Recovery Parity

Status: completed
Targets: `packages/flow-designer-core/src/{core.ts,core/history.ts}`, `packages/flow-designer-renderers/src/designer-command-adapter.ts` if save/restore command-path parity needs code or proof, focused tests, owner docs listed above

- Item Types: `Fix | Proof`

- [x] Extend the saved baseline so tree mode carries the paired owner `TreeDocument`, not only the projected graph document.
- [x] Make `restore()` replay both graph state and owner-tree state.
- [x] Add focused proof covering tree-mode `save()` / `restore()` behavior, not only undo/redo behavior.
- [x] Update `docs/architecture/flow-designer/{tree-mode.md,api.md,runtime-snapshot.md}` and `docs/components/designer-page/design.md`.

Exit Criteria:

- [x] `R23-02` is fixed.
- [x] Focused proof confirms tree-mode `save()` / `restore()` no longer leave owner tree newer than restored graph state.
- [x] Affected owner docs are updated if needed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-23.md` is updated.

## Closure Gates

- [x] The in-scope confirmed live defect is fixed.
- [x] Tree-mode save/restore now matches the supported owner-truth recovery baseline.
- [x] Necessary focused verification is complete.
- [x] No in-scope residual is silently downgraded to deferred or follow-up.
- [x] Affected owner docs are synced to the final live baseline, or each phase explicitly records `No owner-doc update required`.
- [x] Independent subagent / independent reviewer closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Draft Review Record

- Draft split from the original umbrella 2026-05-23 host-contract plan after independent review concluded `R23-02` is its own Flow Designer recovery surface.

## Deferred But Adjudicated

None at draft time.

## Non-Blocking Follow-ups

- If execution proves `rollbackTransaction()` is the same unfixed recovery mechanism, add it only with an explicit scope amendment and matching proof/doc obligations.

## Closure

Status Note: `R23-02` is fixed in live code, focused proof and owner-doc sync are complete, workspace verification passed, and an independent closure audit found no remaining plan-owned work.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit subagent `ses_1ad94538dffeskWerOoXF8tPyx`
- Evidence: fresh-session audit re-checked tree-mode save/restore behavior and confirmed `core.ts`, `core.test.ts`, and the updated flow-designer owner docs now share the same owner-tree recovery baseline, with `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` already passing in the workspace.

Follow-up:

- No remaining plan-owned work.
