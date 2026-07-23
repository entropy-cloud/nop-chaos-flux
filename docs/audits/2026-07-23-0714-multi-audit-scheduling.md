> Audit Status: closed
> Audit Type: multi-dimensional
> Mission: scheduling

# Multi-Dimensional Audit: Scheduling Package

> Scope: `packages/flux-renderers-scheduling/` — Gantt, Kanban, Calendar, BarcodeInput
> Date: 2026-07-23
> Method: Deep audit per `docs/skills/deep-audit-prompts.md` — 4 batches of parallel dimension deep-dives (dimensions 04, 05, 06, 07, 09, 14, 15, 21, 22, 23)
> Baseline: `pnpm typecheck` passes, `pnpm lint` has 1 warning (TanStack Virtual React Compiler compat), `pnpm check:oversized-code-files` shows 1 scheduling file >700 lines (`kanban-board.tsx:725`) and 1 >500 lines (`calendar.tsx:581`)

---

## Audit Summary

| Dimension | Focus                                    | Initial Findings                                                         | Status   |
| --------- | ---------------------------------------- | ------------------------------------------------------------------------ | -------- |
| 04        | State Ownership & Single Source of Truth | 6 findings (2 P1, 2 P2, 1 P3, 1 informational)                           | Complete |
| 05        | Reactive Subscription Precision          | 9 findings (1 P1, 5 P2, 3 P3)                                            | Complete |
| 06        | Async Patterns & Cancellation Safety     | 10 findings (5 P2, 5 P3)                                                 | Complete |
| 07        | Lifecycle & Side Effect Ownership        | 18 findings (3 P1, 12 P2, 2 P3, 1 cleanup)                               | Complete |
| 09        | Renderer Contract Compliance             | 4 renderers scored: BarcodeInput=A, Calendar=B, Gantt=B, Kanban=C        | Complete |
| 14        | Test Coverage & Quality                  | 21 findings (1 P0, 6 P1, 8 P2, 6 P3)                                     | Complete |
| 15        | Security & Performance                   | 17 findings (6 P2, 4 P3, 7 informational/good)                           | Complete |
| 21        | Display & Positioning                    | 20 findings (16 previously-reported fixes verified, 3 new P2, 1 partial) | Complete |
| 22        | Integration Wiring & Operability         | 41 findings (26 fixes verified, 4 not fixed, 2 partial, 9 informational) | Complete |
| 23        | Test Effectiveness & False Green         | 13 findings (1 P1, 8 P2, 4 P3)                                           | Complete |

---

## P0 Findings

None found in current code. All 12 P0s from the prior 2026-07-22 audit (S11-S18) have been verified as fixed.

---

## P1 Findings

### State Ownership (Dim04)

| ID    | File                                 | Issue                                                                                                            |
| ----- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 04-01 | `kanban/kanban-board.tsx:98,148-154` | Props-to-state sync (`resolved.data` → `localBoardData`) can overwrite local mutations in `local` ownership mode |
| 04-02 | `gantt/gantt.tsx:79-82`              | Store re-parse from props on every render overwrites in-memory changes and clears undo stack                     |

### Reactive Subscriptions (Dim05)

| ID    | File                              | Issue                                                                     |
| ----- | --------------------------------- | ------------------------------------------------------------------------- |
| 05-02 | `gantt/gantt-timescale.tsx:12-13` | Unnecessary `treeRevision` subscription — timescale doesn't use tree data |

### Async Safety (Dim06)

No P1 findings. All 5 P2s are detailed below.

### Lifecycle (Dim07)

| ID     | File                                               | Issue                                                                                  |
| ------ | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 07-001 | `barcode-input/hooks/use-barcode-detect.ts:36-125` | Polling loop cannot restart when `enabled`/`interval` change (empty deps `[]`)         |
| 07-002 | `barcode-input/barcode-scanner-overlay.tsx:96-130` | Camera init effect has unstable `stop`/`start` function deps, re-runs on every render  |
| 07-022 | `calendar/calendar.tsx:376-402`                    | `document.querySelector` with string interpolation for drag visual — unscoped, fragile |

### Test Coverage (Dim14)

| ID    | File                                             | Issue                                                                            |
| ----- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| 14-1  | `calendar/components/*.tsx`                      | 3 Calendar dialog/overlay components at 0% coverage                              |
| 14-2  | `gantt/components/*.tsx`                         | 5 Gantt components (baseline-bars, compact, resource load views) at 0% coverage  |
| 14-3  | `barcode-input/`                                 | Weakest module: use-barcode-camera 53%, use-barcode-detect 38%, camera-utils 35% |
| 14-4  | `kanban/hooks/use-kanban-collab.ts`              | 0% branch coverage, 1 test for initial disconnected status only                  |
| 14-11 | `barcode-input/hooks/use-barcode-camera.test.ts` | Camera lifecycle incomplete (no error paths, no multiple start/stop tested)      |

### Test Effectiveness (Dim23)

| ID   | File                                | Issue                                                                                                                          |
| ---- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 23-1 | `kanban/kanban-helpers.test.ts:173` | Frozen defect: `changeCard` test asserts WRONG expected value (priority should be absent, but correct merge behavior keeps it) |

---

## P2 Findings (Selected Critical)

### Gantt Display (Dim21)

| ID   | File                         | Issue                                                                                                                                     |
| ---- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 21-6 | `gantt/gantt-grid.tsx:39-45` | Virtualizer scroll container mismatch — nested scrollable divs mean scroll events never fire, virtualization permanently stuck at index 0 |
| 21-7 | `gantt/gantt-bars.tsx:29-44` | Timeline content absolutely positioned, `timelineRef` never scrolls — virtual window never activates, ALL tasks always render             |

### Integration Wiring (Dim22)

| ID    | File                                            | Issue                                                                                                                         |
| ----- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 22-22 | `kanban/kanban-board.tsx, kanban-column.tsx`    | DnD adapters destroyed and recreated on every render — major performance regression with many cards; mid-drag disruption risk |
| 22-31 | `calendar/utils/calendar-layout-utils.ts:50-55` | Events with explicit `resourceId`s silently dropped when no resources array provided                                          |
| 22-13 | `gantt/utils/layout.ts:44-45`                   | End date treated inclusive — bars are 1 day shorter than expected                                                             |

### State Ownership (Dim04)

| ID    | File                                   | Issue                                                                                                |
| ----- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 04-03 | `gantt/components/filter-bar.tsx:27`   | Missing prop→local text sync in debounced filter; programmatic `filterText` changes silently ignored |
| 04-04 | `kanban/hooks/use-kanban-filter.ts:10` | Same pattern — missing `externalFilterText` → `localText` sync                                       |

### Security/Performance (Dim15)

| ID    | File                              | Issue                                                                                                         |
| ----- | --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 15-5  | `calendar/calendar.tsx:376-402`   | Direct DOM manipulation via `document.querySelector` for drag visual feedback — bypasses React reconciliation |
| 15-6  | `kanban/kanban-board.tsx:496-524` | Same pattern — direct DOM manipulation for drag visual                                                        |
| 15-8  | `gantt/gantt-store.ts:258-271`    | `deleteTask` — O(n\*m) nested loop, Map mutation during iteration                                             |
| 15-9  | `gantt/gantt-store.ts:92-100`     | `computeCoordinates` — in-place mutation of task objects in store (breaks immutability contract)              |
| 15-10 | `gantt/utils/layout.ts:113-124`   | `computeLinkPolylines` — same in-place mutation                                                               |
| 15-11 | `gantt/gantt-grid.tsx:38-49`      | Virtualization flash — `hasScrollContainer` deferred via useEffect, causes empty render on mount              |

### Async Safety (Dim06)

| ID   | File                                                | Issue                                                                                      |
| ---- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 06-1 | `barcode-input/hooks/use-barcode-camera.ts:88-97`   | `start()` re-throws errors; torch-off path has unhandled promise rejection                 |
| 06-2 | `gantt/components/export-handles.tsx:3,24-25`       | Module-level `exportingFlag` shared across ALL Gantt instances — blocks concurrent exports |
| 06-3 | `calendar/hooks/use-calendar-export.ts:45-50`       | `toBlob` abort signal check runs once synchronously — race with late abort                 |
| 06-4 | `kanban/utils/kanban-export.ts:17-39`               | No concurrency guard for rapid Kanban exports                                              |
| 06-5 | `barcode-input/hooks/use-barcode-torch.ts:49,60-64` | Stale `isOn` closure + unhandled rejection in torch-off branch                             |

### Test Coverage (Dim14)

| ID    | File                                                               | Issue                                                                          |
| ----- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 14-5  | `calendar/calendar.tsx`                                            | 42% statement coverage — view switching, event flows uncovered                 |
| 14-6  | `gantt/` subcomponents                                             | Header 22%, Layout 23%, Bars 50%, Links 47%                                    |
| 14-15 | `gantt/gantt-timezone.test.ts, calendar/calendar-timezone.test.ts` | TZ env pollution — global `process.env.TZ` mutation can affect parallel tests  |
| 14-20 | Top-level renderer test mocks                                      | All 3 top-level tests mock ALL hooks — verify only "shell", not real rendering |

### Test Effectiveness (Dim23)

| ID    | File                                                              | Issue                                                                                  |
| ----- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 23-2  | `gantt/gantt.test.tsx`                                            | Mocks all hooks + flux-react — no assertion that task data flows to rendered bars/grid |
| 23-3  | `calendar/calendar.test.tsx`                                      | Mocks all 8 hooks — only checks DOM markers, not event/resource rendering              |
| 23-5  | `kanban/hooks/use-kanban-collab.test.ts`                          | Single test covers <5% of hook behavior; mock WebSocket never used to simulate events  |
| 23-6  | `gantt/components/gantt-compact.tsx`                              | Dead code — component has zero importers                                               |
| 23-7  | `gantt/components/resource-load-view.tsx, resource-load-grid.tsx` | Dead code — no production importers                                                    |
| 23-10 | `gantt/gantt-timezone.test.ts`                                    | Sets TZ but tests only UTC operations — zero timezone-dependent verification           |
| 23-11 | `calendar/calendar-timezone.test.ts`                              | Same pattern — zero timezone verification                                              |
| 23-12 | `gantt/gantt-store.test.ts`                                       | 27 tests weighted on revision counters, few behavioral invariant checks                |

### Lifecycle (Dim07)

| ID     | File                                          | Issue                                                                               |
| ------ | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| 07-006 | 3 files (barcode, kanban, calendar)           | Focus trap code duplicated in 3 locations — `useFocusTrap` exists but unused by 2/3 |
| 07-008 | `gantt/gantt.tsx:79-82`                       | `store.parse()` clears undo stack on every data prop change                         |
| 07-009 | `gantt/gantt-bars.tsx:98-110`                 | Dblclick listener re-attached on every render due to unstable callback              |
| 07-015 | `kanban/kanban-board.tsx:148-154`             | Data sync effect overwrites local edits                                             |
| 07-016 | `kanban/kanban-board.tsx:421-486`             | Keyboard DnD listener re-attached on every boardData change                         |
| 07-023 | `calendar/hooks/use-calendar-drag.ts:105-163` | Effect depends only on `dragState.active` — fragile                                 |
| 07-029 | 4 renderer files                              | Inconsistent mount/unmount event pattern across components                          |

---

## Verification of Prior Fixes (S11-S18)

All 12 P0 fixes from the 2026-07-22 audit are **verified as correctly applied**:

| Fix                                           | Component    | Status       |
| --------------------------------------------- | ------------ | ------------ |
| S11.1 — zoomLevels wiring                     | Gantt        | ✅ Fixed     |
| S11.2 — grid row height                       | Gantt        | ✅ Fixed     |
| S11.3 — `_dirty` parse guard removed          | Gantt        | ✅ Fixed     |
| S11.4 — scrollTo element fix                  | Gantt        | ✅ Fixed     |
| S11.5 — expand/collapse wiring + coord recalc | Gantt        | ✅ Fixed     |
| S12.1 — Kanban controlled mode                | Kanban       | ✅ Fixed     |
| S13.1 — Calendar view switching from hook     | Calendar     | ✅ Fixed     |
| S13.2 — Month view event width                | Calendar     | ✅ Fixed     |
| S13.3 — Month view column count               | Calendar     | ✅ Fixed     |
| S13.4 — Virtualizer position:absolute         | Calendar     | ✅ Fixed     |
| S14.1 — Barcode video stream mounting         | BarcodeInput | ✅ Fixed     |
| S15.1-S15.13 — Gantt P1 fixes                 | Gantt        | ✅ All Fixed |
| S16.1-S16.9 — Kanban P1 fixes                 | Kanban       | ✅ All Fixed |
| S17.1-S17.7 — Calendar P1 fixes               | Calendar     | ✅ All Fixed |
| S18.1-S18.6 — BarcodeInput P1 fixes           | BarcodeInput | ✅ All Fixed |

---

## Renderer Contract Compliance

| Renderer             | Score | Key Issues                                                                                                                                                         |
| -------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BarcodeInputRenderer | **A** | Fully compliant. Model for lifecycle event declaration.                                                                                                            |
| Calendar             | **B** | `onMount`/`onUnmount` kind mismatch (declared `meta`, consumed from `events`); `loading` prop/region dual-use                                                      |
| Gantt                | **B** | Same `onMount`/`onUnmount` mismatch; `loading` dual-use; React 18 `forwardRef` instead of React 19 ref-as-prop                                                     |
| KanbanBoard          | **C** | **8 event handler calls missing `void` prefix**; `onMount`/`onUnmount` kind mismatch; compile-once bypass (expression compiled at render time); `loading` dual-use |

---

## High-Frequency Issue Files

| File                                        | Dimensions                 | Issues                                                           |
| ------------------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| `kanban/kanban-board.tsx`                   | 04, 05, 07, 09, 15, 22, 23 | State sync, DnD adapter churn, event void prefix, mock fragility |
| `gantt/gantt.tsx`                           | 04, 07, 21, 22             | Store re-parse, cleanup, scroll architecture                     |
| `gantt/gantt-store.ts`                      | 05, 15                     | Cascading setState, in-place mutation, O(n\*m) deleteTask        |
| `calendar/calendar.tsx`                     | 04, 07, 21, 22             | Drag querySelector, view/date refs, export wiring                |
| `barcode-input/hooks/use-barcode-detect.ts` | 06, 07                     | Empty deps, polling restart, option sync                         |
| `gantt/gantt-bars.tsx`                      | 05, 07, 21                 | 3× subscription, unstable callback, timeline scroll              |
| `gantt/gantt-grid.tsx`                      | 05, 14, 15, 21             | Virtualizer flash, scroll container mismatch                     |

---

## Cross-Dimension Patterns

1. **Gantt scroll/virtualization architecture collapse** (Dim21-6, Dim21-7, Dim15-11, Dim05-2/4/5): Nested scrollable divs prevent timeline and grid virtualization from activating. Root cause is the dual-panel layout where absolutely positioned content eliminates the scroll container's intrinsic height. This is the highest-ROI architectural fix in the Gantt component.

2. **Kanban DnD registration churn** (Dim22-22, Dim23-2, Dim07-016/017): DnD adapters destroyed/recreated on every render due to unstable references. The pragmatic-dnd integration works correctly for simple cases but degrades with many cards.

3. **Direct DOM manipulation for drag visual feedback** (Dim15-5, Dim15-6, Dim07-022, Dim07-017): Calendar and Kanban use `document.querySelector` and `setAttribute` for visual feedback. Bypasses React but is common in DnD implementations.

4. **Inconsistent lifecycle event ownership** (Dim09, Dim07-029): `onMount`/`onUnmount` declared as `kind: 'meta'` but consumed from `props.events` across 3/4 renderers. BarcodeInput shows the correct pattern.

5. **Mount-effect-only effects with stale dep arrays** (Dim06-6, Dim07-001): Multiple effects use empty deps `[]` then read from refs. This is correct for avoiding re-runs but fragile when new reactive dependencies are added without updating the pattern.

---

## Previously Verified Clean Areas

Confirmed no issues found in:

- Render-phase store mutation (Bug 15 pattern) — clean
- `eval`/`new Function` usage — clean
- Camera stream cleanup — properly implemented
- URL/blob export cleanup — properly implemented
- `JSON.stringify` change detection — not used
- `React.memo` — none used (consistent with React Compiler best practices)
- No `useLayoutEffect` needed — correct selection

---

## Actionable Recommendations (Priority Order)

### P1 Must Fix

1. **Kanban `changeCard` frozen defect** (`kanban-helpers.test.ts:173`): Fix test assertion to match correct merge behavior
2. **Kanban DnD adapter churn** (`kanban-board.tsx/kanban-column.tsx`): Memoize registration callbacks to prevent per-render adapter destruction
3. **Barcode detection polling empty deps** (`use-barcode-detect.ts:36-125`): Add `enabled`/`interval` to effect deps
4. **Barcode scanner overlay unstable deps** (`barcode-scanner-overlay.tsx:96-130`): Stabilize `stop`/`start` with useCallback
5. **Calendar drag `document.querySelector` unscoped** (`calendar.tsx:376-402`): Scope to calendar container ref
6. **Kanban 8 missing `void` prefixes** (`kanban-board.tsx`): Add void before event calls
7. **Kanban board local data sync** (`kanban-board.tsx:148-154`): Prevent prop overwrite of local mutations

### P2 Should Fix

8. **Gantt dual-panel scroll architecture** (`gantt-grid.tsx`, `gantt-bars.tsx`): Fix nested scrollable structure
9. **Gantt store in-place mutation** (`gantt-store.ts:92-100`, `layout.ts:113-124`): Clone objects before layout assignment
10. **Gantt deleteTask O(n\*m)** (`gantt-store.ts:258-271`): Use Set-based link collection
11. **Gantt virtualizer mount flash** (`gantt-grid.tsx:38-49`): Synchronous scroll container detection
12. **Calendar week/day view maxConcurrent** (`calendar-time-utils.ts:79-83`): Honor maxConcurrent for overflow
13. **Calendar no-resources edge case** (`calendar-layout-utils.ts:50-55`): Handle explicit resourceIds
14. **Focus trap duplication** (3 locations): Share `useFocusTrap`
15. **Timezone test false green** (2 test files): Test timezone-sensitive operations
16. **Export concurrency** (`export-handles.tsx`, `kanban-export.ts`): Per-instance guard, not global flag

---

## Conclusion

The scheduling package has **significantly improved** since the prior 2026-07-22 audit. All 12 P0 defects and ~35 P1 defects from that audit are verified as fixed. The code is well-structured with clear separation between Zustand stores (Gantt), custom hooks (Calendar), pure helpers (Kanban), and camera/hardware lifecycle (BarcodeInput).

**Total new issues found in this audit: ~80 findings (after deduplication)**

- P0: 0
- P1: 12
- P2: 35
- P3: 25
- Informational/good practices: 8

The issues are concentrated in three areas:

1. **Gantt scroll/virtualization** (architecture-level — highest ROI fix)
2. **Kanban DnD registration churn** (performance — affects many-cards scenarios)
3. **Test effectiveness** (false greens mask real issues — timezone, dead code, mock swallows)

The remaining issues are standard code quality/maintainability items that can be scheduled incrementally.

---

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
