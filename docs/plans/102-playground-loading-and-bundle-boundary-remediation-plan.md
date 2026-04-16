# 102 Playground Loading And Bundle Boundary Remediation Plan

> Plan Status: planned
> Last Reviewed: 2026-04-16
> Source: `docs/analysis/2026-04-16-performance-audit.md` sections 1.1-1.6, `docs/architecture/performance-design-requirements.md`
> Related: `docs/plans/101-performance-audit-closure-and-owner-assignment-plan.md`, `docs/plans/75-reaction-and-renderer-perf-fix-plan.md`, `docs/plans/77-renderer-hot-path-perf-and-memory-continuation-plan.md`

## Purpose

收口 playground initial path 上仍成立的 eager-loading / bundle-boundary defects，并在 package boundary 层面关闭 chart export surface 风险。

## Current Baseline

- `apps/playground/src/App.tsx` 仍从 root page barrel eager import 大部分 domain pages。
- `registerFlowDesignerRenderers()` 仍在 app root eager path 执行。
- `@nop-chaos/ui` root barrel 和 `@nop-chaos/flux-renderers-data` root export surface 仍暴露 chart modules；这两个问题的真正 owner surface 是 package-level root export boundary，而不只是 playground 本地 chunk 结果。
- `packages/*/package.json` workspace package manifests 仍未系统声明 `sideEffects`，tree-shaking boundary 仍缺少显式 package-level hint。
- `chunkSizeWarningLimit` 仍处于过宽松阈值。

## Goals

- 将 heavy playground routes 改为 route-level lazy boundaries。
- 把 flow-designer renderer registration 移出 initial eager path。
- 通过 package-level export boundary narrowing 收口 chart export surface 风险；bundle evidence 只作为辅助证明，不单独构成 closure 依据。
- 收口 package manifest `sideEffects` 缺失问题。
- 将 Vite chunk warning threshold 调回有审查价值的范围。

## Non-Goals

- 不处理 `1.7` Tailwind source scan tuning。
- 不改动 route semantics 或页面内容本身。
- 不在本计划中做 chart renderer 内部行为优化。

## Scope

### In Scope

- `apps/playground/src/App.tsx`
- `apps/playground/src/pages/`
- `packages/ui/src/index.ts`
- `packages/flux-renderers-data/src/index.tsx`
- all workspace package manifests under `packages/*/package.json`
- `apps/playground/vite.config.ts`
- bundle verification evidence and docs/log updates

### Out Of Scope

- Tailwind source scan narrowing
- runtime/render hot-path optimization

## Execution Plan

### Phase 1 - Baseline Bundle Evidence

Status: planned
Targets: playground build output, `docs/logs/`

- [ ] capture current route/chunk baseline before edits
- [ ] determine whether chart export surfaces pollute non-chart initial chunks, as supporting evidence for the package-boundary decision

Exit Criteria:

- [ ] pre-change chunk evidence is recorded
- [ ] chart export risk has a yes/no evidence baseline

### Phase 2 - Route Lazy Boundaries

Status: planned
Targets: `apps/playground/src/App.tsx`, `apps/playground/src/pages/`

- [ ] convert heavy routes to `React.lazy()` boundaries
- [ ] keep route behavior unchanged while deferring page implementation imports

Exit Criteria:

- [ ] heavy pages are not eagerly imported by `App.tsx`
- [ ] route behavior remains intact under lazy loading

### Phase 3 - Flow Designer Registration Boundary

Status: planned
Targets: `apps/playground/src/App.tsx`, flow-designer route files

- [ ] move `registerFlowDesignerRenderers()` out of root eager path
- [ ] ensure registration still occurs exactly once before flow-designer pages render

Exit Criteria:

- [ ] flow-designer registration no longer happens during initial app module evaluation
- [ ] flow-designer routes still render correctly

### Phase 4 - Chart Export Surface Closure

Status: planned
Targets: `packages/ui/src/index.ts`, `packages/flux-renderers-data/src/index.tsx`, bundle evidence, docs/logs

- [ ] narrow `@nop-chaos/ui` chart export surface away from the root barrel, or record an explicit package-level why-not decision with evidence
- [ ] narrow `@nop-chaos/flux-renderers-data` chart export surface away from the root barrel, or record an explicit package-level why-not decision with evidence
- [ ] use bundle evidence only as supporting proof, not as the sole closure criterion for these root-barrel risks

Exit Criteria:

- [ ] `@nop-chaos/ui` chart export boundary is code-closed or explicitly documented as an accepted package-level baseline with owner rationale and evidence
- [ ] `@nop-chaos/flux-renderers-data` chart export boundary is code-closed or explicitly documented as an accepted package-level baseline with owner rationale and evidence
- [ ] no ambiguous root-barrel chart export risk remains for these two packages

### Phase 5 - Warning Threshold And Docs Sync

Status: planned
Targets: `apps/playground/vite.config.ts`, `docs/analysis/2026-04-16-performance-audit.md`, `docs/logs/`

- [ ] lower `chunkSizeWarningLimit` to a review-useful threshold aligned with the new chunk topology
- [ ] reverse-update the audit/log with actual observed outcome

Exit Criteria:

- [ ] chunk warning threshold is no longer effectively permissive by default
- [ ] docs reflect measured post-change bundle boundaries

### Phase 6 - Package SideEffects Boundary

Status: planned
Targets: all workspace package manifests under `packages/*/package.json`, docs/logs

- [ ] audit every workspace package manifest under `packages/*/package.json` for side-effect-free versus CSS side-effectful behavior
- [ ] add explicit `sideEffects` declarations where safe across that audited manifest set

Exit Criteria:

- [ ] the full `packages/*/package.json` manifest set no longer relies on implicit tree-shaking assumptions
- [ ] any manifest left unchanged in that set has a documented why-not decision

## Validation Checklist

- [ ] heavy routes are lazy-loaded
- [ ] flow-designer registration moved out of initial eager path
- [ ] chart export surface risk closed at the package boundary, not only in local playground chunks
- [ ] package `sideEffects` manifest boundary closed
- [ ] chunk warning threshold updated
- [ ] audit/log updated with measured results
- [ ] focused verification completed
- [ ] independent closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: complete this section only after route loading, flow-designer registration, chart export boundaries, package `sideEffects`, and chunk warning threshold are all closed with code or explicit documented owner decisions backed by evidence.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- if Tailwind source scan narrowing later becomes evidence-backed, create a separate tuning plan rather than reopening this one
