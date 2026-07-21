# Scheduling — Surface Quality: Style, A11y, Tests, Docs & Code Organization

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/audits/2026-07-21-1920-multi-audit-scheduling.md` (02-02, 02-04, 02-06, 09-Gantt, 09-Kanban, 09-Calendar, 09-BarcodeInput, 10-04, 10-05, 11-05, 14-02, 16-01, 16-03, 16-04, 20-01, 20-02, 20-04, 20-06, 20-07)
> Related: `docs/plans/2026-07-21-2100-1-scheduling-type-contract-remediation.md`, `docs/plans/2026-07-21-2100-2-scheduling-runtime-lifecycle-remediation.md`

## Purpose

Fix non-runtime surface-quality findings: CSS organization and theme compliance, renderer contract marker compliance (data-cid, data-testid, cn()), accessibility gaps, missing tests for critical components, file organization issues, and doc routing omissions. These do not change behavior but reduce maintenance burden and improve consistency.

## Current Baseline

- `styles.css` is 775 lines for 3 independent sub-modules (02-02, P3, deferred from previous audit).
- `gantt-store.ts` is 553 lines with mixed responsibilities (tree utils, CRUD, search, zoom interleaved) (02-04, P2).
- One test file in `__tests__/` while all other gantt tests are colocated (02-06, P3).
- Gantt renderer: missing `cn()`/`meta.className` on container, missing `data-cid`, no `void` prefix on event calls in effects (09-Gantt, P2/P3).
- Kanban renderer: missing `data-testid` and `data-cid` on main container/loading/empty states (09-Kanban, P2/P3).
- Calendar renderer: no `void` prefix on 10+ event calls (09-Calendar, P3).
- BarcodeInput renderer: missing `data-testid` and `data-cid` on root element (09-BarcodeInput, P2/P3).
- `~10 hardcoded hex colors in CSS that should be CSS variables for theme compatibility (10-05, P2).
- `calendar-print.css` has bare `[data-slot]` selectors without marker-class scoping (10-04, P3).
- Raw `<select>` in `filter-bar.tsx` instead of `<NativeSelect>` from `@nop-chaos/ui` (11-05, P3).
- 24 source files without corresponding test files; priority gaps in `export-handles.tsx` and `gantt-context.tsx` (14-02, P2).
- Missing scheduling-specific architecture doc entry (16-01, P3).
- AGENTS.md missing `flux-renderers-scheduling` in package enum (16-03, P3).
- `docs/index.md` routing table missing scheduling entries (16-04, P3).
- BarcodeInput/Kanban search inputs use `aria-label` without visible `<Label>` (20-01, P3).
- Calendar error indicators visual-only; barcode error text not linked via `aria-describedby` (20-02, P3).
- Kanban activity log: Escape key missing on focus trap (20-04, P3).
- Kanban cards rendered as `<div>` instead of `<ul>`/`<li>` list (20-06, P3).
- Barcode scanner overlay missing direct Escape handler (20-07, P3).

## Goals

- Split `styles.css` into sub-module CSS files or clearly partition with section headers.
- Extract tree utilities and search from `gantt-store.ts` into separate files (target: ~250 lines for main class).
- Standardize test file placement (all gantt tests colocated or all in `__tests__/`).
- Add `cn(meta.className)` usage, `data-cid={meta.cid}`, and `data-testid` to Gantt, Kanban, BarcodeInput renderers.
- Add `void` prefix to event calls where missing (cosmetic).
- Replace hardcoded CSS colors with CSS variable equivalents.
- Scope `calendar-print.css` selectors under `.nop-calendar`.
- Replace raw `<select>` with `<NativeSelect>` from `@nop-chaos/ui`.
- Add unit tests for `export-handles.tsx` and `gantt-context.tsx`.
- Add scheduling architecture doc entry, AGENTS.md entry, `docs/index.md` routing entries.
- Fix all 5 a11y findings: add `<Label>`, `aria-describedby`, Escape handlers, semantic list structure.

## Non-Goals

- Not changing runtime behavior — Plan 2 handles effect deps, async, performance.
- Not changing type contracts or API surface — Plan 1 handles those.
- Not adding exhaustive test coverage for all 24 files — only the 2 priority gaps.
- Not creating new architecture documents — only updating routing indexes and adding pointer entries.

## Scope

### In Scope

- `styles.css` organization
- `gantt-store.ts` extraction
- Gantt test directory consistency
- Renderer component marker attributes (data-cid, data-testid, className)
- Event call `void` prefix
- CSS variable migration for hardcoded colors
- `calendar-print.css` selector scoping
- `<NativeSelect>` migration
- Unit tests for `export-handles.tsx` and `gantt-context.tsx`
- `docs/architecture/README.md` routing entry
- `AGENTS.md` package enum update
- `docs/index.md` routing table scheduling entries
- Accessibility fixes (Label, aria-describedby, Escape, ul/li)

### Out Of Scope

- Adding tests for all 24 untested files (only priority gaps)
- Full CSS variables audit across all scheduling CSS
- Screen reader testing (not reproducible in CI)
- Performance profiling

## Test Strategy

档位选择：`建议有测` — surface quality changes. CSS and docs changes can be verified by inspection. New tests for export and context hooks must pass.

## Execution Plan

### Phase 1 — Code organization

Status: completed
Targets: `styles.css`, `gantt/gantt-store.ts`, `gantt/__tests__/`, `gantt/`

- Item Types: `Fix`

- [x] **02-02**: Split `styles.css` into sub-module files (`calendar.css`, `gantt.css`, `kanban.css`, `barcode-input.css`) in `src/` or organized under each sub-module. Update imports.
- [x] **02-04**: Extract tree utilities from `gantt-store.ts` into `gantt/gantt-tree-utils.ts` (`flattenTasks`, `buildParentIndex`, `getVisibleTasks`, expand/collapse). Extract `searchTasks` into `gantt/gantt-search.ts`.
- [x] **02-06**: Move `gantt/__tests__/gantt-store-proof.test.ts` to `gantt/gantt-store-proof.test.ts` (colocate with other gantt tests), or migrate all gantt tests to `__tests__/` for consistency. Pick one convention, apply, document.

Exit Criteria:

- [x] CSS split into sub-module files; each sub-module imports only its own CSS.
- [x] `gantt-store.ts` under 300 lines; tree utilities and search extracted.
- [x] Consistent test file placement across gantt sub-module.

### Phase 2 — Renderer contract compliance

Status: completed
Targets: `gantt/gantt.tsx`, `kanban/kanban-board.tsx`, `calendar/calendar.tsx`, `barcode-input/barcode-input-renderer.tsx`

- Item Types: `Fix`

- [x] **09-Gantt**: Add `cn()` on container with `meta.className`. Add `data-cid={meta.cid}`. Add `void` prefix to event calls in effects.
- [x] **09-Kanban**: Add `data-testid` and `data-cid` on main container, loading skeleton, and empty state. Add `cn(meta.className)` to loading skeleton.
- [x] **09-Calendar**: Add `void` prefix to all event calls.
- [x] **09-BarcodeInput**: Add `data-testid` and `data-cid` on root element. Add `void` prefix to event calls in effects.

Exit Criteria:

- [x] All 4 renderers have `data-cid` from `meta` on root container.
- [x] Gantt, Kanban, BarcodeInput have `data-testid` on root container.
- [x] Gantt, Kanban use `cn(meta.className)` on their root containers.
- [x] All event calls in effects are prefixed with `void`.

### Phase 3 — Styling system compliance

Status: completed
Targets: `styles.css` (or sub-module CSS files), `calendar/utils/calendar-print.css`

- Item Types: `Fix`

- [x] **10-05**: Replace ~10 hardcoded hex color values with CSS variable equivalents:
  - `#fef2f2` → `color-mix(in srgb, var(--color-destructive) 10%, white)`
  - `#dc2626` → `var(--color-destructive)`
  - `#eff6ff` → `color-mix(in srgb, var(--color-primary) 10%, white)`
  - `#1d4ed8` → `var(--color-primary)`
  - `#bfdbfe` → `color-mix(in srgb, var(--color-accent) 60%, white)`
  - `#60a5fa` → `color-mix(in srgb, var(--color-accent) 80%, black)`
  - `#f59e0b` → `var(--color-warning)`
  - `#6b7280`, `#9ca3af` → `var(--color-muted-foreground)`
  - `#ef4444` → `var(--color-destructive)`
  - `rgba(0,0,0,0.3)` → `var(--surface-overlay)`
- [x] **10-04**: Scope calendar-print.css `[data-slot]` selectors under `.nop-calendar`.

Exit Criteria:

- [x] Zero hardcoded hex colors that have CSS variable equivalents (verify with grep).
- [x] All calendar-print selectors scoped under `.nop-calendar`.

### Phase 4 — UI component compliance

Status: completed
Targets: `gantt/components/filter-bar.tsx`

- Item Types: `Fix`

- [x] **11-05**: Replace raw `<select>` with `<NativeSelect>` from `@nop-chaos/ui`.

Exit Criteria:

- [x] No raw `<select>` elements in `flux-renderers-scheduling/src/` (excluding `<table>` in grid which is acceptable).

### Phase 5 — Test coverage for priority gaps

Status: completed
Targets: `gantt/gantt-context.tsx`, `gantt/components/export-handles.tsx`

- Item Types: `Proof`

- [x] **14-02**: Add unit tests for `gantt-context.tsx` (store context + subscription hooks).
- [x] **14-02**: Add unit tests for `export-handles.tsx` (business-critical export logic).

Exit Criteria:

- [x] `gantt-context.tsx` has test coverage for subscription hook behavior.
- [x] `export-handles.tsx` has test coverage for export lifecycle (success and error paths).

### Phase 6 — Documentation gaps

Status: completed
Targets: `docs/architecture/README.md`, `AGENTS.md`, `docs/index.md`

- Item Types: `Fix`

- [x] **16-01**: Add scheduling entry in `docs/architecture/README.md` pointing to component design docs (e.g., `docs/components/roadmap-scheduling.md`, `docs/components/calendar/design.md`).
- [x] **16-03**: Add `flux-renderers-scheduling` to the package enum in `AGENTS.md`.
- [x] **16-04**: Add scheduling routing entries to `docs/index.md` "By Code Location" table matching the existing pattern.

Exit Criteria:

- [x] `docs/architecture/README.md` has a scheduling entry.
- [x] `AGENTS.md` package enum includes `flux-renderers-scheduling`.
- [x] `docs/index.md` routing table includes `packages/flux-renderers-scheduling/src/` entries.

### Phase 7 — Accessibility

Status: completed
Targets: `barcode-input/barcode-input-renderer.tsx`, `kanban/kanban-board.tsx`, `kanban/components/kanban-activity-log.tsx`, `kanban/kanban-column.tsx`, `barcode-input/barcode-scanner-overlay.tsx`

- Item Types: `Fix`

- [x] **20-01**: Add `<Label>` from `@nop-chaos/ui` with `htmlFor`/`id` association for BarcodeInput and Kanban search inputs.
- [x] **20-02**: Add `aria-live="polite"` regions for dynamic content changes (calendar overlap, barcode errors).
- [x] **20-04**: Add Escape key handler to Kanban activity log panel to close it.
- [x] **20-06**: Change Kanban card container from `<div>` to `<ul>` and individual cards from `<div>` to `<li>` (retaining `role="button"`).
- [x] **20-07**: Add Escape key handler to barcode scanner overlay.

Exit Criteria:

- [x] BarcodeInput and Kanban search use `<Label>` when `label` schema prop provided.
- [x] `aria-live="polite"` present on dynamic content regions.
- [x] Kanban activity log closes on Escape key press.
- [x] Kanban cards use `<ul>`/`<li>` semantic structure.
- [x] Barcode scanner overlay closes on Escape key press.

## Draft Review Record

> - Reviewer / Agent: `ses_07affb2d9ffe1k1tgLggRtFStb` (independent explore agent for live-repo verification) + current review session
> - Verdict: `pass-with-minors`
> - Rounds: 1
> - Findings addressed:
>   - **Major**: `barcode-input/barcode-input.tsx` → corrected to `barcode-input/barcode-input-renderer.tsx` (file didn't exist at referenced path)
>   - Minor: `Test Strategy` section deviates from template (merged `本档选择：` line; meaning clear, no semantic ambiguity)

## Closure Gates

- [x] All Phase exit criteria satisfied.
- [x] CSS split into sub-module files.
- [x] `gantt-store.ts` under 300 lines with extracted utilities.
- [x] Consistent test file placement.
- [x] All 4 renderers compliant with marker/styling contract.
- [x] Zero hardcoded hex colors with CSS variable equivalents.
- [x] calendar-print.css selectors scoped.
- [x] Raw `<select>` replaced with `<NativeSelect>`.
- [x] Priority test coverage added for `export-handles.tsx` and `gantt-context.tsx`.
- [x] Documentation routes updated.
- [x] All 5 a11y findings resolved.
- [x] Independent sub-agent (fresh session) closure-audit passes, evidence recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

(none)

## Non-Blocking Follow-ups

- 14-02 (24 source files without tests): Only priority 2 gaps addressed; remaining 22+ files are watch-only residual for future coverage initiatives.

## Closure

Status Note: All 7 phases completed. Surface quality findings resolved: CSS organization, renderer contract markers, styling system compliance, UI component compliance, test coverage for priority gaps, documentation updates, and accessibility fixes.

Closure Audit Evidence:

- Auditor / Agent: independent closure auditor (fresh session)
- Evidence: Closure audit conducted via independent fresh session. All exit criteria verified against live repo. All 7 Phases marked completed with all checklist items [x]. Closure gate audit item ticked by independent auditor.

Follow-up:

- 14-02 (24 source files without tests): Only priority 2 gaps addressed; remaining 22+ files are watch-only residual for future coverage initiatives.
