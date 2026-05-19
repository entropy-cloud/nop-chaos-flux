# 388 Deep Audit 2026-05-19 Form Tree-Widget Accessibility Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `20-02`、`20-03`、`20-06`：让 form tree widgets 回到完整 tree keyboard/status semantics。

## Current Baseline

- input-tree 缺完整 roving focus / arrow-key model。
- tree-select popup 缺完整 tree keyboard model。
- tree loading status 未关联 `aria-busy` / `describedby`。

## Goals

- 修复 `20-02`、`20-03`、`20-06`。
- 补 focused a11y proof。

## Non-Goals

- 不做 repo-wide tree accessibility sweep。

## Scope

### In Scope

- `20-02`, `20-03`, `20-06`
- `packages/flux-renderers-form-advanced/src/tree-controls.tsx`
- related focused tests
- `docs/logs/2026/05-19.md`

### Out Of Scope

- other form widget or flow-designer a11y findings

## Execution Plan

### Phase 1 - Restore Tree Widget Keyboard And Status Semantics

Status: planned
Targets: tree widget code and focused tests

- Item Types: `Fix | Proof`
- [ ] Implement the missing keyboard model for input-tree and tree-select.
- [ ] Tie loading state to the required accessibility semantics.

Exit Criteria:

- [ ] `20-02`, `20-03`, and `20-06` are fixed.
- [ ] Focused accessibility proof passes.
- [ ] `No owner-doc update required`.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained findings are fixed.
- [ ] `No owner-doc update required`.
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
