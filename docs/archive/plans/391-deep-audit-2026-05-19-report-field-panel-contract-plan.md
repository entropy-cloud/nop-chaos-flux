# 391 Deep Audit 2026-05-19 Report Field-Panel Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-20
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/analysis/2026-05-19-open-ended-adversarial-review-01/{round-02.md,round-04.md}`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`, `docs/plans/406-open-ended-adversarial-review-2026-05-19-25-round-remediation-routing-plan.md`

## Purpose

收口 `06-01`、`10-01`、`11-01` 以及 open-ended findings `R02-03`、`R04-02`：让 report field-panel insert/styling/UI-component/default-surface contract 回到 supported baseline。

## Current Baseline

- report field insert path fire-and-forget hides dual-owner failures。
- field-panel CSS uses unscoped raw `data-slot` selectors。
- drag handle bypasses shared UI `Button`。
- keyboard insert currently allows unsupported selection targets and can build invalid `dropFieldToTarget` payloads (`R02-03`)。
- default report field-panel fallback is only a static list and drops drag-drop / keyboard-insert contract (`R04-02`)。

## Goals

- 修复 `06-01`、`10-01`、`11-01`、`R02-03`、`R04-02`。
- 同步 field-panel owner docs。

## Non-Goals

- 不处理 spreadsheet host findings。

## Scope

### In Scope

- `06-01`, `10-01`, `11-01`, `R02-03`, `R04-02`
- relevant report field-panel files/tests
- `docs/components/report-field-panel/design.md`
- `docs/architecture/report-designer/design.md`
- `docs/logs/2026/05-20.md`

### Out Of Scope

- spreadsheet/report-designer surfaces outside field-panel contract

## Execution Plan

### Phase 1 - Restore Report Field-Panel Contract

Status: completed
Targets: report field-panel code, tests, owner docs

- Item Types: `Fix | Proof`
- [x] Make insert failure semantics observable and supported.
- [x] Reject unsupported keyboard-insert targets and keep `dropFieldToTarget` payload construction within the supported target contract.
- [x] Replace the static default field-panel fallback with the supported live field-panel surface so drag-drop / keyboard-insert behavior remains available by default.
- [x] Scope styling correctly and restore shared UI component usage.
- [x] Re-audit the owner docs named in Plan `371`; no text change was required because the docs already described the target contract now implemented in live code.

Exit Criteria:

- [x] `06-01`, `10-01`, `11-01`, `R02-03`, and `R04-02` are fixed.
- [x] Focused proof covers insert, keyboard-target validation, default field-panel behavior, styling, and UI-component behavior.
- [x] `docs/components/report-field-panel/design.md` and `docs/architecture/report-designer/design.md` are re-audited against live code; no text delta was required.
- [x] `docs/logs/2026/05-20.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] Required owner-doc review is completed; no owner-doc text update was required after re-audit.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed on 2026-05-20 after restoring the live field-panel contract across the standalone component, explicit `report-field-panel` renderer, and the default `report-designer-page` fallback surface.

Implemented Proof:

- `packages/report-designer-renderers/src/report-field-panel.tsx` now emits the canonical drag payload, keeps a dedicated insert button, removes faux button semantics from the drag surface, and exports shared drag-payload helpers.
- `packages/report-designer-renderers/src/field-panel-renderer.tsx` now restricts keyboard insert to `cell | range`, emits the canonical drag payload, and keeps insert failure reporting visible.
- `packages/report-designer-renderers/src/page-renderer.tsx` now uses the live `ReportFieldPanel` contract for the default left workbench panel instead of the old static-list fallback.
- `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx` now accepts canonical drag payloads from `dataTransfer` while remaining compatible with legacy field-drag state used by existing tests.
- Focused regression coverage landed in `packages/report-designer-renderers/src/report-field-panel.test.tsx`, `packages/report-designer-renderers/src/field-panel-renderer.test.tsx`, and `packages/report-designer-renderers/src/page-renderer.test.tsx`.
- Owner docs were re-audited: `docs/components/report-field-panel/design.md` and `docs/architecture/report-designer/design.md` already matched the restored contract, so no text edits were needed.

Verification Evidence:

- `pnpm --filter @nop-chaos/report-designer-renderers test`
- `pnpm --filter @nop-chaos/report-designer-renderers typecheck`
- `pnpm --filter @nop-chaos/report-designer-renderers lint`
- `pnpm --filter @nop-chaos/report-designer-renderers build`
- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`
- `pnpm test`

Closure Audit Evidence:

- Reviewer / Agent: fresh independent closure audit
- Evidence: `Verdict: acceptable`, `Findings: none`.
