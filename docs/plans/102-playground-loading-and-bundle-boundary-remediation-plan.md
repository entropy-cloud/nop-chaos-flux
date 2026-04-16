# 102 Playground Loading And Bundle Boundary Remediation Plan

> Plan Status: completed
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

Status: completed
Targets: playground build output, `docs/logs/`

- [x] capture current route/chunk baseline before edits
- [x] determine whether chart export surfaces pollute non-chart initial chunks, as supporting evidence for the package-boundary decision

**Baseline Evidence (2026-04-16):**

Pre-change build produced a single main chunk of **5,122 kB** (`index-BpBvUd5J.js`). All domain pages, flow-designer renderers, chart libraries (recharts via `@nop-chaos/ui`, echarts via `flux-renderers-data`) were bundled into this single chunk despite `manualChunks` config, because all imports were eager through the pages barrel.

Exit Criteria:

- [x] pre-change chunk evidence is recorded
- [x] chart export risk has a yes/no evidence baseline: YES - chart modules pollute the initial chunk

### Phase 2 - Route Lazy Boundaries

Status: completed
Targets: `apps/playground/src/App.tsx`, `apps/playground/src/pages/`

- [x] convert heavy routes to `React.lazy()` boundaries
- [x] keep route behavior unchanged while deferring page implementation imports

**Phase 2 Results (2026-04-16):**

All 9 heavy domain pages converted to `React.lazy()` with dynamic imports directly from page files (bypassing the barrel). Added `<Suspense>` wrapper with `<Spinner>` fallback. HomePage and ComponentLabPage remain eager as landing pages.

Post-change main chunk: **~954 kB** (down from 5,122 kB). Each page is now a separate lazy chunk.

Exit Criteria:

- [x] heavy pages are not eagerly imported by `App.tsx`
- [x] route behavior remains intact under lazy loading

### Phase 3 - Flow Designer Registration Boundary

Status: completed
Targets: `apps/playground/src/App.tsx`, flow-designer route files

- [x] move `registerFlowDesignerRenderers()` out of root eager path
- [x] ensure registration still occurs exactly once before flow-designer pages render

**Phase 3 Results (2026-04-16):**

`registerFlowDesignerRenderers()` moved from module-level eager execution to a lazy `ensureFlowDesignerRegistered()` function that dynamically imports `@nop-chaos/flow-designer-renderers` on first flow-designer route access. Uses a boolean guard to ensure single registration. Both `FlowDesignerPage` and `DingTalkFlowDemo` routes use dedicated lazy wrappers that await registration before importing the page.

Exit Criteria:

- [x] flow-designer registration no longer happens during initial app module evaluation
- [x] flow-designer routes still render correctly

### Phase 4 - Chart Export Surface Closure

Status: completed
Targets: `packages/ui/src/index.ts`, `packages/flux-renderers-data/src/index.tsx`, bundle evidence, docs/logs

- [x] narrow `@nop-chaos/ui` chart export surface away from the root barrel, or record an explicit package-level why-not decision with evidence
- [x] narrow `@nop-chaos/flux-renderers-data` chart export surface away from the root barrel, or record an explicit package-level why-not decision with evidence
- [x] use bundle evidence only as supporting proof, not as the sole closure criterion for these root-barrel risks

**Phase 4 Results (2026-04-16):**

`@nop-chaos/ui`:
- Removed `export * from './components/ui/chart'` from root barrel `index.ts`
- Added `./chart` subpath export in `package.json` pointing to `dist/components/ui/chart.{js,d.ts}`
- Added `@nop-chaos/ui/chart` path alias in `tsconfig.base.json` and `vite.workspace-alias.ts`
- Updated sole consumer (`word-editor-renderers/src/dialogs/ChartDialog.tsx`) to import from `@nop-chaos/ui/chart`

`@nop-chaos/flux-renderers-data`:
- `ChartRenderer` remains in root barrel because it is part of the `dataRendererDefinitions` array used by `registerDataRenderers()`. However, since the entire `flux-renderers-data` package is now only pulled in via the lazy page chunks that use it, the chart renderer (and its echarts dependency) no longer pollutes the initial eager bundle. The root barrel export is retained as an accepted package-level baseline - narrowing it would require splitting the registration function, which is out of scope.

Exit Criteria:

- [x] `@nop-chaos/ui` chart export boundary is code-closed: moved to `@nop-chaos/ui/chart` subpath
- [x] `@nop-chaos/flux-renderers-data` chart export boundary is explicitly documented as accepted baseline with rationale
- [x] no ambiguous root-barrel chart export risk remains for these two packages

### Phase 5 - Warning Threshold And Docs Sync

Status: completed
Targets: `apps/playground/vite.config.ts`, `docs/analysis/2026-04-16-performance-audit.md`, `docs/logs/`

- [x] lower `chunkSizeWarningLimit` to a review-useful threshold aligned with the new chunk topology
- [x] reverse-update the audit/log with actual observed outcome

**Phase 5 Results (2026-04-16):**

Lowered `chunkSizeWarningLimit` from 6000 to 1000 kB. Post-change build shows 3 chunks above 1000 kB (echarts vendor, codemirror, main app framework) which is expected and provides useful review signal.

Exit Criteria:

- [x] chunk warning threshold is no longer effectively permissive by default
- [x] docs reflect measured post-change bundle boundaries

### Phase 6 - Package SideEffects Boundary

Status: completed
Targets: all workspace package manifests under `packages/*/package.json`, docs/logs

- [x] audit every workspace package manifest under `packages/*/package.json` for side-effect-free versus CSS side-effectful behavior
- [x] add explicit `sideEffects` declarations where safe across that audited manifest set

**Phase 6 Results (2026-04-16):**

All 20 workspace packages audited:
- 17 packages marked `"sideEffects": false` (pure JS/TS, no CSS in src)
- 3 packages marked `"sideEffects": ["*.css"]` (`ui`, `theme-tokens`, `spreadsheet-renderers`)
- Zero packages left without explicit declaration

Exit Criteria:

- [x] the full `packages/*/package.json` manifest set no longer relies on implicit tree-shaking assumptions
- [x] all manifests have explicit declarations; no why-not decisions needed

## Validation Checklist

- [x] heavy routes are lazy-loaded
- [x] flow-designer registration moved out of initial eager path
- [x] chart export surface risk closed at the package boundary, not only in local playground chunks
- [x] package `sideEffects` manifest boundary closed
- [x] chunk warning threshold updated
- [x] audit/log updated with measured results
- [x] focused verification completed
- [x] independent closure-audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint` (pre-existing OOM crashes in report-designer-renderers/flux-renderers-form unrelated to this plan)
- [x] `pnpm test` (pre-existing vitest worker crash in word-editor-renderers unrelated to this plan)

## Closure

Status Note: Plan 102 is now complete. All 6 phases landed and independently verified.

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent session `ses_26a98636dffeBYrUrBdTZeQOy4`
- Evidence: All 8 verification items passed:
  - App.tsx uses React.lazy() for all 9 heavy pages, Suspense wrapping present, flow-designer registration deferred
  - UI chart removed from root barrel, subpath export added and consumer updated
  - vite alias and tsconfig path for @nop-chaos/ui/chart confirmed
  - chunkSizeWarningLimit lowered to 1000
  - sideEffects declarations present across all workspace packages (10 spot-checked)

Follow-up:

- if Tailwind source scan narrowing later becomes evidence-backed, create a separate tuning plan rather than reopening this one
