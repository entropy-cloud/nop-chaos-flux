# 396 Deep Audit 2026-05-19 Flow-Designer Accessibility Interaction Plan

> Plan Status: completed
> Last Reviewed: 2026-05-20
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
- `docs/logs/2026/05-20.md`

### Out Of Scope

- non-a11y flow-designer findings

## Execution Plan

### Phase 1 - Restore Flow-Designer Interaction Accessibility

Status: completed
Targets: flow-designer interaction code, tests, owner docs

- Item Types: `Fix | Proof`
- [x] Implement the missing menu/button keyboard/name/state semantics.
- [x] Update the owner docs named in Plan `371`.

Implemented:

- `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx` now implements roving menu focus with `ArrowLeft` / `ArrowRight` / `Home` / `End` plus `Escape`, matching the declared `menu` / `menuitem` contract.
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx` and `src/designer-xyflow-canvas/designer-xyflow-edge.tsx` now expose stable interactive labels and selected state through `aria-label` plus `aria-pressed` on focusable button-like canvas roots.
- `packages/flow-designer-renderers/src/designer-page-inner.tsx` now preserves the widened lifecycle-hook error fidelity when routing host-monitor warnings, so the accessibility slice remains compatible with the adjacent `395` error-surface contract.
- Focused proof now lives in `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.test.tsx`, `src/canvas-bridge.test.tsx`, `src/edge-label-xyflow.test.tsx`, and `src/designer-page-shell.test.tsx`.
- Owner docs `docs/components/designer-page/design.md` and `docs/architecture/flow-designer/design.md` now explicitly record the required menu/button interaction semantics for designer add-node overlays and focusable canvas node/edge roots.

Exit Criteria:

- [x] `20-07`, `20-08`, and `20-09` are fixed.
- [x] Focused accessibility proof covers the final interaction model.
- [x] `docs/components/designer-page/design.md` and `docs/architecture/flow-designer/design.md` are updated.
- [x] `docs/logs/2026/05-20.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed. The flow-designer menu/button accessibility contract is landed, required owner docs are synced, and the current workspace verification baseline is green.

Focused Verification Evidence:

- `pnpm --filter @nop-chaos/flow-designer-renderers exec vitest run src/dingflow/ding-flow-add-node-menu.test.tsx src/canvas-bridge.test.tsx src/edge-label-xyflow.test.tsx src/designer-page-shell.test.tsx`
- `pnpm --filter @nop-chaos/flow-designer-renderers typecheck`

Closure Audit Evidence:

- Reviewer / Agent: gpt-5.4 independent closure audit (`ses_1bcc6058dffeBfzJI6miyyp9lv`)
- Evidence: confirmed DingFlow menu keyboard behavior, stable node/edge `aria-label` plus `aria-pressed` semantics, owner-doc updates in `docs/components/designer-page/design.md` and `docs/architecture/flow-designer/design.md`, and repo-wide `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` green status.
