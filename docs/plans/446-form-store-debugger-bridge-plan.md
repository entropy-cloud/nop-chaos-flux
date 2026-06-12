# 446 Form Store Debugger Bridge Plan

> Plan Status: planned
> Last Reviewed: 2026-06-12
> Source: `docs/architecture/form-store-diagnostics.md`, `docs/architecture/debugger-runtime.md`, `docs/plans/445-form-store-diagnostics-and-debugger-bridge-plan.md`
> Related: `docs/plans/445-form-store-diagnostics-and-debugger-bridge-plan.md`

## Purpose

Consume the runtime-owned form-store diagnostics surface from debugger automation and any diagnostics page entrypoints without changing runtime ownership or reopening the form-store commit truth contract landed by plan 445.

## Current Baseline

- Runtime-owned form-store diagnostics live behind explicit `FormStoreApi` session controls and bounded snapshots.
- Projected/public store wrappers translate diagnostics paths into their consumer-visible coordinate space.
- `nop-debugger` does not yet expose a first-class automation API for form-store diagnostics snapshots.

## Goals

- Define and land the minimum debugger automation bridge for bounded form-store diagnostics snapshots.
- Keep debugger consumption downstream of runtime-owned capture and session semantics.

## Non-Goals

- Re-owning store capture inside debugger.
- Expanding v1 beyond form-store diagnostics into generic store tracing.

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`

## Execution Plan

### Phase 1 - Debugger Bridge

Status: planned
Targets: `packages/nop-debugger/`, relevant playground diagnostics entrypoints, owner docs

- Item Types: `Fix | Decision | Proof`

- [ ] Add a debugger automation-facing query surface for runtime-owned form-store diagnostics snapshots.
- [ ] Define how hosts select the relevant form/store owner for one diagnostics scenario.
- [ ] Add focused automated proof for bridge behavior and bounded payload semantics.

Exit Criteria:

- [ ] Debugger automation can query runtime-owned form-store diagnostics without DOM scraping.
- [ ] Related docs reflect the bridge surface without re-owning runtime capture.
- [ ] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [ ] Runtime-owned capture remains the only source of form-store commit truth.
- [ ] Debugger automation bridge is explicit and bounded.
- [ ] Focused automated proof covers the supported bridge path.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: pending

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- no remaining plan-owned work once the debugger bridge lands
