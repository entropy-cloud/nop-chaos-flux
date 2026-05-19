# 375 Deep Audit 2026-05-19 Spreadsheet-Grid Surface Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `02-03` 与 `20-05`：拆分 `spreadsheet-grid.tsx` 的混合 owner boundary，并让 fill handle interaction 回到 supported accessibility baseline。

## Current Baseline

- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` 同时承担多个 interaction owners，并超过 hard gate。
- fill handle 当前 `role=button` 但只支持 mouse interaction。

## Goals

- 修复 `02-03`。
- 让 spreadsheet-grid owner boundary 清晰且重新通过 oversized gate。
- 修复 `20-05`。
- 让 grid interaction surface 不再保留 mouse-only faux-button semantics。

## Non-Goals

- 不处理 spreadsheet host semantics or shell styling findings。

## Scope

### In Scope

- `02-03`, `20-05`
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`
- any extracted spreadsheet-grid modules
- `docs/components/spreadsheet-page/design.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- spreadsheet host semantics and shell styling findings routed to other successor plans

## Execution Plan

### Phase 1 - Split Grid Owners And Fix Fill-Handle Semantics

Status: planned
Targets: `spreadsheet-grid.tsx`, extracted modules, owner doc

- Item Types: `Fix | Proof`
- [ ] Split `spreadsheet-grid.tsx` by owner responsibility until the root file is within the hard gate.
- [ ] Remove the current mouse-only faux-button semantics from the fill handle or replace them with a supported accessible interaction.
- [ ] Update `docs/components/spreadsheet-page/design.md` to the final supported grid interaction contract.

Exit Criteria:

- [ ] `02-03` and `20-05` are fixed.
- [ ] The touched file no longer violates the oversized hard gate.
- [ ] Focused proof covers the final fill-handle interaction semantics.
- [ ] `docs/components/spreadsheet-page/design.md` is updated.
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
