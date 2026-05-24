# 437 Open-Ended Adversarial Review 2026-05-24 Report Designer Aggregated Runtime Plan

> Plan Status: completed
> Last Reviewed: 2026-05-24
> Source: `docs/analysis/2026-05-24-open-ended-adversarial-review-01/round-01.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/433-open-ended-adversarial-review-2026-05-23-report-designer-host-projection-and-manifest-plan.md`, `docs/plans/436-open-ended-adversarial-review-2026-05-24-contract-and-host-truthfulness-routing-plan.md`

## Purpose

收口 Report Designer top-level aggregated runtime summary 的 live split，让 host scope、bridge snapshot、`statusPath`、focused proof、以及 owner docs 重新回到同一 supported contract。

## Current Baseline

- `R24-01`: `docs/analysis/2026-05-24-open-ended-adversarial-review-01/round-01.md` 已确认 `buildReportDesignerScopeData()` 仍把 top-level `runtime` 发布为 report-only `dirty` / `canUndo` / `canRedo`，而 `deriveDesignerHostSnapshot()` 与 `useStatusPathPublication()` 已经发布 report+spreadsheet 聚合摘要。
- `docs/components/report-designer-page/design.md:106-112` 和 `docs/architecture/report-designer/design.md:447-455` 已把 top-level `runtime` 定义为 canonical aggregated runtime summary，因此当前 drift 是 live implementation 没跟上 active owner docs，而不是文档尚未裁定。
- 已完成计划 `433` 只 owning Report Designer `activeSheet` convenience 语义与 nested `spreadsheet.selection` manifest precision，不 owning 本轮新增的 aggregated runtime summary split。

## Goals

- 修复 `R24-01`。
- 让 Report Designer top-level `runtime` 在 host scope、bridge snapshot、`statusPath`、focused proof、以及 owner docs 中重新使用同一聚合语义。

## Non-Goals

- 不重开 `activeSheet`、`spreadsheet.selection` manifest precision、或更早的 selection alias families。
- 不扩大到其他未命名 Report Designer host fields，除非执行证明它们与 `R24-01` 共享同一 fix 和 proof bundle，且必须一起落地才能诚实闭环。

## Scope

### In Scope

- `R24-01`
- `packages/report-designer-renderers/src/{host-data.ts,bridge.ts,page-renderer.tsx}`
- Focused tests under `packages/report-designer-renderers/src/`
- `docs/components/report-designer-page/design.md`
- `docs/architecture/report-designer/{design.md,api.md}`
- `docs/logs/2026/05-24.md`

### Out Of Scope

- Report Designer manifest precision work already owned by completed Plan `433`
- workbook/selectionTarget split-brain families outside aggregated runtime summary semantics
- new report/spreadsheet host vocabulary cleanup beyond the in-scope runtime fields

## Execution Plan

### Phase 1 - Re-verify Aggregated Runtime Boundary

Status: completed
Targets: live Report Designer projection code, this plan, `docs/logs/2026/05-24.md`

- Item Types: `Decision | Proof`

- [x] Re-verify `R24-01` against host scope, bridge snapshot, and `statusPath` publication.
- [x] Record explicit non-overlap with completed Plan `433` if any boundary wording needs tightening during re-audit.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `R24-01` remains accurately scoped as an aggregated runtime summary split.
- [x] No owner-doc update required.
- [x] `docs/logs/2026/05-24.md` is updated.

### Phase 2 - Restore Aggregated Runtime Publication Parity

Status: completed
Targets: `packages/report-designer-renderers/src/{host-data.ts,bridge.ts,page-renderer.tsx}`, focused tests, `docs/components/report-designer-page/design.md`, `docs/architecture/report-designer/{design.md,api.md}`

- Item Types: `Fix | Proof`

- [x] Make top-level host-scope `runtime` derive from the same aggregated dirty/undo/redo definition already used by bridge/status publication, preferably through one shared helper.
- [x] Add focused proof for spreadsheet-only dirty/history changes, report-only changes, and mixed states so host scope, bridge snapshot, and `statusPath` all agree.
- [x] Re-audit `docs/components/report-designer-page/design.md` and `docs/architecture/report-designer/{design.md,api.md}`; no owner-doc update was required because they already described the final aggregated runtime baseline.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `R24-01` is fixed.
- [x] Focused proof confirms host scope, bridge snapshot, and `statusPath` now publish one aggregated runtime contract.
- [x] `docs/components/report-designer-page/design.md` and `docs/architecture/report-designer/{design.md,api.md}` are updated if needed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-24.md` is updated.

## Closure Gates

- [x] The in-scope confirmed live defect is fixed.
- [x] Report Designer aggregated runtime now publishes one final supported contract across host scope, bridge snapshot, and `statusPath`.
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

- Expand scope only if another Report Designer field must be fixed to preserve the same aggregated runtime proof path or owner-doc sync; otherwise require explicit successor ownership.

## Closure

Status Note: `R24-01` is fixed in live code, focused proof and current-session workspace verification passed, and an independent closure audit found no remaining plan-owned work.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit subagent `ses_1a8678678ffeji9P1UDeRQCJQj`
- Evidence: fresh-session audit re-checked `packages/report-designer-renderers/src/{host-data.ts,bridge.ts,page-renderer.tsx}`, focused proof under `packages/report-designer-renderers/src/`, and the Report Designer owner docs, then confirmed the aggregated top-level `runtime` summary is now published consistently across host scope, bridge snapshot, and `statusPath`; current-session `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` all passed.

Follow-up:

- No remaining plan-owned work.
