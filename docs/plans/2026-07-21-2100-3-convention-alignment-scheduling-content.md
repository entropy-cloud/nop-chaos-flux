# 3 Convention Alignment — Scheduling + Content

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/audits/2026-07-21-1920-open-audit-scheduling.md` (F-54, F-57, F-58)
> Related: `docs/plans/2026-07-21-2100-2-scheduling-package-hardening.md`

## Purpose

Align the scheduling and content renderer packages with established project conventions: use standard `@nop-chaos/flux-react` hooks, eliminate redundant `React.memo` under React Compiler, and harden the `dangerouslySetInnerHTML` pattern with explicit safety documentation.

## Current Baseline

- All 5 scheduling + content renderers (Gantt, KanbanBoard, Calendar, BarcodeInput, DiffView) either miss `helpers` destructuring or use zero of the 8 standard `@nop-chaos/flux-react` hooks mandated by AGENTS.md. Only BarcodeInput uses any (2 of 8). None destructure `helpers` (F-54).
- `diff-view/components/diff-line.tsx` uses `dangerouslySetInnerHTML` on user-supplied diff content. Currently safe (both code paths escape via `escapeHtml()`), but there is no comment explaining why it is safe, making it a future-regression risk (F-57).
- `diff-view/components/diff-line.tsx` wraps `DiffLineComponent` in `React.memo` with a custom 12-line comparator — redundant under React Compiler and lacks `eslint-disable-react-compiler` annotation (F-58).
- All three findings are `Certain` confidence (F-54, F-58) or `Likely` (F-57 — future regression risk).

## Goals

- Every scheduling and content renderer destructures `helpers` and uses the standard flux-react hooks for runtime, scope, dispatch, and fragment rendering.
- `React.memo` removed from `diff-line.tsx` (React Compiler handles memoization).
- `dangerouslySetInnerHTML` in `diff-line.tsx` annotated with an explicit safety rationale comment.

## Non-Goals

- Not addressing redundant `useMemo`/`useCallback` across the entire scheduling package (covered by F-44 note — addressed in Plan 2 Phase 4 for compiler annotations, but the wider sweep is out of scope).
- Not introducing new feature work (e.g., keyboard drag reorder for Gantt) — convention alignment only.

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/gantt/gantt.tsx`
- `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`
- `packages/flux-renderers-scheduling/src/calendar/calendar.tsx`
- `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx`
- `packages/flux-renderers-content/src/diff-view/diff-view-renderer.tsx`
- `packages/flux-renderers-content/src/diff-view/components/diff-line.tsx`

### Out Of Scope

- F-51, F-52, F-53, F-59, S01-02 (covered in Plan 1)
- S14-01, S14-02, S14-03, S01-01, S13-01, F-55, F-56, S15-01 (covered in Plan 2)

## Test Strategy

本档选择：不适用：无行为变更 — all changes are convention alignment (hook imports, destructuring, comment-only, removing redundant wrapper). No behavioral difference.

## Execution Plan

### Phase 1 — `helpers` destructuring + hook migration (scheduling renderers)

Status: completed
Targets: `gantt.tsx`, `kanban-board.tsx`, `calendar.tsx`, `barcode-input.tsx`

- Item Types: `Fix`

- [x] Add `helpers` to the destructuring in all 4 scheduling renderers
- [x] Replace direct `props.props`/`props.meta`/`props.events` access with standard hooks where applicable: `useRendererRuntime()`, `useRenderScope()`, `useScopeSelector()`, `useActionDispatcher()`, `useCurrentForm()`, `useCurrentPage()`, `useRenderFragment()`, `useCurrentNodeMeta()`
- [x] Remove any now-redundant direct store/prop drilling once hooks are in place
- [x] Verify `pnpm typecheck` passes after each renderer change

Exit Criteria:

- [x] All 4 scheduling renderers destructure `helpers` from `props`
- [x] Each renderer uses at least the hooks relevant to its responsibilities (runtime, scope, action dispatch)

### Phase 2 — Hook migration (content renderer)

Status: completed
Targets: `packages/flux-renderers-content/src/diff-view/diff-view-renderer.tsx`

- Item Types: `Fix`

- [x] Add `helpers` destructuring to `diff-view-renderer.tsx`
- [x] Replace direct prop access with standard hooks as applicable
- [x] Verify `pnpm typecheck` passes

Exit Criteria:

- [x] `diff-view-renderer.tsx` destructures `helpers`
- [x] Renderer uses standard flux-react hooks
- [x] `pnpm typecheck` passes

### Phase 3 — React.memo removal + dangerouslySetInnerHTML comment

Status: completed
Targets: `diff-line.tsx`

- Item Types: `Fix | Decision`

- [x] Remove `React.memo(DiffLineComponent, areDiffLinePropsEqual)` wrapper — React Compiler auto-memoizes
- [x] Add an explicit safety comment before `dangerouslySetInnerHTML` explaining both code paths escape via `escapeHtml()` so future maintainers know not to remove escaping

Exit Criteria:

- [x] No `React.memo` wrapping `DiffLineComponent` remains
- [x] Inline comment documents the escaping guarantee at the `dangerouslySetInnerHTML` site

## Draft Review Record

- Reviewer / Agent: current review session (MISSION_DRIVER)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - (Minor) Phase 1 & 3 Exit Criteria included `pnpm build` — removed per Min Rule 18 (full build is Closure Gates scope)
  - (Minor) Test Strategy missing `本档选择：` prefix — added
  - (Minor) Phase 2 target used short filename — replaced with full path

## Closure Gates

- [x] All 5 renderers destructure `helpers` from props
- [x] All 5 renderers use standard flux-react hooks instead of direct prop access
- [x] `React.memo` removed from `diff-line.tsx`
- [x] `dangerouslySetInnerHTML` site annotated with safety rationale
- [x] No in-scope live defect or contract drift silently downgraded to deferred
- [x] Affected owner docs updated if public contract changed
- [x] By independent sub-agent (fresh session) closure-audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

(none)

## Non-Blocking Follow-ups

(none)

## Closure

Status Note: All three phases completed. typecheck, build, lint, test all pass.

Closure Audit Evidence:

- Auditor / Agent: MISSION_DRIVER (fresh closure-audit session)
- Evidence: Live code verification completed:
  - Phase 1: All 4 scheduling renderers (gantt.tsx, kanban-board.tsx, calendar.tsx, barcode-input.tsx) destructure `helpers` and use standard flux-react hooks ✓
  - Phase 2: DiffViewRenderer destructures `helpers` and uses standard hooks ✓
  - Phase 3: `React.memo(DiffLineComponent)` removed ✓; `dangerouslySetInnerHTML` annotated with safety rationale (diff-line.tsx:26-29) ✓
  - `pnpm typecheck` 56/56 ✓, `pnpm build` 30/30 ✓, `pnpm lint` 30/30 ✓, `pnpm test` 56/56 ✓
  - No deferred items; no in-scope defects downgraded
