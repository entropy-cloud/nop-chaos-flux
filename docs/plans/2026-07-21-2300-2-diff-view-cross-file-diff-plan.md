# Diff-view Cross-file Diff (§12.2)

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/components/diff-view/design.md` §12.2, deferred items from `2026-07-21-0200-1-diff-view-core-implementation.md`, `2026-07-21-0200-2-diff-view-three-column-compare.md`
> Related: `docs/plans/2026-07-21-0200-1-diff-view-core-implementation.md`, `docs/plans/2026-07-21-0200-2-diff-view-three-column-compare.md`, `docs/plans/2026-07-21-1400-2-diff-view-css-definition.md`

## Purpose

Implement the §12.2 cross-file diff feature — multi-file diff navigation with a file list sidebar, file switching, search/filter, and change statistics. After this plan, `diff-view` supports displaying a changeset of multiple files (like GitHub PR Files Changed tab or `git diff --name-status` output).

## Current Baseline

- Diff-view v1 (S9.1–S9.7, S9.9) is `done`: unified-diff parsing, syntax highlighting, inline diffs, split/unified views, hunk folding, virtual scrolling, view switch animation, content debounce — all in `packages/flux-renderers-content/src/diff-view/`.
- Diff-view v2 three-column compare (S9.8) is `done`: `middleContent` schema field, `computeThreeWayDiff()`, conflict marker rendering, diff navigation buttons — all in `packages/flux-renderers-content/src/diff-view/`.
- Design doc §12.2 defines the cross-file diff feature: file list sidebar (~240px), `DiffFileMeta[]` schema, `activeFileIndex`, file search filter, status grouping (all/added/modified/deleted), change statistics (+N/-M).
- `DiffViewSchema` in `packages/flux-renderers-content/src/schemas.ts` — currently has `oldContent`, `newContent`, `middleContent`, `viewType`, etc. No `files` or `activeFileIndex` yet.
- S9 on roadmap-scheduling.md does not include a work item for §12.2 — it is a post-v1/v2 extension per the design doc.
- `docs/components/diff-view/design.md` §12.2 warns: "`files` field is mutually exclusive with `oldContent/newContent`".
- Previous two diff-view plans both deferred §12.2 as "out of scope" with successor required.

## Goals

- Implement cross-file diff navigation: file list sidebar + current-file diff display.
- Extend `DiffViewSchema` with `files` and `activeFileIndex` fields, mutually exclusive with `oldContent/newContent`.
- Support file search filter and status-grouped file list (all/added/modified/deleted).
- Persist `viewType`, `showLineNumbers`, `showInlineDiff` across file switches.
- Create focused unit tests for file switching, filtering, and schema validation.
- Update `docs/components/diff-view/design.md` to reflect live implementation state (remove "proposed" language from §12.2).
- Add cross-file demo to the playground diff-demo page.
- Add a new work item S9.10 to `docs/components/roadmap-scheduling.md` and mark it `done`.

## Non-Goals

- Directory tree mode for file list (design doc mentions "reserve space" but explicitly says flat list only).
- Inline annotation/widgets system (per design doc §12 — deferred).
- Cross-package diff (e.g., comparing files across different packages or renderers).
- Performance optimization for 500+ file changesets (virtual scrolling in file list is v2 concern; flat list at moderate scale is sufficient).
- Gantt/Kanban/Calendar/Barcode changes.
- Bundle size analysis of diff-view (separate concern per scheduling-performance-remediation-plan).

## Scope

### In Scope

- `DiffViewSchema` extension: `files` (`DiffFileMeta[]`), `activeFileIndex` (`number`), mutually exclusive with `oldContent/newContent`.
- `DiffFileMeta` type definition: `fileName`, `oldContent`, `newContent`, `language`, `status`.
- File list sidebar component (`diff-file-list.tsx`): ~240px, file name + change stats (+N/-M), click to switch, status badge (added/modified/deleted), unread dot.
- File search filter input and status-grouped tabs (all/added/modified/deleted).
- File switching logic: update `activeFileIndex`, re-render the existing diff-view with new file content, preserve `viewType`/`showLineNumbers`/`showInlineDiff`.
- Schema mutual-exclusion guard: `files` and `oldContent/newContent` cannot both be provided (compile-time type + runtime warning).
- Focused unit tests: file switching, filter behavior, schema validation, mutual-exclusion.
- Playground demo page update: add a cross-file diff example with 3+ files.
- Design doc sync: mark §12.2 as `implemented`.
- Roadmap update: add S9.10 work item.

### Out Of Scope

- Directory tree file list (design doc "预留 tree 模式扩展空间" — not implemented).
- File content lazy-loading (all files expected in schema; future extension).
- Cross-file diff inline comparison (showing two files side by side is already handled by existing split-view within each file).

## Failure Paths

Not applicable — no error-handling contract changes. Missing `files` field defaults to single-file mode (backward compatible).

## Test Strategy

Tier: `建议有测`

## Execution Plan

### Phase 1 — Schema Extension & File List Component

Status: completed
Targets: `packages/flux-renderers-content/src/schemas.ts`, `packages/flux-renderers-content/src/diff-view/`

- Item Types: `Fix | Fix`

- [x] Extend `DiffViewSchema`: add `files?: DiffFileMeta[]` and `activeFileIndex?: number`. Define `DiffFileMeta` interface with `fileName`, `oldContent`, `newContent`, `language`, `status` fields. Document mutual-exclusion with `oldContent/newContent` in JSDoc.
- [x] Create `diff-file-list.tsx`: file list sidebar with file name, change statistics (+N/-M calculated from diff lines), status badge (added/modified/deleted), unread dot. File search input filter (text matching on `fileName`). Status grouping tabs (all/added/modified/deleted). 240px width.

Exit Criteria:

- [x] `DiffViewSchema` has `files` and `activeFileIndex` fields. `DiffFileMeta` type exists. Mutual-exclusion documented.
- [x] `diff-file-list.tsx` renders with file list, search filter, status tabs, change stats. Works in isolation.

### Phase 2 — File Switching & Renderer Integration

Status: completed
Targets: `packages/flux-renderers-content/src/diff-view/diff-view-renderer.tsx`

- Item Types: `Fix | Fix`

- [x] Wire file switching: when `files` is provided, render `DiffFileList` sidebar + `DiffViewRenderer` for the active file. `activeFileIndex` defaults to 0. Switch preserves `viewType`/`showLineNumbers`/`showInlineDiff`. Mutually exclusive with `oldContent/newContent` — runtime warning if both provided, `files` wins.
- [x] Add "previous file" / "next file" navigation buttons in the diff header (complement to sidebar click). Keyboard shortcuts: Ctrl+↑/Ctrl+↓.

Exit Criteria:

- [x] Cross-file mode renders sidebar + file content. File switching works with viewType preservation.
- [x] Mutual-exclusion guard works: supplying both `files` and `oldContent` produces a console warning and `files` takes precedence.

### Phase 3 — Tests, Demo & Documentation

Status: completed
Targets: `packages/flux-renderers-content/src/diff-view/`, `apps/playground/src/pages/diff-demo.tsx`, `docs/components/diff-view/design.md`, `docs/components/roadmap-scheduling.md`

- Item Types: `Proof | Proof | Follow-up | Follow-up`

- [x] Write focused unit tests: file switching updates content, search filter matches file names, status tab filters, mutual-exclusion warning fires correctly.
- [x] Update playground `diff-demo.tsx`: add a "cross-file" example tab or schema preset with 3+ files (added/modified/deleted mix). Include search filter interaction.
- [x] Update `docs/components/diff-view/design.md` §12.2: mark as `implemented` with final schema, component name, and usage example. Remove "proposed" / "v4" / "留待" language per Minimum Rule 14.
- [x] Add S9.10 work item to `docs/components/roadmap-scheduling.md` and mark `done`.

Exit Criteria:

- [x] Unit tests pass for file switching, filtering, mutual-exclusion.
- [x] Playground demo page has cross-file example.
- [x] Design doc §12.2 reflects implemented state (not proposed).
- [x] Roadmap has S9.10 as `done`.

## Draft Review Record

- Reviewer / Agent: sub-agent (fresh session, 2026-07-21 review)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: No Blocker/Major issues. Minor: (1) Phase 2 nav buttons + keyboard shortcuts item not listed in In Scope — acceptable as implementation detail. (2) Failure Paths says "no error-handling contract changes" but mutual-exclusion guard qualifies — acceptable since it's developer-side console.warn. Both are non-blocking per Plan Review Rule.

## Closure Gates

- [x] Cross-file diff renders with file list sidebar, search filter, status grouping.
- [x] File switching preserves `viewType`/`showLineNumbers`/`showInlineDiff`.
- [x] Mutual-exclusion guard between `files` and `oldContent/newContent` works.
- [x] Focused unit tests pass.
- [x] Playground demo page has cross-file example.
- [x] `docs/components/diff-view/design.md` §12.2 updated to implemented state.
- [x] `docs/components/roadmap-scheduling.md` has S9.10 work item marked `done`.
- [x] No in-scope live defect or contract drift degraded to deferred/follow-up.
- [x] Affected owner docs updated.
- [x] By independent sub-agent (fresh session) executed closure-audit passed and evidence recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Directory Tree File List

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Design doc explicitly says "flat file list only, reserve tree mode extension space". Flat list at moderate file count (<100) is sufficient for the initial cross-file diff. Tree mode can be added as a successor if needed.
- Successor Required: `no`

### File Content Lazy Loading

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: All file contents are expected in the schema (same as `oldContent`/`newContent`). Lazy loading from a remote source would require a different data contract and is not part of §12.2.
- Successor Required: `no`

## Non-Blocking Follow-ups

- Consider adding virtual scrolling to the file list if 500+ file changesets become a supported scenario.

## Closure

Status Note: Plan is complete. All Exit Criteria met, all Closure Gates satisfied. Cross-file diff feature (§12.2) fully implemented: `DiffFileMeta` type + `files`/`activeFileIndex` schema fields landed, `diff-file-list.tsx` sidebar with search filter and status tabs rendered, `CrossFileDiffView` integrates file switching with viewType preservation and mutual-exclusion guard, focused unit tests (`diff-cross-file.test.tsx`) pass, playground cross-file demo added, design doc §12.2 updated to implemented state, roadmap S9.10 marked done.

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent (fresh session, closure audit)
- Evidence: Live code verification confirms all Phase exit criteria satisfied. Schema (`schemas.ts:3-14,16-27`) has `DiffFileMeta`, `files`, `activeFileIndex`. Component (`diff-view/components/diff-file-list.tsx`) renders sidebar. Integration (`diff-view-renderer.tsx:209-238`) wires cross-file mode with console.warn mutual-exclusion guard. Cross-file tests (`__tests__/diff-cross-file.test.tsx`) cover file switching, search filter, status tabs, schema validation. Playground (`apps/playground/src/pages/diff-demo.tsx:134-188`) has cross-file demo. Design doc (`docs/components/diff-view/design.md:213-251`) §12.2 marked implemented. Roadmap (`docs/components/roadmap-scheduling.md:183`) has S9.10 as `done`.

Follow-up:

- No remaining plan-owned work. Virtual scrolling for file list (500+ files) is a non-blocking optimization candidate noted in Deferred section.
