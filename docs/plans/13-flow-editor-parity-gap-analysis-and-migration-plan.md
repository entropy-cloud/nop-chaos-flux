# Flow Editor Parity Gap Analysis And Migration Plan

> **Implementation Status: ✅ COMPLETED**
> All 6 phases completed: xyflow canvas integration, drag-drop from palette, hover toolbars on nodes/edges, schema-driven inspector panel, productivity features (undo/redo, copy/paste, keyboard shortcuts), and list-shell node type. The flow-designer2 playground has reached practical parity with the legacy FlowEditor.
>
> This status was verified against the codebase on 2026-03-30.

## Purpose

This plan defines what it means for the `flow-designer2` playground Flow Designer to reach practical parity with the legacy `flow-editor` from `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master`.

The goal is not to copy the old page component tree literally.

The goal is to reproduce the same user-facing workflow, feature set, and visual hierarchy through the `nop-amis` Flow Designer architecture:

- `@nop-chaos/flow-designer-core` for document and editor state
- `@nop-chaos/flow-designer-renderers` for canvas, palette, and designer host rendering
- schema-driven toolbar / inspector / dialogs regions
- playground configuration and sample documents as the first end-to-end reference

## Reference Baseline

### Normative feature list

Use `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\docs\03-flow-editor.md` as the primary feature checklist.

That document defines:

- list-page requirements
- editor-page layout and canvas interactions
- node creation and editing expectations
- edge editing expectations
- hover toolbar behavior
- keyboard and history requirements
- dirty-state leave protection

### Actual implementation anchors

Cross-check the design doc against the current implementation in:

- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\index.tsx`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\[id]\index.tsx`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\[id]\components\FlowCanvas.tsx`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\[id]\components\FlowNodePalette.tsx`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\[id]\components\FlowInspectorPanel.tsx`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\[id]\components\FlowMobilePanels.tsx`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\[id]\components\FlowNodeCard.tsx`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\[id]\components\FlowEdgeRenderer.tsx`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\[id]\constants.ts`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\tests\e2e\flow-editor.spec.ts`

### Current target in this repo

The active target implementation lives mainly in:

- `packages/flow-designer-core/src/`
- `packages/flow-designer-renderers/src/`
- `apps/playground/src/FlowDesignerExample.tsx`
- `apps/playground/src/pages/FlowDesignerPage.tsx`

## Parity Interpretation

"Parity" in this repository means all of the following at once:

1. The playground demonstrates the same editor workflow that legacy users expect.
2. The implementation is driven primarily by Flow Designer runtime + schema configuration, not another page-specific monolith.
3. The visible structure and interaction emphasis match the old editor closely enough that the playground can act as the migration proof.

This means visual parity alone is not enough, and raw feature parity alone is not enough.

## Current Implementation Status (2026-03-24 Survey)

### Already Implemented in Core (`flow-designer-core`)

| Feature | Status | Location |
|---------|--------|----------|
| Undo/redo with 50-entry history | ✅ Complete | `core.ts:undo()`, `redo()`, `canUndo()`, `canRedo()` |
| Dirty state tracking | ✅ Complete | `core.ts:isDirty()`, `save()`, `restore()` |
| Export JSON | ✅ Complete | `core.ts:exportDocument()` |
| Copy/paste methods | ✅ Complete | `core.ts:copySelection()`, `pasteClipboard()` |
| Node/edge CRUD | ✅ Complete | `core.ts:addNode()`, `deleteNode()`, `updateNode()`, etc. |
| Viewport management | ✅ Complete | `core.ts` viewport state and events |
| Reconnection validation | ✅ Complete | `core.ts` reconnect logic |

### Already Implemented in Renderers (`flow-designer-renderers`)

| Feature | Status | Location |
|---------|--------|----------|
| xyflow adapter infrastructure | ✅ Complete | `canvas-bridge.tsx:DesignerXyflowCanvasBridge` |
| Background grid | ✅ Complete | `<Background />` rendered in ReactFlow |
| Connection handling | ✅ Complete | `onConnect`, `onReconnect` wired |
| Viewport sync | ✅ Complete | Controlled viewport with normalization |
| Card canvas fallback | ✅ Complete | `DesignerCardCanvasBridge` |

### Already Implemented in Playground

| Feature | Status | Location |
|---------|--------|----------|
| Palette grouping | ✅ Complete | `FlowDesignerExample.tsx` - basic/logic/execution groups |
| Basic inspector | ✅ Complete | `FlowDesignerExample.tsx` - label and data fields |
| Toolbar actions | ✅ Complete | Undo/redo, save/restore/export, clear selection |
| Toast notifications | ✅ Complete | `FlowDesignerExample.tsx` |

### Partially Implemented (Infrastructure Exists, Not Wired)

| Feature | Status | What's Missing |
|---------|--------|----------------|
| MiniMap | ⚠️ Partial | Imported, `showMinimap` prop exists, but **not rendered** |
| Controls | ⚠️ Partial | Imported, `showControls` prop exists, but **not rendered** |
| NodeToolbar | ⚠️ Partial | Imported, hover state exists, but **not rendered** |
| Double-click editing | ⚠️ Partial | Props `onNodeDoubleClick`/`onEdgeDoubleClick` exist, but **not connected** to ReactFlow |
| Keyboard shortcuts | ⚠️ Partial | Config has `features.shortcuts`, core has methods, but **no key event wiring** |

### Not Implemented (Gap Items)

| Feature | Gap Level | Notes |
|---------|-----------|-------|
| Playground uses xyflow | High | Currently uses custom card canvas, not xyflow adapter |
| Palette drag-drop | High | Click-to-add only, no `draggable`/`onDragStart`/drop |
| MiniMap rendering | Medium | Just needs `<MiniMap />` in ReactFlow |
| Controls rendering | Medium | Just needs `<Controls />` in ReactFlow |
| Hover toolbars UI | High | Need to render NodeToolbar with actions |
| Double-click edit wiring | Medium | Need to wire `onNodeDoubleClick` to ReactFlow |
| Leave guard | Medium | No `beforeunload` or navigation guard |
| Keyboard shortcut wiring | Medium | Need keydown handler calling core methods |
| Copy/paste UX | Low | Core has methods, need toolbar buttons/hotkeys |
| Type-specific inspector | High | Only generic inputs, no type-specific editors |
| Flow list shell | High | No list page at all |

## Target Capability Matrix

### A. Flow list shell

Expected from `docs/03-flow-editor.md` and `apps/main/src/pages/flow-editor/index.tsx`:

- list fields: name, description, status, created time, updated time
- actions: new, edit, duplicate, delete, enable/disable
- search and status filter
- pagination

Current `flow-designer2` state:

- no true list shell in the playground
- current playground enters a single editor demo directly

Gap level: `high`

### B. Editor page layout

Expected:

- top toolbar
- left grouped palette
- dominant central canvas
- right inspector panel on desktop
- mobile property/edge panels on narrow screens

Current state:

- top/left/center/right shell exists in simplified demo form
- desktop hierarchy is only partially aligned
- mobile drawer/sheet behavior is not implemented to the same level

Gap level: `medium-high`

### C. Canvas interaction

Expected:

- true `@xyflow/react` canvas as the main playground experience
- pan on drag
- zoom on scroll
- touchpad-friendly navigation
- optional grid snapping/background
- visible interactive minimap
- canvas controls and hint surface

Current state:

- `xyflow` adapter exists and is now the default package adapter
- playground example still behaves partly like a custom demo shell rather than the final `xyflow`-first target
- minimap / controls / canvas hint parity is incomplete in the main playground example

Gap level: `medium-high`

### D. Palette and node creation

Expected:

- grouped palette: basic / logic / execution
- compact palette items with icons
- drag-drop from palette onto canvas is the primary creation path
- click-add may remain only as an auxiliary shortcut

Current state:

- grouping exists
- icons exist
- drag-drop parity is not yet the main demonstrated path in the playground implementation
- current example still leans too much on custom example logic

Gap level: `high`

### E. Node model and visuals

Expected:

- six node kinds: `start`, `end`, `task`, `condition`, `parallel`, `loop`
- distinct visual treatment by type
- start-node uniqueness rule
- draggable nodes
- connectable nodes
- double-click node to open editing immediately

Current state:

- six node kinds exist
- uniqueness rule exists in core
- visuals are only partly aligned with the richer legacy product styling
- double-click edit parity is not the main package-level interaction contract yet

Gap level: `medium`

### F. Edge model and editing

Expected:

- edge labels
- edge condition editing
- line-style editing
- arrow markers
- double-click edge to edit
- condition branches visibly labeled

Current state:

- labels and basic edge rendering exist
- package and playground examples do not yet reproduce the richer edge editor workflow closely enough
- line-style editing parity is still incomplete

Gap level: `high`

### G. Hover floating toolbars

Expected:

- node hover shows floating toolbar
- edge hover shows floating toolbar
- toolbar remains visible while hovered
- hide delay around 160ms
- node toolbar actions: edit, duplicate, delete
- edge toolbar actions: edit, delete

Current state:

- current example mostly shows actions through selection-state chrome, not real hover-managed floating toolbars
- no package-level parity contract for hover keep-delay behavior

Gap level: `high`

### H. Inspector and property editing

Expected:

- desktop inspector shows flow summary, current selection summary, and node/edge editors
- mobile uses separate node/edge sheets
- node editor supports label, description, and type-specific config fields
- edge editor supports label, condition, and line style

Current state:

- schema-driven toolbar and inspector mounting exists
- current playground inspector is still too simplified and not yet aligned with the legacy editor information architecture
- type-specific editing is incomplete

Gap level: `high`

### I. Editor productivity features

Expected:

- undo / redo
- copy / paste
- delete selected node or edge
- history max size 50
- drag-end aggregation semantics for history recording
- export JSON
- restore last saved snapshot

Current state:

- undo / redo / dirty / save / restore / export foundations already exist in core
- copy / paste exists in core but is not yet surfaced as full parity UX in the playground target
- history semantics must be checked against legacy behavior before claiming parity

Gap level: `medium`

### J. Dirty state and leave protection

Expected:

- dirty state shown in toolbar
- browser refresh/close protection
- in-app navigation confirmation

Current state:

- dirty tracking exists in core
- actual guarded leave workflow is not yet aligned with the legacy editor shell in the playground

Gap level: `medium-high`

## What Must Become Framework Capability

The migration should not keep growing `apps/playground/src/FlowDesignerExample.tsx` into another hardcoded editor page.

The following behaviors should be promoted into reusable Flow Designer capability:

- `xyflow`-first live canvas shell
- palette drag/drop contract
- node and edge hover-toolbar lifecycle
- node/edge double-click editing hooks
- inspector shell structure and responsive behavior
- keyboard shortcut wiring for designer commands
- dirty-state and restore-last-saved command plumbing
- flow list shell schema or reusable page composition pattern if list parity is in scope for playground

## What Can Stay Example-Specific

These parts may stay in playground sample config or local example adapters:

- sample workflow documents
- local mock repository for save/load/duplicate/delete
- legacy labels, example descriptions, icon mapping, and default node values
- page copy and empty-state text
- exact sample flow records used for parity demonstrations

## Current File Direction

### Keep and strengthen

- `packages/flow-designer-core/src/`
- `packages/flow-designer-renderers/src/index.tsx`
- `packages/flow-designer-renderers/src/canvas-bridge.tsx`
- `packages/flow-designer-renderers/src/styles.css`

### Treat as transitional playground shell

- `apps/playground/src/FlowDesignerExample.tsx`
- `apps/playground/src/pages/FlowDesignerPage.tsx`

These files are still acceptable as the temporary integration harness, but they should shrink over time as package-level capabilities become configurable.

### Target long-term role of the playground

The playground should eventually prove parity mostly by supplying:

- sample config
- sample documents
- mock persistence
- schema fragments for toolbar and inspector

It should not be the place where core editor behavior is reimplemented ad hoc.

## Staged Migration Plan

### Phase 1 - Lock parity target and freeze adapter choice [COMPLETED]

### Phase 2 - Match the canvas interaction baseline [COMPLETED]

### Phase 3 - Implement hover toolbars and double-click editing as reusable behavior [COMPLETED]

### Phase 4 - Rebuild inspector parity through schema-driven fragments [COMPLETED]

### Phase 5 - Close productivity parity [COMPLETED]

### Phase 6 - Add list-shell parity if the playground is expected to demonstrate the full module [COMPLETED]

Tasks:
- build a sample flow list page with search, filter, pagination, duplicate, delete, enable/disable, and edit-entry behavior
- keep this shell configuration-driven as much as practical

Exit criteria:

- the playground can demonstrate both list page and editor page as one coherent migrated module

## Recommended Test Strategy

Add parity-oriented tests in this repository that mirror the legacy e2e checklist conceptually.

Existing tests:
- `packages/flow-designer-core/src/core.test.ts` - 13 tests covering node/edge CRUD, undo/redo, dirty, viewport, reconnection
- `packages/flow-designer-renderers/src/canvas-bridge.test.tsx` - Bridge callback verification for Card/XyflowPreview/Xyflow adapters

Priority tests to add:

- [ ] grouped palette sections visible
- [ ] drag palette item to canvas creates node at drop position
- [ ] minimap visible in main showcase
- [ ] double-click node opens property editing path
- [ ] double-click edge opens edge editing path
- [ ] hover toolbars appear for node and edge and keep visible while hovered
- [ ] save/restore/export and dirty-state badge behavior
- [ ] leave guard path

## Immediate Next Implementation Slice

The next implementation slice should not try to finish all parity dimensions at once.

Recommended next slice:

1. switch the playground's main Flow Designer showcase to explicit `xyflow` parity mode
2. make grouped palette drag-drop the primary creation path
3. add visible minimap and canvas controls to that primary path
4. begin package-level hover-toolbar behavior so node/edge quick actions stop depending on selected-state chrome

This slice unlocks the highest-value gap first: the current playground still does not feel like the real `flow-editor` even though several supporting runtime pieces already exist.
