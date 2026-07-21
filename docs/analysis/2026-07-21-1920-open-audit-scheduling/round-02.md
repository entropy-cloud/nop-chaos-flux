> Audit Status: open
> Audit Type: open-ended (Round 2)
> Mission: scheduling
> Date: 2026-07-21
> Source perspectives: Dead-code cleaner, contract archaeologist, React 19 enforcer, cross-boundary messenger, 10x-scale operator, abnormal-path detective

## Cross-Reference

No overlap with Round-01 findings (F-46 to F-50). This round found 20 new findings (F-51 to F-70).

**Summary file**: `docs/audits/2026-07-21-1920-open-audit-scheduling.md`

## Findings

| ID   | Severity | Location                                                                              | Issue                                                                                              |
| ---- | -------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| F-51 | High     | `use-gantt-drag.ts:25-26`                                                             | Ghost positioned at container rect, not bar rect — drag visual feedback broken                     |
| F-52 | High     | `use-gantt-drag.ts:118-120`, `use-gantt-link-draw.ts:71-73`, `gantt-layout.tsx:50-53` | Document event listeners leak on unmount during active drag                                        |
| F-53 | High     | `scheduler-config.tsx:28`                                                             | Status stuck at `'scheduling'` — button permanently disabled                                       |
| F-54 | High     | `kanban-board.tsx:102-112`                                                            | setState updater contains side effect — Strict Mode double undo entries                            |
| F-55 | High     | `scheduling-renderer-definitions.ts:84`, `kanban-board.tsx:158`                       | `filterCard` prop schema says string, hook expects function, component never passes it             |
| F-56 | Medium   | `scheduling-renderer-definitions.ts:72-106`                                           | 16 Kanban registered props never consumed; `onMount`/`onUnmount` never dispatched                  |
| F-57 | Medium   | `kanban.css:78-85`, `kanban-board.tsx:176`                                            | DnD visual feedback dead — `data-dragging`/`data-drop-target` never set in JSX                     |
| F-58 | Medium   | `calendar.css:48`, `calendar-month-view.tsx:177`                                      | `data-weekend="weekend"` vs CSS selector `[data-weekend="true"]` — weekend styling broken          |
| F-59 | Medium   | `calendar-date-utils.ts:49-51`                                                        | `isToday()` compares UTC date against local `new Date()` — near-midnight wrong highlight           |
| F-60 | Medium   | `scheduling-renderer-definitions.ts:108-158`, `calendar.tsx`                          | 15+ Calendar schema props/events/regions not consumed; 5+ dead components                          |
| F-61 | Medium   | `barcode-input-schemas.ts:3-16`, `barcode-input.tsx`                                  | BarcodeInput ignores `required`/`minLength`/`maxLength`/`pattern`/`validate` — validation bypassed |
| F-62 | Medium   | `prepare-wasm.ts:24-33`                                                               | Cached rejected promise — scanner permanently dead after failed WASM load                          |
| F-63 | Medium   | `barcode-input.tsx:72-80`                                                             | `handleScanClick` async lacks catch — unhandled promise rejection                                  |
| F-64 | Medium   | `critical-path.ts:119-121`                                                            | Critical path uses calendar days, ignores work calendar                                            |
| F-65 | Low      | `resource-load.ts:84`                                                                 | Resource load average divides by days-worked not total days — overstates light resources           |
| F-66 | Medium   | `schemas.ts:29-67` vs `gantt.types.ts:60-97`                                          | Duplicated types with drift — `GanttResource.id: string` vs `string \| number`                     |
| F-67 | Low      | `baseline-bars.tsx`                                                                   | Entire `BaselineBars` component never imported                                                     |
| F-68 | Low      | `kanban-board.tsx:105`                                                                | Undo command type hard-coded `'moveCard'` for all mutations                                        |
| F-69 | Low      | `kanban-undo-stack.ts:97-104`, `kanban-helpers.ts:3-10`                               | Shallow clone of nested `data`/`meta` objects — undo snapshot corruption                           |
| F-70 | Low      | `package.json:29-35`                                                                  | Missing `react-dom` peer dependency                                                                |
