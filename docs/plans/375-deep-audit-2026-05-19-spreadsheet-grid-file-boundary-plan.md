# 375 Deep Audit 2026-05-19 Spreadsheet-Grid Surface Plan

> Plan Status: partially completed
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

Status: completed
Targets: `spreadsheet-grid.tsx`, extracted modules, owner doc

- Item Types: `Fix | Proof`
- [x] Split `spreadsheet-grid.tsx` by owner responsibility until the root file is within the hard gate.
- [x] Remove the current mouse-only faux-button semantics from the fill handle or replace them with a supported accessible interaction.
- [x] Update `docs/components/spreadsheet-page/design.md` to the final supported grid interaction contract.

Exit Criteria:

- [x] `02-03` and `20-05` are fixed.
- [x] The touched file no longer violates the oversized hard gate.
- [x] Focused proof covers the final fill-handle interaction semantics.
- [x] `docs/components/spreadsheet-page/design.md` is updated.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [x] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: In-scope code/doc work is complete after splitting the table/cell shell out of `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`, keeping the root file below the oversized hard gate, and making the fill handle explicit as a presentational pointer-only affordance instead of an advertised button. Final plan closure remains blocked by unrelated workspace `typecheck`/`build`/`test` failures outside this surface.

Closure Audit Evidence:

- Reviewer / Agent: GPT-5.4 independent closure pass
- Evidence: re-audited the live repo after the split and contract/doc updates; confirmed `spreadsheet-grid.tsx` dropped to `402` lines, the extracted `packages/spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx` owns the table/cell rendering surface, focused proof in `packages/spreadsheet-renderers/src/__tests__/context-menu-fill-and-range.test.tsx` asserts the fill handle remains `aria-hidden` with no faux button role, and focused spreadsheet verification plus package-local `typecheck`/`build`/`lint` passed. Workspace closure gates remain blocked by unrelated failures in `@nop-chaos/flux-renderers-data` build/typecheck and `@nop-chaos/flux-runtime` tests; `pnpm check:oversized-code-files` still fails only on unrelated files after `spreadsheet-grid.tsx` cleared the hard gate.
