# 393 Deep Audit 2026-05-19 Spreadsheet Shell Styling Scope Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `10-02` 与 `10-03`：让 spreadsheet shell/overlay styling 回到 scoped styling contract，不再混入 canvas exception CSS。

## Current Baseline

- toolbar shell styling leaks into canvas exception CSS。
- overlay shell styling leaks into canvas exception CSS。

## Goals

- 修复 `10-02` 与 `10-03`。
- 同步 styling contract doc if needed。

## Non-Goals

- 不处理 spreadsheet host or a11y semantics。

## Scope

### In Scope

- `10-02`, `10-03`
- `packages/spreadsheet-renderers/src/canvas-styles.css`
- related tests/proof
- `docs/architecture/styling-system.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- host-result and fill-handle findings

## Execution Plan

### Phase 1 - Re-scope Spreadsheet Shell Styles

Status: planned
Targets: styling files, proof, owner doc

- Item Types: `Fix | Proof`
- [ ] Separate shell/overlay styling from canvas exception scope.
- [ ] Update `docs/architecture/styling-system.md` if the supported styling contract needs sync.

Exit Criteria:

- [ ] `10-02` and `10-03` are fixed.
- [ ] Focused proof covers the final styling scope.
- [ ] `docs/architecture/styling-system.md` is updated, or `No change required` is explicitly adjudicated.
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
