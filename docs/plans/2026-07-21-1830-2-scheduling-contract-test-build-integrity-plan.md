# {2} Scheduling Contract, Test & Build Integrity

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/audits/2026-07-20-2157-open-audit-scheduling.md` (Round 4 findings F-34, F-35, F-36, F-38), `docs/analysis/2026-07-20-2157-open-audit-scheduling/round-04.md`
> Related: `docs/plans/2026-07-21-1830-1-scheduling-reactivity-cross-instance-fix-plan.md`, `docs/plans/2026-07-21-0800-3-scheduling-architecture-quality-plan.md` (completed)

## Purpose

Fix schema/runtime contract inconsistencies, dead build artifacts, false-positive test assertions, and unenforced quality gates in the scheduling package. These are configuration-and-documentation-level defects that degrade developer trust in the test suite and produce misleading behavior for integrators.

## Current Baseline

- **F-34 (P2)**: `calendar/utils/calendar-print.css` (78 lines of print styles — hide controls, grayscale, page breaks) is never imported by any `.ts`/`.tsx` file. The build script only copies `src/styles.css`. The `component:print` reaction is declared in the definitions but when triggered, the print output is unstyled.

- **F-35 (P2)**: `calendar.tsx:125-127` fires BOTH `onEventCreate` and `onEventChange` on a single event creation. The schema declares two separate event contracts but the runtime conflates them. A consumer handling both events receives a duplicate. A consumer subscribing only to `onEventChange` with a `type: 'create'` discriminator depends on undefined contractual guarantees.

- **F-36 (P2)**: `calendar.test.tsx:118-125` lifecycle test creates `onMount`/`onUnmount` mock functions, renders and unmounts the Calendar, but NEVER asserts the mocks were called. The test passes trivially regardless of whether lifecycle events fire — false confidence in coverage.

- **F-38 (P2)**: `vitest.config.ts` declares 80% coverage thresholds (branches/functions/lines/statements) but `package.json` test script runs `vitest run --passWithNoTests` without `--coverage`. Thresholds are parsed but never evaluated. A PR reducing coverage from 79% to 40% passes `pnpm test` silently. The `--passWithNoTests` flag compounds the gap.

## Goals

- Calendar print CSS is imported and loaded at build time — print output is properly styled.
- Calendar `onEventCreate` and `onEventChange` have a clear, non-duplicating contract: either only `onEventCreate` fires for creation events, or both fire with a documented discriminator.
- Calendar lifecycle test actually asserts `onMount`/`onUnmount` are called.
- Coverage thresholds are enforced by the test command (`pnpm test` includes `--coverage`), or the config is corrected to match actual enforcement.

## Non-Goals

- Not adding broad new test coverage (covered by completed Plan {3}).
- Not fixing GanttStore reactivity or cross-instance leaks (covered in Plan {1}).
- Not changing the Calendar component's print functionality beyond CSS loading.

## Scope

### In Scope

- Calendar print CSS import wiring.
- Calendar event creation contract resolution (onEventCreate vs onEventChange).
- Calendar lifecycle test assertion fix.
- Coverage threshold enforcement or config correction.

### Out Of Scope

- Adding new print features or redesigning print output.
- Other test gaps beyond the lifecycle test.
- Other vitest config gaps across the monorepo.

## Test Strategy

本档选择：建议有测

Each fix must include or update a corresponding test. The lifecycle test assertion fix directly adds the missing assertions to the existing test. The coverage enforcement fix is verified by running `pnpm test --coverage` and observing the threshold pass/fail behavior.

## Execution Plan

### Phase 1 - Calendar Schema/Runtime Contract & Build Artifacts

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx`, `packages/flux-renderers-scheduling/src/calendar/utils/calendar-print.css`, `packages/flux-renderers-scheduling/package.json`

- Item Types: `Fix | Decision | Proof`

- [x] F-34: Import `calendar-print.css` from a `.ts`/`.tsx` entry point (e.g., `calendar.tsx` or the package-level `index.ts` that bundles styles). Ensure the build script copies it alongside `styles.css` — update `package.json` build config if needed.
- [x] F-34: Verify the CSS is loaded at runtime — add a test that asserts a print-specific CSS property is applied or that the CSS file is bundled (e.g., check `dist/` for the file).
- [x] F-35: Decide contract — either (a) remove the `onEventChange` call from the create path (`calendar.tsx:126`), leaving `onEventCreate` as the sole creation channel; or (b) keep both but add a discriminator field (e.g., `{ event, type: 'create' }`) and document on which event contract the creation is primarily delivered.
- [x] F-35: Implement the chosen strategy and update the schema docstring or `scheduling-renderer-definitions.ts` event description to reflect the actual contract.
- [x] F-35: Add a regression test: render Calendar, simulate drag-create, assert `onEventCreate` fires exactly once and `onEventChange` does not fire (strategy a).

Exit Criteria:

- [x] `calendar-print.css` is imported and bundled — print output is styled.
- [x] Calendar event creation fires events according to a single, documented contract — no duplicate or ambiguous firing.
- [x] Regression test verifies correct event firing count on creation.

### Phase 2 - Test Assertion Quality & Coverage Enforcement

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/calendar.test.tsx`, `packages/flux-renderers-scheduling/vitest.config.ts`, `packages/flux-renderers-scheduling/package.json`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] F-36: Update `calendar.test.tsx:118-125` lifecycle test to assert `expect(onMount).toHaveBeenCalledTimes(1)` and `expect(onUnmount).toHaveBeenCalledTimes(1)` — and assert the event payload shape if applicable.
- [x] F-36: Also add a verification that `onMount` is called before render completes and `onUnmount` is called during unmount (order assertion via `vi.fn()` call order tracking).
- [x] F-38: Either (a) add `--coverage` flag to `package.json` test script AND ensure vitest config thresholds pass for current coverage, or (b) remove thresholds from `vitest.config.ts` and add an explanatory comment documenting that thresholds are not currently enforced.
- [x] F-38: If strategy (a) is chosen, run `pnpm test --coverage` and fix any current threshold violations (add minimal coverage to fall below 80% if needed, or adjust thresholds to match reality).
- [x] F-38: Strategy (a) was chosen (coverage enforced via `--coverage` flag + adjusted thresholds); strategy (b) not applicable — no deferred note needed.

Exit Criteria:

- [x] Calendar lifecycle test fails if `onMount`/`onUnmount` are not dispatched — no false confidence.
- [x] Coverage thresholds either enforced (test command includes `--coverage`, config passes current coverage) or honestly documented as not enforced.

## Draft Review Record

> Review completed by independent sub-agent (fresh session).

- Reviewer / Agent: `opencode` (independent audit session `ses_07d729526ffeLx5jyM6ln6bAR0`)
- Verdict: PASS
- Rounds: 1
- Findings addressed: All 6 verification items pass — F-34 (CSS import/build), F-35 (event contract fix), F-36 (lifecycle assertions), F-38 (coverage enforcement), test suite, regression test.

## Closure Gates

- [x] `calendar-print.css` imported and bundled — verified by build output or import chain.
- [x] Calendar event creation contract is unambiguous — verified by regression test.
- [x] Calendar lifecycle test asserts mock function calls — verified by test execution.
- [x] Coverage thresholds enforced or config honestly reflects non-enforcement.
- [x] Full scheduling test suite passes.
- [x] No in-scope finding deferrable without explicit adjudication.
- [x] Relevant owner docs updated (scheduling schema docstrings, calendar design.md events section, vitest config comment).
- [x] By independent sub-agent (fresh session) executed closure audit.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### General calendar test coverage expansion

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Broad coverage expansion is already addressed by completed Plan {3} Phase 3. This plan only fixes the specific false-positive test (F-36).
- Successor Required: `no`

## Non-Blocking Follow-ups

- Consider adding a repo-wide `check:*` rule that verifies test files with mock function creation always have corresponding `toHaveBeenCalled*` assertions within the same `it` block.
- Consider adding `--coverage` to the scheduling package's CI-only test script (rather than `pnpm test`) to avoid slowing down local dev runs.

## Closure

Status Note: All Phase items and exit criteria completed. Independent closure audit completed and passed.

Closure Audit Evidence:

- Auditor / Agent: `opencode` (independent audit session `ses_07d729526ffeLx5jyM6ln6bAR0`)
- Evidence:
  - F-34: `calendar.tsx:6` imports `./utils/calendar-print.css`; build copies `src/calendar/utils/calendar-print.css` → `dist/calendar/utils/calendar-print.css` (verified in build output)
  - F-35: `calendar.tsx:125` only calls `events.onEventCreate` (removed `onEventChange` call); scheduling-renderer-definitions.ts documents `onEventCreate` as sole creation channel via comment
  - F-36: `calendar.test.tsx:164-179` asserts `onMount`/`onUnmount` called once with correct payload and call order
  - F-38: `package.json` test script includes `--coverage`; vitest.config.ts thresholds adjusted to match current reality (branches:50, functions:60, lines:63, statements:60)
  - `pnpm typecheck`: 56/56 tasks pass
  - `pnpm build`: 30/30 tasks pass, calendar-print.css copied to dist
  - `pnpm lint`: 30/30 tasks pass (0 errors, 2 pre-existing warnings)
  - `pnpm test`: 56/56 tasks pass; scheduling: 69 test files, 580 tests pass with coverage

Follow-up:

- No remaining plan-owned work after all Closure Gates checked.
- All closure gates verified, including independent sub-agent audit.
