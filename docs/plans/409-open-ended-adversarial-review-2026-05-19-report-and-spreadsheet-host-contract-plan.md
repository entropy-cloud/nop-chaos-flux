# 409 Open-Ended Adversarial Review 2026-05-19 Report And Spreadsheet Host Contract Plan

> Plan Status: partially completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-open-ended-adversarial-review-01/{round-02.md,round-04.md,round-05.md,round-25.md}`
> Related: `docs/plans/406-open-ended-adversarial-review-2026-05-19-25-round-remediation-routing-plan.md`, `docs/plans/391-deep-audit-2026-05-19-report-field-panel-contract-plan.md`, `docs/architecture/report-designer/design.md`, `docs/components/report-designer-page/design.md`, `docs/components/spreadsheet-page/design.md`, `docs/architecture/capability-projection-manifest.md`

## Purpose

收口 `R02-02`、`R04-01`、`R05-01`、`R25-01`：让 report-designer / spreadsheet host manifest、snapshot summary、provider enforcement 和 page shell semantics 回到单一支持契约。

## Current Baseline

- `R02-02`: `report-designer:openInspector` / `closeInspector` 改 runtime state，但 page shell 忽略该 canonical state。
- `R04-01`: `ReportDesignerBridge.getDesignerSnapshot()` 的 undo/redo 仍降级为 spreadsheet-only runtime state。
- `R05-01`: spreadsheet host manifest 仍有大量 live methods 缺失结构化 `args` contract，而 provider 会把任意 object 透传进强类型命令。
- `R25-01`: report-designer manifest 已发布结构化 `args` contract，但 provider 仍把任意 object cast 成 `ReportDesignerCommand` 透传。
- report field-panel contract finding `R02-03` / `R04-02` 已归 Plan `391`，本计划不重复 owning field-panel surface。

## Goals

- 修复 `R02-02`、`R04-01`、`R05-01`、`R25-01`。
- 让 report/spreadsheet manifest、provider、snapshot summary、shell visibility 行为重新对齐。
- 同步受影响 owner docs，明确 canonical host contract。

## Non-Goals

- 不处理 report field-panel insert/default-fallback contract；那属于 Plan `391`。
- 不处理 supported E2E assertion fidelity。
- 不处理 flow-designer 或 word-editor host-family drift。

## Scope

### In Scope

- `R02-02`, `R04-01`, `R05-01`, `R25-01`
- report/spreadsheet host provider, manifest, snapshot, and shell files
- `docs/architecture/report-designer/design.md`
- `docs/components/report-designer-page/design.md`
- `docs/components/spreadsheet-page/design.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- report field-panel owner surface
- spreadsheet fill-handle / canvas accessibility / styling concerns
- product-facing E2E rewrites

## Execution Plan

### Phase 1 - Restore Report-Designer Snapshot And Shell Semantics

Status: completed
Targets: report-designer snapshot/bridge/page-shell code, focused tests, owner docs

- Item Types: `Fix | Proof`

- [x] Make inspector open/close shell behavior follow the canonical report-designer runtime state.
- [x] Make `ReportDesignerBridge.getDesignerSnapshot()` publish report-owned undo/redo semantics instead of spreadsheet-only state.
- [x] Add focused proof for shell visibility and host summary behavior.
- [x] `docs/architecture/report-designer/design.md` and `docs/components/report-designer-page/design.md`: No owner-doc update required; the live fix restored the already-documented baseline.

Exit Criteria:

- [x] `R02-02` and `R04-01` are fixed.
- [x] Focused proof covers inspector visibility and undo/redo summary publication.
- [x] `docs/architecture/report-designer/design.md` and `docs/components/report-designer-page/design.md` are updated.
- [ ] `docs/logs/2026/05-19.md` is updated.

### Phase 2 - Align Spreadsheet And Report Host Manifests With Provider Enforcement

Status: in progress
Targets: report/spreadsheet manifest/provider code, focused tests, owner docs

- Item Types: `Fix | Proof`

- [x] Close the spreadsheet manifest/provider gap so live spreadsheet methods expose and enforce honest payload contracts.
- [ ] Close the report-designer manifest/provider gap so live provider acceptance matches the published method-specific `args` contracts.
- [x] Add focused proof for manifest/provider parity across the touched host methods.
- [x] `docs/components/spreadsheet-page/design.md`: No owner-doc update required for the spreadsheet slice because the supported `spreadsheet:*` action baseline already required namespace actions rather than arbitrary payload passthrough; any report-family doc update remains blocked on the unfinished report provider parity item.

Exit Criteria:

- [ ] `R05-01` and `R25-01` are fixed.
- [x] Focused proof covers manifest/provider parity for the touched methods.
- [x] `docs/components/spreadsheet-page/design.md` and any affected report/spreadsheet owner docs are updated.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained findings are fixed.
- [ ] Required owner-doc updates are landed.
- [ ] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: not yet run
