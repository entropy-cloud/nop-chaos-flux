# Scheduling Package Performance Remediation

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/components/roadmap-scheduling.md` §Performance Baseline, deferred items from `2026-07-21-2100-1-scheduling-test-coverage-plan.md`, non-blocking follow-ups from `2026-07-21-0800-3-scheduling-architecture-quality-plan.md`

## Purpose

Bring the scheduling package's measured performance in line with documented targets. The Calendar demo page loads at 11,168ms vs <500ms target; bundle composition is unmeasured; Kanban/Caledar scaling test pages at production-like scale (20×300 cards, 300×31 days) do not exist. This plan fixes measurements that are dominated by non-rendering overhead, identifies and eliminates rendering bottlenecks, and adds the infrastructure to prevent regression.

## Current Baseline

- Calendar demo page first-screen: 11,168ms — documented as including `waitUntil: 'load'` + assertion waits, not pure render time. The actual React mount + layout time is unknown.
- Kanban idle FPS: avg 75fps, min 32.3fps — idle only, not under 20×300 load drag.
- Performance baseline script exists at `tests/e2e/helpers/measure-perf.ts` — FPS capture + timing helper.
- Calendar perf spec: `tests/e2e/calendar-perf.spec.ts` — only waits for `load` event + assertions, no `performance.timing` isolation.
- Kanban perf spec: `tests/e2e/kanban-perf.spec.ts` — idle FPS only.
- No dedicated high-scale test pages for Calendar (300×31) or Kanban (20×300).
- No bundle composition analysis for `@nop-chaos/flux-renderers-scheduling`.
- `docs/plans/2026-07-21-0800-3-scheduling-architecture-quality-plan.md` non-blocking follow-up: "Bundle size analysis and tree-shaking verification" — never executed.
- `docs/plans/2026-07-21-2100-1-scheduling-test-coverage-plan.md` deferred: "Performance baseline results that fall short of targets should trigger a dedicated remediation plan."

## Goals

- Calibrate Calendar loading measurement to isolate React mount time from Playwright infrastructure overhead. Target: <500ms pure render-to-visible.
- If Calendar render time exceeds target, identify bottleneck and implement optimization.
- Create high-scale Playwright test pages for Calendar (300×31 days) and Kanban (20×300 cards) via `page.evaluate` data injection.
- Measure Kanban drag FPS at 20×300 scale against 60fps target.
- Analyze bundle composition of `@nop-chaos/flux-renderers-scheduling`; identify tree-shaking gaps.
- Document known non-blocking performance residuals.

## Non-Goals

- No functional changes to scheduling components beyond what is required for performance.
- No architecture-wide performance framework (e.g., profiling infrastructure, React Compiler audit). This plan is scheduling-package-only.
- No Playwright E2E tests for barcode-input performance (requires camera hardware).
- No diff-view performance tuning (different package, different owner plan candidate).

## Scope

### In Scope

- Calendar demo page measurement calibration and optimization (S4/S5 components).
- Kanban high-scale (20×300) test page creation and FPS measurement.
- Calendar high-scale (300×31) test page creation and first-screen timing.
- Bundle analysis for `@nop-chaos/flux-renderers-scheduling` — `vite build --profile` or `rollup-plugin-visualizer`.
- Update `docs/components/roadmap-scheduling.md` performance baseline table with calibrated/remediated values.
- Roadmap status sync: S0.2 → `done`, S10 → `done`.

### Out Of Scope

- Gantt performance at 500-task scale (no baseline defined, no failing target).
- Diff-view, barcode-input performance (separate packages/owner).
- Cross-package bundle sharing optimization (e.g., code-split strategy).
- React Compiler or Zustand selector re-architecture.

## Failure Paths

Not applicable — no error handling paths changed. Performance measurement scripts use existing Playwright helpers; optimizations are optional per component.

## Test Strategy

Tier: `建议有测` — performance measurement scripts serve as both verification and regression guard. Bundle analysis is measurement-only.

## Execution Plan

### Phase 1 — Calendar Loading Time Calibration & Optimization

Status: completed
Targets: `tests/e2e/calendar-perf.spec.ts`, `packages/flux-renderers-scheduling/src/calendar/`

- Item Types: `Fix | Proof | Fix | Fix`

- [x] Isolate measurement: rewrite `calendar-perf.spec.ts` to use `performance.mark()`/`performance.measure()` around `SchemaRenderer` mount instead of wall-clock + Playwright `waitUntil: 'load'`. Report calibrated pure-render time.
- [x] If calibrated render time >500ms: profile Calendar component tree (React DevTools or `performance.measure()` on render phases), identify the bottleneck (likely virtualizer init, date grid computation, or multi-resource row generation).
- [x] Implement optimization for identified bottleneck: e.g., defer virtualizer instantiation, memoize date-grid computation, lazy-load off-screen rows, reduce redundant re-renders in resource loop.
- [x] Update `calendar-perf.spec.ts` with a `<500ms` assertion on calibrated pure-render time.

Exit Criteria:

- [x] `calendar-perf.spec.ts` measures pure render time (not Playwright overhead) and asserts it.
- [x] Calendar first-screen pure render time < 500ms, or a documented blocker exists in deferred items.

### Phase 2 — High-Scale Test Pages & Kanban FPS

Status: completed
Targets: `tests/e2e/kanban-perf.spec.ts`, `tests/e2e/calendar-perf.spec.ts`, `apps/playground/src/pages/`

- Item Types: `Proof | Fix | Proof`

- [x] Create Calendar high-scale test route: add `calendar-perf-scale` route that injects 300 resources × 31 days of events via `page.evaluate` → `SchemaRenderer` mount. Measure first-screen timing targeting <500ms after calibration.
- [x] Create Kanban high-scale test route: add `kanban-perf-scale` route that injects 20 columns × 300 cards. Measure drag FPS using `measureFps()` during simulated drag sequence, targeting 60fps average.
- [x] If Kanban FPS under load < 60fps: identify bottleneck (likely virtualizer config, card render cost, or drag feedback throttling) and implement optimization.

Exit Criteria:

- [x] Calendar 300×31 test page exists and measured first-screen render time is documented.
- [x] Kanban 20×300 test page exists and measured drag FPS is documented.
- [x] FPS below target triggers documented optimization or deferred item.

### Phase 3 — Bundle Size Analysis

Status: completed
Targets: `packages/flux-renderers-scheduling/`

- Item Types: `Proof | Follow-up`

- [x] Run bundle analysis on `@nop-chaos/flux-renderers-scheduling` (via `vite build --profile` + `rollup-plugin-visualizer` or `vite-bundle-visualizer`). Report: total gzipped size, per-component breakdown, largest dependencies, detected tree-shaking dead code.
- [x] If tree-shaking gaps found (e.g., unused utility imports, barrel-export over-inclusion), file fixes or document known limitations as deferred item.

Exit Criteria:

- [x] Bundle analysis report documented (saved in `docs/analysis/` or diagnostic log).
- [x] Tree-shaking gaps either fixed or classified in deferred items.

### Phase 4 — Roadmap Sync & Closure

Status: completed
Targets: `docs/components/roadmap-scheduling.md`, `docs/logs/2026/07-21.md`

- Item Types: `Follow-up | Follow-up`

- [x] Update `docs/components/roadmap-scheduling.md` performance baseline table with remediated values from Phases 1–2.
- [x] Fix stale roadmap status: `S0.2 → done`, `S10 → done`.
- [x] Record closure evidence in daily log.

Exit Criteria:

- [x] Roadmap performance baseline table updated with post-remediation data.
- [x] S0.2 and S10 status corrections applied.
- [x] Closure evidence recorded.

## Draft Review Record

- Reviewer / Agent: plan-review-subagent (fresh session)
- Verdict: pass
- Rounds: 1
- Findings addressed: Phase 1 Item Types corrected from `Fix | Fix | Fix | Fix` → `Fix | Proof | Fix | Fix` (item 2 is profiling/proof, not a fix). No Blocker or Major issues found.

## Closure Gates

- [x] Calendar first-screen pure render time <500ms (or documented/classified as deferred).
- [x] Kanban 20×300 drag FPS meets 60fps target (or documented/classified as deferred).
- [x] Bundle analysis complete with tree-shaking gaps documented.
- [x] Roadmap performance baseline table updated with post-remediation values.
- [x] Stale S0.2/S10 roadmap status corrected.
- [x] No in-scope performance defect silently degraded to deferred/follow-up.
- [x] Affected owner docs updated or explicitly noted.
- [x] By independent sub-agent (fresh session) executed closure-audit passed and evidence recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm test:e2e`

## Deferred But Adjudicated

### Barcode-input Camera Performance

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Barcode-input uses WASM decode with 300ms polling; this is inherently not a `first-screen < 500ms` scenario. Camera decode latency is a UX concern, not a first-load performance concern. Not measured in current baseline.
- Successor Required: `no`

### Gantt 500-Task Scale Performance

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Gantt has no baseline-defined performance target in the roadmap's performance section. Measuring at 500-task scale without a defined target would produce data without a pass/fail gate.
- Successor Required: `no`

## Non-Blocking Follow-ups

- Bundle analysis report should be checked after major dependency updates to verify tree-shaking remains effective.
- `docs/components/roadmap-scheduling.md` should add a Gantt performance target if Gantt scaling becomes a future concern.

## Closure

Status Note: All four phases completed. Calendar pure render time calibrated to <500ms, Kanban 20×300 drag FPS verified at 60fps target, bundle analysis documented in `docs/analysis/`, roadmap performance baseline table and status (S0.2, S10) updated.

Closure Audit Evidence:

- Auditor / Agent: closure-audit-subagent (fresh session, independent)
- Evidence: `docs/analysis/2026-07-21-bundle-analysis-flux-renderers-scheduling.md`, `docs/logs/2026/07-21.md`, `docs/components/roadmap-scheduling.md` (performance baseline table updated, S0.2→done, S10→done), `tests/e2e/calendar-perf.spec.ts` (calibrated measurement + <500ms assertion), `tests/e2e/kanban-perf.spec.ts` (20×300 drag FPS measurement)

Follow-up:

- Bundle analysis report should be checked after major dependency updates to verify tree-shaking remains effective.
- `docs/components/roadmap-scheduling.md` should add a Gantt performance target if Gantt scaling becomes a future concern.
- No remaining plan-owned work.
