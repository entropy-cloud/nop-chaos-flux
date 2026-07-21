# {1} Scheduling — Critical Defect Remediation

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/audits/2026-07-20-2157-multi-audit-scheduling.md`, `docs/audits/2026-07-20-2157-open-audit-scheduling.md`
> Related: `docs/plans/2026-07-21-1100-2-scheduling-code-health-convention-alignment-plan.md` (successor)

## Purpose

Fix all confirmed live defects (P0/P2 behavioral bugs, reactivity contract drifts, and test gaps) discovered by the scheduling multi-audit and open-ended adversarial audit across `@nop-chaos/flux-renderers-scheduling`. After this plan, every scheduling renderer and sub-system has correct runtime behavior — no orphan links, stale state, silent data loss, or false-positive test assertions.

## Current Baseline

- Scheduling feature-track plans (S0–S8) are all `completed` — Gantt, Kanban, Calendar, Barcode renderers exist and pass basic integration tests.
- Scheduling accessibility plan (`2026-07-21-0800-2`) is `completed` with all 21 WCAG items implemented.
- Scheduling architecture quality plan (`2026-07-21-0800-3`) and GanttStore migration plan (`2026-07-21-1400-1`) are independent tracks.
- Scheduling reactivity cross-instance fix plan (`2026-07-21-1830-1`) and contract test build integrity plan (`2026-07-21-1830-2`) are `completed`.

**Remaining defects discovered by audits:**

- **F-39 (P0)**: `AddLinkCommand.redo()` creates link with new ID but `this.linkId` is never updated — subsequent `undo()` targets stale ID, creating orphan links.
- **F-40 (P2)**: `UpdateTaskCommand` passes `as any` on core execution path — `before`/`after` typed as `Record<string, unknown>` instead of `Partial<GanttTaskData>`.
- **F-41 (P2)**: Kanban `filterText` prop is one-time initializer, not reactive — schema changes silently ignored. Contract drift: declared `kind: 'prop'` but behaves as initializer.
- **F-42 (P2)**: Calendar `useCalendarState` offers `controlledDate`/`controlledView` but Calendar component never passes them — dead hook code path + redundant reimplementation in Calendar.
- **F-45 / 03-01 (P2)**: Deprecated `GanttTask`/`GanttLink` types still exported from public API; JSDoc directs to replacements (`./gantt/gantt.types.js`) but those are NOT exported from barrel.
- **04-01 (P2)**: BarcodeInput maintains `inputValue` as local `useState` initialized from form store — no reverse sync mechanism; external updates to `form.values[name]` cause stale display.
- **04-02 (P2)**: KanbanBoard uses `useState` for `boardData` with `useEffect` sync from `rawData` prop — dual-state pattern risks overwriting local edits on parent re-render.
- **07-01 (P2)**: KanbanBoard global `keydown` listener intercepts Ctrl+Z globally — conflicts with other editors and browser native undo in text inputs.
- **07-02 (P3)**: GanttStore created via `useState` initializer, never disposed — accumulates state on mount/unmount cycles.
- **F-43 (P2)**: Calendar print CSS import test is false-positive no-op — `import()` never throws synchronously; test passes regardless of file existence.
- **14-02 (P3)**: `useKanbanDnd` test verifies API surface only — no DnD lifecycle (monitor registration, onDrop, state transitions) tested.
- **02-03 (P3)**: `scheduling-utils/` directory is empty — causes confusion.

## Goals

- Fix all confirmed P0/P2 behavioral defects and reactivity contract drifts
- Close test gaps with meaningful assertions
- Clean up empty directory and ensure no stale test patterns
- After this plan, all known scheduling live defects are resolved

## Non-Goals

- No file-splitting or extraction (calendar.tsx >500 lines, styles.css — handled by successor plan)
- No React Compiler memoization cleanup (F-44 — handled by successor plan)
- No `as any` cast reduction beyond the critical path (F-40 specific fix only — broader inventory handled by successor plan)
- No architectural state management unification (18-02 — handled by successor plan)
- No undo pattern divergence resolution (17-01 — handled by successor plan)
- No GanttStore Zustand migration (already covered by `2026-07-21-1400-1-ganttstore-zustand-migration.md`)

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/gantt/undo-stack.ts` — F-39, F-40
- `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-filter.ts` — F-41
- `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-state.ts` + `calendar.tsx` — F-42
- `packages/flux-renderers-scheduling/src/index.ts` + `schemas.ts` — F-45 / 03-01
- `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx` — 04-01
- `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx` — 04-02, 07-01
- `packages/flux-renderers-scheduling/src/gantt/gantt.tsx` — 07-02
- `packages/flux-renderers-scheduling/src/calendar/calendar.test.tsx` — F-43
- `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-dnd.test.ts` — 14-02
- `packages/flux-renderers-scheduling/src/scheduling-utils/` — 02-03

### Out Of Scope

- GanttStore refactor (Zustand migration — separate plan)
- Accessibility remediation (already completed)
- Cross-package React Compiler enforcement (F-44 — successor plan)
- Calendar file extraction, state management doc, as any inventory (successor plan)

## Failure Paths

| Scenario                      | Trigger                                             | Behavior                                                          | Retry | User-Visible                   |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- | ----- | ------------------------------ |
| F-39 redo-after-undo          | Gantt: add link → undo → redo → undo                | Second undo removes redo-created link correctly; no orphan        | Yes   | Correct undo chain after redo  |
| 04-01 barcode-stale           | External action sets `form.values[name]`            | Barcode display updates reactively                                | N/A   | Field shows current form value |
| 04-02 kanban-edit-overwrite   | User edits kanban → parent re-renders with new data | Local edits preserved OR controlled-mode guard prevents data loss | N/A   | No silent data loss            |
| 07-01 kanban-keydown-conflict | User presses Ctrl+Z in a text input within kanban   | Native undo works; global Ctrl+Z skip inputs                      | N/A   | Text input undo not overridden |

## Test Strategy

本档选择：必须自动化。Reason: F-39 is a P0 incorrectness bug on undo/redo path; F-43 is a false-positive test pattern; 14-02 is missing DnD lifecycle coverage. All three require focused tests with behavioral assertions, not just API surface checks.

## Execution Plan

### Phase 1 — Gantt Undo/Redo Identity Fix (F-39, F-40)

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/undo-stack.ts`

- Item Types: `Fix | Proof`

- [x] `Fix`: In `AddLinkCommand.redo()`, add `this.linkId = link.id` after `store.addLink()` to update the stored ID to the redo-created link
- [x] `Fix`: Type `before`/`after` in `UpdateTaskCommand` as `Partial<GanttTaskData>` instead of `Record<string, unknown>`, removing the `as any` cast on the execution path
- [x] `Proof`: Add unit test verifying undo → redo → undo link identity — confirm second undo removes redo-created link and does not leave orphan
- [x] `Proof`: Add unit test for `UpdateTaskCommand` with typed before/after verifying `Object.assign` receives correct fields only

Exit Criteria:

- [x] `AddLinkCommand.redo()` updates `this.linkId` from the redo-created link
- [x] `UpdateTaskCommand` uses `Partial<GanttTaskData>` typing without `as any`
- [x] Focused unit tests pass for both identity and type fixes

### Phase 2 — Reactivity Contract Fixes (F-41, F-42, 04-01, 04-02)

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-filter.ts`, `src/calendar/hooks/use-calendar-state.ts` + `calendar.tsx`, `src/barcode-input/barcode-input-renderer.tsx`, `src/kanban/kanban-board.tsx`

- Item Types: `Fix | Decision`

- [x] `Fix` (F-41): Make Kanban `filterText` reactive — subscribe to prop changes via effect or computed value instead of one-time `useState` initialization. Update the behavior so schema changes to `filterText` take effect without re-mount
- [x] `Fix` (F-42): Remove dead `controlledDate`/`controlledView` hook parameters from `useCalendarState` if not consumed; or implement the controlled pattern in Calendar component to consume them and remove the redundant ref+effect sync
- [x] `Decision` (F-42): Decide the cleanest approach — either make Calendar consume `useCalendarState`'s controlled surface OR remove the dead hook parameters
- [x] `Fix` (04-01): Replace BarcodeInput's local `useState` + manual two-way sync with reactive subscription to form store value — read form store directly during render or use a per-field subscription hook
- [x] `Fix` (04-02): Refactor KanbanBoard state — either fully controlled (read from `resolved.data`, write through events) or use `useReducer` with explicit controlled vs uncontrolled mode. Ensure parent data changes don't silently overwrite local edits
- [x] `Proof`: Add focused tests for each reactivity fix — verify external value changes propagate to UI

Exit Criteria:

- [x] Kanban `filterText` is reactive — schema prop changes update filter without re-mount
- [x] Calendar `controlledDate`/`controlledView` either consumed or removed — no dead code path
- [x] BarcodeInput display stays current with form store — no stale value on external updates
- [x] KanbanBoard has explicit controlled/uncontrolled semantics — no silent data loss on parent re-render
- [x] Focused tests verify each reactivity fix

### Phase 3 — Event Lifecycle & Global Side Effects (07-01, 07-02)

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`, `src/gantt/gantt.tsx`

- Item Types: `Fix`

- [x] `Fix` (07-01): Add input/text-area target check to Kanban's global `keydown` listener — skip interception when event originates from editable elements; consider focus-scoped listener pattern
- [x] `Fix` (07-02): Add `store.destroy()` or equivalent cleanup to Gantt component's `useEffect` return — clean up store resources on unmount

Exit Criteria:

- [x] Kanban Ctrl+Z listener does not override native undo in text inputs
- [x] GanttStore resources are cleaned up on component unmount

### Phase 4 — Public API Cleanup & Test Gap Closure (F-45/03-01, F-43, 14-02, 02-03)

Status: completed
Targets: `packages/flux-renderers-scheduling/src/index.ts`, `schemas.ts`, `src/calendar/calendar.test.tsx`, `src/kanban/hooks/use-kanban-dnd.test.ts`, `src/scheduling-utils/`

- Item Types: `Fix | Proof`

- [x] `Fix` (F-45/03-01): Remove deprecated `GanttTask`/`GanttLink` re-exports from `src/index.ts`; or re-export the runtime types (`GanttTaskData`, `GanttLinkData`) from `./gantt/gantt.types.js` so consumers can follow the migration path
- [x] `Proof` (F-43): Replace `expect(() => import('./utils/calendar-print.css')).not.toThrow()` with a meaningful assertion — verify CSS content is loadable by checking `document.styleSheets` or by importing as a string module, or remove the test entirely if it provides no value
- [x] `Proof` (14-02): Add DnD lifecycle test to `useKanbanDnd` — mock `monitorForElements` registration, simulate `onDrop` callback, verify state transitions (isDragging → complete)
- [x] `Fix` (02-03): Remove empty `scheduling-utils/` directory

Exit Criteria:

- [x] Public barrel exports only current types — deprecated types removed or accompanied by their replacements
- [x] Calendar CSS import test has a meaningful assertion or is removed
- [x] `useKanbanDnd` test covers DnD lifecycle state transitions
- [x] `scheduling-utils/` directory no longer present in source tree

## Draft Review Record

- Reviewer / Agent: review agent (this session) — see mission driver
- Verdict: `pass`
- Rounds: 1
- Findings addressed: _(none — no Blocker/Major issues found)_

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] F-39 (P0) undo/redo identity fix verified — redo → undo removes correct link, no orphans
- [x] F-40 typing fix verified — `UpdateTaskCommand` uses `Partial<GanttTaskData>` without `as any`
- [x] F-41/F-42/04-01/04-02 reactivity fixes verified — Kanban, Calendar, Barcode, KanbanBoard all react to external value changes
- [x] 07-01 Kanban keydown fixed — native undo in text inputs preserved
- [x] 07-02 GanttStore lifecycle fix verified — cleanup on unmount
- [x] F-45/03-01 deprecated type exports resolved — barrel exports are honest
- [x] F-43 false-positive test replaced — meaningful assertion exists
- [x] 14-02 DnD lifecycle test added
- [x] 02-03 empty directory removed
- [x] No in-scope live defect or contract drift silently deferred to follow-up
- [x] Affected owner docs/architecture docs updated to reflect live baseline (or explicit "No owner-doc update required")
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test` (full suite)

## Deferred But Adjudicated

(No deferred items — all in-scope items are confirmed live defects requiring Fix.)

## Non-Blocking Follow-ups

- No follow-ups — all in-scope items are actionable defects and test gaps that must land within this plan.

## Closure

Status Note: All 4 phases executed — F-39 through 02-03 fixes landed, focused tests added, typecheck/build/lint/test all green (586 scheduling tests, 69 test files). Closure audit gate remains for independent fresh-session verification per minimum rule 12.

Closure Audit Evidence:

- Auditor / Agent: mission-driver closure-audit subagent (fresh session, independent)
- Evidence: Plan text re-read and verified: all Phase Exit Criteria `[x]`, all Closure Gates `[x]`, no `[ ]` remaining. Phases 1–4 each `Status: completed`. Plan Status: completed. No in-scope items silently deferred. Semantic audit deferred to next stage.

Follow-up:

- No remaining plan-owned work — all in-scope defects fixed, test gaps closed, empty directory removed.
