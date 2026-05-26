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
- Supported specs must use the fixture-managed `page` from `tests/e2e/fixtures.ts` when calling `assertTrackedPageErrors(page)`.
- Do not create an extra page with `browser.newContext().newPage()` or popup-like flows and then call `assertTrackedPageErrors(page)` on that untracked page; this now fails loudly to prevent false-positive gate coverage.

## Allowed Exceptions

Exceptions are rare and must be explicit in the test body.

- If a test intentionally triggers `console.error`, call `allowConsoleErrors(n)` with the exact allowed count.
- If a test intentionally triggers `pageerror`, call `allowPageErrors(n)` with the exact allowed count.
- Do not silently filter new errors in individual specs.
- CI forbids `test.only(...)` and `describe.only(...)` through `playwright.config.ts`; keep focused E2E runs local-only.
- Diagnostic-only specs that primarily capture screenshots, dump DOM/HTML, print console state, inspect React fiber internals, or query `window.__NOP_DEBUGGER_API__` must be explicitly isolated with `test.skip(...)` / `test.describe.skip(...)` unless and until the suite gains a dedicated non-supported diagnostic project.

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
- Do not simulate compliance by calling `assertTrackedPageErrors(page)` on an untracked page object.
- Do not treat debug-only probes such as `[data-slot="scope-debug-json"]` as the primary success oracle for supported E2E coverage.
- Do not treat synthetic test hooks or `page.evaluate()`-dispatched custom events as substitutes for a real user interaction path when the supported claim is about visible end-to-end behavior.
- Do not leave screenshot-generation, HTML dump, console dump, or debugger-internal inspection specs active in the default supported suite.

## References

- `tests/e2e/fixtures.ts`
- `tests/e2e/component-lab/helpers.ts`
- `docs/skills/exploratory-e2e-testing-prompt.md`
