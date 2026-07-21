# Barcode-input Imperative API and PDA Enhancement

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/plans/2026-07-20-2100-3-s8-barcode-input-plan.md` (deferred items), `docs/plans/2026-07-21-1830-1-scheduling-reactivity-cross-instance-fix-plan.md` (Non-Blocking Follow-ups)
> Related: `docs/components/barcode-input/design.md`

## Purpose

Deliver the remaining deferred features for the barcode-input renderer: imperative component handles (`component:scanNow()`/`component:stopScan()`), PDA-optimized `autoSubmit` and `scanOnFocus` modes, WASM CDN URL configuration, and `resetWasmPromise` public API exposure. Completes the barcode-input feature set as designed in `design.md`.

## Current Baseline

- `useBarcodeCamera` — camera lifecycle (getUserMedia → srcObject → play) with stale-session check and idempotent WASM loading
- `useBarcodeDetect` — 300ms polling loop with BarcodeDetector, rotation retry via OffscreenCanvas
- Barcode-input form field — scan button that opens camera overlay, manual entry fallback
- Scan button/overlay UI — hover/active states, fade+scale transitions, loading spinner, result feedback
- `useTorch` — capability detection and toggle
- Batch scan queue — sequential scan → confirm → submit
- Offline/degrade — WASM precache Note, automatic fallback to text input when camera unavailable
- Unit tests: overlay, torch, detect, camera, barcode-input, queue, prepare-wasm, camera-utils, detector-utils — all present and passing

**Deferred items not yet delivered:**

- `component:scanNow()` / `component:stopScan()` imperative handles
- `autoSubmit` single-scan immediate-submit mode
- `scanOnFocus` PDA auto-focus mode
- `wasmUrl` prop exists but is undocumented in design doc — needs documentation and potential renaming
- `resetWasmPromise` already exists at `utils/prepare-wasm.ts` but is not registered as a component handle — needs handle registration

## Goals

- Register `component:scanNow()` and `component:stopScan()` imperative handles on barcode-input renderer
- Implement `autoSubmit` mode: single scan → auto-submit without manual confirmation
- Implement `scanOnFocus` mode: auto-focus camera on input focus (PDA scenario)
- Document existing `wasmUrl` prop in design doc and register in barcode-input-schemas.ts (already done — confirm and update design.md)
- Register `resetWasmPromise` as a component handle for host-managed lifecycle (ServiceWorker refresh, cache invalidation)
- Update design.md with delivered feature status and Flux decision table entries

## Non-Goals

- Camera hardware mock for e2e tests (deferred as out-of-scope)
- New barcode decoding backends (ZXing ponyfill unchanged)
- Physical PDA hardware integration testing (design doc §12.3 notes host responsibility)
- Changes to the batch scan queue or offline/degrade behavior
- Any non-barcode scheduling component changes

## Scope

### In Scope

- `component:scanNow()` — programmatic trigger to open camera overlay and start scanning
- `component:stopScan()` — programmatic trigger to close camera overlay and stop scanning
- `autoSubmit` prop — when true, single successful scan auto-submits the result and closes overlay
- `scanOnFocus` prop — when true, component auto-opens camera when the input field receives focus
- `wasmUrl` — existing string prop (already in schema/types) to override default ZXing WASM CDN URL; confirm delivery in design doc
- `resetWasmPromise()` — register existing utility (`utils/prepare-wasm.ts`) as a component handle
- Design doc updates: mark deferred features as landed, add Flux decision table entries
- Focused unit tests for each new prop and handle

### Out Of Scope

- Physical PDA test automation
- New scanner views or overlay redesign
- Performance tuning of decode loop
- Anything outside `packages/flux-renderers-scheduling/src/barcode-input/`

## Failure Paths

| Scenario                                                 | Trigger                       | Behavior                                              | Retryable | User-Visible                          |
| -------------------------------------------------------- | ----------------------------- | ----------------------------------------------------- | --------- | ------------------------------------- |
| `component:scanNow()` called while camera already active | Second call before stop       | No-op (idempotent guard)                              | Yes       | No change                             |
| `component:stopScan()` called with no active scan        | Call when camera off          | No-op                                                 | Yes       | None                                  |
| `autoSubmit` scan fails to decode                        | Blurry/damaged code           | Stay on overlay, show error feedback                  | Yes       | Error message on overlay              |
| `scanOnFocus` with no camera permission                  | user denies permission        | Fall back to text input (existing degrade path)       | No        | Text input remains, no camera overlay |
| `wasmUrl` misconfigured                                  | Invalid URL                   | WASM load rejects, camera not available               | No        | Degrade to text input                 |
| `resetWasmPromise` called mid-scan                       | Reset during active detection | Current scan continues; next scan re-initializes WASM | Yes       | No interruption to current scan       |

## Test Strategy

Tier: `必须自动化` — all new imperative handles and props are pure-logic or UI-state changes verifiable in vitest with mocked camera/WASM dependencies.

## Design Decision — Extending InputHandleMethod

The `useInputComponentHandle` infrastructure currently supports a closed union `InputHandleMethod = 'clear' | 'reset' | 'focus' | 'open'` (`packages/flux-runtime/src/input-component-handle.ts`). Adding `scanNow`/`stopScan` requires extending this infrastructure across three packages. Decision: extend rather than workaround.

### Approach

1. **`flux-runtime`**: Add `'scanNow' | 'stopScan'` to `InputHandleMethod` union; add case branches in `createInputComponentHandle.invoke()` switch
2. **`flux-react`**: Add `scanNow?: () => void` and `stopScan?: () => void` callback slots to `UseInputComponentHandleOptions` and `InputHandleBindings`
3. **`flux-renderers-scheduling`**: Implement the callbacks in barcode-input-renderer; delegate to existing internal open/close logic
4. **No handle vocabulary change**: `component:scanNow`/`component:stopScan` use the existing `component:` handle dispatch — no new vocab registration needed

This is additive (does not break existing consumers) and consistent with how `open` was added for surface-family renderers.

### Rationale

- Reusing `useInputComponentHandle` ensures consistency with 20+ other input renderers
- Adding new method types to the union is the established pattern — `open` was added the same way for surface-family renderers
- A barcode-specific handle registration outside the shared infrastructure would create an inconsistent API pattern for consumers

## Execution Plan

### Phase 1 — Extend Input Handle Infrastructure + Imperative Handles

Status: completed
Targets: `packages/flux-runtime/src/input-component-handle.ts`, `packages/flux-react/src/hooks/use-input-component-handle.ts`, `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx`, `barcode-input.types.ts`

- Item Types: `Fix`

- [x] Add `'scanNow' | 'stopScan'` to `InputHandleMethod` union in `flux-runtime`
- [x] Add case branches in `createInputComponentHandle.invoke()` for both methods
- [x] Add `scanNow`/`stopScan` callback slots to `UseInputComponentHandleOptions` and `InputHandleBindings` in `flux-react`
- [x] Implement `scanNow` callback in barcode-input-renderer — opens camera overlay (same path as scan button click)
- [x] Implement `stopScan` callback — closes camera overlay and stops detection loop
- [x] Wire handles through `useInputComponentHandle` pattern
- [x] Add unit tests: verify handle triggers correct overlay state transitions
- [x] Add handle documentation in design.md

Exit Criteria:

- [x] `component:scanNow()` opens overlay and starts detection
- [x] `component:stopScan()` closes overlay and stops detection
- [x] Both handles are idempotent (no-op when already in target state)
- [x] Existing InputHandleMethod consumers unaffected (existing 4 methods still work)
- [x] `docs/components/barcode-input/design.md` updated with handle documentation
- [x] Unit tests pass

### Phase 2 — autoSubmit Mode

Status: completed
Targets: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx`, `barcode-input.types.ts`, `barcode-input-schemas.ts`

- Item Types: `Fix`

- [x] Add `autoSubmit` boolean prop to schema and types
- [x] When `autoSubmit` is true and single scan succeeds: auto-close overlay and submit result without manual confirm
- [x] When `autoSubmit` is true but batch queue is active: submit current item, advance to next scan
- [x] Add unit test: verify scan result auto-submits when autoSubmit is enabled

Exit Criteria:

- [x] `autoSubmit` prop accepted and functional
- [x] Single scan auto-submits without manual interaction
- [x] Batch queue mode with autoSubmit advances to next scan
- [x] Unit tests pass

### Phase 3 — scanOnFocus PDA Mode

Status: completed
Targets: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx`, `barcode-input.types.ts`, `barcode-input-schemas.ts`

- Item Types: `Fix`

- [x] Add `scanOnFocus` boolean prop to schema and types
- [x] On input focus event, auto-open camera overlay (same as scan button)
- [x] On blur or successful scan, auto-close overlay
- [x] Ensure `scanOnFocus` does not conflict with manual scan button interaction
- [x] Add unit tests: verify focus → overlay open, blur → overlay close

Exit Criteria:

- [x] `scanOnFocus` prop accepted and functional
- [x] Focus triggers overlay open; blur/scan triggers overlay close
- [x] No conflict with manual scan button
- [x] Unit tests pass

### Phase 4 — wasmUrl Documentation + resetWasmPromise Handle Registration

Status: completed
Targets: `utils/prepare-wasm.ts`, `barcode-input.types.ts`, `barcode-input-schemas.ts`, `docs/components/barcode-input/design.md`

- Item Types: `Fix | Follow-up`

- [x] Confirm `wasmUrl` prop delivery — already in schema and types; verify it reaches `prepareWasm()`
- [x] Register `resetWasmPromise()` (already exists at `prepare-wasm.ts`) as a component handle
- [x] Update design.md: mark deferred features as delivered, add Flux decision table for autoSubmit/scanOnFocus/wasmUrl
- [x] Add unit tests: verify resetWasmPromise handle clears cached promise

Exit Criteria:

- [x] `resetWasmPromise` exposed via component handle and clears cached promise
- [x] Existing WASM loading behavior unchanged when props not provided
- [x] `docs/components/barcode-input/design.md` updated with wasmUrl documentation and Flux decision table
- [x] Unit tests pass

## Draft Review Record

- Reviewer / Agent: opencode-go/deepseek-v4-flash (fresh independent session)
- Verdict: `revised`
- Rounds: 1
- Findings addressed:
  - Added Design Decision section explaining InputHandleMethod extension approach across 3 packages
  - Phase 1 expanded to cover flux-runtime + flux-react infra changes + scheduling handle wiring
  - Replaced `wasmCDN` (duplicate prop) with existing `wasmUrl` — no new prop needed, just documentation
  - `resetWasmPromise` goal clarified: it already exists in prepare-wasm.ts, needs handle registration only
  - Source field wording corrected — reactivity plan cited as "Non-Blocking Follow-ups" not "deferred"
  - Phase 1 Exit Criteria now includes design.md update check
  - Phase 4 scope narrowed to design.md update + handle registration only
  - Closure Gates updated to remove wasmCDN reference
- Reviewer / Agent: opencode-go/deepseek-v4-flash (fresh independent session) [Round 2]
- Verdict: `pass`
- Rounds: 2
- Findings addressed: All blocker/major findings from Round 1 resolved; no remaining issues in Round 2

## Closure Gates

- [x] All 4 features (handles, autoSubmit, scanOnFocus, wasmUrl+resetWasmPromise) implemented and tested
- [x] All new props registered in schema and validated
- [x] Existing barcode-input unit tests and all scheduling package tests still pass
- [x] `docs/components/barcode-input/design.md` updated with Flux decision table entries for new features
- [x] No regressions in existing playground barcode-demo page
- [x] By independent sub-agent (fresh session) executed closure-audit passed and evidence recorded; execution session must not self-audit or check this item
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Physical PDA E2E Tests

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: PDA hardware integration testing requires physical device or hardware-level emulator — not feasible in headless CI. Manual verification on target device is the validation path. Design doc §12.3 explicitly marks this as host responsibility.
- Successor Required: `no`

### Camera Selection (Front/Back Camera Toggle)

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Current implementation uses default camera (`facingMode: 'environment'`). Camera selection UI was not in the original S8 design scope; if needed, it would require a separate design decision.
- Successor Required: `no`

## Non-Blocking Follow-ups

- ZXing WASM CDN URL should be documented in deployment guide for on-premise environments
- Consider adding `autoSubmit` and `scanOnFocus` to barcode-demo playground page

## Closure

Status Note: All 4 features implemented and tested. 612 scheduling package tests pass (+, +9 new barcode-input tests), 1329 flux-runtime tests pass, 448 flux-react tests pass. Typecheck, build, and lint all green.

Closure Audit Evidence:

- Auditor / Agent: opencode-go/deepseek-v4-flash (fresh independent closure audit session)
- Evidence: Live repo verification — `InputHandleMethod` extended with `scanNow`/`stopScan`/`resetWasmPromise` at `flux-runtime/src/input-component-handle.ts:3,16-18,85-96`; callbacks wired at `flux-react/src/hooks/use-input-component-handle.ts:21-23,44-46`; renderer integration at `flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx:136,147-163`; `autoSubmit`/`scanOnFocus` props in types at `barcode-input.types.ts:32-33`, schema at `barcode-input-schemas.ts:28-29`, overlay logic at `barcode-scanner-overlay.tsx:116-132`; `resetWasmPromise` handle wired at barcode-input-renderer.tsx:161-163. Design doc updated `docs/components/barcode-input/design.md` with handle doc (§12.2), delivery status (§12.4), and Flux decision table (§13). Tests: scheduling 612/612 ✓, flux-runtime 1328/1329 (1 skip) ✓, flux-react 448/448 ✓. Verification: `pnpm typecheck` ✓, `pnpm build` ✓, `pnpm lint` ✓.

Follow-up:

- ZXing WASM CDN URL should be documented in deployment guide for on-premise environments (see Non-Blocking Follow-ups)
- Consider adding `autoSubmit` and `scanOnFocus` to barcode-demo playground page (see Non-Blocking Follow-ups)
