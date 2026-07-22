# 3 Diff-view Defect Fixes & Test Coverage

> Plan Status: completed
> Last Reviewed: 2026-07-22
> Source: `docs/analysis/2026-07-22-diff-view-display-operability-analysis.md` (dimensions 21/22/23), S19 and S20 items from `docs/components/roadmap-scheduling.md`
> Mission: scheduling
> Work Item: S19, S20

## Purpose

Fix all remaining P1 and P2 defects in the diff-view renderer. P1 defects (component handle missing, definition fields incomplete, three-column toggle misleading, zero integration tests) block reliable host integration. P2 defects (dead code, prop compare incompleteness, shortcut scope, algorithm cleanup, test quality) reduce maintainability. All items are independent code-quality improvements for `@nop-chaos/flux-renderers-content`'s diff-view sub-module.

## Current Baseline

- Diff-view core implementation (split/unified views, syntax highlight, inline diff, hunk fold, virtual scroll) completed and functional.
- Three-column compare mode (`S9.8`) completed via `2026-07-21-0200-2-diff-view-three-column-compare.md`.
- Cross-file diff navigation (`S9.10`) completed.
- **Remaining P1 defects (S19):**
  - S19.1: `useImperativeHandle` not implemented — `toggleViewType`/`setViewType`/`expandAll`/`collapseAll` handles missing; renderer definition `reactions` field not registered.
  - S19.2: Renderer definition `fields` array missing `middleContent`/`files`/`activeFileIndex` entries.
  - S19.3: Three-column auto-toggle hides view-type toggle button but does not allow `viewType` override — user cannot switch to split/unified in three-column mode.
  - S19.4: Zero integration tests — no smoke test renders real component and asserts DOM output (line count, viewType switch, hunk expand).
- **Remaining P2 defects (S20):**
  - S20.1: Unused hook calls — `useRendererRuntime()`/`useRenderScope()` invoked but values not consumed.
  - S20.2: Three-column syntax highlighting — `language` prop not passed to `DiffThreeColumnView`.
  - S20.3: `areHunkPropsEqual` missing `onHunkExpand` comparison.
  - S20.4: Cross-file Ctrl+↑/↓ keyboard shortcut has no scope guard — fires even when diff-view not focused.
  - S20.5: 3-way multi-conflict region logic at `model/diff-3way.ts:207-213` uses convoluted index-based approach; should be single-pass traversal over original rows.
  - S20.6: Dead code exports — `DiffGutterCell`/`renderFileListSidebar` still exported from their source modules but unused internally.
  - S20.7: Zero-assertion tests in `diff-cross-file.test.tsx` — assert `length > 0` without checking actual content/structure.
  - S20.8: Dead parameter — `buildInlineHtml` takes unused `content` parameter.
- `pnpm typecheck`/`build`/`lint`/`test` pass at baseline.

## Goals

- `useImperativeHandle` exposes `toggleViewType`/`setViewType`/`expandAll`/`collapseAll`; renderer definition registers `reactions`.
- `fields` array in renderer definition includes all three missing entries.
- Three-column mode allows `viewType` override to switch back to split/unified.
- At least one focused integration/smoke test for the diff-view renderer.
- All P2 code quality items resolved: unused hooks cleaned, syntax highlighting wired, prop compare fixed, shortcut scoped, 3way logic simplified, dead exports cleaned/deprecated, tests assert real behavior, dead parameter removed.

## Non-Goals

- Adding comprehensive test coverage for the entire diff-view sub-module — only the P1 integration smoke test and P2 zero-assertion rewrites.
- Functional changes to diff comparison algorithm, syntax highlighter, or virtual scroll behavior.
- Changes outside `flux-renderers-content` diff-view sub-module.

## Scope

### In Scope

- `src/diff-view/diff-view-renderer.tsx` — `useImperativeHandle` implementation, `reactions` wiring, three-column toggle logic, shortcut scope guard
- `src/diff-view/components/diff-three-column-view.tsx` — `DiffThreeColumnView` language prop
- `src/diff-view/model/diff-3way.ts` — multi-conflict algorithm refactor and conflict logic cleanup
- `src/content-renderer-definitions.ts` — diff-view `fields` array update with `middleContent`/`files`/`activeFileIndex`
- `src/diff-view/components/diff-hunk.tsx` — `areHunkPropsEqual` completion
- `src/diff-view/components/diff-gutter.tsx` — `DiffGutterCell` deprecation
- `src/diff-view/components/diff-file-list.tsx` — `renderFileListSidebar` deprecation
- `src/diff-view/utils/diff-template.ts` — `buildInlineHtml` parameter cleanup
- `src/index.ts` — barrel dead export cleanup
- Test files under `src/diff-view/__tests__/`: new integration smoke test (S19.4) + rewrite of zero-assertion tests (S20.7)

### Out Of Scope

- Changes to diff computation engine (unified-diff parser, `diff-match-patch`, `lowlight`)
- Cross-package type contract changes
- Playwright e2e tests
- Performance profiling or optimization

## Test Strategy

档位选择：`必须自动化` — S19.4 (integration smoke test) and S20.7 (rewrite zero-assertion tests) are test items by definition. P2 code-quality items must not regress existing tests.

## Execution Plan

### Phase 1 — P1 fixes: handles, definition fields, three-column toggle, integration test

Status: completed
Targets: `diff-view-renderer.tsx`, `content-renderer-definitions.ts`, `components/diff-three-column-view.tsx`, new test file

- Item Types: `Fix | Proof`

- [x] **S19.1**: Add `useImperativeHandle` with forwarded ref. Expose `toggleViewType()`, `setViewType(type)`, `expandAll()`, `collapseAll()`. Register `reactions` in renderer definition mapping reaction names to handle methods.
- [x] **S19.2**: Add `middleContent` (with `type:'string'` or appropriate content type), `files` (array of file objects type), `activeFileIndex` (number) to the renderer definition `fields` array in `content-renderer-definitions.ts`.
- [x] **S19.3**: When `middleContent` is present and three-column mode is active, do not override/hide the toggle button unconditionally. Allow `viewType` prop to override the auto-detection. User can switch to split/unified even with `middleContent`.
- [x] **S19.4**: Write a focused integration test: render `<SchemaRenderer type="diff-view" ...>` with mock diff data, assert DOM output contains correct line count, verify viewType toggle renders, verify hunk expand button renders.

Exit Criteria:

- [x] Component handles callable via ref; reactions registered in definition
- [x] `fields` array includes `middleContent`, `files`, `activeFileIndex`
- [x] Toggle button visible in three-column mode when `viewType` override allows switching
- [x] Integration test passes and asserts concrete DOM structure (not just `length > 0`)

### Phase 2 — P2 code quality: unused hooks, syntax highlighting, prop compare, shortcut scope, 3way logic, dead exports, zero-assertion tests, dead parameter

Status: completed
Targets: `diff-view-renderer.tsx`, `components/diff-three-column-view.tsx`, `components/diff-hunk.tsx`, `model/diff-3way.ts`, `components/diff-gutter.tsx`, `components/diff-file-list.tsx`, `utils/diff-template.ts`, `src/index.ts`, `src/content-renderer-definitions.ts`, `__tests__/diff-cross-file.test.tsx`

- Item Types: `Fix | Proof`

- [x] **S20.1**: Remove unused `useRendererRuntime()`/`useRenderScope()` calls (confirmed non-functional via live grep).
- [x] **S20.2**: Pass `language={debouncedLang}` prop to `DiffThreeColumnView` component; destructure and use within the three-column container.
- [x] **S20.3**: Add `prev.onHunkExpand === next.onHunkExpand` to `areHunkPropsEqual` comparator.
- [x] **S20.4**: Scope Ctrl+↑/↓ to fire only when diff-view container (or `data-shortcuts` marker) has focus. Add `useEffect` with container ref check or event delegation guard.
- [x] **S20.5**: Refactor `model/diff-3way.ts:207-213` multi-conflict region logic: replace convoluted index-based approach with single pass over original `rows` array, tracking conflict boundaries linearly.
- [x] **S20.6**: Mark `DiffGutterCell`/`renderFileListSidebar` as `@deprecated` with JSDoc in their source modules (`components/diff-gutter.tsx`, `components/diff-file-list.tsx`); neither is in the barrel (`src/index.ts`) so removal means dropping the `export` keyword or adding `@deprecated` JSDoc. If internal usage exists, inline or keep as private.
- [x] **S20.7**: Rewrite zero-assertion tests in `diff-cross-file.test.tsx` to assert specific DOM output, rendered hunks count, or navigation behavior.
- [x] **S20.8**: Remove unused `content` parameter from `buildInlineHtml` signature.

Exit Criteria:

- [x] Zero unused `useRendererRuntime()`/`useRenderScope()` calls remaining
- [x] Three-column view applies syntax highlighting matching the active language
- [x] `areHunkPropsEqual` includes `onHunkExpand` in comparison
- [x] Ctrl+↑/↓ only affects diff-view when focused; does not interfere with page-level shortcuts
- [x] 3-way conflict logic refactored; original rows traversed once
- [x] `DiffGutterCell`/`renderFileListSidebar` deprecated or removed from their source modules
- [x] `diff-cross-file.test.tsx` tests assert specific behavior, not just `length > 0`
- [x] `buildInlineHtml` has no unused `content` parameter

## Draft Review Record

- Reviewer / Agent: mission-driver (review session)
- Verdict: `pass-with-minors` (after fix-forward)
- Rounds: 1
- Findings addressed:
  - **Blocker**: All 6+ inaccurate file path references corrected (Scope, Phase1/2 Targets, S20.5, S20.6, Current Baseline). Wrong paths included `diff-3way.tsx`→`components/diff-three-column-view.tsx`, `diff-view-definitions.ts`→`content-renderer-definitions.ts`, `diff-hunks.tsx`→`components/diff-hunk.tsx`, `diff-cross-file.tsx`→integrated into `diff-view-renderer.tsx`, `diff-utils.ts`→`utils/diff-template.ts`, `index.ts`→`src/index.ts`.
  - **Blocker**: S20.6 referenced non-existent export `DiffGutter` (only `DiffGutterCell` exists); claimed "remove from barrel exports" but neither `DiffGutterCell` nor `renderFileListSidebar` is in the barrel — corrected to "mark `@deprecated` in source modules, drop `export` keyword".
  - **Major**: Phase 2 Exit Criteria included `pnpm typecheck/build/lint/test` — violates Minimum Rule 18 (full validation belongs in Closure Gates only). Removed.
  - Minor: Test strategy wording deviates from template `必须自动化` — acceptable intent preserved.

## Closure Gates

- [x] All 4 P1 defects (S19.1–S19.4) fixed and verified
- [x] All 8 P2 defects (S20.1–S20.8) fixed and verified
- [x] Integration smoke test passes with concrete DOM assertions
- [x] Zero-assertion tests rewritten to assert specific behavior
- [x] No in-scope defect silently downgraded to deferred/follow-up
- [x] Affected owner docs updated if public contract changed
- [x] By independent sub-agent (fresh session) closure-audit completed with evidence recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

(None — all in-scope items are P1/P2 fixes within reasonable scope.)

## Non-Blocking Follow-ups

- Adding Playwright e2e tests for diff-view (split/unified switch, hunk interaction, cross-file navigation) would improve confidence but is not required for this plan's contract closure.

## Closure

Status Note: All 4 P1 and 8 P2 defects verified as fully implemented in live codebase via fresh closure-audit session. No remaining unchecked items.

Closure Audit Evidence:

- Auditor / Agent: closure-auditor (fresh sub-agent session)
- Evidence: All Phase 1 items confirmed live: useImperativeHandle+reactions in `diff-view-renderer.tsx:244-253` and `content-renderer-definitions.ts:514-517`; fields array includes middleContent/files/activeFileIndex at `content-renderer-definitions.ts:503-505`; three-column toggle logic at `diff-view-renderer.tsx:95-129`; integration test with concrete DOM assertions at `diff-view/__tests__/diff-view-renderer.test.tsx`. All Phase 2 items confirmed live: unused hooks removed (`diff-view-renderer.tsx:1`); language prop wired in `diff-three-column-view.tsx:13,128,161,195`; areHunkPropsEqual includes onHunkExpand at `diff-hunk.tsx:107`; shortcut scope guard at `diff-view-renderer.tsx:369`; 3-way conflict refactored to single-pass at `diff-3way.ts:200-244`; dead exports deprecated at `diff-gutter.tsx:9` and `diff-file-list.tsx:198`; test assertions specific in `diff-cross-file.test.tsx`; dead parameter removed in `diff-template.ts:5`.

Follow-up:

- No remaining plan-owned work.
