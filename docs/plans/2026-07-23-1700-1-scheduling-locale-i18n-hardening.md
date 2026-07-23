# 1 — Scheduling Locale & i18n Hardening

> Plan Status: completed
> Last Reviewed: 2026-07-23
> Source: Live-repo audit of deferred code-quality items from `docs/plans/2026-07-22-2359-1-scheduling-p2-p3-residual-fixes.md`, `docs/plans/2026-07-22-0915-3-scheduling-quality-polish.md`; confirmed by live code inspection
> Related: `docs/components/{calendar,kanban}/design.md`

## Purpose

Fix all confirmed hardcoded locale and i18n gaps across scheduling components — Calendar weekday labels use static maps instead of `Intl.DateTimeFormat`, Calendar sub-views render contradictory empty states when parent already guards, and Kanban activity log renders purely in Chinese regardless of user locale. The result is locale-consistent scheduling components that respect the user's configured locale.

## Current Baseline

- Calendar design doc (`docs/components/calendar/design.md`) does not list the `locale` prop in its props table (approx lines 88-114), but the code accepts it.
- Kanban design doc (`docs/components/kanban/design.md`) lists the activity log as deferred ("P3 deferred — 不内置活动日志实体" in the decision table), but a functional activity log now exists in code — design doc is stale on this point.

- Calendar month-view (`calendar-month-view.tsx:32-35` static map, `:37-43` helper function) and week-view (`calendar-week-view.tsx:27-30`) define static `WEEKDAY_LABELS`/`WEEKDAY_SHORT` maps with only `zh-CN` and `en-US` entries. Any other locale silently falls back to `en-US`.
- Calendar day-view (`calendar-day-view.tsx:74`) correctly uses `toLocaleDateString(locale, ...)` — proving the locale prop is available and the pattern exists.
- Calendar parent component (`calendar.tsx:447-460`) shows a full-page empty state when both `eventsData` and `resourcesData` are empty. Sub-views (`month-view.tsx:363-367`, `week-view.tsx:170-174`, `day-view.tsx:135-139`) have independent empty-state checks that render "no schedule data" even when the parent synthesizes a default resource — creating a contradictory display of data rows + empty-state text.
- Kanban activity log (`kanban-activity-log.tsx:38-51,54-65,109,122`) contains hardcoded Chinese strings for all activity descriptions, relative-time labels, header, and empty-state text. The file does not import `t()` from `@nop-chaos/flux-i18n` at all.
- All P0/P1/P2/P3 defect fixes across the scheduling package are completed and verified.

## Goals

- Replace all static locale maps in Calendar views with `Intl.DateTimeFormat`-based formatting, matching the day-view pattern.
- Fix Calendar sub-view empty-state guards to prevent contradictory rendering when parent already provides a default resource.
- Migrate Kanban activity log all hardcoded Chinese strings to proper `t()` i18n calls.
- Verify that no other hardcoded locale strings remain in scheduling components.

## Non-Goals

- No changes to the i18n infrastructure or `t()` function behavior.
- No addition of new locale keys — existing keys in the i18n bundle must be used, or new keys added only through the standard pattern.
- No changes to Calendar layout, interaction, or performance.
- No accessibility ARIA changes (covered by Plan 2).
- No cross-cutting convention cleanup beyond these specific findings.

## Scope

### In Scope

- Calendar month-view: replace `WEEKDAY_LABELS` static map with `Intl.DateTimeFormat` (pattern: day-view's existing `toLocaleDateString` usage)
- Calendar week-view: replace `WEEKDAY_SHORT` static map with `Intl.DateTimeFormat`
- Calendar sub-views: remove redundant empty-state rendering when parent already handles empty state + default resource synthesis keeps rendering consistent
- Kanban activity log: replace every hardcoded Chinese string with `import { t } from '@nop-chaos/flux-i18n'` calls using existing or new locale keys
- Verify scheduling package `packages/*/src/**/*.tsx` for any other hardcoded locale-dependent strings

### Out Of Scope

- Full i18n audit across all packages
- Temporal API / Intl polyfill for legacy browsers
- Calendar `timezoneSelector` or timezone formatting (covered by S5.7 design)
- `project-context.md` freshness update (covered by Plan 2)

## Failure Paths

Not applicable — all changes are localized string rendering and empty-state guard logic. No external API, auth, or error-handling surface changes.

## Test Strategy

档位选择：建议有测

Each fix must include a focused unit or integration test that verifies locale-dependent rendering (e.g., assert weekday labels change with locale, activity log renders in English with `en-US` locale).

## Execution Plan

### Phase 1 — Calendar Locale Hardening

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx`, `calendar-week-view.tsx`

- Item Types: `Fix | Proof`

- [x] Replace `WEEKDAY_LABELS` in `calendar-month-view.tsx` with `Intl.DateTimeFormat(locale, { weekday: 'short' }).format()` — same pattern as `calendar-day-view.tsx:74`. Use reference dates (e.g., `new Date(2026, 0, 4 + i)` for Monday=0 through Sunday=6) to cover 7 weekday indices.
- [x] Replace `WEEKDAY_SHORT` in `calendar-week-view.tsx` with the same `Intl.DateTimeFormat` pattern using reference dates
- [x] Add unit tests that assert `locale='de-DE'` produces German weekday abbreviations, `locale='ja-JP'` produces Japanese
- [x] Verify no regression in `zh-CN` and `en-US` rendering (existing tests must pass)

Exit Criteria:

- [x] Calendar month-view and week-view use `Intl.DateTimeFormat` for weekday labels (confirmed by grep against static maps)
- [x] Focused tests verify locale-dependent rendering for at least 3 locales
- [x] Existing Calendar tests pass

### Phase 2 — Calendar Empty-State Redundancy Fix

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx`, `calendar-week-view.tsx`, `calendar-day-view.tsx`

- Item Types: `Fix | Proof`

- [x] Audit each sub-view empty-state guard: determine whether it can ever trigger after parent's fallback resource synthesis (`calendar.tsx:418-426` synthesizes default resource when `resourcesData` is empty)
- [x] Remove sub-view empty-state checks that are dead code (never reachable after default resource creation)
- [x] Or, if any reachable path remains, consolidate into a single empty-state rendering path in the parent
- [x] Add integration test: provide events with no resources → verify sub-view renders rows (with synthesized default resource) and does NOT render "no schedule data" text

Exit Criteria:

- [x] Sub-view empty-state guards either removed or consolidated into parent
- [x] Integration test confirms no contradictory empty-state + data row rendering
- [x] Existing Calendar tests pass

### Phase 3 — Kanban Activity Log i18n

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/components/kanban-activity-log.tsx`

- Item Types: `Fix | Decision | Proof`

- [x] Check `@nop-chaos/flux-i18n` for existing keys that cover activity log text patterns
- [x] Add missing i18n keys via standard pattern (check which i18n bundle file is used by scheduling)
- [x] Replace all hardcoded Chinese strings with `t(...)` calls:
  - Activity descriptions (lines 39-50): card moved/created/deleted/updated, column created/deleted, default action
  - Relative-time labels (lines 59-64): "just now", "minutes ago", "hours ago", "days ago"
  - "Activity Log" header (line 109)
  - "No activity records" empty state (line 122)
- [x] Add unit test: render activity log with `locale='en-US'` → assert English text output

Exit Criteria:

- [x] Zero hardcoded Chinese strings in `kanban-activity-log.tsx` (confirmed by grep)
- [x] Activity log renders locale-correct text for `en-US`, `zh-CN`, and a third locale
- [x] Focused test verifies locale-dependent activity log rendering
- [x] Existing Kanban tests pass

### Phase 4 — Scheduling-Wide Locale String Sweep

Status: completed
Targets: `packages/flux-renderers-scheduling/src/`

- Item Types: `Proof`

- [x] Search for any other hardcoded locale-dependent strings across scheduling components (e.g., date format fallbacks, hardcoded month names, hardcoded AM/PM)
- [x] Fix any found with `Intl.DateTimeFormat` or `t()` calls

Exit Criteria:

- [x] Zero hardcoded locale-dependent maps or strings in scheduling package (confirmed by audit)

## Draft Review Record

> Reviewed per `docs/plans/00-plan-authoring-and-execution-guide.md` Plan Review Rule. Consensus reached (0 Blocker, 0 Major).

- Reviewer / Agent: `ses_072d0f3bdffe0yFqbmsuODiGCm` (R1), `ses_072ce419cffe7TKDHIb337nLTx` (R2 — re-review, fresh session)
- Verdict: `revised` (R1) → `pass` (R2)
- Rounds: 2
- Findings addressed:
  - **Major (Fixed)**: Phase 2 line reference corrected from `calendar.tsx:150-152` to `calendar.tsx:418-426` — the actual fallback resource synthesis location.
  - **Minor #1 (Fixed)**: Line ranges tightened — `calendar-month-view.tsx:32-43` → `:32-35,:37-43`, `calendar-week-view.tsx:27-31` → `:27-30`, `kanban-activity-log.tsx:39-64` → `:38-51,:54-65`.
  - **Minor #2 (Fixed)**: Added `Intl.DateTimeFormat` reference date approach clarification to Phase 1 execution items.
  - **Minor #3 (Added)**: Kanban design doc staleness noted in Current Baseline. Closure gate for design doc sync now explicitly covers both Calendar locale prop gap and Kanban activity log stale status.

## Closure Gates

- [x] All Calendar views use `Intl.DateTimeFormat` for locale-dependent weekday labels
- [x] Calendar sub-view empty-state rendering is consistent with parent
- [x] Kanban activity log has zero hardcoded locale-dependent strings
- [x] Scheduling-wide sweep confirms no other hardcoded locale strings
- [x] Focused tests added for each locale change
- [x] Affected owner docs updated: `design.md` — add `locale` prop to props table if missing; `kanban/design.md` — update activity log status from deferred to implemented, add i18n contract
- [x] No in-scope live defect silently downgraded to deferred
- [x] By independent sub-agent (fresh session) executed closure-audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Kanban activity log relative-time i18n infrastructure

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Proper relative-time i18n (e.g., `Intl.RelativeTimeFormat`) is a broader infrastructure concern beyond this plan. Hardcoded relative-time strings will use simple `t()` lookups with parameterized strings (e.g., `t('scheduling.kanban.minutesAgo', { count })`). Full `Intl.RelativeTimeFormat` integration is an optimization candidate for a future i18n infrastructure plan.
- Successor Required: `no`

### Calendar `timezoneSelector` locale formatting

- Classification: `watch-only residual`
- Why Not Blocking Closure: Timezone display formatting in Calendar's `timezoneSelector` is already handled by `Intl.DateTimeFormat` via day-view; non-day-view timezone formatting is a separate feature not in scope.
- Successor Required: `no`

## Non-Blocking Follow-ups

- GanttStore `new`-cast export (`gantt-store.ts:330`) — type-casting trick to make functional factory appear class-constructable. Low severity; not a functional bug.

## Closure

Status Note: All four phases completed and verified against live codebase. Calendar month/week views use `Intl.DateTimeFormat` for weekday labels (no static maps). Calendar sub-view empty-state guards removed — parent handles empty state consistently. Kanban activity log fully i18n'd with `t()` calls (zero hardcoded Chinese strings). Scheduling-wide sweep found no residual hardcoded locale-dependent strings. Owner docs updated (calendar `locale` prop added to props table, kanban activity log i18n documented). `pnpm typecheck` ✓ `pnpm build` ✓ `pnpm lint` ✓ (0 errors) `pnpm test` ✓ (809/809 passed).

Closure Audit Evidence:

- Auditor / Agent: `ses_072ba6af9ffe3i8K51DJS2uerf` (fresh independent sub-agent)
- Evidence: Live code verification via grep/glob/read of all 4 Calendar view files, Kanban activity log, 6 test files, 2 design docs. Confirmed: `Intl.DateTimeFormat` in month-view (`getWeekdayLabels()`) and week-view (inline formatter). Zero `WEEKDAY_LABELS`/`WEEKDAY_SHORT` static maps. Zero hardcoded Chinese strings in `kanban-activity-log.tsx` — all 13 UI strings use `t()` with keys in both `zh-CN.ts` and `en-US.ts`. Calendar sub-views have no empty-state rendering (integration test verifies no contradictory "no schedule data" + data rows). `pnpm typecheck` 56/56 ✓, `pnpm build` 30/30 ✓, `pnpm lint` 0 errors ✓ (1 pre-existing TanStack warning), `pnpm test` 72/72 files ✓ 809/809 tests ✓. Deferred items properly classified (out-of-scope improvement, watch-only residual). No in-scope live defect downgraded. Five-point consistency verified.

Follow-up:

- No remaining plan-owned work.
