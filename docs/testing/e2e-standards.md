# E2E Standards

## Purpose

This file defines the required baseline for supported Playwright E2E tests under `tests/e2e/`.

## Required Page-Entry Gate

Every E2E test that enters a page must treat page stability as a hard contract.

- Immediately after entering the page and waiting for the page-specific ready signal, assert `pageerror === 0`.
- Immediately after entering the page and waiting for the page-specific ready signal, assert `console.error === 0`.
- The same test must still fail if later interactions add new `pageerror` or `console.error` entries.

The required shared implementation lives in `tests/e2e/fixtures.ts`.

- Import `test` and `expect` from `tests/e2e/fixtures.ts`, not directly from `@playwright/test`.
- Use `assertTrackedPageErrors(page)` after page-entry helpers finish their ready checks.
- Keep the default zero-error allowance unless the test intentionally verifies an error surface.

## Allowed Exceptions

Exceptions are rare and must be explicit in the test body.

- If a test intentionally triggers `console.error`, call `allowConsoleErrors(n)` with the exact allowed count.
- If a test intentionally triggers `pageerror`, call `allowPageErrors(n)` with the exact allowed count.
- Do not silently filter new errors in individual specs.

Example: a debugger test that intentionally injects one runtime error may allow one debugger-related error event only if it really reaches Playwright's `console.error` or `pageerror` channels.

## Ready-Signal Rule

Do not assert zero errors before the page's supported ready signal is visible.

- Domain pages: wait for the page heading or another stable contract element.
- Component Lab pages: wait for `component-lab` plus the active renderer container.
- Multi-step helpers: perform the zero-error assertion at the end of the helper so all callers inherit the same contract.

## Anti-Patterns

- Do not hand-roll `page.on('console')` and `page.on('pageerror')` in each spec unless the test is doing diagnostics beyond the shared baseline.
- Do not keep standalone "zero console errors" tests for pages already covered by the shared page-entry gate.
- Do not weaken the gate with broad noise filters beyond the shared fixture-level known-noise list.

## References

- `tests/e2e/fixtures.ts`
- `tests/e2e/component-lab/helpers.ts`
- `docs/skills/exploratory-e2e-testing-prompt.md`
