# 3 BarcodeInput Lifecycle, Validation & Queue Remediation

> Plan Status: completed
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

Status: completed
Targets: `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-camera.ts`, `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx`, `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-torch.ts`

- Item Types: `Fix`

- [x] F-50 / 07-002: Stabilize `start`/`stop` functions with `useCallback` (or extract to stable ref-based closures) so they don't change identity on every render
- [x] 06-1: Fix `start()` — catch and handle errors with proper camera state transitions instead of re-throwing
- [x] 06-5: Fix torch-off path — handle unhandled promise rejection; stabilize `isOn` closure

Exit Criteria:

- [x] Camera effect deps array in `barcode-scanner-overlay.tsx` no longer causes re-init on every render
- [x] `start()` errors handled gracefully (camera state reset, no uncaught exceptions)
- [x] Torch toggle has no unhandled promise rejections

### Phase 2 - Validation Props & readOnly Enforcement

Status: completed
Targets: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx`

- Item Types: `Fix`

- [x] F-61: Implement validation for `required`, `minLength`, `maxLength`, `pattern`, `validate` — check each on scan result and display validation error
- [x] F-24: Gate scanner overlay opening on `readOnly` — if `readOnly` is true, don't open overlay on focus, and skip form write on scan result

Exit Criteria:

- [x] All 5 validation props produce correct validation errors when violated
- [x] When `readOnly` is true, scanning overlay does not open and scan results don't write to form

### Phase 3 - Batch Queue & WASM Isolation

Status: completed
Targets: `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-queue.ts`, `packages/flux-renderers-scheduling/src/barcode-input/utils/prepare-wasm.ts`

- Item Types: `Fix`

- [x] F-81: Fix `enqueueItem` — when a `submitted`-status barcode is scanned again, provide user feedback (new queue entry with `duplicate` status or error message)
- [x] F-82: Fix `resetWasmPromise()` — when called without URL, only reset current instance's cached URL (add instance-scoped tracking); or remove the no-argument overload

Exit Criteria:

- [x] Scanning a previously-submitted barcode produces visible feedback (new duplicate entry or error display)
- [x] `resetWasmPromise()` called without argument does not clear WASM cache for other instances

### Phase 4 - Polling Loop & Effect Dependencies

Status: completed
Targets: `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-detect.ts`

- Item Types: `Fix`

- [x] 07-001: Add `enabled` and `interval` to effect deps (or restructure with refs + useCallback to handle dynamic interval changes without polling restart)

Exit Criteria:

- [x] Detection polling responds to `enabled`/`interval` prop changes (stops/starts/reschedules correctly)

### Phase 5 - Test Coverage

Status: completed
Targets: `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-camera.test.ts`, `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-detect.test.ts`, `packages/flux-renderers-scheduling/src/barcode-input/utils/camera-utils.test.ts`, `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-queue.test.ts`, `packages/flux-renderers-scheduling/src/barcode-input/utils/prepare-wasm.test.ts`

- Item Types: `Proof`

- [x] 14-11: Expand camera lifecycle test — add error paths, multiple start/stop cycles
- [x] 14-3: Improve coverage for `use-barcode-camera` (>60%), `use-barcode-detect` (>60%), `camera-utils` (>60%)
- [x] Add tests for validation props (F-61), readOnly gate (F-24), batch queue submitted-duplicate (F-81), WASM cache isolation (F-82)
- [x] Add tests for polling loop dynamic deps (07-001)

Exit Criteria:

- [x] `use-barcode-camera` coverage ≥60%
- [x] `use-barcode-detect` coverage ≥60%
- [x] `camera-utils` coverage ≥60%
- [x] Camera lifecycle tests include error paths and multiple start/stop
- [x] All new fix behaviors (validation, readOnly, queue, WASM, polling) have corresponding focused tests

## Draft Review Record

- Reviewer / Agent: Independent sub-agent (fresh session, no prior context)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: Minor — Phase 5 Targets now includes `camera-utils.test.ts`. Minor — Missing `## Failure Paths` (noted; recommended for camera API/error-handling work). All references verified against live repo; zero Blockers, zero Majors.

## Closure Gates

- [x] All in-scope confirmed live defects fixed (F-24, F-50, F-61, F-81, F-82, 06-1, 06-5, 07-001, 07-002)
- [x] No live defects silently downgraded to deferred/follow-up
- [x] Camera lifecycle stable; validation props enforced; queue provides feedback; WASM cache isolated
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] Coverage thresholds met for barcode modules (≥60% each)
- [x] All Phase Exit Criteria `[x]`
- [x] `docs/logs/` updated (below)
- [x] `docs/architecture/` synced if public contract changed
- [x] Independent closure-audit by fresh sub-agent session completed (evidence in Closure section below)

## Deferred But Adjudicated

(none at draft time)

## Non-Blocking Follow-ups

- Cross-instance resource management (only WASM cache needed isolation; camera streams already properly scoped)
- Full e2e barcode scanning test (requires real camera or mock media stream in Playwright)

## Closure

Status Note: All 5 phases completed. All in-scope defects fixed. All exit criteria met. Independent closure audit completed by fresh sub-agent session.

Closure Audit Evidence:

- Auditor / Agent: Independent closure auditor (fresh session, no prior execution context) — MISSION_DRIVER closure audit via `docs/plans/2026-07-23-0714-3-barcode-remediation.md`
- Evidence: Verified against live repo — all 5 phases confirmed landed (see daily log `docs/logs/2026/07-23.md` lines 57-63). Camera lifecycle stabilized (useCallback), validation props enforced (validateScanResult), readOnly gates focus/click/scan-result (scanNow imperative handle intentionally ungated for programmatic API access), batch queue handles submitted-duplicate (new `duplicate` status entry), WASM cache isolated (resetWasmPromise without URL only clears DEFAULT_WASM_URL), polling loop dynamically reads enabled/interval via refs. Coverage: `use-barcode-camera` 75%, `use-barcode-detect` 61.44%, `camera-utils` 76.47% — all ≥60%.

Follow-up:

- No remaining plan-owned work
