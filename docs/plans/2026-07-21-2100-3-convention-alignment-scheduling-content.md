# 3 Convention Alignment — Scheduling + Content

> Plan Status: active
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

Status: planned
Targets: `gantt.tsx`, `kanban-board.tsx`, `calendar.tsx`, `barcode-input.tsx`

- Item Types: `Fix`

- [ ] Add `helpers` to the destructuring in all 4 scheduling renderers
- [ ] Replace direct `props.props`/`props.meta`/`props.events` access with standard hooks where applicable: `useRendererRuntime()`, `useRenderScope()`, `useScopeSelector()`, `useActionDispatcher()`, `useCurrentForm()`, `useCurrentPage()`, `useRenderFragment()`, `useCurrentNodeMeta()`
- [ ] Remove any now-redundant direct store/prop drilling once hooks are in place
- [ ] Verify `pnpm typecheck` passes after each renderer change

Exit Criteria:

- [ ] All 4 scheduling renderers destructure `helpers` from `props`
- [ ] Each renderer uses at least the hooks relevant to its responsibilities (runtime, scope, action dispatch)

### Phase 2 — Hook migration (content renderer)

Status: planned
Targets: `packages/flux-renderers-content/src/diff-view/diff-view-renderer.tsx`

- Item Types: `Fix`

- [ ] Add `helpers` destructuring to `diff-view-renderer.tsx`
- [ ] Replace direct prop access with standard hooks as applicable
- [ ] Verify `pnpm typecheck` passes

Exit Criteria:

- [ ] `diff-view-renderer.tsx` destructures `helpers`
- [ ] Renderer uses standard flux-react hooks
- [ ] `pnpm typecheck` passes

### Phase 3 — React.memo removal + dangerouslySetInnerHTML comment

Status: planned
Targets: `diff-line.tsx`

- Item Types: `Fix | Decision`

- [ ] Remove `React.memo(DiffLineComponent, areDiffLinePropsEqual)` wrapper — React Compiler auto-memoizes
- [ ] Add an explicit safety comment before `dangerouslySetInnerHTML` explaining both code paths escape via `escapeHtml()` so future maintainers know not to remove escaping

Exit Criteria:

- [ ] No `React.memo` wrapping `DiffLineComponent` remains
- [ ] Inline comment documents the escaping guarantee at the `dangerouslySetInnerHTML` site

## Draft Review Record

- Reviewer / Agent: current review session (MISSION_DRIVER)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - (Minor) Phase 1 & 3 Exit Criteria included `pnpm build` — removed per Min Rule 18 (full build is Closure Gates scope)
  - (Minor) Test Strategy missing `本档选择：` prefix — added
  - (Minor) Phase 2 target used short filename — replaced with full path

## Closure Gates

- [ ] All 5 renderers destructure `helpers` from props
- [ ] All 5 renderers use standard flux-react hooks instead of direct prop access
- [ ] `React.memo` removed from `diff-line.tsx`
- [ ] `dangerouslySetInnerHTML` site annotated with safety rationale
- [ ] No in-scope live defect or contract drift silently downgraded to deferred
- [ ] Affected owner docs updated if public contract changed
- [ ] By independent sub-agent (fresh session) closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

(none)

## Non-Blocking Follow-ups

(none)

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>
