# 396 Deep Audit 2026-05-19 Flow-Designer Accessibility Interaction Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `20-07`、`20-08`、`20-09`：让 flow-designer menus/buttons 回到完整 keyboard/name/state interaction contract。

## Current Baseline

- DingFlow add-node menu 缺 menu keyboard model。
- flow-designer node button 缺 stable accessible name/state。
- flow-designer edge button 缺 stable accessible name/state。

## Goals

- 修复 `20-07`、`20-08`、`20-09`。
- 同步 flow-designer interaction docs。

## Non-Goals

- 不处理 flow-designer type boundary or error fidelity。

## Scope

### In Scope

- `20-07`, `20-08`, `20-09`
- relevant flow-designer renderer files/tests
- `docs/components/designer-page/design.md`
- `docs/architecture/flow-designer/design.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- non-a11y flow-designer findings

## Execution Plan

### Phase 1 - Restore Flow-Designer Interaction Accessibility

Status: planned
Targets: flow-designer interaction code, tests, owner docs

- Item Types: `Fix | Proof`
- [ ] Implement the missing menu/button keyboard/name/state semantics.
- [ ] Update the owner docs named in Plan `371`.

Exit Criteria:

- [ ] `20-07`, `20-08`, and `20-09` are fixed.
- [ ] Focused accessibility proof covers the final interaction model.
- [ ] `docs/components/designer-page/design.md` and `docs/architecture/flow-designer/design.md` are updated.
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
