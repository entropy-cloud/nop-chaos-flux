# Diff-view CSS Definition & Style Hygiene

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/plans/2026-07-21-0800-3-scheduling-architecture-quality-plan.md` (F-20 deferred item), `docs/components/diff-view/design.md`, `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`
> Related: `docs/plans/2026-07-21-0200-1-diff-view-core-implementation.md` (parent plan), `docs/plans/2026-07-21-0200-2-diff-view-three-column-compare.md`

## Purpose

Add proper CSS definitions for the diff-view renderer in `flux-renderers-content`, completing the styling system compliance gap identified during the scheduling audit (F-20). The diff-view renderer was implemented with functional correctness but its styling definitions (marker classes, color tokens, responsive breakpoints, `[data-slot]` scoping) were deferred as out-of-scope during the quality plan.

## Current Baseline

- Diff-view renderer is implemented and operational in `packages/flux-renderers-content/src/diff-view/` with functional features: split/unified views, syntax highlighting, inline diffs, hunk folding, virtual scrolling, three-column compare.
- `packages/flux-renderers-content/src/styles.css` (31 lines) contains only `nop-separator` and `nop-progress` variant styles — no diff-view CSS definitions.
- The renderer uses ~50 `nop-diff-*` class names, `data-view` / `data-diff-type` / `data-diff-gutter` / `data-diff-inline` / `data-expanded` data attributes, and `data-slot` values (`"diff-header"`, `"diff-gutter"`, `"diff-hunk-header"`) — all currently unstyled.
- No inline color `style` props exist in the renderer; all visual rendering relies on CSS that has not been written yet, causing the renderer to appear unstyled in the playground.
- Per styling system conventions: widget renderers are "self-styled UI controls" (`docs/architecture/styling-system.md`), and their CSS must be scoped under root marker class selectors with `[data-slot]` selectors for internal parts.
- Diff-view design doc (§10) defines the marker contract (`nop-diff-view`, `data-view`, `data-diff-type`, `data-slot`, etc.) that the renderer follows, but none of the required CSS definitions exist.
- `apps/playground/src/styles.css` includes the scheduling CSS via `@import` (added in the quality plan) but content-package CSS is imported separately.

## Goals

- Write complete CSS definitions for all `nop-diff-*` class names (~50) found in diff-view components, covering layout containers (`.nop-diff-split-view`, `.nop-diff-unified-view`, `.nop-diff-three-column-view`, `.nop-diff-hunk`), line types (`.nop-diff-line`, `.nop-diff-line-add`, `.nop-diff-line-delete`, `.nop-diff-line-context`, `.nop-diff-line-conflict`), gutter (`.nop-diff-gutter`, `.nop-diff-gutter-cell`), header (`.nop-diff-header`, `.nop-diff-three-col-nav`), and data-attribute selectors (`[data-view]`, `[data-diff-type]`, `[data-diff-inline]`, `[data-slot]`).
- Scope all `[data-slot]` selectors under their root marker class to prevent style leakage.
- Define color tokens using CSS custom properties (not hardcoded literals) for diff add/del/conflict backgrounds, line number styling, hunk headers, and code foreground.
- Ensure all CSS definitions use the project's `oklch()` color space for consistency with existing content-package styles (see `nop-progress` variants in `styles.css`).
- Add responsive breakpoints for narrow-viewport diff rendering (single-column fallback at `<640px`).
- Verify that playground diff-view demo page renders correctly with the new CSS (no visual regression).

## Non-Goals

- No functional changes to diff-view renderer logic (TypeScript / React components remain untouched).
- No changes to the diff-view schema or design doc.
- No Playwright visual regression tests (beyond manual verification).
- No changes to other content-package renderers (separator, progress, etc.).

## Scope

### In Scope

- `packages/flux-renderers-content/src/styles.css` — add all diff-view CSS definitions in a dedicated section with clear subsection comments.
- Verification: playground diff-view demo page renders with correct colors, spacing, hunk fold indicators, and responsive layout.

### Out Of Scope

- Gantt, Kanban, Calendar, or Barcode-input styling changes (all addressed in the scheduling quality plan).
- Bundle size analysis.
- Diff-view component refactoring or functional enhancement.

## Test Strategy

档位选择：`不适用：纯 CSS 变更，无行为代码改动`

The plan adds CSS only — no behavioral code changes. Verification is via visual inspection in the playground and full workspace build. Unit tests for styling are not applicable (CSS is not unit-testable in Vitest without DOM rendering).

## Execution Plan

### Phase 1 — Audit & Design

Status: completed
Targets: `packages/flux-renderers-content/src/styles.css`, `docs/components/diff-view/design.md §10`

- Item Types: `Decision | Follow-up`

- [x] Audit: scan all `.tsx` files in `packages/flux-renderers-content/src/diff-view/` for `nop-diff-*` class names, `data-*` attributes, `data-slot` values, and any inline styles. Compile a complete selector inventory grouped by component.
- [x] Audit: identify categories of visual styling needed (line backgrounds, gutter, hunk headers, code foreground, borders, transitions, spacing) and confirm no inline color styles exist.
- [x] Design: define CSS custom property tokens for all diff-view color needs (add/del/conflict/hunk/gutter) using `oklch()` values, following the color naming convention from `docs/architecture/theme-compatibility.md`.

Exit Criteria:

- [x] Complete selector inventory filed (class names, data attributes, data-slot values, grouped by component).
- [x] Color token design documented (CSS custom property name → oklch value for each visual need).

### Phase 2 — CSS Implementation

Status: completed
Targets: `packages/flux-renderers-content/src/styles.css`

- Item Types: `Fix`

- [x] Write root container styles: `.nop-diff-view`, `.nop-diff-view-three-column`, `.nop-diff-wrap`, plus view-mode attribute selectors `.nop-diff-view[data-view="split"]` / `[data-view="unified"]` / `[data-view="three-column"]`.
- [x] Write view-panel component styles: `.nop-diff-split-view`, `.nop-diff-split-pane`, `.nop-diff-split-old`, `.nop-diff-split-new`, `.nop-diff-unified-view`, `.nop-diff-three-column-view`, `.nop-diff-three-col-grid`, `.nop-diff-three-col-pane`, `.nop-diff-three-col-old`, `.nop-diff-three-col-mid`, `.nop-diff-three-col-new`.
- [x] Write line-level styles using `[data-diff-type]` attribute selectors for each type: `"add"`, `"delete"`, `"context"`, `"hunk"`, `"conflict"`, `"change-old"`, `"change-new"`, `"equal"`. Also style conflict markers: `.nop-diff-line-conflict`, `.nop-diff-line-conflict-marker`.
- [x] Write inline diff styles via `[data-diff-inline="insert"]` and `[data-diff-inline="delete"]`.
- [x] Write hunk component styles: `.nop-diff-hunk`, `.nop-diff-hunk-collapsed`, `.nop-diff-hunk-expanded`, `.nop-diff-hunk-expand-btn`, `.nop-diff-hunk-collapse-btn`, `.nop-diff-hunk-header-row`, `.nop-diff-hunk-header-text`, plus expand/collapse transitions per design doc §10.
- [x] Write gutter and content styles: `.nop-diff-gutter`, `.nop-diff-gutter-cell`, `.nop-diff-gutter-new`, `.nop-diff-content`, with `[data-diff-gutter="old"|"new"|"mid"]` differentiation.
- [x] Write header and navigation styles: `.nop-diff-header`, `.nop-diff-header-files`, `.nop-diff-header-stats`, `.nop-diff-stat-added`, `.nop-diff-stat-removed`, `.nop-diff-view-toggle`, `.nop-diff-three-col-nav`, `.nop-diff-three-col-line`.
- [x] Write `[data-slot]` scoped selectors: `.nop-diff-view [data-slot="diff-header"]`, `.nop-diff-view [data-slot="diff-gutter"]`, `.nop-diff-view [data-slot="diff-hunk-header"]`.
- [x] Write responsive styles: `@media (max-width: 640px)` single-column fallback for split view.
- [x] Define all color tokens via CSS custom properties on `.nop-diff-view` root, covering add/del/conflict/hunk/gutter backgrounds, line number styling, code foreground, and hover states per design doc §10.

Exit Criteria:

- [x] All inventory classes and attribute selectors from Phase 1 have CSS definitions in `styles.css`.
- [x] All color values in `styles.css` use CSS custom properties (no hardcoded `oklch()` values outside variable definitions).
- [x] All `[data-slot]` selectors are scoped under `.nop-diff-view` or a specific child class.

### Phase 3 — Verification & Documentation

Status: completed
Targets: `apps/playground/src/styles.css`, `apps/playground/src/pages/diff-demo.tsx`

- Item Types: `Proof | Follow-up`

- [x] Verify playground CSS imports content-package styles (or that diff-view CSS is available at runtime). If missing, add `@import '@nop-chaos/flux-renderers-content/styles.css'` in `apps/playground/src/styles.css`.
- [x] Manually verify in playground: diff-view demo page renders correct add/del colors, hunk fold arrows, split/unified spacing, line numbers, three-column navigation, and responsive breakpoint.

Exit Criteria:

- [x] Playground diff-view demo page renders correctly with the new CSS (visual check across split, unified, and three-column modes).

## Draft Review Record

- Reviewer / Agent: `review` agent (mission-driver session 2026-07-21-1400)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: Goal 1 corrected from design-doc subset to live-renderer class list; Phase 1 hardcoded-color assumptions removed; Phase 2 items rewritten to match actual renderer classes (~50), attribute selectors (`[data-view]`, `[data-diff-type]`, `[data-diff-inline]`), and `data-slot` values (`diff-header`, `diff-gutter`, `diff-hunk-header`); Phase 3 build/typecheck items moved to Closure Gates per Rule 18; Test Strategy tier corrected to `不适用`. No remaining Blocker or Major issues.

## Closure Gates

> All Phase Exit Criteria must be met. The full workspace verification is run here once.

- [x] All diff-view class names and attribute selectors have CSS definitions in `styles.css` with proper scoping.
- [x] All color values use CSS custom properties (no hardcoded oklch/literals outside variable definitions).
- [x] `[data-slot]` selectors scoped under root marker class.
- [x] Responsive breakpoint (640px) single-column fallback implemented.
- [x] Playground diff-view demo renders correctly.
- [x] No in-scope live defect or contract drift silently deferred.
- [x] Affected owner docs updated: `docs/logs/` daily log entry.
- [x] By independent sub-agent (fresh session) closure-audit completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

_(No deferred items — this is a small, self-contained CSS-only plan.)_

## Non-Blocking Follow-ups

- No remaining plan-owned work.

## Closure

Status Note: All phases executed. Closure audit completed, 2 findings remediated and re-verified.

Closure Audit Evidence:

- Auditor / Agent: independent `general` sub-agent (task `ses_07dad0725ffem2l6Vjodahos6N`)
- Evidence: Audit found 2 remediation items: (1) 4 marker classes without explicit CSS definitions (`nop-diff-split-new`, `nop-diff-three-col-old`, `nop-diff-three-col-mid`, `nop-diff-three-col-new`) added with `min-width`/`overflow` rules; (2) 5 hardcoded `#fff` backgrounds replaced with `var(--nop-diff-root-bg)`. Both remediated and re-verified via `pnpm typecheck` (56/56), `pnpm build` (30/30), `pnpm lint` (30/30), `pnpm test` (all tests pass).

Follow-up:

- No remaining plan-owned work.
