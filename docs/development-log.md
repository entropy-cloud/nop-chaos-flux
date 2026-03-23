# Development Log

## Purpose

Use this file for short dated notes about:

- what document was added or updated
- what design decision was made
- what work is planned next
- small context that is useful to remember later but does not belong in a formal architecture doc

This file is intentionally lightweight.

- keep entries short
- prefer reverse chronological order
- link to the main doc or code path when possible
- do not treat this file as the source of truth for architecture contracts

## Entries

### 2026-03-23

- Expanded `packages/flow-designer-renderers/src/canvas-bridge.tsx` so the extracted `DesignerCardCanvasBridge` contract now covers start/cancel/complete connection and reconnect flows in addition to selection, delete, move, and viewport callbacks.
- Updated `packages/flow-designer-renderers/src/index.tsx` to keep renderer-local pending connection and reconnect shell state, then map those bridge callbacks back onto adapter-backed `addEdge` and `reconnectEdge` commands.
- Hardened `packages/flow-designer-renderers/src/designer-command-adapter.ts` so reconnect dispatch reports `missing-edge` before shared validation runs, and refreshed `packages/flow-designer-renderers/src/canvas-bridge.test.tsx` to pin the new follow-up actions (`Cancel connection`, `Connect here`, `Reconnect here`).
- Expanded `packages/flow-designer-renderers/src/index.test.tsx` with renderer-level jsdom coverage proving duplicate-edge failures raised during bridge-driven connect/reconnect completion still surface through host `env.notify('warning', ...)`.
- Added `DesignerXyflowPreviewBridge` and `canvasAdapter` selection in `packages/flow-designer-renderers/src/canvas-bridge.tsx` and `packages/flow-designer-renderers/src/index.tsx`, so `designer-page` can now swap between the card bridge and a target-side xyflow preview while reusing the same callback contract.
- Expanded `packages/flow-designer-renderers/src/canvas-bridge.test.tsx` and `packages/flow-designer-renderers/src/index.test.tsx` to pin preview-bridge callbacks plus `designer-page` adapter switching.
- Adjusted `packages/flow-designer-renderers/src/index.tsx` so failed connect/reconnect completions keep their pending bridge intent active instead of clearing local shell state immediately after a rejected command, and extended `packages/flow-designer-renderers/src/index.test.tsx` to prove the follow-up action remains visible after duplicate-edge failures.
- Extended `packages/flow-designer-renderers/src/index.test.tsx` again so the same failure-intent rule is now pinned for `canvasAdapter: 'xyflow-preview'`; duplicate-edge failures leave preview connect/reconnect affordances active until the user retries or cancels.
- Added real `@xyflow/react` wiring to `packages/flow-designer-renderers/src/canvas-bridge.tsx` and exposed `canvasAdapter: 'xyflow'` from `packages/flow-designer-renderers/src/index.tsx`, so the target renderer can now switch from card/preview shells to a live controlled React Flow surface without changing the shared command callback contract.
- Added basic render coverage in `packages/flow-designer-renderers/src/canvas-bridge.test.tsx` and `packages/flow-designer-renderers/src/index.test.tsx` for the new live `xyflow` adapter selection path.
- Expanded `packages/flow-designer-renderers/src/canvas-bridge.test.tsx` with mocked `@xyflow/react` callback-translation coverage, locking how live `onConnect`, `onReconnect`, `onSelectionChange`, `onNodesChange`, `onEdgesChange`, and viewport movement map back onto the shared bridge contract.
- Switched the default `designer-page` / `designer-canvas` adapter in `packages/flow-designer-renderers/src/index.tsx` from `card` to `xyflow`, while keeping explicit `canvasAdapter: 'card'` available for parity tests and fallback usage; updated `packages/flow-designer-renderers/src/index.test.tsx` to pin the new default behavior.
- Verified the renderer package again with `pnpm --filter @nop-chaos/flow-designer-renderers test`, `pnpm --filter @nop-chaos/flow-designer-renderers typecheck`, `pnpm --filter @nop-chaos/flow-designer-renderers build`, and `pnpm --filter @nop-chaos/flow-designer-renderers lint`.
- Key decision: keep transient connect/reconnect intent as bridge-host UI state while all actual graph mutations still flow through the shared command adapter, so future xyflow work can reuse the same callback contract without introducing a second mutation path.
- Next step: deepen live `xyflow` regression coverage around selection changes, drag-stop movement commits, and connect/reconnect callback translation now that the dependency is wired.

- Expanded `packages/flow-designer-renderers/src/canvas-bridge.tsx` and `packages/flow-designer-renderers/src/designer-command-adapter.ts` so the extracted bridge contract now covers node movement and viewport changes in addition to selection and delete actions.
- Updated `packages/flow-designer-renderers/src/index.tsx` to bind the new `onMoveNode` and `onViewportChange` bridge callbacks back onto adapter-backed `moveNode` and `setViewport` commands.
- Added regression coverage in `packages/flow-designer-renderers/src/canvas-bridge.test.tsx`, `packages/flow-designer-renderers/src/designer-command-adapter.test.ts`, and `packages/flow-designer-renderers/src/index.test.tsx` for move-node and viewport bridge/provider behavior.
- Key decision: continue extending the extracted bridge by adding explicit callback contracts first, then mapping them onto command adapter results, so future xyflow work inherits stable callback semantics instead of raw core method coupling.
- Next step: add connect/reconnect and richer viewport synchronization callbacks to the same bridge surface before introducing a target-side xyflow preview implementation.

- Added `packages/flow-designer-renderers/src/canvas-bridge.tsx` with a dedicated `DesignerCardCanvasBridge` contract so the current card canvas consumes only snapshot data plus explicit bridge callbacks for pane, node, edge, duplicate, and delete interactions.
- Rewired `packages/flow-designer-renderers/src/index.tsx` so `DesignerCanvasContent` now acts as a bridge host that binds adapter-backed commands to the extracted canvas bridge component instead of inlining the full card canvas DOM.
- Added `packages/flow-designer-renderers/src/canvas-bridge.test.tsx` to pin the extracted bridge callback contract, and updated `docs/architecture/flow-designer/api.md` to record the bridge-facing canvas boundary.
- Key decision: keep card canvas rendering behind the same explicit bridge callback surface we want for future xyflow work, so the view layer can swap implementations without reintroducing direct graph mutation paths.
- Next step: extend the new bridge surface beyond select/delete actions so connection, reconnect, move, and viewport synchronization can migrate onto the same contract before the real xyflow adapter lands.

- Rewired `packages/flow-designer-renderers/src/index.tsx` so palette, canvas, default inspector, and `designer-field` no longer mutate `core.*` directly; all renderer-side graph writes now go through the shared command adapter dispatch path used by the provider layer.
- Kept renderer-side warning behavior aligned with provider behavior by routing adapter failures through the same notify helper, so shared semantic rejections stay host-visible regardless of whether they originate from ActionScope dispatch or direct renderer UI events.
- Expanded `packages/flow-designer-renderers/src/index.test.tsx` with provider coverage for normalized viewport return values after `setViewport`, and re-verified the package after the renderer adapter rewiring.
- Verified the renderer package again with `pnpm --filter @nop-chaos/flow-designer-renderers test`, `pnpm --filter @nop-chaos/flow-designer-renderers typecheck`, `pnpm --filter @nop-chaos/flow-designer-renderers build`, and `pnpm --filter @nop-chaos/flow-designer-renderers lint`.
- Key decision: renderer UI events should reuse the same target-owned command normalization layer as namespace providers, instead of creating a second “local UI shortcut” mutation path that could drift from provider and future xyflow bridge semantics.
- Next step: start extracting a dedicated canvas bridge surface so future xyflow integration can dispatch adapter commands without depending on the card/list renderer implementation details.

- Added `packages/flow-designer-renderers/src/designer-command-adapter.ts` as the target-side command normalization layer, giving provider and future canvas bridges a shared result shape with `ok`, `snapshot`, `data`, `error`, `reason`, and `exported` fields.
- Rewired `packages/flow-designer-renderers/src/index.tsx` so the `designer` namespace provider now dispatches through the command adapter instead of open-coding raw core mutations, and warning notifications are emitted only for shared semantic rejections such as missing-node, self-loop, and duplicate-edge failures.
- Added regression coverage in `packages/flow-designer-renderers/src/designer-command-adapter.test.ts` and expanded `packages/flow-designer-renderers/src/index.test.tsx` to pin adapter reconnect/viewport outcomes plus provider-level warning notification behavior.
- Verified the renderer package with `pnpm --filter @nop-chaos/flow-designer-renderers test`, `pnpm --filter @nop-chaos/flow-designer-renderers typecheck`, `pnpm --filter @nop-chaos/flow-designer-renderers build`, and `pnpm --filter @nop-chaos/flow-designer-renderers lint`.
- Key decision: provider and later xyflow bridge code should normalize onto one target-owned adapter surface before richer renderer migration continues, so validation visibility and command semantics do not fragment across host entry points.
- Next step: migrate direct renderer interactions that still call `core.*` inline onto the command adapter and then expand the provider surface toward fuller source parity.

- Extended `packages/flow-designer-core/src/core.ts` viewport handling so `setViewport(...)` now normalizes x/y/zoom, writes through shared document state, participates in undo/redo history, and restores normalized viewport state from undo/redo and `restore()`.
- Added viewport-parity coverage in `packages/flow-designer-core/src/core.test.ts` for normalization, history no-op suppression, dirty-state interaction, and save/restore semantics.
- Verified the target core slice with `pnpm --filter @nop-chaos/flow-designer-core test`, `pnpm --filter @nop-chaos/flow-designer-core typecheck`, `pnpm --filter @nop-chaos/flow-designer-core build`, and `pnpm --filter @nop-chaos/flow-designer-core lint`.
- Key decision: keep viewport as shared core-owned document state rather than renderer-local UI state, so later command-adapter and xyflow work can reuse the same history and dirty semantics already pinned by tests.
- Next step: introduce the target-side command adapter that normalizes provider and future canvas-bridge mutations onto the now-tested reconnect, validation, and viewport core surface.

- Extended `packages/flow-designer-core/src/core.ts` with shared edge validation and a first-class `reconnectEdge(...)` API, then pinned the behavior in `packages/flow-designer-core/src/core.test.ts` for duplicate-edge rejection, self-loop rejection, missing-node rejection, reconnect success, reconnect no-op, and reconnect failure cases.
- Key decision: target core now owns reconnect and duplicate-edge semantics directly instead of leaving them as later renderer-only concerns, so the command-adapter and real xyflow migration can build on a tested shared graph contract.
- Next step: implement viewport-history parity in target core and then start the command-adapter layer on top of the now-tested reconnect/validation surface.

- Added the first pure Flow Designer core safety-net in `packages/flow-designer-core/src/core.test.ts`, covering baseline node mutation, edge history, and save/restore/export behavior before reconnect and validation migration begins.
- Key decision: start `flow-designer2` implementation with a target-owned core test harness instead of continuing to rely on the thin provider smoke test in `packages/flow-designer-renderers/src/index.test.tsx`.
- Next step: expand the new core suite with reconnect, shared edge validation, and viewport-history parity tests as the corresponding target core upgrades land.

- Implemented first-pass `xui:imports` loading/error UX semantics across `packages/amis-runtime/src/imports.ts` and `packages/amis-react/src/index.tsx`, including placeholder providers, explicit loading failures, persisted load-error results, and render-time notify/monitor reporting.
- Updated `docs/architecture/action-scope-and-imports.md` to record the now-active runtime behavior for loading, failure, collision reporting, and refcounted release.
- Added regression coverage for loading-state dispatch errors and failed-loader diagnostics in `packages/amis-react/src/index.test.tsx`.
- Added runtime-level import-manager coverage in `packages/amis-runtime/src/index.test.ts` for same-scope refcounted release, child-scope shadowing/restoration, and deterministic alias-collision failures.
- Key decision: import lifecycle semantics are now pinned at both the React boundary layer and the runtime API layer so future refactors cannot keep dedupe/disposal behavior only as an incidental React effect detail.
- Added `xui:imports` lifecycle regression coverage in `packages/amis-react/src/index.test.tsx` for same-scope dedupe, descendant visibility, child-scope isolation, and unmount disposal/fallback behavior.
- Key decision: imported namespaces now follow the same owned mount/unmount lifecycle as host namespace providers, so scope-local import registrations are reference-counted and released when the declaring React boundary disappears.
- Added dialog lifecycle regression coverage in `packages/amis-react/src/index.test.tsx` to verify dialog-scoped namespace/handle providers are recreated on reopen and that captured dialog dispatchers fall back to outer providers after dialog close.
- Key decision: dialog reopen semantics should produce a fresh child boundary rather than reusing a prior dialog-owned dispatch path or registrations, matching the existing fresh dialog data-scope behavior.
- Added nested React regression coverage in `packages/amis-react/src/index.test.tsx` for action-scope/component-registry boundary precedence and teardown fallback behavior.
- Key decision: teardown verification should assert that a child-scoped dispatch path falls back to still-live parent providers after the child subtree unmounts, instead of keeping stale namespace/handle registrations alive.
- Next step: extend the same boundary-focused coverage to dialog reopen/unmount cases and imported namespace lifecycle once `xui:imports` gets richer loading/error semantics.
- Implemented the first action-scope, component-handle, and import-declaration runtime pass across `packages/amis-schema/src/index.ts`, `packages/amis-runtime/src/action-runtime.ts`, `packages/amis-react/src/index.tsx`, and `packages/flow-designer-renderers/src/index.tsx`.
- Added explicit runtime primitives for `ActionScope`, `ComponentHandleRegistry`, `ComponentHandle`, `XuiImportSpec`, import loading, and extended monitor payloads so built-in, component-targeted, and namespaced dispatch paths are diagnosable.
- Key decision: keep dispatch order fixed as built-in -> `component:invoke` -> namespaced action, and keep form/public component invocation limited to explicit handle methods instead of exposing arbitrary store methods.
- Proved the component-target path with form handle registration and `component:invoke`, including `submit`, `validate`, `reset`, and `setValue` support through `packages/amis-runtime/src/form-component-handle.ts` and React lifecycle registration in `packages/amis-react/src/index.tsx`.
- Proved the namespaced host path with Flow Designer by adding a local `designer` action provider registered from `packages/flow-designer-renderers/src/index.tsx` rather than relying on root-level handler injection.
- Added initial `xui:imports` plumbing with trusted loader hooks and scope-local namespace registration; current pass focuses on declaration handling and deduped registration, not full example adoption yet.
- Added regression coverage in `packages/amis-runtime/src/index.test.ts`, `packages/amis-react/src/index.test.tsx`, and `packages/flow-designer-renderers/src/index.test.tsx`.
- Next step: tighten import collision/loading state UX, add richer Flow Designer schema-driven command coverage, and document concrete `xui:imports` authoring examples once a first imported library example lands.

### 2026-03-22 (Action Scope And Import Design)

- Replaced the earlier lexical-method-dispatch note with a single active design doc at `docs/architecture/action-scope-and-imports.md`.
- Key decision: keep `ScopeRef` as a data scope only, and introduce a separate action-scope layer for namespaced host actions and imported library capabilities.
- Defined `xui:import` as declaration-style import semantics rather than execution-order semantics: imports are order-independent, repeatable, deduplicated by normalized import key, and visible by container-owned action scope.
- Clarified that complex hosts such as Flow Designer and future Report/Spreadsheet Designer should expose namespaced action providers on top of bridge contracts instead of pushing more domain behavior into the built-in action dispatcher or into `ScopeRef` itself.
- Expanded the same doc with component-targeted invocation rules: runtime may resolve `componentId` or `componentName` through a separate component-handle registry, and externally callable methods must be explicitly exposed through capabilities instead of implicitly falling through to store methods.
- Added the execution plan `docs/plans/12-action-scope-imports-and-component-invocation-plan.md` to stage the work across contract lock, dispatcher refactor, React host integration, form targeting, Flow Designer namespace adoption, and later `xui:import` loading.
- Updated navigation and maintenance guidance in `docs/index.md` and `docs/references/maintenance-checklist.md` so future action-scope and import changes have one canonical documentation target.
- Next step: if implementation starts, add minimal runtime contracts for action-scope resolution plus component-handle lookup, prove the model first with one host namespace such as `designer:*` and one targeted capability such as form submit before adding `xui:import` loading.

### 2026-03-22 (Superseded Design Note)

- The earlier lexical-method-dispatch draft was later superseded by `docs/architecture/action-scope-and-imports.md`.
- Key decision after review: do not turn `ScopeRef` into a general method registry; keep data scope and action scope separate.
- Historical context only: the superseded draft helped identify the need for non-built-in host action extension, but its main mechanism was intentionally replaced.

### 2026-03-22

- Created `@nop-chaos/flow-designer-core` package with pure graph runtime including:
  - `GraphDocument`, `GraphNode`, `GraphEdge`, `DesignerConfig` types
  - `createDesignerCore()` factory with node/edge CRUD, selection, undo/redo, copy/paste, save/restore/export
  - Start-node uniqueness constraint, grid toggle, dirty tracking
- Created `@nop-chaos/flow-designer-renderers` package with:
  - `designer-page`, `designer-field`, `designer-canvas`, `designer-palette` renderer definitions
  - `registerFlowDesignerRenderers()` for registry integration
- Added Flow Designer example to playground (`apps/playground/src/FlowDesignerExample.tsx`) demonstrating:
  - Six legacy node types (start, end, task, condition, parallel, loop)
  - Palette with search and expandable groups
  - Canvas with node/edge rendering, selection, quick actions
  - Inspector panel for node/edge property editing
  - Toolbar with undo/redo/save/restore/export actions
  - JSON view for document inspection
- Updated `vite.workspace-alias.ts` to include flow-designer package aliases
- Key decision: implemented a direct React component approach in the playground example rather than using SchemaRenderer, to avoid type complexity with designer-specific document/config props
- Next step: integrate `@xyflow/react` canvas adapter for richer graph interaction, add schema-driven inspector forms, implement connection validation rules

### 2026-03-21

- Added `docs/plans/11-flow-designer-playground-example-development-plan.md` to define a phased plan for a playground Flow Designer example that reimplements the practical behavior of the legacy `FlowEditor` from `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master` using the new `nop-amis` Flow Designer architecture.
- Key decision: scope parity around the real legacy editor feature set first, then use the new architecture to re-express toolbar and inspector behavior as schema/config instead of copying the old hardcoded page structure.
- Next step: turn the plan into an implementation backlog starting with core graph commands, history/dirty tracking, the xyflow bridge, and a schema-driven playground example.

- Reworked the temporary Flow Designer review note into `docs/analysis/flow-designer-documentation-review.md` and moved the accepted conclusions into the active flow-designer docs.
- Updated `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/config-schema.md`, `docs/architecture/flow-designer/api.md`, and `docs/architecture/flow-designer/README.md` to clarify the xyflow adapter boundary, graph/schema bridge contract, migration rules, expression scope, transaction/history expectations, event hooks, and large-graph guidance.
- Key decision: only record claims that still hold after re-reading the active design set; keep composite-node structure and patch-vs-snapshot storage as intentionally open extension areas instead of pretending they are finalized.
- Next step: if implementation starts, turn the new bridge, lifecycle hook, migration registry, and transaction notes into concrete TypeScript contracts under the future flow-designer packages.

- Finished the `@nop-chaos/amis-debugger` entry-point refactor so `packages/amis-debugger/src/controller.ts` is now the single controller implementation and `packages/amis-debugger/src/index.tsx` is a thin re-export layer.
- Added the missing controller-level exports for `installAmisDebuggerWindowFlag()` and `createAmisDiagnosticReport()` so package consumers keep the same public API after the split.
- Key decision: keep diagnostics, redaction, panel UI, types, and controller assembly in separate modules, but preserve the existing top-level package surface from `packages/amis-debugger/src/index.tsx`.
- Continued the split by extracting controller assembly dependencies into `packages/amis-debugger/src/store.ts`, `packages/amis-debugger/src/controller-helpers.ts`, `packages/amis-debugger/src/automation.ts`, and `packages/amis-debugger/src/adapters.ts`.
- Key decision: keep `controller.ts` focused on orchestration while moving event-store state, window/bootstrap helpers, environment decoration, plugin hooks, and automation hub wiring into dedicated modules.
- Added focused module tests in `packages/amis-debugger/src/store.test.ts`, `packages/amis-debugger/src/automation.test.ts`, and `packages/amis-debugger/src/adapters.test.ts` to cover store state transitions, automation delegation/window registration, and adapter-level event capture/redaction behavior.
- Key decision: keep the high-level integration coverage in `packages/amis-debugger/src/index.test.ts` while adding small module tests for the newly extracted files instead of over-expanding the single integration suite.
- Added pure helper coverage in `packages/amis-debugger/src/controller-helpers.test.ts` and `packages/amis-debugger/src/redaction.test.ts` so window-config parsing, network summary shaping, session id formatting, and redaction edge cases are checked directly.
- Key decision: keep pure functions under direct unit tests so future refactors can change controller composition without weakening behavior checks for config parsing and data masking.
- Added direct diagnostics coverage in `packages/amis-debugger/src/diagnostics.test.ts` for event query matching, overview aggregation, node diagnostics, interaction traces, redacted session export, and empty-report fallback behavior.
- Key decision: test `diagnostics.ts` at the pure-function level so AI-facing query/report/export semantics stay stable even if controller wiring changes again.
- Extended the AI-facing trace model so `packages/amis-debugger/src/diagnostics.ts` can infer a latest interaction anchor, resolve a richer trace query, and include `latestInteractionTrace` inside diagnostic reports without forcing callers to handcraft trace filters every time.
- Key decision: automatic interaction correlation stays in the pure diagnostics layer, using explicit `mode`, `eventId`, and `inferFromLatest` inputs so controller wiring remains thin while AI clients get higher-level defaults.
- Refreshed the playground AI example in `apps/playground/src/App.tsx` to demonstrate inferred traces, exact event-anchored traces, and `latestInteractionTrace` coming back from `createDiagnosticReport()`.
- Key decision: keep the playground snippet aligned with the public automation surface so the in-browser example doubles as living documentation for AI agents.
- Surfaced the inferred trace summary directly in the debugger overview via `packages/amis-debugger/src/panel.tsx` and added `packages/amis-debugger/src/panel.test.tsx` to pin the new UI summary behavior.
- Key decision: render the latest inferred trace in the overview tab using the existing diagnostic-report API instead of duplicating correlation logic inside the panel.
- Next step: if the overview gets crowded, split trace-specific UI into a dedicated summary block or future trace tab instead of overloading the metric-card grid.

### 2026-03-20 (Bug Fixes)

- Extended Bug #1 coverage and fix scope: `array-editor` and `key-value` now resync local state from plain scope updates as well as managed form updates.
  - Files: `packages/amis-renderers-form/src/renderers/array-editor.tsx`, `packages/amis-renderers-form/src/renderers/key-value.tsx`, `packages/amis-renderers-form/src/__tests__/bug-dual-state.test.tsx`
  - Docs: `docs/bugs/06-array-editor-key-value-dual-state-fix.md`
  - Key decision: dual-state renderers must subscribe to whichever source of truth is active (`form.store` or scope), not just the form path.
- Tightened Bug #3 semantics: `validateForm()` now includes side-effect validation errors in its returned `errors`/`fieldErrors`, so `submit()` cannot pass while the store still contains validation failures.
  - Files: `packages/amis-runtime/src/form-runtime.ts`, `packages/amis-runtime/src/__tests__/bug-validate-overwrite.test.ts`
  - Docs: `docs/bugs/08-validate-form-destructive-error-merge-fix.md`
  - Key decision: end-of-pass error merges must keep store state and returned validation results consistent, not just preserve external paths in the store.
- Corrected Bug #2 semantics: duplicate `submit()` calls now return `cancelled` instead of a normal error so guarded re-clicks do not masquerade as business failures in action chains or monitor output.
  - Files: `packages/amis-runtime/src/form-runtime.ts`, `packages/amis-runtime/src/index.test.ts`, `packages/amis-runtime/src/__tests__/bug-submit-race.test.ts`
  - Docs: `docs/bugs/07-submit-concurrent-guard-fix.md`
  - Key decision: guarded duplicate submits share the project's existing cancelled-action semantics instead of introducing a new failure mode.
- **Bug #1 Fixed**: ArrayEditor/KeyValue now subscribe to form store via `useCurrentFormState` with deep equality. External `reset()`/`setValue()` properly syncs to local state.
  - Files: `packages/amis-renderers-form/src/renderers/array-editor.tsx`, `packages/amis-renderers-form/src/renderers/key-value.tsx`
  - Tests: 4 passing in `packages/amis-renderers-form/src/__tests__/bug-dual-state.test.tsx`
- **Bug #2 Fixed**: `submit()` now checks `store.getState().submitting` and rejects concurrent calls.
  - File: `packages/amis-runtime/src/form-runtime.ts:248`
  - Test: 1 passing in `packages/amis-runtime/src/__tests__/bug-submit-race.test.ts`
- **Bug #3 Fixed**: `validateForm()` uses merge (`{...existing, ...fieldErrors}`) instead of replacement for error map.
  - File: `packages/amis-runtime/src/form-runtime.ts:177`
  - Tests: 5 passing in `packages/amis-runtime/src/__tests__/bug-validate-overwrite.test.ts`
- All 117 tests pass (75 runtime + 42 form). Typecheck/lint pass for changed packages.
- Note: `amis-debugger` has pre-existing typecheck failures unrelated to these changes.

### 2026-03-20 (Bug Analysis)

- Completed frontend bug analysis across all packages. Found 5 confirmed runtime bugs.
- **Bug #1 (HIGH)**: ArrayEditor/KeyValue dual-state desync — `useState` initialized once, external `reset()`/`setValue()` doesn't update local state. Failing tests: `packages/amis-renderers-form/src/__tests__/bug-dual-state.test.tsx`
- **Bug #2 (HIGH)**: `submit()` no concurrent guard — rapid double-click fires two API calls. Failing test: `packages/amis-runtime/src/__tests__/bug-submit-race.test.ts`
- **Bug #3 (MEDIUM-HIGH)**: `validateForm()` calls `store.setErrors(fieldErrors)` which destructively replaces entire errors map, wiping errors for paths not in traversal. Tests: `packages/amis-runtime/src/__tests__/bug-validate-overwrite.test.ts`
- **Bug #4 (MEDIUM)**: `remapArrayFieldState` makes 5+ independent store updates causing intermediate state visible to `useSyncExternalStore` subscribers.
- **Bug #5 (MEDIUM)**: Table `key={index}` fallback causes row state misalignment on sort/delete.
- Key decision: complex fields must NOT maintain parallel local state; read from store only.
- Next step: implement fixes for Bug #1 and #2, starting with dual-state sync.

### 2026-03-20

- Fixed `checkbox-group` value handling so arrays no longer round-trip through JSON strings in `packages/amis-renderers-form/src/renderers/input.tsx` and `packages/amis-renderers-form/src/field-utils.tsx`.
- Added regression coverage for non-string checkbox-group values and plain-scope updates in `packages/amis-renderers-form/src/index.test.tsx` and recorded the defect note in `docs/bugs/05-checkbox-group-value-type-drift-fix.md`.
- Key decision: shared field handlers must preserve typed values because array-valued controls cannot safely share a string-only update pipeline.
- Next step: audit other multi-value renderers for hidden coercion paths before reusing generic field helpers.

- Fixed `checkbox-group` shared field handling so array values are passed through without JSON stringification in `packages/amis-renderers-form/src/renderers/input.tsx`.
- Added regression coverage for form and plain-scope checkbox-group updates, including non-string option values, in `packages/amis-renderers-form/src/index.test.tsx`.
- Key decision: shared field handlers now accept typed values so array-valued controls do not drift into string payloads on either the form or scope update path.
- Next step: if more multi-value controls are added, reuse the typed handler path instead of introducing serializer-specific glue.

- Added `docs/analysis/framework-debugger-design.md` as the first framework-level debugger design draft.
- Confirmed the debugger should live in a separate package, proposed as `@nop-chaos/amis-debugger`.
- Confirmed the main integration boundary should be the `SchemaRenderer` host layer rather than a specific renderer package.
- Recorded the recommended debugger shape: `window` global switch, floating draggable panel, hide-to-launcher behavior, and a left-bottom launcher entry.
- Identified the first key event groups for the debugger: `compile`, `render`, `action`, `api`, `notify`, and `error`.
- Planned next implementation direction: create the package skeleton, add controller and timeline event model, then wire the first version into `apps/playground/src/App.tsx`.
- Created the first `packages/amis-debugger/` package skeleton, including workspace package metadata, TypeScript configs, and alias wiring.
- Implemented a first debugger controller with `env` decoration, plugin hooks, timeline event storage, and root action error capture.
- Added a floating debugger panel with tabs for `overview`, `timeline`, and `network`, plus pause, clear, hide, and left-bottom launcher behavior.
- Wired the playground to the new debugger package and removed the old local right-side activity panel from `apps/playground/src/App.tsx`.
- Verified the first version with `pnpm --filter @nop-chaos/amis-debugger typecheck`, `pnpm --filter @nop-chaos/amis-playground typecheck`, `pnpm --filter @nop-chaos/amis-debugger build`, and `pnpm --filter @nop-chaos/amis-playground build`.
- Extended the debugger design and implementation direction to support AI-first diagnostics through structured automation APIs instead of UI scraping.
- Added automation-facing concepts to the design: `queryEvents`, `getLatestError`, `waitForEvent`, `createDiagnosticReport`, and `window`-level debugger hub access.
- Updated the package API plan so the debugger can serve both human operators and AI agents during automatic diagnosis and guided debugging.
- Added `packages/amis-debugger/src/index.test.ts` to cover event querying, diagnostic report generation, async event waiting, and global automation hub registration.
- Added a playground-facing reminder that AI tooling can read `window.__NOP_AMIS_DEBUGGER_API__` and `window.__NOP_AMIS_DEBUGGER_HUB__` directly.
- Added structured network summaries to debugger events so AI can read request/response shape without parsing free-form strings.
- Added node-level diagnostics aggregation to the debugger API so AI can inspect one node's recent render/action/api/error history in one call.
- Added a visible AI debug script example card in the playground to demonstrate how agents can call the debugger API from the browser context.
- Added higher-level AI automation APIs for interaction tracing and session export so agents can capture one diagnostic chain or the whole current debugger state as JSON.
- Expanded debugger tests to cover `getInteractionTrace()` and `exportSession()` behavior.
- Added configurable redaction support for exported debugger payloads so AI can analyze structure without leaking obvious secrets.
- Kept exported session data useful by preserving request/response shape metadata while masking sensitive values in `exportedData`.
- Started splitting `packages/amis-debugger/src/index.tsx` into dedicated modules for shared types, diagnostics helpers, redaction logic, and the floating panel UI to reduce the monolithic package entry.
- Next likely step: add focused tests for debugger event collection and refine API response summaries so the network tab shows more useful payload metadata.
