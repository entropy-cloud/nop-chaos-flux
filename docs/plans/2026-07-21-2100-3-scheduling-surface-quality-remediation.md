# Scheduling — Surface Quality: Style, A11y, Tests, Docs & Code Organization

> Plan Status: active
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

Status: planned
Targets: `styles.css`, `gantt/gantt-store.ts`, `gantt/__tests__/`, `gantt/`

- Item Types: `Fix`

- [ ] **02-02**: Split `styles.css` into sub-module files (`calendar.css`, `gantt.css`, `kanban.css`, `barcode-input.css`) in `src/` or organized under each sub-module. Update imports.
- [ ] **02-04**: Extract tree utilities from `gantt-store.ts` into `gantt/gantt-tree-utils.ts` (`flattenTasks`, `buildParentIndex`, `getVisibleTasks`, expand/collapse). Extract `searchTasks` into `gantt/gantt-search.ts`.
- [ ] **02-06**: Move `gantt/__tests__/gantt-store-proof.test.ts` to `gantt/gantt-store-proof.test.ts` (colocate with other gantt tests), or migrate all gantt tests to `__tests__/` for consistency. Pick one convention, apply, document.

Exit Criteria:

- [ ] CSS split into sub-module files; each sub-module imports only its own CSS.
- [ ] `gantt-store.ts` under 300 lines; tree utilities and search extracted.
- [ ] Consistent test file placement across gantt sub-module.

### Phase 2 — Renderer contract compliance

Status: planned
Targets: `gantt/gantt.tsx`, `kanban/kanban-board.tsx`, `calendar/calendar.tsx`, `barcode-input/barcode-input-renderer.tsx`

- Item Types: `Fix`

- [ ] **09-Gantt**: Add `cn()` on container with `meta.className`. Add `data-cid={meta.cid}`. Add `void` prefix to event calls in effects.
- [ ] **09-Kanban**: Add `data-testid` and `data-cid` on main container, loading skeleton, and empty state. Add `cn(meta.className)` to loading skeleton.
- [ ] **09-Calendar**: Add `void` prefix to all event calls.
- [ ] **09-BarcodeInput**: Add `data-testid` and `data-cid` on root element. Add `void` prefix to event calls in effects.

Exit Criteria:

- [ ] All 4 renderers have `data-cid` from `meta` on root container.
- [ ] Gantt, Kanban, BarcodeInput have `data-testid` on root container.
- [ ] Gantt, Kanban use `cn(meta.className)` on their root containers.
- [ ] All event calls in effects are prefixed with `void`.

### Phase 3 — Styling system compliance

Status: planned
Targets: `styles.css` (or sub-module CSS files), `calendar/utils/calendar-print.css`

- Item Types: `Fix`

- [ ] **10-05**: Replace ~10 hardcoded hex color values with CSS variable equivalents:
  - `#fef2f2` → `var(--color-destructive-100)` or equivalent
  - `#dc2626` → `var(--color-destructive)`
  - `#eff6ff` → `var(--color-primary-50)` or equivalent
  - `#1d4ed8` → `var(--color-primary)`
  - `#bfdbfe` → `var(--color-accent)` or equivalent
  - `#60a5fa` → `var(--color-accent-400)` or equivalent
  - `#f59e0b` → `var(--color-warning)`
  - `#6b7280`, `#9ca3af` → `var(--color-muted-foreground)`
  - `#ef4444` → `var(--color-destructive)`
  - `rgba(0,0,0,0.3)` → `var(--color-overlay)` or equivalent
- [ ] **10-04**: Scope calendar-print.css `[data-slot]` selectors under `.nop-calendar`.

Exit Criteria:

- [ ] Zero hardcoded hex colors that have CSS variable equivalents (verify with grep).
- [ ] All calendar-print selectors scoped under `.nop-calendar`.

### Phase 4 — UI component compliance

Status: planned
Targets: `gantt/components/filter-bar.tsx`

- Item Types: `Fix`

- [ ] **11-05**: Replace raw `<select>` with `<NativeSelect>` from `@nop-chaos/ui`.

Exit Criteria:

- [ ] No raw `<select>` elements in `flux-renderers-scheduling/src/` (excluding `<table>` in grid which is acceptable).

### Phase 5 — Test coverage for priority gaps

Status: planned
Targets: `gantt/gantt-context.tsx`, `gantt/components/export-handles.tsx`

- Item Types: `Proof`

- [ ] **14-02**: Add unit tests for `gantt-context.tsx` (store context + subscription hooks).
- [ ] **14-02**: Add unit tests for `export-handles.tsx` (business-critical export logic).

Exit Criteria:

- [ ] `gantt-context.tsx` has test coverage for subscription hook behavior.
- [ ] `export-handles.tsx` has test coverage for export lifecycle (success and error paths).

### Phase 6 — Documentation gaps

Status: planned
Targets: `docs/architecture/README.md`, `AGENTS.md`, `docs/index.md`

- Item Types: `Fix`

- [ ] **16-01**: Add scheduling entry in `docs/architecture/README.md` pointing to component design docs (e.g., `docs/components/roadmap-scheduling.md`, `docs/components/calendar/design.md`).
- [ ] **16-03**: Add `flux-renderers-scheduling` to the package enum in `AGENTS.md`.
- [ ] **16-04**: Add scheduling routing entries to `docs/index.md` "By Code Location" table matching the existing pattern.

Exit Criteria:

- [ ] `docs/architecture/README.md` has a scheduling entry.
- [ ] `AGENTS.md` package enum includes `flux-renderers-scheduling`.
- [ ] `docs/index.md` routing table includes `packages/flux-renderers-scheduling/src/` entries.

### Phase 7 — Accessibility

Status: planned
Targets: `barcode-input/barcode-input-renderer.tsx`, `kanban/kanban-board.tsx`, `kanban/components/kanban-activity-log.tsx`, `kanban/kanban-column.tsx`, `barcode-input/barcode-scanner-overlay.tsx`

- Item Types: `Fix`

- [ ] **20-01**: Add `<Label>` from `@nop-chaos/ui` with `htmlFor`/`id` association for BarcodeInput and Kanban search inputs.
- [ ] **20-02**: Add `aria-live="polite"` regions for dynamic content changes (calendar overlap, barcode errors).
- [ ] **20-04**: Add Escape key handler to Kanban activity log panel to close it.
- [ ] **20-06**: Change Kanban card container from `<div>` to `<ul>` and individual cards from `<div>` to `<li>` (retaining `role="button"`).
- [ ] **20-07**: Add Escape key handler to barcode scanner overlay.

Exit Criteria:

- [ ] BarcodeInput and Kanban search use `<Label>` when `label` schema prop provided.
- [ ] `aria-live="polite"` present on dynamic content regions.
- [ ] Kanban activity log closes on Escape key press.
- [ ] Kanban cards use `<ul>`/`<li>` semantic structure.
- [ ] Barcode scanner overlay closes on Escape key press.

## Draft Review Record

> - Reviewer / Agent: `ses_07affb2d9ffe1k1tgLggRtFStb` (independent explore agent for live-repo verification) + current review session
> - Verdict: `pass-with-minors`
> - Rounds: 1
> - Findings addressed:
>   - **Major**: `barcode-input/barcode-input.tsx` → corrected to `barcode-input/barcode-input-renderer.tsx` (file didn't exist at referenced path)
>   - Minor: `Test Strategy` section deviates from template (merged `本档选择：` line; meaning clear, no semantic ambiguity)

## Closure Gates

- [ ] All Phase exit criteria satisfied.
- [ ] CSS split into sub-module files.
- [ ] `gantt-store.ts` under 300 lines with extracted utilities.
- [ ] Consistent test file placement.
- [ ] All 4 renderers compliant with marker/styling contract.
- [ ] Zero hardcoded hex colors with CSS variable equivalents.
- [ ] calendar-print.css selectors scoped.
- [ ] Raw `<select>` replaced with `<NativeSelect>`.
- [ ] Priority test coverage added for `export-handles.tsx` and `gantt-context.tsx`.
- [ ] Documentation routes updated.
- [ ] All 5 a11y findings resolved.
- [ ] Independent sub-agent (fresh session) closure-audit passes, evidence recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

(none)

## Non-Blocking Follow-ups

- 14-02 (24 source files without tests): Only priority 2 gaps addressed; remaining 22+ files are watch-only residual for future coverage initiatives.
