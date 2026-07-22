# 1 — Scheduling Timezone & Date Correctness

> Plan Status: completed
> Last Reviewed: 2026-07-22
> Source: `docs/audits/2026-07-22-0908-multi-audit-scheduling.md` (D21-01/02/03/10/11/17/18, D23-08), `docs/audits/2026-07-22-0908-open-audit-scheduling.md`
> Related: `docs/plans/2026-07-22-0915-2-scheduling-contract-drift.md`, `docs/plans/2026-07-22-0915-3-scheduling-quality-polish.md`

## Purpose

Fix all UTC/local timezone getter mismatches across `flux-renderers-scheduling` date utilities (gantt and calendar) so that weekend marking, today-marker, date positions, and scale-range calculations are correct regardless of the user's local timezone offset.

## Current Baseline

- Gantt `date.ts` mostly uses `getUTCFullYear/getUTCMonth/getUTCDate/getUTCDay` but 8 functions still use local getters (`getFullYear/getMonth/getDate`): `diffInDays`, `getMonthStart`, `getMonthEnd`, `getQuarterStart`, `getQuarterEnd`, `getYearStart`, `getYearEnd`, `getISOWeek`
- Calendar `calendar-date-utils.ts` uses local getters in 8 functions: `getMonthStartEnd`, `getWeekStartEnd`, `getDayStartEnd`, `isWeekend`, `diffInDays`, `getDaysInMonth`, `getMonthDays`
- `gantt/gantt-markers.tsx` uses `new Date()` (local) for today-marker construction
- `gantt/gantt-cellgrid.tsx` uses `.getDay()` for weekend check
- `calendar/utils/calendar-time-utils.ts` `allocateConcurrentWidths` fails on date-only event overlap detection
- Test assertions in `date.test.ts` and `calendar-date-utils.test.ts` use local getters, masking errors in UTC CI
- Calendar `isToday` constructs UTC-midnight from local-time getters — borderline but functional

## Goals

- All date utility functions in `flux-renderers-scheduling` use consistent UTC getters
- Today-marker, weekend highlighting, and date positions work correctly for users in negative UTC offsets
- Timezone-sensitive tests pass regardless of `TZ` environment variable
- Calendar week/day event filtering uses consistent date parsing
- Calendar `maxConcurrent: 0` treated as unbounded instead of silently defaulting to 4
- Calendar month view shows "+N more" overflow indicator

## Non-Goals

- No i18n/localization of calendar locale (covered by Plan 3)
- No architectural changes to date storage format

## Scope

### In Scope

- Fix all local getter calls in `gantt/utils/date.ts` (`diffInDays`, `getMonthStart`, `getMonthEnd`, `getQuarterStart`, `getQuarterEnd`, `getYearStart`, `getYearEnd`, `getISOWeek`)
- Fix all local getter calls in `calendar/utils/calendar-date-utils.ts` (`getMonthStartEnd`, `getWeekStartEnd`, `getDayStartEnd`, `isWeekend`, `diffInDays`, `getDaysInMonth`, `getMonthDays`)
- Fix `gantt/gantt-markers.tsx` today-marker construction
- Fix `gantt/gantt-cellgrid.tsx` weekend check
- Fix `gantt/utils/layout.ts` pixelToDate precision loss
- Fix `calendar/utils/calendar-time-utils.ts` `allocateConcurrentWidths` date-only overlap
- Fix `calendar/utils/calendar-layout-utils.ts` `maxConcurrent: 0` handling
- Add "+N more" overflow indicator in calendar month view
- Fix calendar week/day view event filter string-date comparison
- Fix test assertions in `gantt/utils/date.test.ts` and `calendar-date-utils.test.ts` to use UTC getters
- Run full scheduling test suite with `TZ=America/New_York` to verify

### Out Of Scope

- Calendar locale/i18n support
- Performance optimization of date calculations

## Test Strategy

**必须自动化** — timezone correctness is a cross-platform correctness issue. TZ-dependent tests must be parameterized or environment-independent.

## Execution Plan

### Phase 1 — Fix gantt date utilities and tests

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/utils/date.ts`, `gantt/gantt-markers.tsx`, `gantt/gantt-cellgrid.tsx`, `gantt/utils/layout.ts`, `gantt/utils/date.test.ts`

- Item Types: `Fix | Fix | Fix | Fix | Proof`

- [x] `gantt/utils/date.ts`: Replace local getters with UTC getters in `diffInDays`, `getMonthStart`, `getMonthEnd`, `getQuarterStart`, `getQuarterEnd`, `getYearStart`, `getYearEnd`, `getISOWeek`
- [x] `gantt/gantt-markers.tsx`: Replace `new Date()` with `Date.UTC(...)` for today-marker
- [x] `gantt/gantt-cellgrid.tsx`: Replace `getDay()` with `getUTCDay()` for weekend cell check
- [x] `gantt/utils/layout.ts`: Replace fractional-day `setUTCDate` with millisecond-precision arithmetic
- [x] `gantt/utils/date.test.ts`: Replace all local getter assertions (`getDay`, `getMonth`, `getFullYear`, `getDate`) with UTC equivalents

Exit Criteria:

- [x] All `gantt/utils/date.ts` functions use only UTC getters
- [x] Today-marker in gantt is correct regardless of timezone
- [x] Weekend cells render correctly in negative UTC offsets
- [x] `pixelToDate` uses millisecond-precision arithmetic
- [x] Gantt date tests pass with `TZ=America/New_York`

### Phase 2 — Fix calendar date utilities and tests

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-date-utils.ts`, `calendar/utils/calendar-layout-utils.ts`, `calendar/utils/calendar-time-utils.ts`, `calendar/utils/calendar-date-utils.test.ts`

- Item Types: `Fix | Fix | Fix | Fix | Fix | Fix | Proof`

- [x] `calendar-date-utils.ts`: Replace local getters with UTC getters in all 8 affected functions
- [x] `calendar-layout-utils.ts`: Treat `maxConcurrent <= 0` as unbounded
- [x] `calendar-layout-utils.ts`: Add "+N more" chip rendering when events exceed maxConcurrent
- [x] `calendar-time-utils.ts`: Add detection of time-component absence in `allocateConcurrentWidths`
- [x] Calendar week/day event filter: apply consistent `parseISODate` on both sides or document date-only requirement
- [x] Calendar `isToday` boundary: ensure correct with documented assumption
- [x] Fix `calendar-date-utils.ts` assertions to use UTC getters

Exit Criteria:

- [x] All `calendar-date-utils.ts` functions use only UTC getters
- [x] `maxConcurrent: 0` allows unlimited events (no silent cap at 4)
- [x] Date-only events in calendar week/day view are shown concurrently (not collapsed into same column)
- [x] "+N more" indicator shown when events exceed maxConcurrent in month view
- [x] Calendar date tests pass with `TZ=America/New_York`

### Phase 3 — Full verification

Status: completed
Targets: `packages/flux-renderers-scheduling/`

- Item Types: `Proof`

- [x] Run `pnpm --filter @nop-chaos/flux-renderers-scheduling test` with default TZ
- [x] Run `TZ=America/New_York pnpm --filter @nop-chaos/flux-renderers-scheduling test`
- [x] Run `TZ=Asia/Shanghai pnpm --filter @nop-chaos/flux-renderers-scheduling test`
- [x] `pnpm typecheck` passes

Exit Criteria:

- [x] All tests pass in UTC, America/New_York, and Asia/Shanghai timezones
- [x] `pnpm typecheck` passes

## Draft Review Record

> Filled after independent MISSION_DRIVER closure audit (fresh session).

- Reviewer / Agent: MISSION_DRIVER (independent closure auditor)
- Verdict: All phases complete — all UTC/local getter mismatches fixed, all tests pass across 3 TZs, typecheck/build/lint all green.
- Rounds: 1
- Findings addressed: All 8 gantt date functions + 7 calendar date functions switched to UTC getters; today-marker/weekend/maxConcurrent/overflow/date-only event detection all verified against live codebase.

## Closure Gates

- [x] All UTC/local getter mismatches in gantt and calendar date utilities fixed
- [x] Today-marker, weekend highlighting, and date positions verified correct in negative UTC offsets
- [x] Calendar overflow indicator and maxConcurrent semantics working correctly
- [x] All affected tests pass across three timezones (UTC, America/New_York, Asia/Shanghai)
- [x] No silent failures or regressions introduced
- [x] No owner-doc update required (bug-fix-only scope; architecture unchanged)
- [x] By independent sub-agent (fresh session) executed closure-audit completed and documented
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None — all P1 timezone findings are in scope.

## Non-Blocking Follow-ups

- D21-14 (milestone $w set to cellWidth): cosmetic, does not affect correctness
- D21-15 (baseline deviation label overflow above SVG viewport): near-zero-impact edge case
- D21-20 (redundant "no schedule data" in month view): cosmetic, not a P1/P2

## Closure

Status Note: All phases completed. All UTC/local getter mismatches in gantt and calendar date utilities fixed and verified against live codebase.

Closure Audit Evidence:

- Auditor / Agent: MISSION_DRIVER (independent closure auditor, fresh session)
- Evidence: Verified via grep/glob/read against live codebase:
  - `gantt/utils/date.ts` — all 8 functions (diffInDays, getMonthStart, getMonthEnd, getQuarterStart, getQuarterEnd, getYearStart, getYearEnd, getISOWeek) use only UTC getters. Zero local getter calls remain.
  - `calendar/utils/calendar-date-utils.ts` — all 7 functions (getMonthStartEnd, getWeekStartEnd, getDayStartEnd, isWeekend, diffInDays, getDaysInMonth, getMonthDays) use only UTC getters. `isToday` uses local getters wrapped in Date.UTC (intentional, documented assumption).
  - `gantt/gantt-markers.tsx` — today-marker uses `Date.UTC(...)`
  - `gantt/gantt-cellgrid.tsx` — weekend check uses `getUTCDay()`
  - `gantt/utils/layout.ts` — `pixelToDate` uses millisecond-precision arithmetic
  - `calendar/utils/calendar-layout-utils.ts` — `maxConcurrent <= 0` as unbounded, "+N more" overflow mechanism present
  - `calendar/utils/calendar-time-utils.ts` — date-only event detection with column isolation
  - `gantt/utils/date.test.ts` and `calendar-date-utils.test.ts` — all assertions use UTC getters
  - Tests pass: 697/697 (UTC), 697/697 (America/New_York), 697/697 (Asia/Shanghai)
  - `pnpm typecheck` 56/56, `pnpm build` 30/30, `pnpm lint` 30/30

Follow-up:

- No remaining plan-owned work
