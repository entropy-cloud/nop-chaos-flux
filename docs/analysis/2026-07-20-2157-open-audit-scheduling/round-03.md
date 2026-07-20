> Audit Status: open
> Audit Type: open-ended (Round 3)
> Mission: scheduling
> Date: 2026-07-20
> Source perspective: 10x scale operator + dead code cleaner

## F-27: Zero i18n usage in Gantt, Calendar, and Kanban sub-domains

**Location**: All files under `packages/flux-renderers-scheduling/src/gantt/`,
`src/calendar/`, `src/kanban/`

**What**: The `gantt/`, `calendar/`, and `kanban/` directories have ZERO imports or calls to
`t()` from `@nop-chaos/flux-i18n`. Only `barcode-input/barcode-scanner-overlay.tsx` correctly
uses `t()` for its overlay strings. The i18n locale files (`flux-i18n/src/locales/en-US.ts`
and `zh-CN.ts`) have defined keys under `flux.scheduling.gantt.*` (zoomFit, editTask, cancel,
save, name, start, end, duration, progress) but these keys are NEVER read by any runtime code.

The full list of hardcoded user-facing text that should use i18n:

**Gantt** (no i18n at all):

- `gantt-grid.tsx:7-11`: `DEFAULT_COLUMNS` labels `'Task'`, `'Start'`, `'End'`, `'Dur'`, `'Pred'`
- `gantt-header.tsx`: toolbar buttons, zoom labels
- `gantt/components/resource-load-view.tsx:29`: `'No resources configured'`
- `gantt/components/resource-load-grid.tsx:19,21`: Column headers `'Resource'`, `'Load'`
- `gantt/components/scheduler-config.tsx:43,47,50,58,61,65-68,74,81,90,94,98`: All labels,
  button text, status messages
- `gantt/components/filter-bar.tsx:60`: Placeholder `'Filter tasks...'`

**Calendar** (no i18n, all Chinese):

- `calendar.tsx:27-31`: `DEFAULT_SHIFT_TYPES` labels `'早班'`, `'休假'`, `'预约'`, `'维保'`
- `calendar.tsx:303,339,374,377,391,406`: Dialog titles, button text, confirmation text
- `calendar/components/calendar-header.tsx`: View labels `'月'`, `'周'`, `'日'`, nav text
- `calendar/components/calendar-month-view.tsx:84`: Weekday labels via `getWeekdayLabels`
- `calendar/components/calendar-week-view.tsx:85`: Weekday array `['日','一','二','三','四','五','六']`
- `calendar/components/calendar-batch-scheduler.tsx:133,138,158,164,191,232,250,253,292,297,308,324`:
  All labels, button text, column headers
- `calendar/components/calendar-timezone-selector.tsx:84`: Emoji globe icon as label

**Kanban** (no i18n, mixed Chinese/English):

- `kanban-board.tsx:152`: Hardcoded `'当前用户'` (Chinese) for action actor name
- `kanban-board.tsx:254`: Hardcoded `'暂无数据'` (Chinese) for empty state
- `kanban-board.tsx:269`: Hardcoded `'搜索卡片...'` (Chinese) for search placeholder
- `kanban-board.tsx:278,287,296`: Button titles `'撤销 (Ctrl+Z)'`, `'重做 (Ctrl+Shift+Z)'`, `'活动日志'`
- `kanban-board.tsx:339,341`: Hardcoded `'+ 添加列'`, `'拖拽卡片到此处'`
- `kanban-card.tsx`: Card templates, status labels
- `kanban-column.tsx`: Column header, card count, empty state, add card button
- `kanban/components/kanban-activity-log.tsx`: Activity log title, action descriptions

**Why care**: The scheduling package targets ERP/enterprise deployments where
internationalization is a baseline requirement (the project explicitly includes
`@nop-chaos/flux-i18n` as a dependency). Having i18n locale keys that exist but are never
consumed by the code creates a false sense of i18n coverage. Every user-facing string is
hardcoded in either Chinese or English with no mechanism for translation.

The contrast is sharp: `barcode-scanner-overlay.tsx` correctly uses `t()` for all UI text,
while the other three sub-domains use zero i18n. This suggests the i18n pattern was known
but not applied across all sub-domains.

**Confidence**: Certain

---

## F-28: Scheduling i18n locale keys exist but are never consumed

**Location**:

- `packages/flux-i18n/src/locales/en-US.ts:696-699` (keys defined)
- `packages/flux-i18n/src/locales/zh-CN.ts:695-708` (keys defined)

**What**: The locale files define:

```typescript
scheduling: {
  today: 'Today',
  noScheduleData: 'No schedule data',
  gantt: {
    zoomFit: 'Fit',
    editTask: 'Edit Task',
    cancel: 'Cancel',
    save: 'Save',
    name: 'Name',
    start: 'Start',
    end: 'End',
    duration: 'Duration',
    progress: 'Progress (%)',
  },
},
```

Zero of these keys are consumed by any source file in `flux-renderers-scheduling/src/`. The
keys `t('flux.scheduling.gantt.zoomFit')` etc. exist but are never referenced. Even the
calendar and kanban sub-domains have NO locale keys at all in the i18n package.

**Why care**: This is data-driven dead code. The `check:i18n-keys` script
(`scripts/check-i18n-keys.mjs`) verifies that `t('flux.*')` keys used in source code have
corresponding entries in locale files. But it cannot detect the reverse — locale entries that
no source code consumes. The 12+ locale keys under `scheduling.gantt` are dead. When someone
finally adds i18n to Gantt, they may waste time searching for existing locale keys that are
incomplete (no calendar/kanban/barcode keys exist, and the gantt keys that do exist don't cover
the full surface).

Additionally, the stored i18n key coverage for `scheduling.noScheduleData` is only used by
calendar (via the empty state text), and `scheduling.today` seems to be unused across all
sub-domains.

**Confidence**: Certain

---

## F-29: Gantt `handleScrollToToday` in header is also a stub (same pattern as F-01)

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-header.tsx:37-39`

**What**: Separate from the `useImperativeHandle` stubs in `gantt.tsx` (F-01), the
`GanttHeader` component also has a `handleScrollToToday` that stubs out the scroll behavior:

```typescript
const handleScrollToToday = useCallback(() => {
  store.emit('change');
}, [store]);
```

This is a different function than the imperative handle — it's the header toolbar button
handler. It also calls `store.emit('change')` without scrolling.

**Why care**: There are now THREE instances of the "scroll to today" stub pattern:

1. `gantt.tsx:73-75` — imperative handle `scrollToToday`
2. `gantt.tsx:76-81` — imperative handle `scrollToTask`
3. `gantt-header.tsx:37-39` — header toolbar button handler

This is a pattern, not an isolated bug. Three different functions named with "scroll"/
"today" semantics emit a change event without scrolling. This confirms the finding in F-01
(F-05 in the Gantt context) extends beyond the imperative handle to the actual UI. The
"Scroll to Today" toolbar button in the Gantt UI header is also broken.

**Confidence**: Certain

---

## F-30: Kanban test suite uses Chinese text assertions — fragile against i18n changes

**Location**: `packages/flux-renderers-scheduling/src/kanban/kanban-renderer.test.tsx:58,69,124`
and `kanban/components/kanban-activity-log.test.tsx:43,48,50,55,67,79`

**What**: The Kanban test suite asserts against hardcoded Chinese text:

```typescript
expect(screen.getByText('暂无数据')).toBeTruthy();
expect(screen.getByPlaceholderText('搜索卡片...')).toBeTruthy();
expect(screen.getByText('拖拽卡片到此处')).toBeTruthy();
expect(screen.getByText('活动日志')).toBeTruthy();
expect(screen.getByText(/李四/)).toBeTruthy(); // hardcoded Chinese name
```

If/when i18n is added and the locale is set to English, these tests break because the
rendered text changes to `'No data'`, `'Search cards...'`, etc.

**Why care**: Test fragility creates resistance to adding i18n. The tests are written against
the current hardcoded Chinese strings. Properly adding i18n requires either (a) fixing these
tests simultaneously, or (b) testing with specific locale context. Currently, neither approach
is considered in the test design. The assertion-less tests (F-10.2 in round 2) compound this
issue — tests that exist but verify nothing give false confidence.

**Confidence**: Certain

---

## Cross-round Summary

### Verification Cross-Check

| Source                                                   | Findings Found | Overlap with 116-item audit | Novel  |
| -------------------------------------------------------- | -------------- | --------------------------- | ------ |
| Round 1 (direct code reading)                            | 13             | 0                           | 13     |
| Round 2 (sub-agent Calendar + Diff-view + Barcode/Gantt) | 13             | 0                           | 13     |
| Round 3 (i18n gap analysis)                              | 4              | 0                           | 4      |
| **Total**                                                | **30**         | **0**                       | **30** |

### Key Patterns Detected

1. **Stub syndrome (3 instances)**: Functions named with action semantics (scroll, delete)
   that emit a change event but don't implement the promised behavior — P0 functional gap.

2. **Dead "done" status (3 instances)**: Roadmap items declared "done" that are completely
   non-functional (GanttEditor, cross-day lines SVG, diff-view CSS).

3. **Cross-instance state leaks (2 instances)**: Module-level singletons (BarcodeQueue) and
   DOM ID-based queries (GanttEditor) that break with multiple component instances.

4. **Missing i18n (entire sub-domains)**: Gantt, Calendar, and Kanban have zero i18n usage.
   The locale file has keys that are never consumed. Tests assert against hardcoded Chinese.

5. **Contract-runtime asymmetry (4 instances)**: Schema events declared but never dispatched
   (onLineClick, onEventCreate, onMount/onUnmount in barcode, readOnly prop).

6. **Reactivity misfit (2 instances)**: GanttStore EventEmitter pattern with coarse
   subscription causes both missed updates AND excessive re-renders — fundamentally
   incompatible with the project's Zustand convention.

### Previous Audit Gap Analysis

The 116-item multi-audit (2026-07-20) focused on:

- Accessibility (20 items) — 5 P0 keyboard issues
- UI component compliance (16 items)
- Test coverage (18 items)
- Async patterns (12 items)
- Error propagation (13 items)
- State ownership (11 items)

**What it missed**:

- **Functional correctness**: Two P0 bugs (scroll stubs, delete no-op) and a permanently dead
  component (GanttEditor) — the most impactful category
- **i18n**: Completely missed — zero findings about hardcoded Chinese/English text
- **Cross-instance state**: Module-level singletons, DOM ID anti-patterns
- **Architecture convention violations**: EventEmitter vs Zustand, ad-hoc React context
- **Compute correctness**: Resource load calculation produces wrong numbers
- **CSS artifacts**: Diff-view has zero stylesheet definitions
- **Reactivity granularity**: Coarse subscription with missed updates

Blind spot hypothesis: The previous audit was decomposed into independent dimensions executed
by parallel agents. This structure excelled at finding per-dimension issues (test quality,
styling violations, accessibility) but missed cross-dimensional patterns (e.g., "dead done
status" spans test coverage, feature completeness, and schema contract — no single dimension
would catch it).

### Recommended Immediate Priorities

| Priority | Finding                                  | Why                                              |
| -------- | ---------------------------------------- | ------------------------------------------------ |
| P0       | F-02: Delete/Backspace no-op             | User data loss expectation                       |
| P0       | F-01, F-29: Scroll stubs (3 instances)   | UI promises broken behavior                      |
| P0       | F-14: GanttEditor dead                   | Core interaction model missing                   |
| P0       | F-07: Resource load calculation bug      | Output is numerically wrong, not just suboptimal |
| P1       | F-16: Week view only first resource      | Multi-resource scheduling core use case broken   |
| P1       | F-17: Drag triggers both swap and create | Interaction corruption                           |
| P1       | F-19: Hardcoded zh-CN locale             | i18n baseline requirement unmet                  |
| P1       | F-27: Zero i18n in 3/4 sub-domains       | Internationalization gap                         |
| P1       | F-04: Kanban loading condition           | Non-loading boards show skeleton forever         |

### Blindness Self-Assessment

**What this review likely missed**:

1. **Build-time integration issues**: Did not verify that scheduling package exports are
   correctly resolved by the playground build system, or that tree-shaking doesn't remove
   essential CSS.
2. **Cross-package type safety**: Did not deep-dive into whether `RendererComponentProps<GanttSchema>`
   actually type-checks correctly with flux-core's generic constraints at runtime.
3. **Performance measurements**: Did not run any performance benchmarks against the O(n^2)
   algorithms — the findings are based on algorithmic analysis only.
4. **E2E test gap**: Did not attempt to run the test suite to verify which tests actually fail.
5. **Bundle size**: Did not analyze import graphs or bundle composition.
6. **Runtime error paths**: Did not verify error boundary behavior for any component.
7. **AMIS compatibility**: Did not check if the scheduling component signatures match AMIS
   baseline expectations for ERP migration scenarios.

**Best starting point for next round**: Build-time bundling analysis + type-level correctness
of renderer registration with flux-core type contracts + actual test suite execution.

---

## Final Result

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
