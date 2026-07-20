> Audit Status: open
> Audit Type: open-ended (Round 2)
> Mission: scheduling
> Date: 2026-07-20
> Source perspective: Cross-boundary messenger + malicious input + lifecycle tracker

## F-14: GanttEditor is completely dead — dialog never opens (CRITICAL)

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-editor.tsx:13-14`

**What**: The GanttEditor component has:

```typescript
const [open, setOpen] = useState(false); // line 13 — never set to true
const [editingTaskId, setEditingTaskId] = useState<string | number | null>(null); // line 14 — never set
```

No code path ever sets `open` to `true` or `editingTaskId` to a non-null value. The component
always returns `null` (line 40: `if (!open) return null`). The editor region is declared in
the schema and rendered in `gantt.tsx:122`:

```typescript
<GanttEditor editorRegion={regions.editor as any} />
```

But it never renders anything.

**Why care**: The Gantt design document (§12.3, S2.9) specifies double-click task editing as a
core interaction. The keyboard handler (`use-gantt-keyboard.ts:51-55` on Enter) calls
`onOpenEditor?.(selectedTaskId)` — which is passed `setSelectedTaskId` (gantt.tsx:59). But
`setSelectedTaskId` is `Gantt`'s local state for `selectedTaskId`, not the editor open state.
The editor's `open` state is completely disconnected from the keyboard handler.

The existing multi-audit flagged this as "P3: GanttEditor open/editingTaskId disconnected from
parent selectedTaskId — editor unreachable via keyboard" (Dim04-07). This characterization is
too mild: it's not just "unreachable via keyboard" — **there is no mechanism whatsoever** (mouse
double-click, programmatic API, or keyboard) to open the editor. The editor component is a
permanently dead region that always renders `null`.

S2.9 in roadmap-scheduling.md is marked "done" and claims "双击/右键任务弹出编辑浮层" but the
implementation is completely non-functional.

**Confidence**: Certain

---

## F-15: `onLineClick` event declared in schema but never fires (diff-view)

**Location**:

- `packages/flux-renderers-content/src/diff-view/diff-split-view.tsx:25`
- `packages/flux-renderers-content/src/diff-view/diff-unified-view.tsx:24`

**What**: Both split and unified views accept `onLineClick` as a prop but immediately rename it
to `_onLineClick` (convention for intentionally unused parameter):

```typescript
export function DiffSplitView({ ..., onLineClick: _onLineClick, ... }) {
```

The schema declares `onLineClick?: ActionSchema` and the renderer-definition registers it as
`kind: 'event'`. It's wired through the diff-view renderer to these views — then silently
dropped. Neither `DiffHunkComponent` nor `DiffLineComponent` receive any `onClick` handler.

**Why care**: Any consumer attaching event-handling logic to `onLineClick` (e.g., "click a diff
line to navigate to source", "click to select code") will find it never fires. The schema
contract promises a capability that the runtime silently ignores. This is a contract violation
at the same level as the previously-flagged Gantt unwired events (P2-11) — but with the
difference that the diff-view's `onLineClick` is actually passed through layers until it's
explicitly renamed to `_` and dropped, making it a deliberate omission rather than an oversight.

**Confidence**: Certain

---

## F-16: Calendar week view only shows events for the first resource

**Location**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-week-view.tsx:53-56`

**What**: The `positionedByDay` useMemo filters events against `resources[0]?.id` only:

```typescript
const dayEvents = events.filter((evt) => {
  const evtDate = evt.start.split('T')[0] ?? evt.start;
  return evtDate === dateStr && (evt.resourceId ?? '') === (resources[0]?.id ?? '');
});
```

When the calendar has multiple resources (e.g., multiple employees in a scheduling view),
every resource after the first sees no events in week view. The `CalendarDayView` correctly
filters per-resource using a parameter, so this is a week-view-specific bug.

**Why care**: S4.3 (week/day view) in the roadmap is "done" and claims "时间格细分到小时, 垂直
百分比定位, 并发事件宽度分配". But week view with multiple resources is broken — only the
first resource's events display. This makes the week view unusable for the primary use case
(scheduling multiple employees). The demo page may only have one resource, masking the bug.

**Confidence**: Certain

---

## F-17: Calendar drag on events triggers BOTH swap and create simultaneously

**Location**:

- `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:186`
- `packages/flux-renderers-scheduling/src/calendar/components/calendar-week-view.tsx:137`
- `packages/flux-renderers-scheduling/src/calendar/components/calendar-day-view.tsx:105`

**What**: `CalendarEventBlock` fires `onPointerDown` without `stopPropagation()`. The pointer
event bubbles up to the parent cell, which fires `onCellDragStart` (the create-drag handler).
This means dragging an existing event starts BOTH `useCalendarDrag.startDrag` (swap) AND
`useCalendarDragCreate.startCellDrag` (create). Both hooks register global `pointermove`/
`pointerup` listeners, causing conflicting state updates.

**Why care**: Dragging an event in calendar triggers two concurrent drag operations. The user
sees both the swap drag ghost AND the new-event creation type selector when they release. The
interaction is unpredictable — sometimes swapping, sometimes creating, depending on which
listener fires first. This affects all three views (month, week, day).

**Confidence**: Certain

---

## F-18: Cross-day lines SVG is a dead empty element

**Location**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:211-222`

**What**: When `showCrossDayLines` is true, a `<svg>` is rendered with the CSS class
`nop-calendar-cross-day-lines` but NO children. The utility functions `computeCrossDayLines`
and `createSVGPath` exist in `calendar-cross-day-lines.ts` and are unit-tested, but are never
imported or called in any view component. The prop toggles an invisible empty SVG.

**Why care**: S5.4 (cross-day visual connector lines) in the roadmap is "done" with status
claiming "多日事件在拆分块之间渲染浅色弧形连接线". The utility code exists and is tested,
but it's never wired to the UI. The feature is entirely dead — the DOM has an empty SVG,
and users never see any connector lines. This is a complete feature failure despite "done"
status.

**Confidence**: Certain

---

## F-19: Calendar uses hardcoded `zh-CN` locale with no override mechanism

**Location**:

- `packages/flux-renderers-scheduling/src/calendar/components/calendar-header.tsx:15`
- `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:84`
- `packages/flux-renderers-scheduling/src/calendar/components/calendar-week-view.tsx:85`
- `packages/flux-renderers-scheduling/src/calendar/components/calendar-day-view.tsx:58`

**What**: Multiple Calendar components hardcode the Chinese locale with no prop to override:

- `calendar-header.tsx`: `locale: string = 'zh-CN'` (default parameter, no prop passthrough)
- `calendar-month-view.tsx`: Weekday labels via `getWeekdayLabels('zh-CN', ...)`
- `calendar-week-view.tsx`: Day-of-week array `['日', '一', '二', '三', '四', '五', '六']`
- `calendar-day-view.tsx`: `currentDate.toLocaleDateString('zh-CN', ...)`

None of these components accept a `locale` prop. Even if the Calendar root component were
extended with a `locale` prop, it couldn't pass it through to the view components.

Additionally, `calendar.tsx:27-31` defines `DEFAULT_SHIFT_TYPES` with hardcoded Chinese labels
(`'早班'`, `'休假'`, `'预约'`, `'维保'`) that are used for both display AND logic (the labels
are shown to users, not just as internal types). The `calendar-timezone-selector.tsx:33` formats
offsets with `'zh-CN'` hardcoded.

**Why care**: The package is part of `@nop-chaos` which is designed for international ERP
deployments. The Calendar sub-domain has no internationalization mechanism — it's hardcoded to
Chinese. Existing i18n keys for scheduling calendar (in `flux-i18n`) exist for some strings
(e.g., `t('scheduling.today')`) but none of the Calendar view components use them for the
day/month headers, shift type labels, or dialog text.

**Confidence**: Certain

---

## F-20: Diff-view has zero CSS class definitions — rendering is entirely inline-styled

**Location**: `packages/flux-renderers-content/src/styles.css` (no `nop-diff-*` classes)

**What**: All diff-view CSS classes used in JSX (`nop-diff-line`, `nop-diff-gutter`,
`nop-diff-content`, `nop-diff-header`, `nop-diff-hunk`, `nop-diff-split-view`,
`nop-diff-unified-view`, `nop-diff-three-column-view`, etc.) have NO CSS definitions in any
stylesheet in the repository. The diff-view components rely on inline styles for all visual
presentation — every structural style is in JSX `style={}` objects.

Combined with the fact that `packages/flux-renderers-content` CSS is also missing from the
playground (the scheduling CSS missing import was P1-14 in the existing audit, but the diff-view
CSS is in the content package, not the scheduling package), this means:

1. No CSS file defines visual differentiation of added/deleted/context lines
2. The entire component renders as structurally correct but visually flat output
3. The inline styles for basic layout create a maintenance burden

**Why care**: S9 (Diff-view) is marked "done" with all 9 work items complete. The diff-view
design doc (§10) specifies visual styling for added/deleted lines, gutter colors, hunk headers,
etc. Without CSS definitions, the component cannot render the specified visual design. The
diff-view may appear "functional" in the playground only because the playground's page-level
CSS or inherited styles provide minimal rendering.

**Confidence**: Certain

---

## F-21: Barcode scanner `BarcodeQueue` is a module-level singleton shared across all instances

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx:26`

**What**:

```typescript
const queue = new BarcodeQueue(); // module level
```

The `BarcodeQueue` instance is created at module scope, not inside the component. Every
`BarcodeScannerOverlay` instance on the page shares the same queue. If batch-scanning in one
overlay, items enqueued there appear in all overlays.

**Why care**: In an ERP form with multiple barcode-input fields (e.g., scanning items into
multiple form fields), opening two scanner overlays causes their queues to merge. Items scanned
in overlay A appear in overlay B's pending queue, and vice versa. This is a cross-instance
state leak that produces data corruption rather than just a visual glitch.

The existing multi-audit didn't flag this because it focused on per-instance async patterns
(camera init, detection poll) rather than cross-instance shared state.

**Confidence**: Certain

---

## F-22: Batch-mode queue dedup only checks `pending` status — duplicate scans after submission

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx:99-110`

**What**: In batch mode, the `useEffect` triggers on every `detect.result` change (each scan
cycle). The `BarcodeQueue.enqueue` method (barcode-queue.ts) deduplicates only against items
with `status === 'pending'`. Once items are submitted (status → 'submitted') and the scanner
continues running, the same barcode re-enqueues as a new pending item.

**Why care**: In a warehouse scanning scenario where the same barcode appears on multiple
items, or the scanner re-reads the same barcode while waiting for confirmation, duplicates
accumulate in the queue. The "batch scan" feature (S8.6) guarantees deduplication, but the
actual dedup window is only between scans before submission — after any submission, all
previously-seen barcodes become "new" again.

**Confidence**: Certain

---

## F-23: GanttEditor uses `document.getElementById()` to read form values — breaks with multiple instances

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-editor.tsx:66-70`

**What**: The save handler reads input values via DOM queries:

```typescript
const textInput = document.getElementById('edit-text') as HTMLInputElement;
```

HTML `id` attributes must be unique per page. If two Gantt editors exist (e.g., in a dashboard
with multiple charts), `document.getElementById` returns the first element found, not the one
belonging to the current editor instance. The wrong values are saved.

**Why care**: Even though the editor is currently dead (F-14), when someone fixes the open
state, they'll encounter this `document.getElementById` anti-pattern. It's a latent bug that
will manifest as soon as the editor becomes functional. Should use React refs or scoped element
queries from the start.

**Confidence**: Certain

---

## F-24: `barcode-input` `readOnly` schema field declared but never checked

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx`

**What**: The schema declares `readOnly?: boolean` (barcode-input.types.ts:17) and the
renderer-definition registers it as a prop field. But the renderer never reads it:

```typescript
// barcode-input-renderer.tsx line 91
disabled={meta.disabled}
// No equivalent for readOnly
```

When `readOnly=true` and `disabled=false`, the input remains editable.

**Why care**: Schema consumers who set `readOnly: true` expect a read-only input. The rendering
ignores it silently. Combined with the `inputValue` dual-state issue (P1-06 in existing audit),
a read-only form that pre-populates a value shows empty AND still editable.

**Confidence**: Certain

---

## F-25: `barcode-input` `onMount`/`onUnmount` events declared but never dispatched

**Location**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input-renderer.tsx`

**What**: The schema declares `onMount?: ActionSchema` and `onUnmount?: ActionSchema`
(barcode-input.types.ts:33-34). The barcode-input-schemas.ts registers them as `kind: 'meta'`.
But the renderer has no `useEffect` that dispatches these events. The existing audit flagged
the same issue for Gantt and Calendar (P1-03, Dim03) but missed the identical gap in
barcode-input.

**Why care**: Cross-package schema inconsistency. All four scheduling renderers (Gantt,
Calendar, Kanban, Barcode) declare `onMount`/`onUnmount` in their schemas. Only Kanban
actually dispatches them (via standard renderer runtime handling). The other three have dead
contracts — see F-13 for Calendar's related issue.

**Confidence**: Certain

---

## F-26: Calendar `stale closures` capture initial dates/view in event callbacks

**Location**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:134-144`

**What**: The `useCalendarState` callbacks capture closure values at definition time:

```typescript
onDateChange: (date: Date) => {
  events.onDateChange?.({ date: date.toISOString(), view: activeView }); // stale activeView
},
onViewChange: (view: CalendarView) => {
  events.onViewChange?.({ view, date: currentDate.toISOString() }); // stale currentDate
},
```

- `onDateChange` always reports the INITIAL `activeView` (from `resolved.view` at line 39),
  not the current view after the user switches tabs.
- `onViewChange` always reports the INITIAL `currentDate`, not the date that was current when
  the view changed.

**Why care**: Schema consumers who listen to `onDateChange` or `onViewChange` receive
historically stale data. If a schema action uses the view from `onDateChange` (e.g., "when
date changes, reload data for the current view"), it gets the wrong view. The `onViewChange`
event reports the wrong current date.

**Confidence**: Certain

---

## Summary of Round 2 Findings

| ID   | Severity | File                                       | Issue                                                                               |
| ---- | -------- | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| F-14 | P0       | gantt-editor.tsx:13-14                     | GanttEditor completely dead — never opens, always null                              |
| F-15 | P1       | diff-split-view.tsx, diff-unified-view.tsx | `onLineClick` event declared in schema, renamed to `_` at consumption — never fires |
| F-16 | P1       | calendar-week-view.tsx:53-56               | Week view only shows events for first resource — multi-resource scheduling broken   |
| F-17 | P1       | calendar-month/week/day-view               | Dragging event triggers both swap AND create drag simultaneously                    |
| F-18 | P1       | calendar-month-view.tsx:211-222            | Cross-day lines SVG empty — feature utility exists but never wired to UI            |
| F-19 | P1       | calendar/ multiple files                   | Hardcoded `zh-CN` locale with no override mechanism through component hierarchy     |
| F-20 | P1       | diff-view/styles.css                       | Zero `nop-diff-*` CSS class definitions — all rendering relies on inline styles     |
| F-21 | P1       | barcode-scanner-overlay.tsx:26             | BarcodeQueue module-level singleton — cross-instance state leak                     |
| F-22 | P2       | barcode-scanner-overlay.tsx:99-110         | Batch queue dedup only checks pending status — duplicates after submission          |
| F-23 | P2       | gantt-editor.tsx:66-70                     | `document.getElementById()` for form values — breaks with multiple instances        |
| F-24 | P2       | barcode-input-renderer.tsx                 | `readOnly` schema field declared but never checked by renderer                      |
| F-25 | P2       | barcode-input-renderer.tsx                 | `onMount`/`onUnmount` declared in schema but never dispatched                       |
| F-26 | P2       | calendar.tsx:134-144                       | Stale closures in useCalendarState callbacks — wrong view/date in event payloads    |

**Total round 2**: 13 new findings (1 P0, 7 P1, 5 P2)

**Cumulative (round 1 + 2)**: 26 novel findings, 0 duplicates with 116-item multi-audit.

**Pattern detected**: Multiple "done" roadmap items have completely non-functional features:

- S2.9 (Gantt editor) — component dead, no open path
- S5.4 (cross-day lines) — utility exists, UI empty
- S5.7 (timezone selector) — hardcoded locale, no i18n
- S9 (diff-view CSS) — zero stylesheet definitions
- S4.3 (week view multi-resource) — only first resource works
