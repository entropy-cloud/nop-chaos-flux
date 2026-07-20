# S6 — Kanban Core (Read-Only Board With Drag Interaction)

> Plan Status: active
> Last Reviewed: 2026-07-20
> Source: `docs/components/kanban/design.md` (§4, §6, §11), `docs/components/roadmap-scheduling.md` (S6), `docs/components/roadmap-scheduling.md` Rule 8 (S10.3 playground page)
> Related: `docs/plans/2026-07-20-0800-1-s0-scheduling-infrastructure-plan.md` (prerequisite), `docs/components/roadmap-scheduling.md` (S7 Kanban advanced, successor)

## Purpose

Implement the Kanban board renderer — flat dictionary data model, pure function state helpers, board/column/card rendering, drag-and-drop cross-column sorting, column reordering, card filter/search, column collapse, add/delete cards and columns, and default visual design. After this plan, `@nop-chaos/flux-renderers-scheduling` contains a fully usable interactive Kanban board (S6 core = Kanban v1), plus its playground test page.

## Current Baseline

- S0 completed: `packages/flux-renderers-scheduling/` exists with stub files
- `src/kanban/index.ts` is a placeholder stub (2 lines)
- `src/scheduling-renderer-definitions.ts` has Kanban skeleton with `component: () => null` and only `body` field registered
- Kanban design doc at `docs/components/kanban/design.md` covers data model (§4), rendering (§6), interactions (§11), phasing (§12)
- Roadmap S6 items (S6.1–S6.11) are all `proposed`
- `@atlaskit/pragmatic-drag-and-drop` must be added to `@nop-chaos/flux-renderers-scheduling/package.json` (not yet present in monorepo; chosen per design doc §12.1)
- `@tanstack/react-virtual` is available in monorepo (used by Calendar, no install needed)

## Goals

- Implement flat dictionary `BoardData` model with unified `BoardItem` (root/column/card/divider) and `children[]` references (S6.1)
- Implement pure function helpers: `moveCard`, `moveColumn`, `addCard`, `removeCard`, `changeCard`, `addColumn`, `removeColumn` — immutable updates returning new `BoardData` (S6.2)
- Implement `KanbanBoard` renderer: column container list (horizontal scroll), column header/card/headerToolbar regions (S6.3)
- Implement `KanbanColumn` rendering: column header with title + card count + collapse button, card list (vertical scroll), bottom add-card button, empty column drop zone (S6.4)
- Implement `KanbanCard` rendering: `configMap` type dispatch + `cardTemplate` region fallback, `$slot.card`/`$slot.column`/`$slot.index` parameters, React.memo for performance (S6.5)
- Implement card drag-and-drop: `@atlaskit/pragmatic-dnd` cross-column move, intra-column sort, `attachClosestEdge` positioning, drop indicator (S6.6)
- Implement column reordering: column header drag handle, left/right edge detection (S6.7)
- Implement filter/search: `filterText` prop, 300ms debounce, `filterCard` custom function (S6.8)
- Implement column collapse: `collapsed` state per column, scope-level `collapsedStatePath` persistence (S6.9)
- Implement add/delete columns and cards: column footer "+" button, board-level "+" buttons, `component:addCard`/`component:addColumn` handles (S6.10)
- Implement default visual design: loading/empty/hover/drag-ghost/drop-indicator states (S6.11)
- Create S10.3 Kanban playground test page (roadmap Rule 8 obligation)
- All interactions covered by focused unit and integration tests

## Non-Goals

- No column width drag adjustment (S7 scope, P3 per design doc)
- No virtual scrolling (S7 scope, P2 per design doc)
- No WIP limits (S7 scope, P3 per design doc)
- No tags/colors/members metadata beyond children rendering (S7 scope, P3)
- No activity log (S7 scope, P3)
- No undo/redo stack (S7 scope)
- No export/snapshot (S7 scope)
- No real-time collaboration (S7 scope)

## Scope

### In Scope

- `src/kanban/kanban.types.ts` — `BoardData`, `BoardItem`, `KanbanSchema`, `KanbanColumnConfig` interfaces
- `src/kanban/kanban-helpers.ts` — pure function helpers (`moveCard`, `moveColumn`, `addCard`, `removeCard`, `changeCard`, `addColumn`, `removeColumn`)
- `src/kanban/kanban-board.tsx` — Main `KanbanBoard` renderer: column list, horizontal scroll, region wiring
- `src/kanban/kanban-column.tsx` — Column renderer: header, card list, collapse, add-card, empty drop zone
- `src/kanban/kanban-card.tsx` — Card renderer: `configMap` dispatch, `cardTemplate` region, memo
- `src/kanban/kanban-column-header.tsx` — Column header: title, count, collapse button, drag handle
- `src/kanban/hooks/use-kanban-dnd.ts` — Card DnD: `@atlaskit/pragmatic-dnd` integration, cross-column move, intra-column sort
- `src/kanban/hooks/use-column-dnd.ts` — Column DnD: column header drag handle, column reorder
- `src/kanban/hooks/use-kanban-filter.ts` — Filter/search: `filterText`, `filterCard`, 300ms debounce
- `src/kanban/hooks/use-kanban-adder.ts` — Add/delete: "+" buttons, `addCard`/`addColumn`/`removeCard`/`removeColumn` handlers
- `src/styles.css` — Kanban-specific styles (layout, columns, cards, drag states; appended to package's existing stylesheet)
- Update `src/schemas.ts` — add full `KanbanSchema` to schema exports
- Update `src/scheduling-renderer-definitions.ts` — register real Kanban component with proper fields
- `apps/playground/src/pages/kanban-demo.tsx` — Kanban test page (S10.3)
- Update `docs/components/roadmap-scheduling.md` S6 phase status

### Out Of Scope

- S7 items (column width, virtual scroll, WIP, tags, activity log, undo, export, collaboration)
- Calendar or Gantt code

## Failure Paths

| Scenario                       | Trigger                             | Behavior                                                    | Retry | User Visible                             |
| ------------------------------ | ----------------------------------- | ----------------------------------------------------------- | ----- | ---------------------------------------- |
| Empty board                    | `data` empty or missing             | Render empty state: column-less placeholder with "暂无数据" | N/A   | Empty board visual                       |
| Single column                  | One column defined                  | Render single column centered, no scroll needed             | N/A   | Single column board                      |
| Card with no `configMap` match | card type undefined in configMap    | Render via `cardTemplate` region or default simple card     | N/A   | Basic card without type-specific styling |
| Drag to empty column           | Drop card into column with no cards | Place card as first item in column                          | N/A   | Card appears at top of column            |
| Filter no results              | `filterText` matches zero cards     | Show column header + "无匹配卡片" inside each column        | N/A   | Columns visible but empty                |
| Collapse all columns           | All columns collapsed               | Board renders as column headers only, no card lists         | N/A   | Compact board header view                |
| Add column with no title       | Column added with empty title       | Title defaults to "新列"                                    | N/A   | Column shows "新列"                      |

## Test Strategy

档位选择：`必须自动化`

本档选择：必须自动化 — 拖拽交互（跨列排序、列重排）是看板核心功能，属高风险退化区域。纯函数 helpers（S6.2）是算法核心，必须 unit test 覆盖边界条件。组件渲染应通过 integration tests 验证列/卡片渲染正确性。

## Execution Plan

### Phase 1 — Types, Data Model, And Pure Function Helpers

Status: planned
Targets: `kanban.types.ts`, `kanban-helpers.ts`

- Item Types: `Fix | Proof`

- [ ] `Fix`: Create `kanban.types.ts`:
  - `BoardItem` interface: `id`, `type` ('root' | 'column' | 'card' | 'divider'), `parentId`, `children` (string[]), `data` (Record<string, any>), `meta` (Record<string, any>)
  - `BoardData`: `Record<string, BoardItem>`, root item with ID "root" referencing all top-level columns
  - `KanbanColumnConfig`: `id`, `title`, `cardLimit?`, `collapsed?`, `width?`
  - `KanbanSchema` matching design doc §4
- [ ] `Fix`: Create `kanban-helpers.ts` — all pure function helpers:
  - `moveCard(board, cardId, targetColumnId, targetIndex)`: new BoardData
  - `moveColumn(board, columnId, targetIndex)`: new BoardData
  - `addCard(board, columnId, cardData, index?)`: new BoardData
  - `removeCard(board, cardId)`: new BoardData
  - `changeCard(board, cardId, partial)`: new BoardData
  - `addColumn(board, columnData, index?)`: new BoardData
  - `removeColumn(board, columnId)`: new BoardData
  - All functions accept old BoardData, return new BoardData (no mutation)
- [ ] `Proof`: Write unit tests for:
  - `moveCard`: cross-column, same-column, to start/end/middle, edge cases (empty column, single card column)
  - `moveColumn`: reorder columns with various positions
  - `addCard`/`removeCard`: lifecycle, correctness of parent references
  - `addColumn`/`removeColumn`: ordering, data integrity
  - `changeCard`: partial update depth
  - Immutability: original BoardData unmodified after each call

Exit Criteria:

- [ ] All type interfaces match design doc §4 data model
- [ ] All helper functions return new BoardData without mutating input
- [ ] Unit tests cover cross-column move, intra-column reorder, add/remove lifecycle, and edge cases
- [ ] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck && pnpm test` passes for these modules

### Phase 2 — Board, Column, And Card Rendering

Status: planned
Targets: `kanban-board.tsx`, `kanban-column.tsx`, `kanban-card.tsx`, `kanban-column-header.tsx`

- Item Types: `Fix | Proof`

- [ ] `Fix`: Create `kanban-column-header.tsx`:
  - Column title display
  - Card count badge ("N" count)
  - Collapse toggle button (chevron icon)
  - Column drag handle (for column reorder, wired in Phase 3)
  - `columnHeader` region support
  - `columnHeaderToolbar` region support for custom header actions
- [ ] `Fix`: Create `kanban-card.tsx`:
  - `configMap` dispatch: if card `type` matches a key in `configMap`, render via that template; otherwise use `cardTemplate` region; otherwise render default card
  - Default card: title, description preview, color indicator
  - React.memo wrapped (shallow compare card data)
  - `$slot.card`, `$slot.column`, `$slot.index` exposed to templates
  - `data-slot="kanban-card"` with `data-card-id`, `data-column-id`
  - Click handler fires `onCardClick`
- [ ] `Fix`: Create `kanban-column.tsx`:
  - Renders `KanbanColumnHeader` at top
  - Card list (scrollable div, fixed height)
  - Renders each card via `KanbanCard`
  - Collapsed state: hide card list, show only header
  - Empty column: dashed border drop zone + "拖拽卡片到此处" placeholder
  - Footer: "+" button to add card (wired in Phase 4)
  - `columnFooter` region support
- [ ] `Fix`: Create `kanban-board.tsx`:
  - Receives resolved `KanbanSchema` props
  - Computes `BoardData` from `data` prop using helpers
  - Renders column list (horizontal scroll container)
  - Filters columns by `filterText` (wired in Phase 3)
  - Board-level "+" buttons to add columns (left/right edges)
  - Forwards imperative handles: `component:addCard`, `component:addColumn`
  - Empty state: no columns → render `empty` region or default placeholder
  - Loading state: skeleton pulse with 3 placeholder column outlines
- [ ] `Proof`: Write integration tests for:
  - Board renders correct number of columns
  - Column renders correct number of cards
  - Collapsed column hides card list, shows header only
  - Empty column shows drop zone placeholder
  - Card renders via configMap path vs cardTemplate vs default
  - React.memo prevents re-render when card data unchanged

Exit Criteria:

- [ ] Board, column, and card components render matching input data
- [ ] Column collapse toggles card list visibility
- [ ] Empty column shows drop zone placeholder
- [ ] `configMap` dispatch routes to correct card template
- [ ] `data-slot` markers present on cards and columns
- [ ] Integration tests pass (`pnpm --filter @nop-chaos/flux-renderers-scheduling test`)

### Phase 3 — Drag And Drop, Filter, Column Collapse

Status: planned
Targets: `use-kanban-dnd.ts`, `use-column-dnd.ts`, `use-kanban-filter.ts`, `package.json`

- Item Types: `Fix | Decision | Proof`

- [ ] `Fix`: Add `@atlaskit/pragmatic-drag-and-drop` as dependency in `package.json` (not yet in monorepo; per design doc §12.1). Run `pnpm install`.
- [ ] `Decision`: Choose `@atlaskit/pragmatic-drag-and-drop` as DnD runtime. Lock to current version; wrap in `useKanbanDnd` abstraction layer for future upgrade isolation.
- [ ] `Fix`: Create `useKanbanDnd` hook:
  - Card drag source: each `KanbanCard` becomes a draggable
  - Column drop target: each `KanbanColumn` accepts cards
  - `attachClosestEdge` for precise intra-column positioning
  - Drop indicator: horizontal line between cards at insertion point
  - Target column border highlight (2px blue) on drag over
  - On drop: call `moveCard(board, cardId, targetColumnId, targetIndex)` → new BoardData
  - Fires `onCardMove` event with `{ cardId, fromColumnId, toColumnId, fromIndex, toIndex }`
  - Optimistic update: apply `moveCard` immediately, revert on event failure if configured
- [ ] `Fix`: Create `useColumnDnd` hook:
  - Column header drag source (via drag handle in `KanbanColumnHeader`)
  - Column board-level drop targets (left/right edge detection)
  - On drop: call `moveColumn(board, columnId, targetIndex)` → new BoardData
  - Fires `onColumnReorder` event
- [ ] `Fix`: Create `useKanbanFilter` hook:
  - Reads `filterText` prop, maintains local debounced value (300ms)
  - Calls `filterCard(card, text) => boolean` (custom filter function) or default text match on card title/description
  - Filters cards per column; columns with zero visible cards remain visible (show "无匹配卡片")
  - Fires `onFilterChange` event
- [ ] `Fix`: Wire column collapse in `KanbanColumn`:
  - Reads `collapsedStatePath` from schema
  - If path specified, read/write collapse state via scope; otherwise local `useState`
  - Fires `onColumnCollapse` event
- [ ] `Proof`: Write integration tests for:
  - Card drag: simulate drop sequence, verify BoardData updated correctly
  - Column reorder: sequence of column moves, verify ordering
  - Filter: text match excludes non-matching cards, debounce works
  - Column collapse: toggle stores state correctly (local and scope paths)
  - Drop indicator appears on valid drop zones

Exit Criteria:

- [ ] Card drag across columns produces correct BoardData update
- [ ] Card intra-column reorder produces correct BoardData update
- [ ] Column reorder produces correct column ordering
- [ ] Filter hides non-matching cards, debounces at 300ms
- [ ] Collapse state persists per column (local and scope path modes)
- [ ] Integration tests pass (`pnpm --filter @nop-chaos/flux-renderers-scheduling test`)

### Phase 4 — Add/Delete, Visual Design, Registration, Playground

Status: planned
Targets: `use-kanban-adder.ts`, `src/styles.css`, `src/schemas.ts`, `scheduling-renderer-definitions.ts`, `apps/playground/src/pages/kanban-demo.tsx`

- Item Types: `Fix | Proof | Follow-up`

- [ ] `Fix`: Create `useKanbanAdder` hook:
  - Column footer "+" button → `addCard(board, columnId, { title: "新卡片" })`
  - Board left/right "+" buttons → `addColumn(board, { title: "新列" })`
  - Wire into KanbanBoard imperative handle: `component:addCard`, `component:addColumn`
  - Card delete: context menu or column card hover delete button → `removeCard`
  - Column delete: column header menu → `removeColumn`
- [ ] `Fix`: Default visual design in `src/styles.css`:
  - Loading skeleton: 3 column outline rectangles with pulse animation
  - Empty state: centered board outline + "暂无数据" text
  - Hover: card hover subtle lift (translateY(-2px) + shadow)
  - Drag ghost: scale(0.95) + shadow, semi-transparent
  - Drop indicator: 2px blue horizontal line at insertion point
  - Column collapse: width shrink animation (200ms ease)
  - Root marker class: `.nop-kanban`
  - `data-slot` selectors for column, card, header, footer, empty, loading
- [ ] `Fix`: Update `src/schemas.ts` — import and re-export full `KanbanSchema` from `kanban/kanban.types.ts` (replaces the current minimal inline interface); add columns, data, configMap, regions, events fields
- [ ] `Fix`: Update `src/scheduling-renderer-definitions.ts` — replace Kanban `component: () => null` with real `KanbanBoard` component; add proper fields (columns, data, configMap, cardTemplate, columnHeader, columnFooter, empty, loading, events)
- [ ] `Fix`: Create `apps/playground/src/pages/kanban-demo.tsx`:
  - Schema-driven `kanban` renderer with 3-4 columns and 10+ cards of different types
  - Demo controls: add/delete card/column toggle, filter text input, collapse toggle
  - Register to playground domain route `kanban`
  - Add navigation card to `home-page.tsx`
- [ ] `Proof`: Write integration tests for:
  - Add card: correct column receives new card at correct position
  - Add column: new column appears at correct position
  - Remove card: card removed from board data
  - Loading state renders skeleton placeholders
  - Empty state renders centered placeholder
  - Renderer definition: Kanban entry in `scheduling-renderer-definitions.ts`
- [ ] `Follow-up`: Update `docs/components/roadmap-scheduling.md` — S6 phase to `done`, S10.3 to `done`
- [ ] `Follow-up`: Update `docs/components/examples.manifest.json` — add Kanban renderer to `targetContract`
- [ ] `Follow-up`: Update `docs/logs/2026/07-20.md` with S6 completion summary

Exit Criteria:

- [ ] Add/delete card and column work correctly via UI buttons and imperative handle
- [ ] Loading skeleton renders while data loading
- [ ] Empty state renders when no columns configured
- [ ] `scheduling-renderer-definitions.ts` has real Kanban component with proper fields/events
- [ ] Kanban playground page renders interactive board with sample data
- [ ] `roadmap-scheduling.md` S6 items show `done` status
- [ ] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck && pnpm --filter @nop-chaos/flux-renderers-scheduling test` passes

## Draft Review Record

- Reviewer / Agent: `opencode-go/deepseek-v4-flash` (MISSION_DRIVER, fresh session vs drafting context)
- Verdict: `revised`
- Rounds: 1
- Findings addressed:
  - **Blocker: `@atlaskit/pragmatic-drag-and-drop` not in monorepo** — baseline claim and execution plan corrected; install step added to Phase 3.
  - **Major: Phase 3 missing dependency install** — `package.json` added to Targets; `Fix` item to add dependency and run `pnpm install` prepended to Phase 3.
  - **Minor: CSS path ambiguity** — `kanban.scss` vs `src/styles.css` consolidated to `src/styles.css` (existing build pipeline).
  - **Minor: `KanbanSchema` split across files unclear** — Phase 4 item clarified: import/re-export from `kanban/kanban.types.ts`.
  - **Minor: Full verification in Phase 4 exit criteria redundant** — replaced with focused package-level typecheck+test per Rule 18 (full verification remains in Closure Gates).

## Closure Gates

- [ ] `BoardData` flat dictionary model with pure function helpers is implemented and tested
- [ ] `KanbanBoard`, `KanbanColumn`, `KanbanCard` render correctly with configMap and region support
- [ ] Card drag-and-drop (cross-column, intra-column) works and commits BoardData updates
- [ ] Column reorder works via header drag handle
- [ ] Filter/search debounces and hides non-matching cards correctly
- [ ] Column collapse toggles card list visibility, state persists
- [ ] Add/delete card and column operations work via UI and imperative handles
- [ ] Default visual design states (loading, empty, hover, drag ghost, drop indicator) render
- [ ] Kanban playground page (S10.3) renders interactive board with sample data
- [ ] Kanban renderer registered in `scheduling-renderer-definitions.ts` with proper fields/events
- [ ] `roadmap-scheduling.md` S6 phase and S10.3 updated
- [ ] No deferred live defects or contract drifts in scope
- [ ] Affected owner docs synced (schemas.ts, definitions, examples.manifest.json)
- [ ] By independent sub-agent (fresh session) closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Column Drag — Scope-level columnsOrderStatePath persistence

- Classification: `optimization candidate`
- Why Not Blocking Closure: Column order is stored locally during drag and applied to BoardData via `moveColumn`. Scope-level persistence (`columnsOrderStatePath`) is a refinement for multi-session column order preservation; the local in-memory order is sufficient for v1.
- Successor Required: `no`

### Optimistic Update Failure Handling

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `onCardMove` event fires after drag, and the data source layer is responsible for confirming or reverting. Full optimistic update with server-rollback is a data-source integration pattern that belongs in a cross-cutting plan (X4 data source), not in Kanban v1 isolation.
- Successor Required: `no`

## Non-Blocking Follow-ups

- Virtual scrolling for columns with many cards (S7 scope, per design doc §12.2).
- Snapshot-based testing of card drag outcomes using simulated data flows.
- Performance baseline measurement (20 columns × 300 cards at 60fps drag) should be established before S7 virtual scrolling work.

## Closure

Status Note: TBD

Closure Audit Evidence: TBD

Follow-up:

- S6 completion enables S7 (Kanban advanced: virtual scroll, WIP limits, tags, activity log, undo/redo, export).
