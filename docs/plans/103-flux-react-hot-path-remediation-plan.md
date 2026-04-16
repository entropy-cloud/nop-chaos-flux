# 103 Flux React Hot-Path Remediation Plan

> Plan Status: planned
> Last Reviewed: 2026-04-16
> Source: `docs/analysis/2026-04-16-performance-audit.md` sections 2.1-2.8, `docs/architecture/renderer-runtime.md`, `docs/architecture/performance-design-requirements.md`
> Related: `docs/plans/101-performance-audit-closure-and-owner-assignment-plan.md`, `docs/plans/75-reaction-and-renderer-perf-fix-plan.md`, `docs/plans/77-renderer-hot-path-perf-and-memory-continuation-plan.md`

## Purpose

收口 `packages/flux-react/src/` 中仍残留的 confirmed hot-path defects，前提是不重开 Plan 75 / 77 已关闭的 renderer stability fixes。

## Current Baseline

- `node-renderer.tsx` 仍重复解析 `resolveNodeProps()`，并重复做等价 meta normalization。
- `useNodeLifecycleActions()` 仍与宽 `helpers` identity 绑定。
- `hooks.ts` 中仍有若干 `useSyncExternalStoreWithSelector` wrapper 在 render 中重建 `subscribe` / `getSnapshot` 闭包。
- `schema-renderer.tsx` 对 fresh `props.data` 仍会走 broad replace publish。
- `field-frame.tsx` 与 `use-node-source-props.ts` 仍残留小额重复分配 / no-op effect。
- 已关闭且不应重开：Plan 75 的 `node-renderer.tsx` subscription memoization、Plan 77 的 stale `propsValue` structural fix。

## Goals

- 消除 `node-renderer.tsx` 的重复解析和重复 meta normalization。
- 将 lifecycle dispatch 稳定地绑定到真实 node lifecycle，而不是宽 helper churn。
- 稳定当前仍未修复的 selector-hook closure 边界。
- 为 page data replace 加上 cheap guard。
- 清理剩余 confirmed 小额 hot-path churn。

## Non-Goals

- 不重开 Plan 75 的已落地 `node-renderer.tsx` subscription memoization work。
- 不重开 Plan 77 的 stale `propsValue` source-prop controller fix。
- 不 blanket 推进 `RenderNodes` memoization。
- 不做 renderer-wide `React.memo` rollout。

## Scope

### In Scope

- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-react/src/hooks.ts`
- `packages/flux-react/src/schema-renderer.tsx`
- `packages/flux-react/src/field-frame.tsx`
- `packages/flux-react/src/use-node-source-props.ts`
- focused tests and docs/log sync

### Out Of Scope

- Plan 75 / 77 landed slices
- `RenderNodes` blanket memoization

## Execution Plan

### Phase 1 - Node Renderer Duplicate Work Removal

Status: planned
Targets: `packages/flux-react/src/node-renderer.tsx`

- [ ] reuse selector-produced `resolvedProps` instead of calling `resolveNodeProps()` twice
- [ ] remove repeated post-`resolvedMeta` normalization when no new transform exists

Exit Criteria:

- [ ] `NodeRendererResolved` no longer resolves equivalent node props twice per render path
- [ ] final meta construction no longer repeats already-computed normalization

### Phase 2 - Lifecycle And Hook Stability

Status: planned
Targets: `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-effects.ts`, `packages/flux-react/src/hooks.ts`

- [ ] decouple lifecycle mount/unmount dispatch from wide `helpers` identity churn
- [ ] stabilize only the still-unfixed `hooks.ts` `subscribe` / `getSnapshot` call sites

Exit Criteria:

- [ ] helper identity churn no longer widens lifecycle dispatch triggers
- [ ] named audited hooks keep stable subscription closure identity when their owner store/scope is unchanged

### Phase 3 - Broad Replace Guard And Residual Churn Cleanup

Status: planned
Targets: `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/field-frame.tsx`, `packages/flux-react/src/use-node-source-props.ts`

- [ ] add a cheap no-op guard before page-wide replace publish on equivalent `props.data`
- [ ] hoist `FieldFrame` static allocation points that still churn each render
- [ ] replace no-op ref sync effects in `use-node-source-props.ts`

Exit Criteria:

- [ ] equivalent `props.data` refreshes do not broad-publish `paths: ['*']`
- [ ] `FieldFrame` no longer recreates static `sourceKinds` literals in render
- [ ] `use-node-source-props.ts` no longer uses post-commit effects only to mirror refs

### Phase 4 - Focused Verification And Docs Sync

Status: planned
Targets: focused tests, `docs/analysis/2026-04-16-performance-audit.md`, `docs/logs/`

- [ ] add focused tests for node renderer reuse, lifecycle dispatch stability, and schema data replace guard
- [ ] reverse-update audit/log text for closed items

Exit Criteria:

- [ ] focused tests cover the high-risk behavior changes
- [ ] audit/log reflect the landed baseline

## Validation Checklist

- [ ] duplicate node-props resolution removed
- [ ] duplicate meta normalization removed
- [ ] lifecycle dispatch stabilized against helper churn
- [ ] audited hooks no longer recreate unfixed subscription closures unnecessarily
- [ ] broad page replace guard added
- [ ] residual `FieldFrame` / `use-node-source-props` churn cleaned up
- [ ] focused verification completed
- [ ] independent closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: complete this section only after all residual `flux-react` hot-path defects listed above are closed without reopening Plan 75 or 77 landings.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- if further profiling proves `RenderNodes` memoization is needed, create a separate measured successor plan
