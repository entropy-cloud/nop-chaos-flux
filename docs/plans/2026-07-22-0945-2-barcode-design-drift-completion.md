# 2 — BarcodeInput Design-Drift Completion: zxing Ponyfill + i18n ARIA Labels

> Plan Status: completed
> Last Reviewed: 2026-07-22
> Source: `docs/audits/2026-07-22-0908-multi-audit-scheduling.md` Issue 1, `docs/audits/2026-07-22-0908-open-audit-scheduling.md` Finding 2
> Related: `docs/plans/2026-07-22-2300-3-barcode-p1-defect-remediation.md`, `docs/plans/2026-07-21-2100-2-barcode-enhancement-plan.md`, `docs/components/barcode-input/design.md`

## Purpose

Close two remaining design-drift gaps in the BarcodeInput component: (1) the design doc §11 requires a `@zxing/library` ponyfill for cross-browser barcode detection, but the current implementation returns an error stub for Firefox/Safari; (2) ARIA labels in `barcode-input.tsx` are hardcoded English strings while the rest of the scheduling package uses `@nop-chaos/flux-i18n` for locale-aware text.

## Current Baseline

- All BarcodeInput P0/P1/P2/P3 defects from the scheduling deep analysis have been fixed across 3 completed plans (`2026-07-22-2300-3`, `2026-07-21-2100-2`, `2026-07-22-2359-1`).
- BarcodeInput works correctly on Chromium-based browsers with native `BarcodeDetector`. On Firefox/Safari, `barcode-detector-utils.ts:38-43` returns a stub that throws `"This browser does not support barcode scanning. Please use Chrome, Edge, or a Chromium-based browser."`
- The `BARCODE_FORMAT_TO_ZXING` mapping exists at `barcode-detector-utils.ts:48-61` but is unused — it was added by B-CD-03 in the P2/P3 plan but never wired to a detection backend.
- `@zxing/library` is not in `package.json` dependencies.
- `barcode-scanner-overlay.tsx` uses `t()` for i18n (e.g., `t('flux.barcode.recognizing')`), but `barcode-input.tsx` has hardcoded `aria-label="Clear"` (line 208) and `aria-label="Scan barcode"` (line 219) with zero `t()` calls.
- Calendar and Kanban already use `t()` extensively for locale-aware strings.

## Goals

- Implement `@zxing/library` ponyfill in `barcode-detector-utils.ts` so Firefox/Safari users get actual barcode decoding instead of an error stub
- Add `@zxing/library` to `packages/flux-renderers-scheduling/package.json` dependencies
- Wire the existing `BARCODE_FORMAT_TO_ZXING` map into the ponyfill
- Replace hardcoded ARIA labels in `barcode-input.tsx` with `t()` i18n calls, adding the required i18n keys to `@nop-chaos/flux-i18n`
- Verify the ponyfill does not break the existing native `BarcodeDetector` path for Chromium browsers

## Non-Goals

- Camera hardware mock for e2e tests (out of scope)
- Changing the batch scan queue, autoSubmit, scanOnFocus, or other existing BarcodeInput features
- Any non-barcode scheduling component changes
- Full i18n audit of all scheduling components (only the specific Finding 2 gap)

## Scope

### In Scope

- `packages/flux-renderers-scheduling/package.json` — add `@zxing/library` dependency
- `packages/flux-renderers-scheduling/src/barcode-input/utils/barcode-detector-utils.ts` — implement ponyfill that falls back to `@zxing/library` when `BarcodeDetector` is unavailable
- `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx` — replace `aria-label="Clear"` and `aria-label="Scan barcode"` with `t()` calls
- `@nop-chaos/flux-i18n` — add i18n keys for the two new ARIA label strings
- Focused unit tests: ponyfill fallback path, i18n label resolution

### Out Of Scope

- Changes to `barcode-scanner-overlay.tsx` (already i18n-compliant)
- Changes to BarcodeInput imperative handles, autoSubmit, scanOnFocus, or WASM init
- PDA hardware integration testing
- Any changes outside `packages/flux-renderers-scheduling/src/barcode-input/`

## Failure Paths

| Scenario                                       | Trigger                         | Behavior                                        | Retryable | User-Visible                                   |
| ---------------------------------------------- | ------------------------------- | ----------------------------------------------- | --------- | ---------------------------------------------- |
| `@zxing/library` fails to load (network error) | WASM CDN unreachable            | Fall back to error state (same as current stub) | Yes       | Error message in overlay, graceful degradation |
| `@zxing/library` WASM initialization slow      | Large WASM binary, slow network | Async load with timeout, show spinner           | Yes       | Longer loading spinner in overlay              |
| i18n key missing for ARIA label                | Key not registered in flux-i18n | Key string rendered as-is (React i18n default)  | No        | English key shown instead of localized text    |

## Test Strategy

档位选择：`必须自动化`

Ponyfill fallback is a core behavioral path for non-Chromium browsers. Unit tests must verify: (1) native `BarcodeDetector` is preferred when available; (2) `@zxing/library` fallback is used when native is absent; (3) i18n keys resolve to correct locale strings.

## Execution Plan

### Phase 1 — zxing ponyfill implementation

Status: completed
Targets: `package.json`, `barcode-detector-utils.ts`

- Item Types: `Fix | Proof`

- [x] Add `"@zxing/library": "^0.20.0"` (or latest compatible) to `packages/flux-renderers-scheduling/package.json` dependencies
- [x] In `barcode-detector-utils.ts`, implement `createZxingDetector()` that wraps `@zxing/library` `BrowserMultiFormatReader` with the same `detect()` interface as native `BarcodeDetector`
- [x] Modify the `createDetector` function: try native `BarcodeDetector` first; if unavailable, fall back to `createZxingDetector()` instead of returning error stub
- [x] Wire `BARCODE_FORMAT_TO_ZXING` map into the zxing detector for format hinting
- [x] Keep the existing error stub as a final fallback if both native and zxing fail (e.g., WASM load failure)
- [x] Add unit tests: mock `BarcodeDetector` as undefined → verify zxing fallback is invoked; mock zxing failure → verify final error stub is used
- [x] Verify existing Chromium-native path still works (no regression)

Exit Criteria:

- [x] `@zxing/library` added as dependency, `pnpm install` succeeds
- [x] Firefox/Safari `detect()` calls go through zxing instead of throwing immediately
- [x] All existing BarcodeInput tests pass (native path unchanged)
- [x] New ponyfill tests verify fallback chain: native → zxing → error stub

### Phase 2 — i18n ARIA labels

Status: completed
Targets: `barcode-input.tsx`, `@nop-chaos/flux-i18n`

- Item Types: `Fix | Proof`

- [x] Add i18n keys to `@nop-chaos/flux-i18n`: e.g., `flux.barcode.clearLabel` and `flux.barcode.scanBarcodeLabel` with zh-CN and en-US translations
- [x] In `barcode-input.tsx`, replace `aria-label="Clear"` with `aria-label={t('flux.barcode.clearLabel')}`
- [x] In `barcode-input.tsx`, replace `aria-label="Scan barcode"` with `aria-label={t('flux.barcode.scanBarcodeLabel')}`
- [x] Add unit test: mock `t()` and verify rendered ARIA attributes match expected key values

Exit Criteria:

- [x] No hardcoded English ARIA strings remain in `barcode-input.tsx`
- [x] `t()` calls resolve correctly in both zh-CN and en-US locales

## Draft Review Record

- Reviewer / Agent: mission_driver (current review session)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor: Corrected `aria-label="Clear"` line reference from 209 to 208
  - Minor: Removed "All existing tests pass" from Phase 2 Exit Criteria (covered by Closure Gates per Rule 18)
  - Note: Proof items listed after Fix items; for "必须自动化" tier, consider ordering Proof before Fix in future

## Closure Gates

- [x] `@zxing/library` ponyfill implemented and tested for Firefox/Safari fallback path
- [x] `BARCODE_FORMAT_TO_ZXING` map wired to ponyfill
- [x] ARIA labels in `barcode-input.tsx` use `t()` i18n calls instead of hardcoded English strings
- [x] New i18n keys registered in `@nop-chaos/flux-i18n`
- [x] No regressions in Chromium native `BarcodeDetector` path
- [x] Ponyfill unit tests cover fallback chain (native → zxing → error stub)
- [x] I18n unit tests verify ARIA label resolution
- [x] `docs/components/barcode-input/design.md` updated to reflect zxing ponyfill delivery status
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] By independent sub-agent (fresh session) executed closure-audit completed and evidence recorded

## Deferred But Adjudicated

### WASM bundle size optimization for zxing

- Classification: `optimization candidate`
- Why Not Blocking Closure: The zxing ponyfill loads WASM asynchronously. Bundle size concerns can be addressed in a future optimization pass if network profiling shows impact.
- Successor Required: `no`

## Non-Blocking Follow-ups

- Consider adding `@zxing/library` to the deployment guide for on-premise WASM CDN configuration.
- Future audit: verify all scheduling components have complete i18n coverage for ARIA labels, not just BarcodeInput.

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent (fresh session)
- Verification ran at: 2026-07-22
- typecheck: PASS (56/56 tasks, cached)
- build: PASS (30/30 tasks, cached)
- lint: PASS (no errors)
- tests: PASS (all 687+ scheduling tests + full monorepo suite all packages pass)
- Source audit: All 12 closure gates verified against live code
- Verdict: **CLOSED** — all plan requirements met

Follow-up:

- No remaining plan-owned work.
