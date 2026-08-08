# 100 Barcode Consecutive Same-Value Scans Silently Dropped Fix

## Problem

In barcode batch mode, scanning the **same barcode twice in a row** silently
dropped the second entry: the queue received only one item and auto-submit
submitted one, so the user believed two items were scanned when only one was
processed. Non-batch (single) mode was unaffected.

## Diagnostic Method

- Hard part: three independent "dedupe" layers each look intentional in
  isolation; the drop is the product of all three stacking on the same value.
- Read the pipeline top-down: detect layer
  (`use-barcode-detect.ts:102-105`), scanner overlay consume-once guard
  (`barcode-scanner-overlay.tsx:147-149`), queue duplicate handling
  (`barcode-queue-utils.ts:20-24`).
- Checked whether the batch-mode branch was ever reached before the guards
  returned: it was not — the consume-once guard returned unconditionally
  **before** the `batchMode` branch.
- Decisive evidence: the queue already had a precedent for enqueuing
  duplicates of _committed_ items (`:26-36`); only _pending_ same-value items
  were dropped, and auto-submit processes pending items only.

## Root Cause

Three stacked drop points, all keyed on value equality:

1. `use-barcode-detect.ts:102-105` — `decoded.barcode === lastResultRef.current`
   suppressed the result regardless of mode.
2. `barcode-scanner-overlay.tsx:147-149` — consume-once guard
   (`lastConsumedKeyRef` keyed `barcode|format`) returned unconditionally,
   before the `batchMode` branch.
3. `barcode-queue-utils.ts:20-24` — same-rawValue **pending** items were
   marked duplicate and never enqueued (auto-submit only sees pending items).

## Fix

- Detect-layer suppression and overlay consume-once are now mode-aware:
  batch mode lets consecutive same values through (`dedupe: !batchMode`,
  overlay `:88`; consume-once by session/scan order `:152-157`, `alwaysAppend`
  `:159`); non-batch mode keeps anti-misfire dedupe.
- Queue layer: consecutive same values in batch mode produce a processing
  entry (new entry enqueued or an explicit committable duplicate marker),
  aligned with the existing committed-item duplicate precedent.

## Tests

- `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.test.tsx:230`
  — batch consecutive same-value ×2 both produce processing; non-batch
  consume-once retained.
- `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-queue.test.ts:24,66`
  — queue duplicate semantics locked (batch vs single mode).

## Affected Files

- `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-detect.ts`
- `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx`
- `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-queue-utils.ts`

## Notes For Future Refactors

- Dedupe semantics must be mode-aware: "prevent misfires" (single mode) and
  "preserve every scan" (batch mode) are different contracts living in the
  same pipeline.
- When adding a new pipeline stage, check the ordering of mode branches
  against guards — an unconditional early return makes later mode logic dead.
