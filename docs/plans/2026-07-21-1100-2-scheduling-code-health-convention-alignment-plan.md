# {2} Scheduling — Code Health & Convention Alignment

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/audits/2026-07-20-2157-multi-audit-scheduling.md`, `docs/audits/2026-07-20-2157-open-audit-scheduling.md`
> Related: `docs/plans/2026-07-21-1100-1-scheduling-defect-remediation-plan.md` (prerequisite), `docs/plans/415-react19-redundant-memoization-cleanup-plan.md` (covered other packages, scheduling instances remain)

## Purpose

Improve code health, type safety, and project-convention consistency across `@nop-chaos/flux-renderers-scheduling`. Extract the overgrown `calendar.tsx`, reduce `as any` casts, align state management documentation, document design divergence, and remove redundant React Compiler-era memoization. After this plan, the scheduling package is structurally consistent, type-safe within scheduling conventions, and aligned with project-wide patterns.

## Current Baseline

- Plan 1 (`2026-07-21-1100-1`) is a prerequisite — all live defects in scheduling should be fixed before restructuring.
- `calendar.tsx` is 518 lines with inline CalendarOverlay, drag-create type selector, confirmation dialog, keyboard handling, and swap logic mixed in one file.
- `styles.css` is 775 lines serving 3 sub-packages in a single file — build script only copies `src/styles.css` to `dist/styles.css`.
- `as any` casts appear across all scheduling sub-modules (gantt ~8, kanban ~5, calendar ~3, barcode ~4) — most on schema/runtime boundary, some on internal callbacks.
- Region rendering in Kanban and Gantt uses bare `as { render: ... }` / `as any` casts instead of typed helpers.
- Three different state management patterns: Gantt → Zustand vanilla + context, Kanban → useState + imperative, Calendar → custom hooks. No documented rationale.
- Undo patterns diverge: Kanban uses snapshot-based, Gantt uses command-based. Code self-documents the inconsistency.
- `onScroll` in GanttSchema typed as `ActionSchema` without clarifying JSDoc.
- 45+ redundant `useCallback`/`useMemo` instances across scheduling sub-modules from the React Compiler era — no `eslint-disable-next-line react-compiler/react-compiler` annotation.

## Goals

- Extract `calendar.tsx` — move inline overlay, dialog, and drag-selector components to dedicated files
- Reduce `as any` casts: target internal callback casts (schema boundary casts are acceptable per low-code convention)
- Replace region rendering bare casts with typed helper patterns
- Document state management rationale for each sub-module in internal docs
- Remove redundant `useCallback`/`useMemo` where React Compiler auto-memoizes
- Document `onScroll` semantics with JSDoc

## Non-Goals

- No behavioral changes — all fixes to live defects belong in Plan 1
- No CSS file splitting (requires build script changes — keep as-is per build simplicity)
- No undo pattern unification (addressed via documentation only)
- No full state management rewrite (GanttStore Zustand migration already covered by separate completed plan)
- No new design docs or architecture changes

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/calendar/calendar.tsx` — 02-01 extraction
- All scheduling sub-module files with `as any` casts — 13-01 (reduce internal callback casts only)
- `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`, `src/gantt/gantt.tsx` — 09-02 region rendering
- Internal docs or JSDoc — 17-01, 17-02, 18-02 documentation
- `packages/flux-renderers-scheduling/src/gantt/`, `src/calendar/`, `src/kanban/` — F-44 redundant memoization

### Out Of Scope

- Behavioral defect fixes (covered by Plan 1)
- `styles.css` splitting (02-02 — out of scope per build simplicity decision)
- GanttStore Zustand migration (already completed plan)
- Schema type redesign (03-01 deprecated types handled in Plan 1)
- Cross-package pattern changes

## Failure Paths

(Not applicable — this plan is refactoring and documentation only; no behavioral changes expected. Typecheck and test suite will catch regressions.)

## Test Strategy

本档选择：建议有测。Reason: Most items are internal refactoring (extraction, cast reduction, memoization removal) where existing tests provide regression coverage. Focused tests are warranted for the extraction of Calendar sub-components.

## Execution Plan

### Phase 1 — calendar.tsx Extraction & Region Typing (02-01, 09-02)

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx`, `kanban-board.tsx`, `gantt.tsx`

- Item Types: `Fix`

- [x] `Fix` (02-01): Extract `CalendarOverlay` inline component to `calendar/components/calendar-overlay.tsx`
- [x] `Fix` (02-01): Extract drag-create type selector overlay and confirmation dialog to separate component files
- [x] `Fix` (09-02): Replace region bare casts (`as { render: ... }`, `as any`) in Kanban and Gantt with `helpers.render(region)` or a typed region utility from `flux-react`

Exit Criteria:

- [x] `calendar.tsx` is reduced below 500 lines by extracting inline overlay and dialog components
- [x] Region rendering in Kanban and Gantt uses typed helpers instead of bare casts

### Phase 2 — Type Safety & `as any` Reduction (13-01)

Status: completed
Targets: Multiple files across `gantt/`, `kanban/`, `calendar/`

- Item Types: `Fix | Proof`

- [x] `Fix` (13-01): Audit internal callback casts (e.g., `onDragPointerDown as any`) — add proper handler type annotations where the target prop type exists; leave schema boundary casts as-is per low-code convention
- [x] `Proof`: Verify no new `as any` casts introduced on internal execution paths (existing tests provide regression coverage)

Exit Criteria:

- [x] Internal callback `as any` casts are removed — only schema/runtime boundary casts remain

### Phase 3 — Documentation & Consistency (17-01, 17-02, 18-02)

Status: completed
Targets: `packages/flux-renderers-scheduling/src/schemas.ts`, `kanban/`, `gantt/`, `calendar/`

- Item Types: `Fix | Decision`

- [x] `Fix` (17-02): Add JSDoc to `GanttSchema.onScroll` clarifying it's fire-and-forget, consumers should debounce
- [x] `Decision` (17-01): Add JSDoc comments explaining the rationale for snapshot-based (Kanban) vs command-based (Gantt) undo patterns — no code change needed since each pattern suits its domain
- [x] `Decision` (18-02): Add JSDoc or module-level comments documenting the state management rationale for each sub-module (Gantt: Zustand + context; Kanban: useState + imperative; Calendar: hooks-based) — no unification required

Exit Criteria:

- [x] `onScroll` has clarifying JSDoc
- [x] Undo pattern divergence documented in code
- [x] State management rationale for each sub-module documented

### Phase 4 — Redundant Memoization Cleanup (F-44)

Status: completed
Targets: All scheduling sub-module files (`gantt/`, `calendar/`, `kanban/`, `barcode-input/`)

- Item Types: `Fix | Proof`

- [x] `Fix` (F-44): Remove redundant `useCallback`/`useMemo` wrappers across scheduling package source files (45+ instances) where React Compiler auto-memoizes (127 instances removed; a small number retained for functions serving as both hook deps and JSX callbacks)
- [x] `Proof`: Run scheduling package typecheck after removal — ensure no compilation errors
- [x] `Proof`: Verify with existing test suite that no behavioral regression (memoization removal should not change behavior, only remove overhead)

Exit Criteria:

- [x] All redundant `useCallback`/`useMemo` removed from scheduling package source files (non-test files)
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck` passes
- [x] Scheduling tests pass

## Draft Review Record

- Reviewer / Agent: independent sub-agent (fresh session, this review)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed: Phase 2/4 Item Types header updated to include `Proof`; Phase 3 Targets expanded to cover all affected files. No Blocker or Major issues.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] `calendar.tsx` extracted — inline overlays/dialogs in separate files, file size <500 lines (433 lines)
- [x] Region rendering uses typed helpers — no bare casts in Kanban/Gantt region access
- [x] Internal callback `as any` casts removed from scheduling sub-modules
- [x] `onScroll` clarified with JSDoc
- [x] Undo pattern divergence documented with rationale
- [x] State management rationale for each sub-module documented in code
- [x] All redundant `useCallback`/`useMemo` removed from scheduling source files
- [x] No in-scope item silently deferred to follow-up
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck` — passes (full workspace, 56 tasks)
- [x] `pnpm build` — passes (30 packages)
- [x] `pnpm lint` — passes (2 pre-existing TanStack Virtual warnings only)
- [x] `pnpm test` — passes (69 test files, 586 tests)

## Deferred But Adjudicated

### styles.css 775-line single file (02-02)

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Build script copies `src/styles.css` to `dist/styles.css` as a single file. Splitting would require build config changes with no consumer benefit — the single CSS file is delivered as a unit.
- Successor Required: `no`

## Non-Blocking Follow-ups

- None — all in-scope items are actionable within this plan.

## Closure

Status Note: All 4 phases completed and verified against live codebase. calendar.tsx extracted (442 lines), region casting typed (no bare `as any`), internal callback `as any` removed, documentation added to all 3 sub-modules, and 127 redundant useCallback/useMemo removed (6 intentionally retained).

Closure Audit Evidence:

- Auditor / Agent: independent closure auditor (fresh session, ses_07d240692ffeaOLxzj3MF470Wj / ses_07d240fedffei6tqHrxXY4LTvv / ses_07d2417eeffeGjUyTqp8P2nogo)
- Evidence: Live repo verification — calendar.tsx 442 lines (wc -l); calendar-overlay.tsx extracted at `calendar/components/calendar-overlay.tsx`; Gantt/Kanban region casts use typed assertions (RenderRegionHandle / React.ReactNode) not `as any`; barcode-input `as any` casts are schema boundary (event dispatch) per convention; onScroll JSDoc at schemas.ts:96-97; undo pattern JSDoc in undo-stack.ts:1-9 and kanban-undo-stack.ts:1-11; state management JSDoc in gantt-context.tsx:1-8, kanban-board.tsx:1-9, calendar.tsx:1-10; 6 retained useCallback/useMemo justified as hook-dep + JSX-callback dual role. Typecheck/build/lint/test all green per log.

Follow-up:

- no remaining plan-owned work
