# S7 — Kanban Advanced Features (Virtual Scroll, WIP, Tags, Activity Log, Undo/Redo, Export)

> Plan Status: active
> Last Reviewed: 2026-07-20
> Source: `docs/components/kanban/design.md` (§12.2, §12.7–§12.11), `docs/components/roadmap-scheduling.md` (S7)
> Related: `docs/plans/2026-07-20-2000-2-s6-kanban-core-plan.md` (prerequisite)

## Purpose

Complete the Kanban component family by adding enterprise-grade features — virtual scrolling, column width adjustment, WIP limits, tags/color/members metadata, activity logging, undo/redo, export/snapshot, and real-time collaboration hooks. After this plan, `@nop-chaos/flux-renderers-scheduling` contains a Kanban renderer with full project-management capability (S6+S7 = Kanban v2).

## Current Baseline

- S6 completed: BoardData flat dictionary model, pure function helpers, KanbanBoard/Column/Card rendering, card drag-and-drop (cross-column, intra-column), column reordering, filter/search, column collapse, add/delete cards and columns, default visual design, playground demo — all tested (264 tests)
- Kanban design doc §12 covers detailed designs for column resize (§12.7), WIP limits (§12.8), tags/colors/members (§12.9), activity log (§12.10), real-time collaboration (§12.11)
- `@tanstack/react-virtual` is available in monorepo (used by Calendar)
- S7 items S7.1–S7.8 on roadmap are all `proposed`
- `docs/components/roadmap-scheduling.md` S7 phase is `proposed`
- S10.3 playground page exists (created in S6)
- S6 deferred: `columnsOrderStatePath` scope-level persistence (optimization candidate), optimistic update failure handling (out-of-scope improvement)

## Goals

- Implement column width drag adjustment with min/max constraints and scope-level `columnWidthsStatePath` persistence (S7.1)
- Implement per-column virtual scrolling via `@tanstack/react-virtual` with `FixedSizeList`, overscan 5, auto scroll-to-position on drag beyond viewport (S7.2)
- Implement WIP limits: `cardLimit` config, strict mode (`wipStrict: true` prevents drop to full column), visual warnings (red count, border, alert icon) (S7.3)
- Implement tags/colors/members metadata rendering: `KanbanItem.meta` with color dot, tag pills, member avatars; tag-filter pills in header (S7.4)
- Implement activity log: `KanbanAction` event recording for card moves/creates/deletes/updates; `activityLog` panel region (S7.5)
- Implement undo/redo: command pattern UndoStack for card/column operations; Ctrl+Z/Ctrl+Shift+Z (S7.6)
- Implement export/snapshot: PNG export (`html2canvas`), BoardData snapshot JSON serialization/restore (S7.7)
- Implement real-time collaboration wiring: WebSocket operation broadcast hooks, connection status indicator (S7.8)
- Address S6 deferred: `columnsOrderStatePath` persistence
- Add standalone design docs for features that only have §12 sketches

## Non-Goals

- No full CRDT-based conflict resolution (LWW is sufficient for Kanban v2)
- No server-side WebSocket implementation (Flux side provides hooks; connection management is data-source layer)
- No Gantt, Calendar, Barcode, or Diff-view changes
- No collaborative cursor or presence indicators beyond connection status

## Scope

### In Scope

- `src/kanban/hooks/use-kanban-column-resize.ts` — Column width drag adjustment
- `src/kanban/hooks/use-kanban-virtualizer.ts` — Per-column virtual scrolling
- `src/kanban/components/kanban-wip-badge.tsx` — WIP limit count display
- `src/kanban/components/kanban-card-tags.tsx` — Tags/color/members rendering
- `src/kanban/components/kanban-tag-filter.tsx` — Tag filter pills
- `src/kanban/components/kanban-activity-log.tsx` — Activity log panel
- `src/kanban/utils/kanban-undo-stack.ts` — Command pattern UndoStack
- `src/kanban/utils/kanban-export.ts` — Export/BoardData snapshot helpers
- `src/kanban/hooks/use-kanban-collab.ts` — Real-time collaboration wiring
- Design docs for items needing expansion beyond §12 sketches
- S7 playground demo enhancements in existing S10.3 page

### Out Of Scope

- Sub-card nesting (KanbanItem.children beyond card level — §12.4 deferred)
- Full Kanban CRUD backend integration (data-source layer responsibility)
- Mobile-responsive drag (touch adaptation — M2 scope per mobile plan)
- Kanban-specific E2E Playwright tests (deferred to test-enhancement plan)

## Failure Paths

> This plan involves external dependencies (html2canvas for export, WebSocket for collaboration), undo/redo error handling, and virtual scroll edge cases. Failure Paths below cover key risk scenarios.

| Scenario                         | Trigger                                                             | Expected Behavior                                                                                               | Retryable | User-Visible Outcome                                                     |
| -------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------ |
| `export-dom-capture-fail`        | html2canvas cannot capture board (cross-origin img, oversized DOM)  | Catch error, show toast "导出失败: 画布截图失败", fall back to BoardData JSON export                            | Yes       | Toast error message; JSON export button remains available                |
| `export-oversized-dom`           | Board has 5000+ cards; canvas memory exceeds limit                  | Fall back to BoardData JSON export automatically; show warning toast "看板过大,已切换为JSON导出"                | No        | JSON export proceeds; user notified of automatic fallback                |
| `collab-ws-connect-fail`         | WebSocket connection cannot be established                          | Connection indicator shows red "断线" with reconnect button; all operations proceed locally; ops queued locally | Yes       | Red connection status; local ops work; queued for sync on reconnect      |
| `collab-ws-reconnect-fail`       | Reconnection fails after 30s timeout                                | Show "离线模式" persistent banner; local ops continue; no data loss                                             | Manual    | Offline mode banner; manual page reload required to retry                |
| `collab-ws-message-loss`         | CollabMessage fails to deserialize or apply                         | Log warning; skip malformed message; do not crash board                                                         | No        | Other user's op silently lost; no visible error to current user          |
| `undo-stack-overflow`            | 10,000+ undo commands accumulated                                   | Cap stack at 1000 entries (FIFO eviction); oldest entries silently dropped                                      | No        | Undo button still works; oldest operations no longer reversible          |
| `virtual-scroll-height-mismatch` | Cards have dynamic heights but FixedSizeList assumes uniform height | Cards may overlap or show gaps; log warning; maintain functional correctness (cards still render)               | No        | Minor visual artifact; all cards still readable and interactive          |
| `wip-strict-race`                | Two users simultaneously drag to same column just under limit       | Last-write-wins (collab); local strict check passes; remote op may exceed limit; column shows red warning       | No        | Red WIP badge appears; column not locked (wipStrict only prevents local) |
| `snapshot-corrupt`               | LoadSnapshot receives malformed JSON                                | Catch parse error; show toast "快照加载失败: 数据格式错误"; board state unchanged                               | Yes       | Toast error message; board state untouched                               |

## Test Strategy

Must automate: Column resize constraint logic, virtual scroll overscan/maxHeight, WIP limit strict mode canDrop rejection, UndoStack command lifecycle, BoardData snapshot round-trip. Should have tests: Tags/members rendering, activity log event recording, export output.

## Execution Plan

### Phase 1 — Design Docs For S7 Items Needing Expansion

Status: planned
Targets: `docs/components/kanban/` (new or expanded design docs)

- Item Types: `Decision | Proof`

- [ ] Verify and expand `docs/components/kanban/design.md` §12.7 (column resize) into implementation-ready detail: resize handle DOM model, `minWidth`/`maxWidth` constraint enforcement, `columnWidthsStatePath` scope persistence path
- [ ] Verify and expand §12.2 (virtual scroll) into standalone design doc: per-column `FixedSizeList` instance management, `overscan` config, drag-to-invisible-area auto-scroll via `scrollToIndex`, row height estimation
- [ ] Verify and expand §12.9 (tags/color/members) into implementation-ready detail: `filterTags` schema field integration, tag pill toggle interaction, member avatar fallback rendering
- [ ] Verify and expand §12.10 (activity log) into implementation-ready detail: `KanbanAction` event dispatch integration, region slot wiring, filter by column/card/actor
- [ ] Create standalone design doc for S7.6 (undo/redo): command types (moveCard/moveColumn/addCard/removeCard/changeCard), merge strategy for consecutive moves, integration with pragmatic-dnd drop lifecycle
- [ ] Create standalone design doc for S7.7 (export/snapshot): `html2canvas` integration point, BoardData `toJSON`/`fromJSON`, snapshot storage via scope or data-source
- [ ] Verify all design doc references against live S6 codebase (BoardData, KanbanItem, pure function helpers, hook APIs)

Exit Criteria:

- [ ] 6 design doc sections verified/expanded with implementation-ready detail referencing actual S6 types/hooks
- [ ] Live repo cross-reference confirms design docs match current `src/kanban/` structure

### Phase 2 — Column Resize + Virtual Scrolling

Status: planned
Targets: `src/kanban/components/kanban-column.tsx`, `src/kanban/hooks/`

- Item Types: `Fix | Proof`

- [ ] Implement column resize: 4px invisible handle at column right edge, hover → 2px blue line + `col-resize` cursor; pointer drag updates column width in real-time; clamp to `minWidth`/`maxWidth`; persist via `columnWidthsStatePath`
- [ ] Implement per-column virtual scrolling: each column wraps card list in `FixedSizeList` (row height fixed at card height + gap); `overscan={5}`; auto `scrollToItem` when dragging card beyond visible range
- [ ] Integrate virtual scroll with pragmatic-dnd: update `attachClosestEdge` to work with virtualized card positions; adjust drop target registration for virtual rows
- [ ] Implement autofit mode (`columnWidth: 'auto'`): calculate width from `min-content`; resize handle still draggable for temporary override
- [ ] Address S6 deferred: implement `columnsOrderStatePath` scope persistence for column order
- [ ] Unit tests: resize handle events and constraint clamping (10+ cases); virtual scroll render count and scroll-to behavior (5+ cases)

Exit Criteria:

- [ ] Column resize handle renders, drag adjusts width clamped to min/max, value persists across re-render
- [ ] Columns with 200+ cards render only visible set + overscan 5; scroll-to-position works on drag beyond viewport
- [ ] `columnsOrderStatePath` persists column order after page refresh (via scope)
- [ ] Unit tests pass for resize constraint and virtual scroll overscan behavior

### Phase 3 — WIP Limits + Tags/Colors/Members

Status: planned
Targets: `src/kanban/components/kanban-wip-badge.tsx`, `src/kanban/components/kanban-card-tags.tsx`, `src/kanban/components/kanban-tag-filter.tsx`

- Item Types: `Fix | Proof`

- [ ] Implement WIP cardLimit: read `column.cardLimit`; display `"${current}/${limit}"` count; when over limit, show red count with `+N` overflow badge
- [ ] Implement WIP strict mode: `wipStrict: true` → `dropTargetForElements` `canDrop` returns false for over-limit columns; drag ghost cannot land; column shows red border + alert-triangle icon
- [ ] Implement `wipStrict: false` (default): allow drop to over-limit column but trigger `onCardMove` with `overLimit: true` flag
- [ ] Implement tags/colors/members rendering: `meta.color` → 8px color dot left of title; `meta.tags[]` → tag pill row at card bottom with `+N` collapse; `meta.members[]` → avatar stack (max 3, +N overflow) at card bottom-right
- [ ] Implement tag filter pills: render all unique tags as clickable filter pills above columns; multi-select OR logic; `filterTags` schema field integration
- [ ] Extend `KanbanItem`/`KanbanSchema` types: add `meta`, `cardLimit`, `wipStrict`, `filterTags` fields (amend existing schemas.ts)
- [ ] Unit tests: WIP limit display and strict-mode canDrop rejection (15+ cases); tag filter multi-select correctness (5+ cases)

Exit Criteria:

- [ ] Column with `cardLimit: 5` and 6 cards shows red `"6/5 +1"` badge; strict mode prevents drop to that column
- [ ] Non-strict mode allows drop but `onCardMove` carries `overLimit: true`
- [ ] Cards with `meta.tags`/`meta.color`/`meta.members` render correctly; tag filter pills filter cards by selected tags
- [ ] Types updated in `kanban.types.ts` and `schemas.ts`; existing tests still pass

### Phase 4 — Activity Log + Undo/Redo

Status: planned
Targets: `src/kanban/utils/kanban-undo-stack.ts`, `src/kanban/components/kanban-activity-log.tsx`

- Item Types: `Fix | Proof`

- [ ] Implement `KanbanAction` event recording: hook into `onCardMove`/`onCardAdd`/`onCardRemove`/`onCardUpdate`/`onColumnAdd`/`onColumnRemove`; create `KanbanAction` entries with actor/timestamp/detail
- [ ] Implement `activityLog` region: side panel or overlay triggered by "Activity Log" button in board header; time-descending list with formatted action descriptions (e.g., "张三 将任务从「待办」移至「进行中」")
- [ ] Implement action filtering: by column (`filterColumnId`), by action type, by time range
- [ ] Implement UndoStack command pattern: wrap moveCard/moveColumn/addCard/removeCard/changeCard with reversible commands; consecutive same-category moves merge (final position only)
- [ ] Wire UndoStack into KanbanBoard: Ctrl+Z undo, Ctrl+Shift+Z redo; toolbar buttons with disabled states
- [ ] Merge strategy: consecutive drag-move operations on same card collapse to single undo step
- [ ] Unit tests: KanbanAction event recording (10+ cases); UndoStack lifecycle and merge (20+ cases)

Exit Criteria:

- [ ] Card/column operations produce `KanbanAction` entries with correct actor/datetime/detail; activity log panel renders formatted list
- [ ] Activity log filters by column/type correctly
- [ ] UndoStack reverses last operation; redo restores it; consecutive moves merge to one step
- [ ] Ctrl+Z/Ctrl+Shift+Z triggers undo/redo; toolbar buttons show correct disabled states

### Phase 5 — Export/Snapshot + Real-Time Collaboration + Closure

Status: planned
Targets: `src/kanban/utils/kanban-export.ts`, `src/kanban/hooks/use-kanban-collab.ts`, playground demo

- Item Types: `Fix | Follow-up | Proof`

- [ ] Implement PNG export: `html2canvas` capture board DOM → canvas → download; loading overlay with progress
- [ ] Implement BoardData snapshot: `toJSON()` serialization, `fromJSON()` deserialization; `component:saveSnapshot`/`component:loadSnapshot` imperative handles
- [ ] Implement collaboration wiring: expose `useKanbanCollab` hook with WebSocket message format (`CollabMessage` type); LWW conflict strategy; version tracking (for server-side detection)
- [ ] Implement connection status indicator: connected (green) / reconnecting (yellow) / disconnected (red) with reconnect button
- [ ] Wire collaboration events through existing `onCardMove`/`onCardUpdate` event chain: local operation → broadcast; remote operation → apply
- [ ] Enhance S10.3 Kanban playground demo: add S7 feature toggles (virtual scroll on/off, WIP limits, tag filter, undo/redo buttons, activity log panel, export button)
- [ ] Update `docs/components/roadmap-scheduling.md`: mark S7 items all `done`; update phase status
- [ ] Update `docs/logs/2026/07-20.md` with S7 completion summary

Exit Criteria:

- [ ] PNG export produces valid board screenshot; BoardData snapshot round-trips correctly
- [ ] `useKanbanCollab` hook dispatches/receives correctly formatted `CollabMessage`; connection indicator renders all 3 states
- [ ] S10.3 playground demo includes S7 feature controls
- [ ] `roadmap-scheduling.md` S7 items show `done`

## Draft Review Record

- Reviewer / Agent: independent sub-agent (current session, plan-review role)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed:
  - Blocker/Major: Phase 5 Exit Criteria included `pnpm typecheck && pnpm build && pnpm lint && pnpm test` — violates Minimum Rule 18 (full verification belongs in Closure Gates only). Removed from Phase 5 Exit Criteria; already present in Closure Gates.
  - Major: Missing `## Failure Paths` section for external integrations (html2canvas export, WebSocket collaboration, undo/redo error handling). Added table with 9 failure scenarios.
  - Minor: Plan title does not list all S7 features (omits column resize and collaboration).
  - Minor: No explicit index.ts export update items for new hooks/components (implicit, noted for executor).

## Closure Gates

- [ ] Column resize with constraint clamping and scope persistence is implemented and tested
- [ ] Per-column virtual scrolling with overscan 5 and drag-to-invisible auto-scroll works
- [ ] WIP limit with cardLimit/wipStrict warnings and strict-mode canDrop rejection is tested
- [ ] Tags/colors/members render correctly; tag filter pills filter cards by selection
- [ ] Activity log records all card/column operations; panel renders with column/type filtering
- [ ] UndoStack reverses/redoes operations with merge for consecutive drags
- [ ] PNG export produces valid output; BoardData snapshot round-trips
- [ ] Collaboration hook dispatches/receives CollabMessage format; status indicator renders
- [ ] S7 playground demo enhances S10.3 page with all new features
- [ ] `roadmap-scheduling.md` S7 items and phase status updated to `done`
- [ ] No deferred live defects or contract drifts in scope
- [ ] Affected owner docs synced (expanded design docs, schemas.ts, renderer definitions)
- [ ] By independent sub-agent (fresh session) closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Sub-Card Nesting (KanbanItem.children)

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Design doc §12.4 defers sub-card rendering; current Kanban v2 focuses on flat card model with tags/color/members providing sufficient metadata. Hierarchical cards require alternate UX not yet designed.
- Successor Required: `no`

### Collaborative Cursor / Presence Indicators

- Classification: `optimization candidate`
- Why Not Blocking Closure: Connection status indicator covers basic awareness. Multi-user cursor positions and real-time typing indicators are beyond Kanban v2 scope and require shared editing infrastructure.
- Successor Required: `no`

## Non-Blocking Follow-ups

- Performance baseline measurement for 20 columns × 300 cards at 60fps drag — should be verified during S7 implementation.
- Kanban-specific Playwright E2E tests (drag cross-column, filter, undo/redo) — recommended for cross-component test-enhancement plan.

## Closure

Status Note: TBD (filled on completion)

Closure Audit Evidence: TBD

Follow-up: TBD
