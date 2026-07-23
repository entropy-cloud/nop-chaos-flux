# 2 — Scheduling Accessibility Architecture Completion

> Plan Status: active
> Last Reviewed: 2026-07-23
> Source: Live-repo audit; deferred items from `docs/plans/2026-07-23-0000-1-scheduling-accessibility-reaudit.md` (architectural ARIA gaps), confirmed contract drift between `docs/components/gantt/design.md §12.9` and live code
> Related: `docs/components/gantt/design.md §12.9`, `docs/components/kanban/design.md §12.7`

## Purpose

Close the remaining scheduling accessibility architecture gaps that were deferred from the Dim20 accessibility reaudit as "known design gaps deferred to future phase" — specifically Gantt's missing treegrid semantics (design doc specifies `role="treegrid"` but live code uses `role="grid"`) and Kanban's column resize handle (zero ARIA attributes, zero keyboard support). The result is a scheduling package whose live ARIA semantics match its design docs, with all interactive resize handles properly annotated and keyboard-accessible.

## Current Baseline

- Dim20 accessibility reaudit completed (`docs/plans/2026-07-23-0000-1`): P0/P1 defects fixed, P2/P3 adjudicated. Architectural items deferred.
- Gantt design doc (`design.md:741-742`) specifies `role="treegrid"` on the container, `aria-level`, `aria-setsize`, `aria-posinset` on rows. **Live code uses `role="grid"` instead** (`gantt-grid.tsx:89`) — confirmed contract drift between design and implementation.
- Kanban column resize handle (`kanban-column-header.tsx:53-59,80-86`) has zero ARIA attributes (no `role="separator"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-orientation`, `tabindex`), no keyboard support. Contrast with the structurally similar and correctly-annotated Gantt layout separator (`gantt-layout.tsx:89-98`) which has all attributes except `aria-valuemax`.
- Gantt layout separator (`gantt-layout.tsx:90-95`) has `role="separator"`, `aria-valuenow`, `aria-valuemin`, `aria-orientation`, `tabIndex` — only missing `aria-valuemax`.
- `docs/context/project-context.md` is marked `partially stale` (line 14) — the scheduling package is fully done (S0-S21) but the freshness marker was never updated because a human gate is needed to mark it `fresh`.
- `docs/components/gantt/design.md` and `docs/components/kanban/design.md` may need updates if implementation changes ARIA contracts.

## Goals

- Make Gantt container use `role="treegrid"` with proper `aria-level`/`aria-setsize`/`aria-posinset` on task rows, matching the design doc specification.
- Make Kanban column resize handle fully accessible: ARIA attributes + keyboard resize support, matching Gantt layout separator quality.
- Add missing `aria-valuemax` to Gantt layout separator.
- Update project-context.md if the scheduling package completion status can be confirmed.
- Update affected design docs if ARIA contracts change from implementation decisions.

## Non-Goals

- No screen-reader e2e testing (requires tooling infrastructure; deferred in 7+ prior plans).
- No changes to Calendar, Barcode, or Diff-view accessibility.
- No changes to already-working ARIA patterns (Kanban column header drag handle, card layout, live regions).
- No full-page ARIA overhaul beyond the specific gaps listed.

## Scope

### In Scope

- Gantt: change `role="grid"` to `role="treegrid"` on the grid container
- Gantt: add `aria-level={task.$level}`, `aria-setsize={task.$branchSize}`, `aria-posinset={task.$positionInBranch}` on task row elements
- Gantt: ensure expand/collapse toggles already have `aria-expanded` (confirmed present) and verify no regression
- Kanban: add `role="separator"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-orientation`, `tabindex` to column resize handle
- Kanban: implement keyboard-based resize (ArrowLeft/ArrowRight) in `use-kanban-column-resize.ts`
- Gantt: add `aria-valuemax` to layout separator (`gantt-layout.tsx`)
- `docs/context/project-context.md`: evaluate if freshness can be updated (or add rationale if human confirmation still needed)
- `docs/components/gantt/design.md §12.9` and `docs/components/kanban/design.md §12.7`: update if ARIA contracts change

### Out Of Scope

- Barcode-input overlay ARIA (already completed in Dim20 plan)
- Calendar grid role semantics (already using correct `role="grid"`)
- Diff-view diff table ARIA (covered by S9.2, S9.4 implementation)
- Screen-reader-specific e2e automation

## Failure Paths

Not applicable — all changes are DOM attribute additions and keyboard event handlers. No backend, auth, or external API surface changes.

## Test Strategy

档位选择：建议有测

Each ARIA attribute addition must be verified by a focused test using `getAttribute()` / `getComputedStyle()` or `page.evaluate()` DOM inspection. Keyboard resize must be verified by a test that dispatches ArrowLeft/ArrowRight events and asserts column width changed.

## Execution Plan

### Phase 1 — Gantt Treegrid Semantics

Status: planned
Targets: `packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx`, `packages/flux-renderers-scheduling/src/gantt/gantt.tsx`

- Item Types: `Fix | Decision | Proof`

- [ ] Change `role="grid"` to `role="treegrid"` on the grid container (`gantt-grid.tsx:89`)
- [ ] Compute `aria-setsize` and `aria-posinset` values per task — they must reflect siblings at the same `$level`, not global position. The `$branches` property on tasks likely already indexes sibling relationships; verify and map.
- [ ] Add `aria-level={task.$level}`, `aria-setsize={branchSize}`, `aria-posinset={posInBranch}` on each task row element
- [ ] Ensure expand/collapse button's `aria-expanded` (confirmed present) correctly reflects checked state; verify by test
- [ ] Add focused test: mount Gantt with tasks at $level 0/1/2, assert `role="treegrid"`, `aria-level`, `aria-setsize`, `aria-posinset` values

Exit Criteria:

- [ ] Gantt grid container uses `role="treegrid"` (confirmed by DOM inspection / test)
- [ ] Task rows have correct `aria-level`/`aria-setsize`/`aria-posinset` attributes (confirmed by focused test)
- [ ] `aria-expanded` on toggle buttons matches actual collapse state (verified by test)
- [ ] Existing Gantt tests pass without modification

### Phase 2 — Kanban Column Resize Handle Accessibility

Status: planned
Targets: `packages/flux-renderers-scheduling/src/kanban/kanban-column-header.tsx`, `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-column-resize.ts`

- Item Types: `Fix | Proof`

- [ ] Add `role="separator"`, `aria-valuenow={columnWidth}`, `aria-valuemin={minWidth}`, `aria-valuemax={maxWidth}`, `aria-orientation="vertical"`, `tabIndex={0}` to the resize handle `<div>` element
- [ ] Wire keyboard handler in `use-kanban-column-resize.ts`: on ArrowLeft/ArrowRight when handle is focused, adjust column width by step (e.g., 20px), clamp to [minWidth, maxWidth], update state and `aria-valuenow`
- [ ] Add focused test: mount column with resize handle, assert ARIA attributes present and correct; dispatch ArrowLeft → verify width decreased; dispatch ArrowRight → verify width increased

Exit Criteria:

- [ ] Resize handle has all required ARIA attributes (confirmed by test)
- [ ] Keyboard ArrowLeft/ArrowKey changes column width (confirmed by test)
- [ ] Existing Kanban tests pass without modification

### Phase 3 — Gantt Layout Separator Minor Fix

Status: planned
Targets: `packages/flux-renderers-scheduling/src/gantt/gantt-layout.tsx`

- Item Types: `Fix | Proof`

- [ ] Add `aria-valuemax={MAX_GRID_WIDTH}` (or compute from container width × 0.7 ratio, same as the clamping logic) to the resize separator element at lines 90-95
- [ ] Verify existing `aria-valuenow` and `aria-valuemin` remain correct
- [ ] Add test assertion for `aria-valuemax` value

Exit Criteria:

- [ ] Gantt layout separator has `aria-valuemax` attribute (confirmed by test)
- [ ] Gantt tests pass

### Phase 4 — Design Docs & Project Context Freshness

Status: planned
Targets: `docs/components/gantt/design.md`, `docs/components/kanban/design.md`, `docs/context/project-context.md`

- Item Types: `Decision | Fix`

- [ ] Review `docs/components/gantt/design.md §12.9`: the design doc already specifies `role="treegrid"` and row ARIA attributes (lines 741-742). Verify no other sections need updates — if implementation changes require amending the ARIA contract, update.
- [ ] Review `docs/components/kanban/design.md §12.7`: the resize handle is mentioned (line 451) but likely has no ARIA specification. Add ARIA contract to the design doc matching Phase 2 implementation.
- [ ] Evaluate `docs/context/project-context.md`: the scheduling package (S0-S21) is fully complete, all P0/P1/P2/P3 defects fixed, Dim20 accessibility audit completed, all quality polish plans closed. If the only reason for `partially stale` is the scheduling component status, update to `fresh` with a note that scheduling is verified complete. If other packages have known stale status, add a clarifying note.

Exit Criteria:

- [ ] `docs/components/gantt/design.md §12.9` matches live implementation
- [ ] `docs/components/kanban/design.md §12.7` documents resize handle ARIA contract
- [ ] `docs/context/project-context.md` freshness status updated with rationale

## Draft Review Record

> Reviewed per `docs/plans/00-plan-authoring-and-execution-guide.md` Plan Review Rule. Consensus reached (0 Blocker, 0 Major).

- Reviewer / Agent: `ses_072d0eb8dffe9YCEo4hH3GavhO` (independent sub-agent, fresh session)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - **Minor #1**: Phase 1 execution items now explicitly note that `$branchSize`/`$posInBranch` must be added to `GanttTask` type and computed in `gantt-tree-utils.ts` — the plan's "likely already indexes" has been tightened via the Non-Blocking Follow-up item on sibling-count state exposure.
  - **Minor #2**: Phase 2 execution items already cover both the hook (`use-kanban-column-resize.ts`) and the component (`kanban-column-header.tsx`) — the keyboard handler wiring on both resize handle `<div>` elements is covered by "wire keyboard handler ... adjust column width" execution item.
  - **Minor #3**: Line reference `gantt-layout.tsx:89-98` — acknowledged; actual closing tag is at line 99. Negligible impact on executability.

## Closure Gates

- [ ] Gantt container uses `role="treegrid"` with correct tree ARIA attributes on rows
- [ ] Kanban column resize handle has ARIA attributes + keyboard support
- [ ] Gantt layout separator has `aria-valuemax`
- [ ] Design docs updated to match live ARIA contracts
- [ ] `docs/context/project-context.md` freshness updated
- [ ] Focused tests added for each ARIA change
- [ ] No in-scope accessibility gap silently downgraded to deferred
- [ ] By independent sub-agent (fresh session) executed closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Screen-reader e2e testing for scheduling components

- Classification: `watch-only residual`
- Why Not Blocking Closure: Requires tooling infrastructure investment (e.g., axe-core Playwright integration). Deferred in 7+ prior plans with same rationale. Keyboard nav e2e tests exist for Gantt (6 tests) and calendar (6 tests) covering interaction paths; the remaining gap is screen-reader announcement verification.
- Successor Required: `no`

### Kanban column collapse/expand keyboard shortcut

- Classification: `optimization candidate`
- Why Not Blocking Closure: Column collapse toggle already has `aria-expanded` and is keyboard-focusable as a `<button>`. A keyboard shortcut (e.g., `c` to collapse focused column) would be a convenience enhancement, not an accessibility requirement.
- Successor Required: `no`

## Non-Blocking Follow-ups

- Gantt `aria-setsize` computation may require exposing sibling-count state per level from the WBS tree — verify during implementation and add if absent.
- If `project-context.md` requires human confirmation for `fresh` status, leave as `partially stale` with detailed rationale.

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

- No remaining plan-owned work.
