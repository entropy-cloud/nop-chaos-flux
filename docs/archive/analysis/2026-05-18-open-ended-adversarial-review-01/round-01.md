# Open-Ended Adversarial Review — 2026-05-18 — Round 01

## Finding 1

- Where: `packages/nop-debugger/src/panel/use-inspect-mode.ts:8-14`, `packages/nop-debugger/src/panel/use-inspect-mode.ts:111-123`, `packages/nop-debugger/src/panel/use-inspect-mode.ts:136-152`, `packages/nop-debugger/src/controller-component-inspector.ts:317-359`
- What: the debugger's element-picking flow is not runtime-scoped even though the debugger contract says `cid` is only runtime-local. `useInspectMode()` listens on the whole `document`, accepts any clicked `[data-cid]`, and then calls `inspectByElement()`. `inspectByElement()` climbs to the nearest `[data-cid]` and immediately resolves that `cid` against the current controller's registry, without checking whether the clicked element belongs to the controller's active runtime root.
- Why it matters: on a page with multiple Flux runtimes, clicking an element from runtime B can resolve a same-number `cid` from runtime A's registry and show the wrong inspect payload, while the overlay still highlights the foreign DOM node. This is exactly the kind of cross-runtime false diagnosis that the debugger docs forbid, and it hits the main panel "Pick element" path rather than a niche helper.
- Confidence: certain
- Discovery source: cross-boundary messenger / contract archaeology
- Evidence:
  - The runtime contract explicitly requires DOM correlation to narrow to `[data-runtime-id="..."]` because `cid` is runtime-local: `docs/architecture/debugger-runtime.md:187-191`.
  - `inspectByCid()` implements runtime-scoped DOM lookup through `queryRuntimeScopedElement()`, but `inspectByElement()` does not reuse that guard; it trusts any DOM owner marker and resolves the naked `cid` directly.
  - The panel's inspect mode is wired to `document`-level mouse/click listeners, so this affects the primary UI path, not only direct automation callers.
- Non-duplication note: recent open-ended review summaries covered dialog error boundaries, compile-time field loss, cache-key truncation, and async/owner defects, but not debugger multi-runtime inspect routing.

## Finding 2

- Where: `tests/e2e/fixtures.ts:24-27`, `tests/e2e/fixtures.ts:50-52`, `tests/e2e/fixtures.ts:87-105`, `tests/e2e/code-editor.spec.ts:189-208`, `docs/testing/e2e-standards.md:7-19`
- What: the shared E2E page-error gate can silently become a no-op. `assertTrackedPageErrors(page)` only invokes a hidden page method if `__nopAssertZeroPageErrors__` exists; otherwise it resolves without asserting anything. The hidden hook is only installed on the default fixture `page`, but `tests/e2e/code-editor.spec.ts` creates a fresh page via `browser.newContext().newPage()` and still calls `openCodeEditor(page)`, whose internal `assertTrackedPageErrors(page)` therefore does nothing.
- Why it matters: the repo's E2E standard says every page-entry test must treat zero `console.error` and zero `pageerror` as a hard contract. Today a spec can appear compliant by calling the helper while actually skipping the contract entirely. The clipboard test in `code-editor.spec.ts` is a concrete live instance, and the same hole applies to any future popup or custom page created outside the fixture.
- Confidence: certain
- Discovery source: contract archaeology / test-perimeter review
- Evidence:
  - `docs/testing/e2e-standards.md` makes the shared fixture-based zero-error gate mandatory.
  - `assertTrackedPageErrors(page)` uses optional chaining and has no failure path for untracked pages.
  - The clipboard test creates a non-fixture page, then calls `openCodeEditor(page)`, which appears to enforce the gate but actually cannot.
- Non-duplication note: recent adversarial-review summaries discussed E2E gaps as an uncovered area but did not report this specific hidden no-op path or the concrete `code-editor.spec.ts` instance.

## Finding 3

- Where: `tests/e2e/debugger-meta-diagnostic.spec.ts:13-61`, `docs/architecture/debugger-runtime.md:247-277`
- What: `debugger-meta-diagnostic.spec.ts` is presented as an E2E test for live meta explanation behavior, but it never asserts the explanation contract it gathers. After a hard-coded `waitForTimeout(1200)`, it dumps a large diagnostic object to `console.log` and only asserts `fieldCid > 0`.
- Why it matters: this gives CI a green test that does not fail when `explainNodeMeta()` returns the wrong source, wrong value, empty payload, or mismatched nearby-node diagnostics. The debugger architecture doc explicitly positions explanation APIs as automation-facing contracts; this spec currently protects only the existence of one DOM node, not the advertised debugger behavior.
- Confidence: certain
- Discovery source: newcomer confusion / test-contract audit
- Evidence:
  - The test collects `inspect`, `inputInspect`, `meta`, `inputMeta`, and `nearby`, but none of them participate in assertions.
  - The test relies on a fixed `1200ms` delay instead of waiting for the actual contract condition.
  - The file lives in the main `tests/e2e/` suite rather than `tests/e2e/exploratory/`, so it contributes false confidence to the supported regression surface.
- Non-duplication note: this is different from earlier reports about missing test coverage in general; it is a concrete existing spec whose assertions do not cover its stated purpose.

## Round Assessment

The common pattern in this round is diagnostic infrastructure that looks stricter than it really is:

- the debugger's element-inspection path claims runtime-local identity but still accepts page-global DOM hits
- the E2E zero-error gate claims to be shared and mandatory but can silently disengage on untracked pages
- a debugger-contract E2E spec looks like a regression test but currently behaves like a logging script

These are high-value because they weaken the project's ability to trust its own observability and test surfaces.
