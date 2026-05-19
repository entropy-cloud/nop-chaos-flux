# 62 E2E Shared WebSocket Error Suppression Fix

## Problem

- Supported Playwright specs under `tests/e2e/` were supposed to fail on page-entry `console.error` and `pageerror` events.
- The shared fixture in `tests/e2e/fixtures.ts` globally filtered any error containing `WebSocket connection` before both zero-error assertions and allowance checks ran.
- This made one whole class of real transport/runtime failures invisible across every fixture-managed page.

## Diagnostic Method

- Re-read the retained open-ended finding `R01-04` and the widened owner plan `docs/plans/400-deep-audit-2026-05-19-test-harness-reliability-plan.md` to confirm the bug was still live.
- Inspected `tests/e2e/fixtures.ts` first because `docs/testing/e2e-standards.md` routes all supported page-entry error gating through that shared fixture.
- Searched the E2E suite for any explicit per-spec WebSocket allowances or helper code that depended on the suppression and found none.
- Confirmed the defect by direct code inspection: `KNOWN_NOISE_PATTERNS` still included `WebSocket connection`, so both `assertTrackedPageErrors(page)` and allowance checks silently dropped those errors.

## Root Cause

- The shared E2E fixture used a substring-based noise list that was too broad for a hard supported baseline.
- Because filtering happened centrally before both zero-error assertions and allowance checks, every supported spec inherited the suppression automatically.

## Fix

- Removed `WebSocket connection` from the shared fixture noise list in `tests/e2e/fixtures.ts`.
- Added a regression test in `tests/e2e/fixtures-hard-gate.spec.ts` that injects a `console.error` containing `WebSocket connection` and proves `assertTrackedPageErrors(page)` now fails instead of silently passing.
- Kept the narrower shared noise entries (`favicon`, `Download the React DevTools`) unchanged because they remain fixture-level non-product noise.

## Tests

- `tests/e2e/fixtures-hard-gate.spec.ts` - verifies the fixture-managed page still works across helper boundaries and now fails hard on `WebSocket connection` console errors.

## Affected Files

- `tests/e2e/fixtures.ts`
- `tests/e2e/fixtures-hard-gate.spec.ts`
- `docs/plans/400-deep-audit-2026-05-19-test-harness-reliability-plan.md`
- `docs/logs/2026/05-19.md`

## Notes For Future Refactors

- Shared E2E noise filters must stay extremely narrow because they affect every supported Playwright spec at once.
- If a future test intentionally expects a WebSocket failure, it must use an explicit per-test allowance instead of reintroducing a fixture-wide suppression.
