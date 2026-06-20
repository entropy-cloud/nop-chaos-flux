# 446 Form Store Debugger Bridge Plan

> Plan Status: completed
> Last Reviewed: 2026-06-21
> Source: `docs/architecture/form-store-diagnostics.md`, `docs/architecture/debugger-runtime.md`, `docs/plans/445-form-store-diagnostics-and-debugger-bridge-plan.md`
> Related: `docs/plans/445-form-store-diagnostics-and-debugger-bridge-plan.md`

## Purpose

Consume the runtime-owned form-store diagnostics surface from debugger automation and any diagnostics page entrypoints without changing runtime ownership or reopening the form-store commit truth contract landed by plan 445.

## Current Baseline

- Runtime-owned form-store diagnostics live behind explicit `FormStoreApi` session controls and bounded snapshots.
- Projected/public store wrappers translate diagnostics paths into their consumer-visible coordinate space.
- `nop-debugger` now exposes a first-class automation API for form-store diagnostics snapshots via a runtime-owned `FormStoreDiagnosticsBridge`.

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

Status: completed
Targets: `packages/nop-debugger/`, `packages/flux-core/src/types/`, `packages/flux-runtime/src/`, relevant playground diagnostics entrypoints, owner docs

- Item Types: `Fix | Decision | Proof`

- [x] Add a debugger automation-facing query surface for runtime-owned form-store diagnostics snapshots.
- [x] Define how hosts select the relevant form/store owner for one diagnostics scenario.
- [x] Add focused automated proof for bridge behavior and bounded payload semantics.

Exit Criteria:

- [x] Debugger automation can query runtime-owned form-store diagnostics without DOM scraping.
- [x] Related docs reflect the bridge surface without re-owning runtime capture.
- [x] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [x] Runtime-owned capture remains the only source of form-store commit truth.
- [x] Debugger automation bridge is explicit and bounded.
- [x] Focused automated proof covers the supported bridge path.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: The minimum debugger bridge lands as a runtime-owned `FormStoreDiagnosticsBridge` exposed by `RendererRuntime.getFormStoreDiagnosticsBridge()` and forwarded by the debugger automation API (`listFormStoreDiagnosticsOwners`, `startFormStoreDiagnosticsSession`, `stopFormStoreDiagnosticsSession`, `clearFormStoreDiagnosticsSession`, `getFormStoreDiagnosticsSnapshot`). Owner selection is explicit (`formId` / `formName` / `scopeId`); empty queries resolve only when exactly one form owner exists so that automation never silently picks the wrong owner. The bridge does not own capture — every session control forwards to the underlying `FormStoreApi` session, preserving the runtime-owned commit-truth contract landed by plan 445. Focused proof covers owner selection, session forwarding, bounded retention, and downstream debugger forwarding.

Closure Audit Evidence:

- Reviewer / Agent: executing agent (same session — independent closure audit recommended before any further contract drift)
- Evidence:
  - Implementation: `packages/flux-core/src/types/runtime.ts` (bridge types), `packages/flux-core/src/types/renderer-core.ts` (`getFormStoreDiagnosticsBridge?`), `packages/flux-runtime/src/form-store-diagnostics-bridge.ts` (factory), `packages/flux-runtime/src/runtime-factory.ts` (wiring), `packages/flux-runtime/src/index.ts` (export), `packages/nop-debugger/src/{types,automation,controller}.ts` (debugger API), `packages/nop-debugger/src/{automation,panel}.test-support.ts` (test stubs).
  - Proof: `packages/flux-runtime/src/__tests__/form-store-diagnostics-bridge.test.ts` (12 tests), `packages/flux-runtime/src/__tests__/runtime-form-store-diagnostics-bridge.test.ts` (6 tests), `packages/nop-debugger/src/controller-form-store-diagnostics-bridge.test.ts` (4 tests).
  - Owner docs: `docs/architecture/form-store-diagnostics.md` (Integration With nop-debugger), `docs/architecture/debugger-runtime.md` (Automation API + Current store-diagnostics routing baseline).
  - Verification: `pnpm typecheck` = 49/49, `pnpm build` = 26/26, `pnpm lint` = 26/26, `pnpm test` = 49 tasks full green. Recorded in `docs/logs/2026/06-21.md`.

Follow-up:

- no remaining plan-owned work once the debugger bridge lands
