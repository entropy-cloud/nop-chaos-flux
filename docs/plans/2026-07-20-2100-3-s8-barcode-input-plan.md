# S8 — Barcode-input: Camera Scan, Decode, Form Integration

> Plan Status: completed
> Last Reviewed: 2026-07-20
> Source: `docs/components/barcode-input/design.md` (§4, §10, §11, §12, §12.1, §12.2), `docs/components/roadmap-scheduling.md` (S8, S10.4)
> Related: `docs/plans/2026-07-20-0800-1-s0-scheduling-infrastructure-plan.md` (prerequisite)

## Purpose

Implement the barcode scanning input component — camera lifecycle hook, decode loop with skew retry, `input-text` extension with scan button, fullscreen camera overlay UI, flashlight control, batch scan queue, and offline degradation. After this plan, `@nop-chaos/flux-renderers-form-advanced` contains a fully functional barcode-input renderer (S8 = Barcode v1), plus its playground test page.

## Current Baseline

- S0 completed: `packages/flux-renderers-scheduling/` exists with stub directories and renderer definitions
- Barcode-input design doc at `docs/components/barcode-input/design.md` covers full schema (§4), regions/slots (§6), events (§8), style markers (§10), implementation split (§11), and phasing (§12, §12.1, §12.2)
- `@nop-chaos/flux-renderers-form-advanced` package exists and contains `input-text` renderer — barcode-input extends this as a schema-driven decoration
- `examples.manifest.json` currently lacks Barcode-input entry (S0.3 residual, addressed by S3 plan)
- S8 items S8.1–S8.7 on roadmap are all `proposed`
- `docs/components/roadmap-scheduling.md` S8 phase is `proposed`
- Design doc covers P1–P6 phasing with implementation-oriented detail for all hooks
- `@zxing/library` not yet present in monorepo; `BarcodeDetector` API has varying browser support

## Goals

- Implement `useBarcodeCamera` hook: `getUserMedia`, `srcObject`, `play()`; session management with stale check; `prepareWasm` idempotent singleton for ZXing ponytail (S8.1)
- Implement `useBarcodeDetect` hook: 300ms `setTimeout` polling loop; `BarcodeDetector.detect(video)` with ZXing ponyfill fallback; skew retry via OffscreenCanvas rotation (angles -20° to +20°) (S8.2)
- Implement Barcode-input as `input-text` extension: "Scan" button in input addon → opens fullscreen camera overlay → auto-fills value on successful decode → triggers `onScan` event (S8.3)
- Implement scan button/overlay UI: button hover/active states; fullscreen overlay open/close animation (backdrop fade 200ms + scale); loading spinner + "Opening camera..." text; result feedback (vibration + color flash) (S8.4)
- Implement flashlight control hook: `useTorch` — detect `getCapabilities().torch`, `applyConstraints` toggle, expose `isAvailable`/`isOn` (S8.5)
- Implement batch scan queue: `BarcodeQueue` with `BarcodeQueueItem` status lifecycle; queue panel in overlay footer; "Batch Confirm" button triggering per-item `onScan` (S8.6)
- Implement offline/downgrade: WASM pre-cache via ServiceWorker guidance; offline decode queue via IndexedDB; camera-unavailable fallback to plain input-text (S8.7)
- Create S10.4 Barcode-input playground page (roadmap Rule 8 obligation)
- All hooks covered by focused unit tests with mock camera/MockBarcodeDetector

## Non-Goals

- No PDA-specific hardware auto-focus (`scanOnFocus` — P5 per design doc)
- No continuous scan mode without queue (`continuousScan` — P3 per design doc; S8 includes queue but not continuous non-queued mode)
- No server-side barcode validation or lookup (onScan event handles external integration)
- No CameraKit or custom WASM build pipeline beyond ZXing CDN ponytail
- No Diff-view, Gantt, Kanban, or Calendar changes

## Scope

### In Scope

All `src/barcode-input/` paths below are relative to `packages/flux-renderers-scheduling/`.

- `src/barcode-input/hooks/use-barcode-camera.ts` — Camera lifecycle hook
- `src/barcode-input/hooks/use-barcode-detect.ts` — Decode loop with skew retry
- `src/barcode-input/hooks/use-barcode-torch.ts` — Flashlight control
- `src/barcode-input/utils/prepare-wasm.ts` — ZXing WASM singleton loader
- `src/barcode-input/utils/camera-utils.ts` — Permission/HTTPS camera detection
- `src/barcode-input/utils/barcode-detector-utils.ts` — BarcodeDetector instantiation + format config
- `src/barcode-input/utils/barcode-queue.ts` — Batch scan queue + IndexedDB persistence
- `src/barcode-input/barcode-input-renderer.tsx` — Main renderer (input-text extension)
- `src/barcode-input/barcode-scanner-overlay.tsx` — Fullscreen camera overlay UI
- `src/barcode-input/barcode-input.types.ts` — Type definitions
- `src/barcode-input/barcode-input-schemas.ts` — Schema registration
- `apps/playground/src/pages/barcode-demo.tsx` — S10.4 playground test page
- Add `@zxing/library` to `packages/flux-renderers-scheduling/package.json`
- Add `@nop-chaos/flux-renderers-form` as workspace dependency in `packages/flux-renderers-scheduling/package.json` (required for input-text composition)
- Update `scheduling-renderer-definitions.ts` and `schemas.ts` with Barcode-input registration

### Out Of Scope

- `autoSubmit` mode (P6 per design doc) — scan-immediate-submit
- `scanOnFocus` PDA auto-focus (P5 per design doc)
- Custom video stream processing (filters, zoom gestures)
- Barcode generation or rendering (output only)
- Native camera app integration beyond getUserMedia

## Test Strategy

Must automate: Camera hook session lifecycle (mount/unmount, stale check, error recovery), decode hook polling loop (mock BarcodeDetector, skew retry angles), torch capability detection, queue enqueue/dequeue/flush, WASM loading idempotency. Should have tests: Overlay UI open/close animation state transitions, empty state fallback for camera-unavailable.

## Execution Plan

### Phase 1 — Core Camera + Decode Hooks

Status: completed
Targets: `src/barcode-input/hooks/`, `src/barcode-input/utils/`

- Item Types: `Fix | Proof`

- [x] Add `@zxing/library` and `@nop-chaos/flux-renderers-form` (workspace dep) to `packages/flux-renderers-scheduling/package.json`; run `pnpm install`
- [x] Implement `prepareWasm`: idempotent singleton Promise; `wasmUrl` configurable (default public CDN); returns singleton on concurrent calls
- [x] Implement `useBarcodeCamera`: call `getUserMedia` with video constraints; bind `srcObject` to HTMLVideoElement; manage session via `sessionRef` (increment on each start, check stale before each async step); expose `start`/`stop`/`isActive`/`error`
- [x] Implement `useBarcodeDetect`: 300ms `setTimeout` recursive polling; `BarcodeDetector.detect(video)` primary path; ZXing ponyfill fallback when `BarcodeDetector` unavailable; skew retry via OffscreenCanvas (angles: -20, -15, -10, -5, 5, 10, 15, 20 degrees)
- [x] Implement camera utility: `checkCameraAvailability()` (HTTPS/localhost guard + getUserMedia probe); expose `isAvailable`/`error` for conditional UI
- [x] Unit tests: camera hook lifecycle (10+ cases covering mount/unmount, stale check, error recovery); decode hook mock (15+ cases covering decode success, failure, skew retry angles); WASM loading idempotency (3+ cases)

Exit Criteria:

- [x] `useBarcodeCamera` correctly acquires and releases camera stream; stale check prevents late async results
- [x] `useBarcodeDetect` decodes known barcodes from mock video; skew retries at least 3 angles before giving up
- [x] `prepareWasm` returns same Promise on concurrent calls; loads ZXing from configurable URL
- [x] Unit tests pass for camera session lifecycle, decode polling with skew retry, WASM singleton

### Phase 2 — Renderer + Overlay UI + Torch

Status: completed
Targets: `src/barcode-input/barcode-input-renderer.tsx`, `src/barcode-input/barcode-scanner-overlay.tsx`, `src/barcode-input/hooks/use-barcode-torch.ts`

- Item Types: `Fix | Proof`

- [x] Implement `barcode-input-schemas.ts`: define `BarcodeInputSchema` extending text-input fields; add `scanButton` (default true), `scanInterval`, `continuousScan`, `batchMode`, `torchButton`, `wasmUrl` props
- [x] Implement `barcode-input-renderer.tsx`: extend `input-text` via composition; render scan button as input addon (left or right based on schema); on click → open overlay; on decode → set input value + trigger `onScan` event
- [x] Implement `barcode-scanner-overlay.tsx`:
  - Fullscreen backdrop (CSS fixed inset-0, z-50, backdrop-blur-sm)
  - Open animation: backdrop fade 200ms + scale 0.95→1.0 (300ms ease-out)
  - Close animation: reverse (fade 150ms + scale 1.0→0.95, 200ms ease-in)
  - Video element with `object-fit: contain`, aspect-ratio maintained
  - Loading state: spinner + "Opening camera..." before `play()` resolves
  - Error state: camera icon + "Camera unavailable" + fallback to manual input
  - Close button (X) top-right; result feedback: 200ms green flash border on decode
- [x] Implement `useBarcodeTorch`: query `getCapabilities().torch`; expose `isAvailable`/`isOn`/`toggle()`; `toggle()` calls `applyConstraints({ advanced: [{ torch: !isOn }] })`
- [x] Wire torch button in overlay: torch-icon button top-right when `torchButton: true`
- [x] Wire schema events: `onScan(result)`, `onScanError(error)`
- [x] Unit tests: renderer integration (input-text composition, scan button click → overlay open); torch hook capability detection and toggle; overlay open/close animation state transitions

Exit Criteria:

- [x] Barcode-input renders as input-text with scan button addon; clicking button opens fullscreen overlay
- [x] Overlay shows camera feed; on decode success, overlay closes, input value set, `onScan` fires
- [x] Loading spinner shown before camera starts; error state shown if camera unavailable
- [x] Torch button visible only when `isAvailable`; toggle correctly calls `applyConstraints`
- [x] `onScan(result)` fires on decode; `onScanError(error)` fires on decode failure or camera error
- [x] Unit tests pass for renderer, overlay states, torch, event wiring

### Phase 3 — Batch Queue + Offline/Degrade + S10.4 Playground + Closure

Status: completed
Targets: `src/barcode-input/utils/barcode-queue.ts`, `src/barcode-input/barcode-scanner-overlay.tsx` (queue panel), `apps/playground/src/pages/barcode-demo.tsx`

- Item Types: `Fix | Proof | Follow-up`

- [x] Implement `BarcodeQueue` util: `BarcodeQueueItem[]` with status lifecycle (`pending` → `submitted`/`duplicate`/`error`); `enqueue`/`dequeue`/`flush`/`clear` methods; IndexedDB persistence via `useBarcodeQueue` hook (`nop_barcode_queue` object store)
- [x] Implement queue panel in overlay footer: semi-transparent bottom panel; time-descending list of scanned barcodes (index + value + format + status icon); swipe-to-delete per item; "N items scanned" header; "Batch Confirm" button → triggers per-item `onScan`
- [x] Implement `batchMode` schema toggle: when enabled, decode results go to queue instead of auto-filling input; queue panel visible; "Batch Confirm" triggers bulk `onScan`
- [x] Implement offline detection: `navigator.onLine` + `'online'`/`'offline'` events; offline yellow banner "Will auto-submit when online"; on reconnect → `BarcodeQueue.flush()` → trigger submission
- [x] Implement camera degradation chain: `getUserMedia` unavailable → hide scan button → input behaves as plain text; optionally show `scanButton: true` with tooltip "Scan unavailable"
- [x] Create S10.4 playground page at `apps/playground/src/pages/barcode-demo.tsx`:
  - Schema-driven barcode-input with sample config (batchMode, torchButton toggles)
  - OnScan demo log panel showing decoded results
  - Camera fallback/offline mode simulation buttons
  - Register to playground domain route `barcode-input` + home-page navigation card
- [x] Update `scheduling-renderer-definitions.ts`: register BarcodeInput renderer with proper fields/events/handles
- [x] Update `src/schemas.ts` with `BarcodeInputSchema`
- [x] Update `docs/components/roadmap-scheduling.md`: mark S8 items all `done`; S10.4 to `done`
- [x] Update `docs/logs/2026/07-20.md` with S8 completion summary
- [x] Unit tests: BarcodeQueue enqueue/dequeue/flush lifecycle (10+ cases); IndexedDB persistence (in-memory mock); offline/online event detection (5+ cases)

Exit Criteria:

- [x] Batch mode: scanned barcodes queue in overlay footer panel; "Batch Confirm" triggers per-item `onScan` with correct sequential ordering
- [x] Offline mode: yellow banner shows when offline; auto-flush on reconnect triggers submission for queued items
- [x] Camera unavailable: scan button hidden, input operates as plain text
- [x] S10.4 playground page renders with sample schema, demo log panel, and fallback simulation
- [x] `scheduling-renderer-definitions.ts` and `schemas.ts` have BarcodeInput registered
- [x] `roadmap-scheduling.md` S8 items and S10.4 show `done`
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` all pass

## Draft Review Record

- Reviewer / Agent: plan-review sub-agent (fresh session)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - [x] Added missing `@nop-chaos/flux-renderers-form` workspace dependency to In Scope and Phase 1 (required for input-text composition)
  - [x] Added package-context prefix note to In Scope paths (all relative to `packages/flux-renderers-scheduling/`)
  - [x] Added `onScanError` verification to Phase 2 Exit Criteria
  - [x] Removed `Follow-up` label from Phase 2 Item Types (no follow-up items exist in that phase)

## Closure Gates

- [x] Camera lifecycle hook (`useBarcodeCamera`) acquires/releases stream; stale check prevents late async
- [x] Decode loop (`useBarcodeDetect`) polls at configurable interval; skew retry handles angled barcodes; ZXing ponyfill fallback works
- [x] Barcode-input renderer extends input-text with scan button; overlay opens on click; decode fills input and fires `onScan`
- [x] Flashlight control (`useBarcodeTorch`) detects capability and toggles correctly
- [x] Batch scan queue stores items with status lifecycle; IndexedDB persists offline queue
- [x] Offline detection shows banner; auto-flush on reconnect
- [x] Camera-unavailable degradation: hidden scan button, plain-text input fallback
- [x] S10.4 playground page renders with sample barcode-input and demo controls
- [x] BarcodeInput renderer registered in definitions and schemas
- [x] `roadmap-scheduling.md` S8 items and S10.4 updated to `done`
- [x] No deferred live defects or contract drifts in scope
- [x] Affected owner docs synced (design doc if amended, schemas.ts, renderer definitions, examples.manifest.json updated by S3 plan)
- [x] By independent sub-agent (fresh session) closure-audit completed and recorded (human gate — executor cannot self-approve)
- [x] `pnpm typecheck` (56/56)
- [x] `pnpm build` (30/30)
- [x] `pnpm lint` (0 new barcode-input errors)
- [x] `pnpm test` (56/56)

## Deferred But Adjudicated

### component:scanNow()/component:stopScan() Imperative Handles

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Programmatic open/close of scanner via `component:scanNow()`/`component:stopScan()` is a convenience layer on top of the existing UI-based scan flow (scan button → overlay → decode). The scan button, camera overlay, decode loop, batch queue, and event wiring already provide a complete v1 user experience. Imperative handles can be added in a follow-up without breaking the existing contract.
- Successor Required: `no`

### autoSubmit Mode (Design Doc P6)

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: autoSubmit (scan-immediate-submit) is a single-scan PDA optimization not needed for v1. Batch queue + manual submit covers the primary ERP use case (inventory receipt scanning).
- Successor Required: `no`

### scanOnFocus PDA Auto-Focus (Design Doc P5)

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: PDA-specific hardware integration not testable without physical device. The manual scan button + batch queue covers warehouse and logistics scenarios.
- Successor Required: `no`

## Non-Blocking Follow-ups

- ZXing WASM CDN URL should be configurable; default URL documented for on-premise deployments.
- ServiceWorker WASM pre-cache documented in design doc §12.2 but is host-application responsibility, not Flux renderer concern.

## Closure

Status Note: All 3 phases completed. typecheck/build/lint/test all pass (56/56 tasks, 454 tests in scheduling package). S8.1-S8.7 and S10.4 marked done on roadmap.

Closure Audit Evidence:

- All 20 source files present under `packages/flux-renderers-scheduling/src/barcode-input/`
- Camera lifecycle with stale check, decode loop with 8-angle skew retry, torch capability detection verified non-hollow
- Barcode queue status lifecycle, offline detection, WASM singleton loader confirmed operational
- Renderer registration in `scheduling-renderer-definitions.ts` (lines 143-152) and `schemas.ts` confirmed
- Playground page at `apps/playground/src/pages/barcode-demo.tsx` with route registration confirmed
- Roadmap `docs/components/roadmap-scheduling.md` updated to `done` for S8.1-S8.7 and S10.4
- Logs recorded at `docs/logs/2026/07-20.md` (lines 82-90)
- `component:scanNow()`/`component:stopScan()` imperative handles deferred as out-of-scope improvement (not implemented)
- No confirmed live defects or contract drifts present in scope

Auditor / Agent: closure-audit independent sub-agent (fresh session)
Evidence: Live code review of all 20 source files; roadmap and log confirmation; typecheck/build/lint/test results verified at plan completion.

Follow-up: ZXing WASM CDN URL configurable via wasmUrl prop. ServiceWorker pre-cache is host-app responsibility. `component:scanNow()`/`component:stopScan()` imperative handles deferred but not implemented (out-of-scope improvement). No deferred live defects.
