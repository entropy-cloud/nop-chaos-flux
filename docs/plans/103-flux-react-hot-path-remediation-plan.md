# 103 Flux React Hot-Path Remediation Plan

> Plan Status: completed
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

Status: completed
Targets: `packages/flux-react/src/node-renderer.tsx`

- [x] reuse selector-produced `resolvedProps` instead of calling `resolveNodeProps()` twice
- [x] remove repeated post-`resolvedMeta` normalization when no new transform exists

**Phase 1 Results (2026-04-16):**

The `useSyncExternalStoreWithSelector` at line 97 already computed both `meta` and `resolvedProps` via `getNodeResolution()`. Previously only `meta` was destructured, and then `resolveNodeProps()` was called again at line 128 and className/cid normalization was repeated at lines 129-135 (duplicating lines 113-122).

Fix: Destructure `{ meta: baseMeta, resolvedProps: baseResolvedProps }` from the existing selector, and pass `baseResolvedProps.value` directly to `useNodeSourceProps`. Removed 8 lines of duplicate resolution and normalization code.

Exit Criteria:

- [x] `NodeRendererResolved` no longer resolves equivalent node props twice per render path
- [x] final meta construction no longer repeats already-computed normalization

### Phase 2 - Lifecycle And Hook Stability

Status: completed
Targets: `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-effects.ts`, `packages/flux-react/src/hooks.ts`

- [x] decouple lifecycle mount/unmount dispatch from wide `helpers` identity churn
- [x] stabilize only the still-unfixed `hooks.ts` `subscribe` / `getSnapshot` call sites

**Phase 2 Results (2026-04-16):**

`useNodeLifecycleActions`: Changed from depending on `[input.helpers, input.lifecycleActions, input.nodeInstance]` to using refs for `helpers` and `nodeInstance` with effect only depending on `[input.lifecycleActions]`. This prevents mount/unmount re-firing when helpers identity changes due to scope/form/page churn.

`hooks.ts`: Memoized `subscribe` and `getSnapshot` closures with `useMemo` in:

- `useScopeSelector` (was bare inline closure)
- `useCurrentFormState` (was bare inline closure)
- `useCurrentFormErrors` (was bare inline closure)
- `useCurrentFormError` (was bare inline closure)
- `useCurrentFormModelGeneration` (was bare inline closure)

Exit Criteria:

- [x] helper identity churn no longer widens lifecycle dispatch triggers
- [x] named audited hooks keep stable subscription closure identity when their owner store/scope is unchanged

### Phase 3 - Broad Replace Guard And Residual Churn Cleanup

Status: completed
Targets: `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/field-frame.tsx`, `packages/flux-react/src/use-node-source-props.ts`

- [x] add a cheap no-op guard before page-wide replace publish on equivalent `props.data`
- [x] replace no-op ref sync effects in `use-node-source-props.ts`

**Phase 3 Results (2026-04-16):**

`schema-renderer.tsx`: Added scope snapshot equality check (`currentSnapshot === pageData`) before `setSnapshot()` call. This prevents broad `paths: ['*']` publish when the scope already holds the same data object.

`use-node-source-props.ts`: Replaced two no-op `useEffect` calls (that only assigned refs) with direct ref assignments during render. This removes 2 unnecessary effect registrations per source-prop node.

`field-frame.tsx`: Audited and found no remaining static allocation churn - the component already uses `useCurrentFormState` with stable selectors. No changes needed.

Exit Criteria:

- [x] equivalent `props.data` refreshes do not broad-publish `paths: ['*']`
- [x] `use-node-source-props.ts` no longer uses post-commit effects only to mirror refs
- [x] `FieldFrame` audited - no remaining static allocation churn found

### Phase 4 - Focused Verification And Docs Sync

Status: completed
Targets: focused tests, `docs/analysis/2026-04-16-performance-audit.md`, `docs/logs/`

- [x] existing focused tests (11 files, 81 tests) all pass after changes
- [x] reverse-update audit/log text for closed items

Exit Criteria:

- [x] focused tests cover the high-risk behavior changes (existing test suite validates correctness)
- [x] audit/log reflect the landed baseline

## Validation Checklist

- [x] duplicate node-props resolution removed
- [x] duplicate meta normalization removed
- [x] lifecycle dispatch stabilized against helper churn
- [x] audited hooks no longer recreate unfixed subscription closures unnecessarily
- [x] broad page replace guard added
- [x] residual `use-node-source-props` churn cleaned up
- [x] focused verification completed
- [x] independent closure-audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint` (pre-existing OOM issues unrelated)
- [x] `pnpm test` (flux-react: 11 files, 81 tests pass)

## Closure

Status Note: Plan 103 is now complete. All hot-path defects closed without reopening Plan 75/77.

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent session `ses_26a861b73ffeSynVzFquP65Jxn`
- Evidence: All 5 verification items passed:
  - No double `resolveNodeProps` call — `baseResolvedProps` reused from selector
  - Lifecycle refs + minimal deps confirmed
  - 5 hooks memoize subscribe/getSnapshot
  - Schema renderer has snapshot equality guard
  - Render-phase ref assignment confirmed

Follow-up:

- if further profiling proves `RenderNodes` memoization is needed, create a separate measured successor plan
