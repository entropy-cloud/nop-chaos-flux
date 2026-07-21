# 2 Scheduling Package Hardening

> Plan Status: active
> Last Reviewed: 2026-07-21
> Source: `docs/audits/2026-07-21-1920-multi-audit-scheduling.md` (S14-01, S14-02, S14-03, S01-01, S13-01, S15-01), `docs/audits/2026-07-21-1920-open-audit-scheduling.md` (F-55, F-56)
> Related: `docs/plans/2026-07-21-2100-1-dead-module-cleanup-scheduling-content.md`

## Purpose

Improve the scheduling package's quality baseline across three dimensions: test coverage for the most critical interactive paths, type safety for the BarcodeInput store access, CSS hygiene (missing + dead definitions), and React Compiler compatibility annotations. All findings target `@nop-chaos/flux-renderers-scheduling` only.

## Current Baseline

- Gantt interactive hooks have critically low test coverage: `useGanttDrag` 9.87%, `useGanttKeyboard` 29.41%, `useGanttLinkDraw` 26.02%, `useGanttScroll` 48.48% (S14-01, P1).
- Kanban export utility `kanban-export.ts` has 14.28% coverage — `boardDataToJson`, `boardDataFromJson`, `downloadBlob` largely untested (S14-02, P2).
- `prepare-wasm.test.ts` patches `globalThis.fetch` with `vi.fn()` across 6 tests but relies only on `beforeEach` cleanup — no `afterEach` defense (S14-03, P3).
- BarcodeInput at `barcode-input.tsx:21` reads `form.store.getState()` directly and double-casts (`as` twice), bypassing `useScopeSelector`'s per-path subscription and type safety (S01-01 + S13-01, P2).
- 6 CSS classes used in TSX have no definitions: `nop-kanban-column-resize-handle`, `nop-kanban-card-tag`, `nop-kanban-card-members`, `nop-kanban-card-member`, `nop-input-text`, `nop-input-group` (F-55, P2).
- 21 CSS definitions in `calendar.css`, `gantt.css`, `kanban.css` have zero TSX usage — estimated ~8-10% dead CSS in the scheduling stylesheet (F-56, P2).
- Two React Compiler warnings from TanStack React Virtual (`use-gantt-drag.ts`, `use-kanban-virtualizer.ts:18`) have no `eslint-disable` annotation with rationale (S15-01, P2).

## Goals

- Gantt interactive hook coverage raised above 50% (statements) for the four flagged hooks.
- Kanban export utility coverage raised above 50%.
- `globalThis.fetch` test cleanup hardened with `afterEach`.
- BarcodeInput switched from `form.store.getState()` to `useScopeSelector`, removing `as` casts.
- All 6 missing CSS definitions added; all 21 dead CSS definitions removed.
- React Compiler warnings annotated with `eslint-disable-next-line react-compiler/react-compiler` and rationale.

## Non-Goals

- Not raising coverage across the entire scheduling package — only the two flagged areas (Gantt hooks, Kanban export).
- Not redesigning the BarcodeInput's value-read architecture beyond the `useScopeSelector` migration.
- Not auditing CSS across other packages — only the scheduling stylesheets.

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-drag.ts`
- `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-keyboard.ts`
- `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-link-draw.ts`
- `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-scroll.ts`
- `packages/flux-renderers-scheduling/src/kanban/utils/kanban-export.ts`
- `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx`
- `packages/flux-renderers-scheduling/src/barcode-input/utils/prepare-wasm.test.ts`
- `packages/flux-renderers-scheduling/src/calendar/calendar.css`
- `packages/flux-renderers-scheduling/src/gantt/gantt.css`
- `packages/flux-renderers-scheduling/src/kanban/kanban.css`
- `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-drag.ts` (compiler annotation)
- `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-virtualizer.ts` (compiler annotation)

### Out Of Scope

- F-51, F-52, F-53, F-59, S01-02 (covered in Plan 1)
- F-54, F-57, F-58 (covered in Plan 3)

## Test Strategy

必须自动化 — coverage improvements directly address CI-measured low-coverage regions; the `useScopeSelector` migration must not regress existing form behavior.

## Execution Plan

### Phase 1 — Test coverage: Gantt hooks + Kanban export

Status: planned
Targets: 4 Gantt hooks + Kanban export + fetch mock cleanup

- Item Types: `Proof | Fix`

- [ ] Write integration tests for `useGanttDrag` primary path (drag start/move/end, ghost creation/cleanup)
- [ ] Write integration tests for `useGanttKeyboard` (arrow navigation, focus management)
- [ ] Write integration tests for `useGanttLinkDraw` (anchor drag, polyline computation)
- [ ] Write integration tests for `useGanttScroll` (scroll sync, coordinate mapping)
- [ ] Write round-trip tests for `kanban-export.ts` (export board → import JSON → verify structure equality)
- [ ] Add `afterEach(() => { vi.restoreAllMocks(); })` to `prepare-wasm.test.ts`

Exit Criteria:

- [ ] Each of the 4 Gantt hooks achieves ≥50% statement coverage (verify via `pnpm test -- --coverage`)
- [ ] Kanban export achieves ≥50% statement coverage
- [ ] `prepare-wasm.test.ts` has explicit `afterEach` cleanup

### Phase 2 — BarcodeInput store access + type safety

Status: planned
Targets: `barcode-input.tsx`

- Item Types: `Fix`

- [ ] Replace `form.store.getState()` with `useScopeSelector(scope, (s) => s?.values?.[name])` for path-granular subscription
- [ ] Remove both `as` casts — the selector preserves the store's generic type parameter
- [ ] Verify the replacement compiles and existing barcode tests pass

Exit Criteria:

- [ ] No `form.store.getState()` calls remain in `barcode-input.tsx`
- [ ] No `as` casts remain in the value-read path

### Phase 3 — CSS hygiene

Status: planned
Targets: `calendar.css`, `gantt.css`, `kanban.css`, TSX files using missing classes

- Item Types: `Fix`

- [ ] Add CSS definitions for the 6 missing classes: `nop-kanban-column-resize-handle`, `nop-kanban-card-tag`, `nop-kanban-card-members`, `nop-kanban-card-member`, `nop-input-text`, `nop-input-group`
- [ ] Remove the 21 dead CSS definitions identified in F-56 (calendar: 13, gantt: 4, kanban: 4)

Exit Criteria:

- [ ] Grep for each of the 6 classes shows a definition in the stylesheet
- [ ] Grep for each of the 21 dead CSS selectors shows zero TSX matches (confirmed dead, not stale-grep)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes

### Phase 4 — React Compiler annotations

Status: planned
Targets: `use-gantt-drag.ts`, `use-kanban-virtualizer.ts`

- Item Types: `Fix`

- [ ] Add `// eslint-disable-next-line react-compiler/react-compiler` with rationale (`// TanStack React Virtual API returns functions incompatible with compiler memoization`) before each of the 2 compiler-skip sites

Exit Criteria:

- [ ] Both compiler warnings are annotated with `eslint-disable-next-line` and rationale
- [ ] `pnpm lint` shows 0 new issues

## Draft Review Record

- Reviewer / Agent: mission-driver review session (2026-07-21)
- Verdict: `revised`
- Rounds: 1
- Findings addressed: Scope section lines 41-44 used PascalCase function names (`useGanttDrag.ts`, etc.) instead of actual kebab-case file names (`use-gantt-drag.ts`, etc.) — fixed in place.

## Closure Gates

- [ ] All in-scope test coverage targets met (Gantt hooks ≥50%, Kanban export ≥50%)
- [ ] BarcodeInput uses `useScopeSelector` with no `as` casts on the value-read path
- [ ] All 6 missing CSS definitions added
- [ ] All 21 dead CSS definitions removed
- [ ] Both React Compiler warnings annotated
- [ ] No in-scope live defect or contract drift silently downgraded to deferred
- [ ] Affected owner docs updated if public contract changed (barcode-input scope subscription)
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
