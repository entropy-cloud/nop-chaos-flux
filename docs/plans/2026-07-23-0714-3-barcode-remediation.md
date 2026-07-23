# 3 BarcodeInput Lifecycle, Validation & Queue Remediation

> Plan Status: active
> Last Reviewed: 2026-07-23
> Source: `docs/audits/2026-07-23-0714-open-audit-scheduling.md` (F-24, F-50, F-61, F-81, F-82), `docs/audits/2026-07-23-0714-multi-audit-scheduling.md` (06-1, 06-5, 07-001, 07-002, 14-3, 14-11)
> Related: Plans 1 (Gantt) and 2 (Kanban/Calendar)

## Purpose

Fix all BarcodeInput-specific findings from the 2026-07-23 audits: camera lifecycle stabilization, validation props and readOnly enforcement, batch queue duplicate handling, WASM cache isolation, and test coverage.

## Current Baseline

- Camera lifecycle `start`/`stop` are fresh closures every render, in effect dep array — re-runs on every render (F-50, 07-002)
- 5 validation props (`required`, `minLength`, `maxLength`, `pattern`, `validate`) declared in schema/types but never read in renderer (F-61)
- `readOnly` only gates text input; scanner overlay still opens and writes to form on scan (F-24)
- Batch queue silently swallows `submitted`-status duplicate scans — no user feedback (F-81)
- `resetWasmPromise()` clears ALL cached WASM URLs when called without argument — cross-instance side effect (F-82)
- Polling loop in `use-barcode-detect.ts` uses empty deps `[]` — cannot restart when `enabled`/`interval` change (07-001)
- `start()` re-throws errors; torch-off path has unhandled promise rejection (06-1, 06-5)
- Coverage: `use-barcode-camera` 53%, `use-barcode-detect` 38%, `camera-utils` 35% (14-3)
- Camera lifecycle test incomplete — no error paths, no multiple start/stop tested (14-11)

## Goals

- Camera lifecycle stable across renders — `start`/`stop` functions stabilized with `useCallback`
- All 5 validation props properly checked on scan result; scanner respects `readOnly`
- Batch queue provides feedback for re-scans of already-submitted barcodes
- WASM cache isolation preserved across instances
- Polling loop responds to `enabled`/`interval` changes
- Error handling robust — `start()` errors caught, torch-off path clean
- Test coverage >60% on all barcode modules; lifecycle tests cover error paths and multiple start/stop

## Non-Goals

- Gantt fixes (Plan 1)
- Kanban/Calendar fixes (Plan 2)
- WASM binary or ZXing library version changes
- Cross-instance resource management beyond WASM cache

## Scope

### In Scope

- `barcode-input/barcode-input.tsx` (F-24, F-61)
- `barcode-input/hooks/use-barcode-camera.ts` (F-50, 07-002, 06-1, 14-11)
- `barcode-input/hooks/use-barcode-detect.ts` (07-001)
- `barcode-input/barcode-scanner-overlay.tsx` (07-002)
- `barcode-input/hooks/use-barcode-torch.ts` (06-5)
- `barcode-input/utils/barcode-queue.ts` (F-81)
- `barcode-input/utils/prepare-wasm.ts` (F-82)
- `barcode-input/hooks/use-barcode-camera.test.ts` (14-11)
- All barcode tests for coverage improvement (14-3)

### Out Of Scope

- Focus trap (handled in Plan 2 Phase 6)
- Camera hardware compatibility or device enumeration
- ZXing library upgrade or alternative engine
- Playwright e2e tests for barcode scanning

## Test Strategy

Must automate: Camera lifecycle (stable deps, error paths, multiple start/stop), validation props, batch queue submitted-duplicate behavior, WASM cache isolation. Should have tests: polling loop reactive deps, torch error handling.

## Execution Plan

### Phase 1 - Camera Lifecycle Stabilization

Status: planned
Targets: `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-camera.ts`, `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx`, `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-torch.ts`

- Item Types: `Fix`

- [ ] F-50 / 07-002: Stabilize `start`/`stop` functions with `useCallback` (or extract to stable ref-based closures) so they don't change identity on every render
- [ ] 06-1: Fix `start()` — catch and handle errors with proper camera state transitions instead of re-throwing
- [ ] 06-5: Fix torch-off path — handle unhandled promise rejection; stabilize `isOn` closure

Exit Criteria:

- [ ] Camera effect deps array in `barcode-scanner-overlay.tsx` no longer causes re-init on every render
- [ ] `start()` errors handled gracefully (camera state reset, no uncaught exceptions)
- [ ] Torch toggle has no unhandled promise rejections

### Phase 2 - Validation Props & readOnly Enforcement

Status: planned
Targets: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx`

- Item Types: `Fix`

- [ ] F-61: Implement validation for `required`, `minLength`, `maxLength`, `pattern`, `validate` — check each on scan result and display validation error
- [ ] F-24: Gate scanner overlay opening on `readOnly` — if `readOnly` is true, don't open overlay on focus, and skip form write on scan result

Exit Criteria:

- [ ] All 5 validation props produce correct validation errors when violated
- [ ] When `readOnly` is true, scanning overlay does not open and scan results don't write to form

### Phase 3 - Batch Queue & WASM Isolation

Status: planned
Targets: `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-queue.ts`, `packages/flux-renderers-scheduling/src/barcode-input/utils/prepare-wasm.ts`

- Item Types: `Fix`

- [ ] F-81: Fix `enqueueItem` — when a `submitted`-status barcode is scanned again, provide user feedback (new queue entry with `duplicate` status or error message)
- [ ] F-82: Fix `resetWasmPromise()` — when called without URL, only reset current instance's cached URL (add instance-scoped tracking); or remove the no-argument overload

Exit Criteria:

- [ ] Scanning a previously-submitted barcode produces visible feedback (new duplicate entry or error display)
- [ ] `resetWasmPromise()` called without argument does not clear WASM cache for other instances

### Phase 4 - Polling Loop & Effect Dependencies

Status: planned
Targets: `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-detect.ts`

- Item Types: `Fix`

- [ ] 07-001: Add `enabled` and `interval` to effect deps (or restructure with refs + useCallback to handle dynamic interval changes without polling restart)

Exit Criteria:

- [ ] Detection polling responds to `enabled`/`interval` prop changes (stops/starts/reschedules correctly)

### Phase 5 - Test Coverage

Status: planned
Targets: `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-camera.test.ts`, `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-detect.test.ts`, `packages/flux-renderers-scheduling/src/barcode-input/utils/camera-utils.test.ts`, `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-queue.test.ts`, `packages/flux-renderers-scheduling/src/barcode-input/utils/prepare-wasm.test.ts`

- Item Types: `Proof`

- [ ] 14-11: Expand camera lifecycle test — add error paths, multiple start/stop cycles
- [ ] 14-3: Improve coverage for `use-barcode-camera` (>60%), `use-barcode-detect` (>60%), `camera-utils` (>60%)
- [ ] Add tests for validation props (F-61), readOnly gate (F-24), batch queue submitted-duplicate (F-81), WASM cache isolation (F-82)
- [ ] Add tests for polling loop dynamic deps (07-001)

Exit Criteria:

- [ ] `use-barcode-camera` coverage ≥60%
- [ ] `use-barcode-detect` coverage ≥60%
- [ ] `camera-utils` coverage ≥60%
- [ ] Camera lifecycle tests include error paths and multiple start/stop
- [ ] All new fix behaviors (validation, readOnly, queue, WASM, polling) have corresponding focused tests

## Draft Review Record

- Reviewer / Agent: Independent sub-agent (fresh session, no prior context)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: Minor — Phase 5 Targets now includes `camera-utils.test.ts`. Minor — Missing `## Failure Paths` (noted; recommended for camera API/error-handling work). All references verified against live repo; zero Blockers, zero Majors.

## Closure Gates

- [ ] All in-scope confirmed live defects fixed (F-24, F-50, F-61, F-81, F-82, 06-1, 06-5, 07-001, 07-002)
- [ ] No live defects silently downgraded to deferred/follow-up
- [ ] Camera lifecycle stable; validation props enforced; queue provides feedback; WASM cache isolated
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] Coverage thresholds met for barcode modules (≥60% each)
- [ ] All Phase Exit Criteria `[x]`
- [ ] `docs/logs/` updated
- [ ] `docs/architecture/` synced if public contract changed
- [ ] Independent closure-audit by fresh sub-agent session completed

## Deferred But Adjudicated

(none at draft time)

## Non-Blocking Follow-ups

- Cross-instance resource management (only WASM cache needed isolation; camera streams already properly scoped)
- Full e2e barcode scanning test (requires real camera or mock media stream in Playwright)
