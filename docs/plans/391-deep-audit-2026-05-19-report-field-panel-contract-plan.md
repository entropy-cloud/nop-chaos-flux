# 391 Deep Audit 2026-05-19 Report Field-Panel Contract Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
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
- `docs/logs/2026/05-19.md`

### Out Of Scope

- spreadsheet/report-designer surfaces outside field-panel contract

## Execution Plan

### Phase 1 - Restore Report Field-Panel Contract

Status: planned
Targets: report field-panel code, tests, owner docs

- Item Types: `Fix | Proof`
- [ ] Make insert failure semantics observable and supported.
- [ ] Reject unsupported keyboard-insert targets and keep `dropFieldToTarget` payload construction within the supported target contract.
- [ ] Replace the static default field-panel fallback with a supported fallback that preserves drag-drop / keyboard-insert behavior, or explicitly narrow the supported default contract and update owner docs accordingly.
- [ ] Scope styling correctly and restore shared UI component usage.
- [ ] Update the owner docs named in Plan `371`.

Exit Criteria:

- [ ] `06-01`, `10-01`, `11-01`, `R02-03`, and `R04-02` are fixed.
- [ ] Focused proof covers insert, keyboard-target validation, default field-panel behavior, styling, and UI-component behavior.
- [ ] `docs/components/report-field-panel/design.md` and `docs/architecture/report-designer/design.md` are updated.
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
