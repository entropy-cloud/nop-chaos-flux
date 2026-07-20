# Diff-view Three-Column Compare (S9.8)

> Plan Status: active
> Last Reviewed: 2026-07-21
> Source: `docs/components/roadmap-scheduling.md`, `docs/components/diff-view/design.md §12.1`
> Related: `docs/plans/2026-07-21-0200-1-diff-view-core-implementation.md`
> Dependency: This plan requires Plan 1 (N=1) to be completed first. Do not execute before Plan 1 closes.

## Purpose

Add three-column compare mode to the diff-view renderer for merge-conflict visualization and three-way version comparison. Implements S9.8 from the scheduling roadmap.

## Current Baseline

- **This plan depends on Plan 1** (`docs/plans/2026-07-21-0200-1-diff-view-core-implementation.md`) being completed first. The following baseline assumes Plan 1 has delivered its scope; this plan is sequenced as N=2 and must not execute until Plan 1 is closed.
- Plan 1 delivers: `DiffFile` model, unified-diff parser, `lowlight` syntax highlighting, `diff-match-patch` inline diff, split/unified view containers, hunk fold, virtual scrolling, view switch animation, content debounce, playground demo page, and renderer registration in `@nop-chaos/flux-renderers-content`
- Design doc §12.1 defines three-column layout as: old (left) | middle/base (center) | new (right)
- `middleContent` schema field is defined in §12.1 but not yet implemented
- Scheduling roadmap S9.8 is `proposed`

## Goals

- Add three-column compare mode triggered when `oldContent` + `middleContent` + `newContent` are all present
- Implement conflict visualization with red-background conflict regions and standard merge conflict markers
- Add "previous diff" / "next diff" navigation buttons for three-column mode
- Move S9.8 from `proposed` to `done` on scheduling roadmap

## Non-Goals

- Cross-file diff navigation (§12.2) — v4, out of scope
- Any changes to standard two-pane split/unified diff-view behavior
- Performance baseline measurement
- Playwright e2e tests

## Scope

### In Scope

- S9.8: Three-column compare in `diff-view-renderer.tsx` — auto-detect when `middleContent` is provided
- Conflict region detection: compute diffs independently for old↔middle and middle↔new; intersect results to find conflict zones
- Conflict marker rendering: red background + `<<<<<<<` / `=======` / `>>>>>>>` markers with `data-diff-type="conflict"` DOM markers
- "Previous diff" / "Next diff" navigation buttons in three-column mode (scroll-to-line + 500ms flash highlight)
- Schema: add `middleContent?: string` to `DiffViewSchema`
- New DiffLine types: `conflict-start`, `conflict-separator`, `conflict-end`

### Out Of Scope

- Cross-file diff (§12.2)
- Inline annotation/widgets
- Any non-diff-view changes (scheduling, gantt, kanban, etc.)

## Failure Paths

| Trigger                                                       | Behaviour                                                        | Retry | User Visible                              |
| ------------------------------------------------------------- | ---------------------------------------------------------------- | ----- | ----------------------------------------- |
| `middleContent` + only one of `oldContent`/`newContent`       | Fall back to standard two-pane mode; `middleContent` ignored     | N/A   | Standard diff view as if mid absent       |
| Conflict region with zero overlaps (all three versions agree) | No conflicts shown; three identical columns rendered             | N/A   | All three columns show identical content  |
| Navigation reaches first/last diff                            | Button becomes disabled with tooltip "已经是第一处/最后一处差异" | N/A   | Navigation buttons disabled at boundaries |

## Test Strategy

**建议有测** — unit tests for conflict detection algorithm; manual verification through modified playground page.

## Execution Plan

### Phase 1 — Three-Column Compare

Status: planned
Targets: `packages/flux-renderers-content/src/diff-view/`

- Item Types: `Fix | Proof`

- [ ] Add `middleContent?: string` to `DiffViewSchema`; detect three-column mode (all three content fields non-null)
- [ ] Extend `model/diff-file.ts` with three additional `DiffLine` types: `conflict-start`, `conflict-separator`, `conflict-end`
- [ ] Implement conflict detection logic: compute `old↔middle` and `middle↔new` diffs independently; intersect to produce conflict zones (regions where both diffs disagree)
- [ ] Extend `utils/diff-template.ts` with three-column templates and conflict marker rendering
- [ ] Extend `components/diff-split-view.tsx` to support three-column layout (CSS Grid `1fr 1fr 1fr`) when `viewType === 'split'` and three-column mode active; for unified mode, render three side-by-side columns
- [ ] Implement conflict marker rendering: red background on conflict rows, `<<<<<<<` / `=======` / `>>>>>>>` text markers, `data-diff-type` set to conflict variants
- [ ] Implement "Previous diff" / "Next diff" navigation buttons: collect all conflict zone line positions, scroll to position on click, 500ms yellow flash highlight
- [ ] Unit tests: conflict detection on known 3-way diff inputs; verify navigation boundary conditions
- [ ] Update playground `diff-demo.tsx` with three-column mode toggle and `middleContent` input area
- [ ] Update `docs/components/roadmap-scheduling.md`: set S9.8 to `done`

Exit Criteria:

- [ ] Three-column mode activates when `oldContent`, `middleContent`, `newContent` all non-null
- [ ] Conflict zones render with red background and merge conflict markers
- [ ] Navigation buttons cycle through all conflict zones correctly
- [ ] `pnpm --filter @nop-chaos/flux-renderers-content typecheck` passes

## Draft Review Record

- Reviewer / Agent: fresh sub-agent (round 1), `ses_07f550e58ffeGPv8wwaVyQ0pvh` (round 2)
- Verdict: `pass`
- Rounds: 2
- Findings addressed:
  - Major 1: Rewrote Current Baseline with explicit dependency note (Plan 1 must complete first)
  - Major 2: Removed full-repo checks (`pnpm typecheck`/`build`/`lint`) from Phase Exit Criteria; kept only focused `pnpm --filter` check

## Closure Gates

- [ ] All in-scope confirmed live defects fixed
- [ ] Three-column compare renders with three panes, conflict visualization, and navigation
- [ ] `middleContent` schema field documented in design doc and consistent with implementation
- [ ] `docs/components/roadmap-scheduling.md` S9.8 status updated to `done`
- [ ] No in-scope live defect or contract drift silently degraded to deferred/follow-up
- [ ] By independent sub-agent (fresh session) executed closure audit with evidence recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

- None

## Non-Blocking Follow-ups

- Cross-file diff (§12.2) remains out of scope for both plans

## Closure

Status Note: _(to be filled on completion)_

Closure Audit Evidence:

- _(to be filled)_

Follow-up:

- _(to be filled)_
