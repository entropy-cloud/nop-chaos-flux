# 388 Deep Audit 2026-05-19 Form Tree-Widget Accessibility Plan

> Plan Status: completed
> Last Reviewed: 2026-05-20
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
- `docs/logs/2026/05-20.md`

### Out Of Scope

- other form widget or flow-designer a11y findings

## Execution Plan

### Phase 1 - Restore Tree Widget Keyboard And Status Semantics

Status: completed
Targets: tree widget code and focused tests

- Item Types: `Fix | Proof`
- [x] Implement the missing keyboard model for input-tree and tree-select.
- [x] Tie loading state to the required accessibility semantics.

Implemented:

- `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts` now owns shared tree roving-focus state, visible-node navigation, and full `ArrowUp` / `ArrowDown` / `Home` / `End` keyboard movement used by both `input-tree` and `tree-select`.
- `packages/flux-renderers-form-advanced/src/tree-controls.tsx` now renders one active treeitem at a time, applies shared expanded-state wiring, and ties loading state to `aria-busy` plus loading status ids through `aria-describedby`.
- Focused proof now lives in `packages/flux-renderers-form-advanced/src/tree-control-controllers.test.tsx`, `src/__tests__/form-tree-control-source-states.test.tsx`, and `src/__tests__/tree-structure.test.tsx`.

Exit Criteria:

- [x] `20-02`, `20-03`, and `20-06` are fixed.
- [x] Focused accessibility proof passes.
- [x] `No owner-doc update required`.
- [x] `docs/logs/2026/05-20.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] `No owner-doc update required`.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed. The shared tree keyboard model and loading semantics are landed, no owner-doc update was required, and the current workspace verification baseline is green.

Focused Verification Evidence:

- `pnpm --filter @nop-chaos/flux-renderers-form-advanced exec vitest run src/tree-control-controllers.test.tsx src/__tests__/form-tree-control-source-states.test.tsx src/__tests__/tree-structure.test.tsx`
- `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck`

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent closure audit (`ses_1bce29d24ffeQ6YYSLwkIGVLHb`)
- Evidence: confirmed shared roving focus and `ArrowUp` / `ArrowDown` / `Home` / `End` behavior in `tree-control-controllers.ts`, verified `aria-busy` plus `aria-describedby` loading semantics in `tree-controls.tsx`, and recorded fresh repo-wide `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` green status.
