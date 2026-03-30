# Flow Designer Playground Example Development Plan

> **Implementation Status: ✅ COMPLETED**
> All 8 phases implemented: `flow-designer-core` (graph document, undo/redo, dirty tracking), `flow-designer-renderers` (xyflow canvas, custom nodes/edges), `designer-page` (toolbar, palette, inspector, canvas orchestration), schema-driven toolbar/inspector, and designer:* namespace actions. The playground has a fully functional Flow Designer example.
>
> This status was verified against the codebase on 2026-03-30.

## Purpose

This plan defines how to build a Flow Designer playground example in this repository that reproduces the practical behavior of the legacy `FlowEditor` from `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master`, but does so through the new `nop-amis` Flow Designer architecture.

The target is not to copy the old page structure literally.

The target is to prove that the same editor capability can be expressed through:

- a reusable graph runtime
- `designer-page` host schema
- schema-driven toolbar and inspector regions
- custom node and edge renderers registered into the AMIS renderer pipeline
- a playground-facing example that acts as the first end-to-end reference implementation

## Research Basis

This plan is based on a code review of the legacy implementation in:

- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\index.tsx`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\[id]\index.tsx`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\[id]\components\*`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\[id]\constants.ts`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\[id]\useFlowHistory.ts`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\[id]\useFlowKeyboardShortcuts.ts`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\services\mockApi\flow.ts`
- `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\services\mockApi\types.ts`

It also assumes the current Flow Designer direction described in:

- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/config-schema.md`
- `docs/architecture/flow-designer/api.md`
- `docs/analysis/flow-designer-documentation-review.md`

## Legacy Capability Baseline

The playground example should be scoped against the actual legacy feature set, not an imagined superset.

### Confirmed legacy editor capabilities

- palette-based node creation by click and drag-drop
- canvas pan/zoom with optional grid background
- minimap and canvas controls
- single-node and single-edge focused editing
- connect nodes through simple left/right handles
- node hover or selection quick actions: edit, duplicate, delete
- edge quick actions: edit, delete
- inspector editing for node label, description, type, and string `config`
- inspector editing for edge label, condition, and line style
- save, export JSON, restore last saved state
- undo/redo with snapshot history and drag-end aggregation
- keyboard shortcuts for undo/redo/copy/paste/delete
- dirty-state prompt before leaving the page
- start-node uniqueness rule
- local mock persistence

### Confirmed legacy non-goals or absent features

- no typed port model
- no auto-layout action
- no import flow
- no permission system
- no readonly mode
- no transaction API
- no schema-driven inspector; inspector is hardcoded React
- no generalized graph runtime package

## Target Outcome In This Repo

Build a playground example that demonstrates the same user-facing editor workflow, but expressed in the new architecture as:

- future `@nop-chaos/flow-designer-core` runtime behavior
- future `@nop-chaos/flow-designer-renderers` integration layer
- `designer-page` schema as the host boundary
- `nodeTypes` / `edgeTypes` / `palette` config as the domain model
- schema-driven toolbar and inspector fragments
- playground-local mock persistence for example documents

## Success Criteria

The plan is successful when the playground example can demonstrate all of the following from within the `nop-amis` system:

1. open a sample flow designer example from `apps/playground`
2. add the six legacy node kinds: `start`, `end`, `task`, `condition`, `parallel`, `loop`
3. drag nodes, connect nodes, select nodes and edges, and edit them through a schema-driven inspector
4. use schema-driven toolbar actions for undo/redo/save/export/grid toggle and related commands
5. show parity for duplicate/delete/restore-last-saved/start-node uniqueness/dirty tracking
6. prove that node and edge UI are renderer-driven while inspector and toolbar remain schema-driven
7. do this without falling back to a page-specific monolith like the legacy editor page

## Scope

### In scope

- flow-designer core/runtime work required for the example to be real
- flow-designer renderer integration required for canvas and schema host wiring
- custom node and edge renderer support needed for parity
- playground example page and example document/config
- local mock persistence inside playground
- tests for core behaviors and example integration

### Out of scope for the first parity pass

- full backend persistence or production API integration
- collaboration or multi-user editing
- advanced permission and role systems beyond what is needed to show the architecture shape
- full import pipeline
- every future flow-designer capability mentioned in docs, such as lifecycle hooks for third parties or document migration UI

## Key Design Decision

The first playground example should optimize for proving the architecture, not just reproducing screenshots.

That means:

- the old hardcoded `NodeInspector` and `EdgeInspector` should be re-expressed as schema fragments under `nodeTypes[].inspector.body` and `edgeTypes[].inspector.body`
- the node taxonomy and basic editing UX should stay recognizable to legacy users
- the surrounding list page features from the old repo should be treated as secondary shell work; the main proof point is the editor itself

## Capability Mapping

### A. Mostly example/config work once the runtime exists

- node type catalog and palette grouping
- default node data
- legacy labels, descriptions, icons, and edge style options
- schema-driven toolbar buttons
- schema-driven inspector forms
- sample document and local save/export actions

### B. Requires core/runtime work before the example can feel real

- graph document store and bridge snapshot model
- canvas event to command normalization
- active target and single-selection semantics
- history stack with drag-end aggregation
- clipboard support for copy/paste
- dirty tracking and restore-last-saved support
- export document action
- delete confirmation flow
- hover and selection quick-action shells

### C. Not required for legacy parity, but good follow-up after parity

- typed ports and richer connection rules
- create dialogs for complex node initialization
- auto layout
- permissions and readonly mode
- migration registry
- plugin lifecycle/event APIs beyond what the example itself needs

## Package And App Work Breakdown

### 1. `@nop-chaos/flow-designer-core`

Must provide:

- `GraphDocument`, `GraphNode`, `GraphEdge`, normalized config types
- designer command executor for add/update/delete/connect/select/move
- single active target semantics
- history manager with logical transaction boundaries
- dirty-state tracking against last committed document snapshot
- clipboard helpers
- export and restore-last-saved helpers
- start-node uniqueness validator as example-level rule support

### 2. `@nop-chaos/flow-designer-renderers`

Must provide:

- `designer-page`
- `designer-canvas`
- `designer-palette`
- optional `designer-inspector-shell`
- xyflow adapter that translates canvas events into designer commands
- fixed host scope injection for `doc`, `selection`, `activeNode`, `activeEdge`, `runtime`, and action helpers
- support for custom node and edge renderer registration

### 3. `apps/playground`

Must provide:

- a Flow Designer example entry in the playground UI
- local mock document repository for sample save/load/duplicate/remove flows
- sample workflow config and sample documents
- schema-driven toolbar and inspector fragments
- example-specific document export trigger
- optional gallery shell for multiple sample documents if parity work reaches that phase

## Phased Execution Plan

## Phase 0 - Discovery Lock And Example Scope Freeze

### Goals

- lock the exact parity target to the real legacy behavior
- prevent the implementation from expanding into every future Flow Designer feature at once

### Tasks

- convert the six legacy node kinds and their defaults from `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master\apps\main\src\pages\flow-editor\[id]\constants.ts` into an explicit parity checklist
- record which legacy behaviors are editor-core requirements versus list-shell niceties
- define one sample `workflow` config and one sample document as the baseline playground fixture

### Deliverables

- parity checklist embedded into implementation issues or plan tracking
- frozen MVP acceptance list

### Exit criteria

- the team agrees that the first playground delivery targets editor parity first, not full app-shell parity

## Phase 1 - Core Package Skeleton And Document Model

### Goals

- create the reusable designer runtime foundation

### Tasks

- scaffold `@nop-chaos/flow-designer-core`
- implement normalized config compilation for node types, edge types, palette groups, and feature flags
- define document operations for add/update/delete/move/connect/disconnect/select
- define runtime snapshot shape for `doc`, `selection`, `activeNode`, `activeEdge`, history status, dirty flag, and grid/view settings needed by the example
- implement start-node uniqueness as a reusable validation rule layer or example validator hook

### Deliverables

- package skeleton with public contracts
- pure tests for document operations and validation

### Exit criteria

- core can mutate an in-memory document without React dependencies
- core tests cover the legacy-critical operations

## Phase 2 - History, Clipboard, Dirty Tracking, And Restore

### Goals

- cover the mundane editor behavior the legacy page handled ad hoc

### Tasks

- implement undo/redo history with drag-end aggregation semantics
- implement clipboard copy/paste for selected node
- implement dirty tracking against the last committed snapshot
- implement restore-last-saved behavior
- implement export-to-JSON action support

### Deliverables

- history and clipboard helpers in core
- tests for undo/redo, copy/paste, dirty reset, restore, export

### Exit criteria

- the runtime can reproduce the legacy save/undo/restore behavior without page-local hacks

## Phase 3 - Renderer Integration And Canvas Bridge

### Goals

- connect core runtime to `SchemaRenderer`

### Tasks

- scaffold `@nop-chaos/flow-designer-renderers`
- implement `designer-page` and fixed host scope injection
- implement `designer-canvas` on top of `@xyflow/react`
- normalize `onNodesChange`, `onEdgesChange`, `onConnect`, pane click, selection change, and drag end into designer commands
- enforce that the canvas adapter does not mutate the graph document directly
- expose runtime summary to schema scope for toolbar and inspector usage

### Deliverables

- first end-to-end render path from `designer-page` to canvas
- integration tests for bridge and scope exposure

### Exit criteria

- a schema can host a live editable graph and react to selection changes through host scope data

## Phase 4 - Custom Node And Edge Rendering

### Goals

- match the recognizable legacy visual behavior

### Tasks

- implement custom node renderer support for the six legacy node kinds
- implement custom edge renderer support for label/condition/style display and quick actions
- implement quick-action shells for node edit/duplicate/delete and edge edit/delete
- keep renderer logic visual; business changes still flow through designer commands

### Deliverables

- reusable node and edge renderer definitions
- visual parity for legacy card and edge affordances

### Exit criteria

- users can visually interact with nodes and edges in a way that matches the old editor closely enough to validate parity

## Phase 5 - Schema-Driven Toolbar And Inspector

### Goals

- prove the nop-amis value proposition over the legacy hardcoded inspector

### Tasks

- define `designer-page` schema for toolbar and inspector shells
- express node inspector forms as `nodeTypes[].inspector.body` schema
- express edge inspector forms as `edgeTypes[].inspector.body` schema
- wire save/undo/redo/export/grid and selection-dependent actions through `designer:*` actions
- add delete confirmation dialog using schema-driven dialog flow

### Deliverables

- one complete example schema showing a real designer page
- example config showing nodeTypes, edgeTypes, palette, and rules

### Exit criteria

- the example no longer depends on hardcoded React inspector forms for parity behavior

## Phase 6 - Playground Example Assembly

### Goals

- make the feature discoverable and runnable in `apps/playground`

### Tasks

- add a Flow Designer example route or tab to `apps/playground`
- provide sample documents and local mock persistence
- add sample save/load/export actions
- add dirty-state leave warning equivalent for the example shell
- optionally add a small document gallery if parity work extends to the list workflow

### Deliverables

- runnable playground example
- local mock repository or in-browser persistence helper

### Exit criteria

- a developer can run `pnpm dev`, open the playground, and use the flow-designer example without touching the legacy repo

## Phase 7 - Parity Polish

### Goals

- close the remaining practical UX gap against the old editor

### Tasks

- refine hover timing and quick-action behavior
- add mobile drawer or narrow-layout inspector fallback if needed
- match legacy default labels and config seeds more closely
- verify edge style editing and export structure
- add parity-focused screenshots or notes to docs if useful

### Exit criteria

- the example covers the behavior most users would associate with the old FlowEditor

## Phase 8 - Stretch Beyond Legacy

### Goals

- showcase the new architecture beyond what the legacy page supported

### Candidate additions

- typed ports
- explicit connection validation rules
- `createDialog` for complex node initialization
- auto layout
- readonly mode
- richer permissions
- lifecycle hooks and plugin events

This phase should start only after parity is already proven.

## Example Deliverables

The final plan should produce at least these concrete artifacts:

- `packages/flow-designer-core/`
- `packages/flow-designer-renderers/`
- playground example schema/config fixture under `apps/playground`
- sample workflow node/edge renderers
- tests for core document commands and renderer integration
- docs explaining how the example maps to the old FlowEditor

## Acceptance Matrix

### MVP acceptance

- can render a `designer-page` in playground
- can add and connect legacy node kinds
- can edit node and edge data through schema-driven inspector fragments
- can undo/redo and export
- enforces the single-start-node rule

### Parity acceptance

- has quick actions for duplicate/delete/edit
- supports save and restore-last-saved
- supports dirty-state feedback
- includes minimap and grid toggle
- visually resembles the legacy editor enough to compare workflows directly

### Architecture acceptance

- inspector and toolbar are schema-driven, not page-hardcoded
- graph state changes go through designer commands/actions, not direct canvas mutation
- the example is reusable as a reference for future flow-designer work

## Risks

### 1. Overbuilding the runtime before proving the example

Mitigation:

- lock parity scope early
- prioritize active target, history, dirty state, and inspector wiring before advanced features like permissions or auto layout

### 2. Recreating the legacy monolith inside the playground

Mitigation:

- require schema-driven toolbar/inspector as a hard acceptance criterion
- keep business mutations in core commands and `designer:*` actions

### 3. Spending too much time on future-only Flow Designer features

Mitigation:

- move typed ports, lifecycle hooks, migration UI, and advanced permissions behind a stretch-goal gate

### 4. Canvas adapter drift

Mitigation:

- keep xyflow integration behind a renderer adapter boundary
- write integration tests around command normalization and no-op loop avoidance

## Verification Plan

### Core verification

- unit tests for add/update/delete/move/connect/select
- unit tests for start-node uniqueness
- unit tests for history aggregation, dirty tracking, restore, and export

### Renderer verification

- integration tests for `designer-page` fixed host scope
- integration tests for schema-driven inspector updates
- integration tests for canvas event to command bridging

### Playground verification

- manual parity check against the legacy flow editor workflow
- ensure the example loads and edits sample documents from mock persistence

### Repository verification

- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`
- `pnpm test`

## Recommended Implementation Order

1. freeze parity scope from the legacy editor
2. build core document command runtime
3. add history, dirty tracking, restore, and export
4. build `designer-page` and canvas bridge
5. add custom node and edge renderers
6. move toolbar and inspector into schema fragments
7. wire the playground example and mock persistence
8. polish parity UX
9. only then add stretch features beyond legacy parity

## Related Documents

- `docs/architecture/flow-designer/README.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/config-schema.md`
- `docs/architecture/flow-designer/api.md`
- `docs/analysis/flow-designer-documentation-review.md`
