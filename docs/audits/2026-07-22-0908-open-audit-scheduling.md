> Audit Status: closed
> Audit Type: open-ended
> Mission: scheduling

# Open-Ended Adversarial Audit — Scheduling Mission

**Date**: 2026-07-22 (second pass)
**Examiner**: AI agent following `docs/skills/open-ended-adversarial-review-prompt.md`
**Scope**: `packages/flux-renderers-scheduling/` — Gantt, Kanban, Calendar, BarcodeInput
**Prior reports read**: `docs/audits/2026-07-22-0908-open-audit-scheduling.md` (prior first pass, 12 findings), `docs/analysis/2026-07-21-1920-open-audit-scheduling/round-01.md` + `round-02.md` (F-46→F-70), `docs/analysis/2026-07-22-deep-audit-scheduling/` summaries (126 findings)

**Deduplication**: This round found 10 new findings (F-71→F-80) not present in any prior report.

---

## F-71: `critical-path.ts` Dead Production Code with Deprecated Type Imports

**Location**: `packages/flux-renderers-scheduling/src/gantt/components/critical-path.ts` (138 lines)

**Problem**: `calculateCriticalPath()` and `isCriticalTask()` are imported by zero production files. Only `critical-path.test.ts` references them. Line 1 imports `GanttTask`/`GanttLink` (internal types with computed layout fields `$x`, `$y`, `$w`, `$p`) rather than `GanttTaskData`/`GanttLinkData`, creating a stale type dependency if the old types are removed.

**Why care**: Dead production code that bundles with Gantt. Test creates false-positive coverage signal. Stale type imports create maintenance risk.

**Confidence**: Certain

---

## F-72: Kanban Explicitly Voids `columnsOrderOwnership` and `columnsOrderStatePath` — Promised Feature Not Implemented

**Location**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:73-76`

**Problem**: These two props are:

- Registered in `scheduling-renderer-definitions.ts:88-89`
- Declared in `KanbanSchema` (kanban.types.ts:60-61)
- Read from `resolved` at lines 73-74
- Immediately suppressed with `void` at lines 75-76

A consumer who reads the schema type and sets `columnsOrderOwnership: 'scope'` with a valid `columnsOrderStatePath` gets silently ignored. This contrasts with `collapsedStatePath`/`collapsedOwnership` which ARE fully implemented (lines 91-137).

**Why care**: Schema contract promises controlled column ordering; component silently ignores it. The `void` expressions exist only to suppress TypeScript's `no-unused-vars` — they conceal an incomplete feature.

**Confidence**: Certain

---

## F-73: Calendar Weekend CSS Selector Still Broken (F-58 Repair Incomplete)

**Location**: `packages/flux-renderers-scheduling/src/calendar/calendar.css:48`

**Problem**: Previous round-02 reported `data-weekend="weekend"` vs CSS selector `[data-weekend="true"]`. The fix corrected the attribute value (now emits `'true'` at `calendar-month-view.tsx:223`), but the CSS selector `.nop-calendar [data-slot='calendar-cell']:has([data-weekend='true'])` still uses `:has()` which selects descendants only. Since `data-weekend` is on the **same element** as `data-slot="calendar-cell"`, the `:has()` pseudo-class never matches. A weekend cell receives no gray background.

A developer inspecting `data-weekend="true"` in DevTools would see the correct attribute and assume the CSS works — silent failure.

**Why care**: Weekend visual styling in the month view is entirely broken since initial implementation. The prior fix addressed only half the problem.

**Confidence**: Certain

---

## F-74: Calendar Month View `locale` Parameter Inaccessible from Schema

**Location**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:12-62`

**Problem**: Function signature includes `locale = 'en-US'` (line 61) but `CalendarMonthViewProps` interface (lines 12-29) doesn't declare it. The `WEEKDAY_LABELS` map (lines 31-34) supports `zh-CN` and `en-US`, but the default is always `en-US` with no schema field to control it.

The calendar's schema system provides `statusPath`, `viewOwnership`, `dateStatePath` etc. but not `locale`.

**Why care**: Non-English users get English weekday labels with no way to change them. The i18n system (`t()` from `@nop-chaos/flux-i18n`) is used for status messages but weekday labels use a separate hardcoded mechanism.

**Confidence**: Certain

---

## F-75: Calendar Hardcoded Emoji Violates Project Convention

**Location**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:454`

**Problem**: Empty-state fallback renders `📅`. AGENTS.md explicitly states: "Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked."

**Why care**: Emoji rendering is platform-inconsistent and inaccessible (screen readers may read "calendar" or ignore it). A `Calendar` icon from `lucide-react` (already a dependency) should be used instead.

**Confidence**: Certain

---

## F-76: `GanttSchema.body` Declared in Type But Never Registered or Consumed

**Location**: `packages/flux-renderers-scheduling/src/schemas.ts:78` vs `scheduling-renderer-definitions.ts:9-63`

**Problem**: `GanttSchema` declares `body?: SchemaInput`, but:

1. `scheduling-renderer-definitions.ts` has no `{ key: 'body', kind: 'region' }`
2. `gantt.tsx` never reads `regions.body`

Contrast with `CalendarSchema.body` which IS registered and consumed (calendar.tsx:465-468). This is not marked as deprecated or reserved — it appears as a regular, usable field in the type.

**Why care**: Schema authors who write `"body": [...]` in their Gantt JSON get silently ignored. No error, no warning, no rendering.

**Confidence**: Certain

---

## F-77: Deprecated Fields in Renderer Definitions Are Invisible to Schema Authors

**Location**: `packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.ts:23,27,28,30,36,52,53`

**Problem**: Seven Gantt fields are marked `// @deprecated` in comments. The `GanttSchema` type does NOT have `@deprecated` JSDoc on any of these fields:

- `scales`, `startDate`, `endDate`, `progressBarHeight`, `calendar`, `childrenField`, `initiallyExpanded`

Similarly, `component:print`/`component:exportPNG`/`component:importICal`/`component:exportToICal` are marked `// @reserved` but visible as regular reaction keys.

These are plain `//` comments, not JSDoc `/** @deprecated */`. The compiler framework does not surface renderer-definition comments to consumers.

**Why care**: The deprecation exists only in the implementation, invisible to both JSON and TypeScript consumers. A TypeScript user sees `GanttSchema.scales` as valid with no indication it's dead. The deprecation is one-sided — maintainers know but can't communicate to consumers.

**Confidence**: Certain

---

## F-78: Gantt Undo Stack Persists Across Schema-Driven Task Replacement

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:156` + `undo-stack.ts:161-213`

**Problem**: `undoStackRef` stores an `UndoStack` instance created once at line 156. When `store.parse()` re-runs (lines 78-85) on task/link/resource/assignment prop changes, the undo stack is NOT cleared. Commands captured during the previous task set reference task IDs from the old data.

**Scenario**: Schema-driven Gantt loads tasks A → user drags → undo stack records `UpdateTaskCommand` → schema changes to tasks B (API refresh) → user hits undo → command tries to update a task ID that no longer exists in the store. The `updateTask` call (`gantt-store.ts:204`) does `this.store.setState` successfully (it's a no-op on `Map.set` with an existing key if the key is present, but it will add a spurious entry if the key is MISSING — actually, `Map.set` adds if key is missing). Wait: `newTasks.set(id, { ...existingTask, ...rest })` — if `id` doesn't exist in `newTasks` (which was cloned from `state.tasks`), it would ADD the task back. So the undo command would resurrect a deleted task.

Actually, looking at `updateTask` in `gantt-store.ts`:

```ts
const state = this.gs();
const task = state.tasks.get(id);
if (!task) return;
const newTasks = new Map(state.tasks);
let updated = { ...task, ...rest } as GanttTask;
newTasks.set(id, updated);
```

It returns early if the task doesn't exist. So no spurious addition. But the command references a stale `before` state. If the same task ID happens to exist in the new data, the undo would restore stale values.

**Why care**: Cross-data-set undo corruption. Low probability if task IDs are truly ephemeral, but a correctness bug when IDs are stable across schema refreshes.

**Confidence**: Likely

---

## F-79: `useGanttDrag` Drop Indicator Element Can Leak into DOM

**Location**: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-drag.ts:31-41,172-181`

**Problem**: `ensureDropIndicator()` lazily appends a `<div>` to `document.body`. The cleanup effect (line 172) removes it on unmount. But if a stale pointer event calls `onPointerDown` after cleanup has run (e.g., during unmount timing), `ensureDropIndicator()` creates a new element that no cleanup path can remove.

**Why care**: DOM node leak in a SPA with frequent Gantt mount/unmount cycles. Each stale event adds one orphaned `<div>` to `<body>`.

**Confidence**: Likely (edge case)

---

## F-80: Calendar `isToday()` Uses Local `new Date()` Against UTC Date — Midnigh Boundary Wrong Highlight

**Location**: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-date-utils.ts:56-59`

**Problem** (re-reported — previously F-59, check for fix):

```ts
export function isToday(date: Date): boolean {
  const now = new Date();
  const utcToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return isSameDay(date, utcToday);
}
```

`now` is a local-time `new Date()`. If the local time is 11 PM on July 21 and the calendar is viewing July 22 in UTC (because all calendar date math uses `getUTCFullYear`/`getUTCMonth`/`getUTCDate`), then `now.getFullYear()/getMonth()/getDate()` return July 21 local while the calendar cell represents July 22 UTC. The cell highlighted as "today" differs from the user's actual local today.

The rest of `calendar-date-utils.ts` consistently uses UTC methods (`getUTCFullYear`, `setUTCDate`, etc.). Only `isToday()` mixes local and UTC — it creates `utcToday` from `now`'s local date components, then compares against the UTC-based `date`.

**Why care**: Users near the midnight timezone boundary will see the wrong cell highlighted as "today". The calendar is UTC-consistent everywhere except this one function.

**Confidence**: Certain

---

## Total Assessment

| ID   | Severity | File                                                      | Issue                                                                                |
| ---- | -------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| F-71 | P3       | `critical-path.ts`                                        | Dead production code (138 lines), deprecated type imports                            |
| F-72 | P2       | `kanban-board.tsx:73-76`                                  | `columnsOrderOwnership`/`columnsOrderStatePath` explicitly voided — promised feature |
| F-73 | P2       | `calendar.css:48`                                         | Weekend selector `:has()` never matches — F-58 half-fixed                            |
| F-74 | P2       | `calendar-month-view.tsx:61-62`                           | `locale` param inaccessible from schema; hardcoded `en-US`                           |
| F-75 | P3       | `calendar.tsx:454`                                        | Hardcoded emoji violates AGENTS.md convention                                        |
| F-76 | P2       | `schemas.ts:78`                                           | `GanttSchema.body` declared but never registered or consumed                         |
| F-77 | P2       | `scheduling-renderer-definitions.ts:23,27,28,30,36,52,53` | Deprecated fields invisible to consumers                                             |
| F-78 | P2       | `gantt.tsx:156`, `undo-stack.ts:161-213`                  | Undo stack not cleared on schema data refresh                                        |
| F-79 | P3       | `use-gantt-drag.ts:31-41,172-181`                         | Drop indicator DOM leak on stale pointer events                                      |
| F-80 | P2       | `calendar-date-utils.ts:56-59`                            | `isToday()` mixes local/UTC — near-midnight wrong highlight                          |

### Key Patterns Detected

1. **Half-repaired bugs** (2 findings): F-73 (weekend CSS selector attribute fixed but selector broken) and F-80 (`isToday()` still broken — not verified if F-59 was actually fixed). The prior F-58 fix was incomplete.

2. **Silent contract drift** (3 findings): F-72 (void expressions concealing unfinished feature), F-76 (unregistered `body` field), F-77 (deprecation invisible to consumers). All three create a gap between what the type/definition promises and what the component delivers.

3. **Dead code with maintenance risk** (1 finding): F-71 (`critical-path.ts`). Clearable with a single deletion.

### Blind Spots Self-Assessment

What this round likely missed:

1. **Actual test execution**: Did not run `pnpm test --filter @nop-chaos/flux-renderers-scheduling` to verify which prior findings would fail and whether the current round-02 fixes actually pass. Some findings (F-63) appeared fixed by code inspection but test confirmation would be stronger.

2. **Cross-package contract audit**: Did not verify whether `RendererComponentProps` generic narrowing works correctly across the `flux-core` → `flux-react` → `flux-renderers-scheduling` boundary for `GanttSchema`, `KanbanSchema`, etc. Type narrowing issues could exist at the `RendererDefinition.component` generic parameter.

3. **CSS-in-JS conflicts**: Did not check whether Tailwind v4 `@source` directive effectively picks up `*.css` files from this package (known monorepo issue #14).

4. **Dynamic import paths for Calendar `component:exportPNG`/`component:print`**: Did not verify whether the optional peer deps (`html2canvas`, `jspdf`) are imported correctly and not bundled into the main chunk.

5. **Kanban undo stack memory pressure**: Did not test with 10,000+ cards to verify the 1000-entry undo limit (kanban-undo-stack.ts) doesn't cause OOM or jank.

Best starting point for next round: **run the scheduling test suite** against HEAD, confirm which prior findings surface as test failures, then do a cross-package type narrowing audit at the `scheduling-renderer-definitions.ts` → `flux-core` `registerRendererDefinitions()` boundary.

---

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
