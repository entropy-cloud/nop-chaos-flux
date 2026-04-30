# 87 Remaining Architecture Convergence Successor Plan

> Plan Status: completed
> Last Reviewed: 2026-04-14
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/82-architecture-contract-implementation-convergence-plan.md`, `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/form-validation.md`, `docs/architecture/api-data-source.md`, `docs/architecture/template-instantiation-and-node-identity.md`, `docs/architecture/surface-owner.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`, `docs/architecture/field-frame.md`, `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flow-designer/config-schema.md`, `docs/architecture/report-designer/inspector-design.md`
> Related: `docs/plans/82-architecture-contract-implementation-convergence-plan.md`

## Purpose

Own the remaining open architecture-convergence debt that was previously mixed into the oversized umbrella scope of Plan 82.

This successor exists so Plan 82 can close as a completed historical record of the baseline freeze plus value-adaptation / inline-composite convergence slice, while the still-open runtime, identity, surface, styling, and platform-host work keeps one explicit owner.

## Current Baseline

- Plan 82 Phase 1 and Phase 6 are complete and already reflected in the live repo.
- The remaining open work from the old umbrella scope is still real, but it is no longer helpful to keep it attached to a plan whose completed slice is now closure-ready.
- The still-open implementation lag is the same debt already identified in `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md`: `Final Execution Schema` / `Host Projection`, foundational runtime substrate, node identity/runtime carriers, surface ownership/import boundaries, styling-contract enforcement, and Flow/Report host-bridge alignment.

## Goals

- Converge the remaining runtime/React execution boundaries with the current architecture docs.
- Finish the still-open identity, surface-ownership, styling, and platform-host alignment that Plan 82 no longer owns.
- Provide the closure audit and full-verification path for the remaining architecture-drift backlog.

## Non-Goals

- Do not reopen the already-landed Phase 6 decision that `object-field`, `array-field`, and `variant-field` are inline live-edit controls by default.
- Do not treat this successor as a generic repo cleanup plan.
- Do not silently inherit closed scope from Plan 82; only the explicitly listed remaining debt belongs here.

## Scope

### In Scope

- Remaining open scope previously described by Plan 82 Phase 2, Phase 3, Phase 4, Phase 5, Phase 7, Workstream 8A, Workstream 8B, and Phase 9
- Required code/docs/tests across `packages/flux-core`, `packages/flux-runtime`, `packages/flux-react`, renderer packages, debugger, Flow Designer, Report Designer, Spreadsheet, and affected docs/logs

### Out Of Scope

- Re-litigating the completed Plan 82 Phase 6 ownership baseline
- New product features outside architecture-conformance work

## Execution Plan

### Workstream 1 - Execution Boundary And Host Projection

Status: completed
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/`, `packages/flux-react/src/render-nodes.tsx`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/workbench/`, related tests

- [x] Finish the `Final Execution Schema` boundary convergence.
      Progress: `packages/flux-react/src/schema-renderer.tsx` now compiles the root schema once through `runtime.compile(...)` and passes the resulting `CompiledTemplate` into `RenderNodes`, while `packages/flux-react/src/__tests__/schema-renderer-runtime-core.test.tsx` intercepts the `RenderNodes` boundary to prove the root input is already normalized before fragment rendering begins.
- [x] Finish `Host Projection` shared-contract convergence.
      Progress: the first substrate slice is now landed. `RendererRuntime` exposes `createHostProjectionScope(...)` as a shared runtime contract, `packages/flux-runtime/src/index.ts` owns the projected-host readonly/write-guard behavior that previously existed only inside `packages/flux-react/src/workbench/hooks.ts`, and `useHostScope()` now delegates to that runtime surface instead of inlining the contract locally.
- [x] Add focused tests covering projected host read/write semantics and normalized execution inputs.
      Progress: direct shared-runtime coverage is now live in `packages/flux-runtime/src/index.test.ts`, and the existing React workbench coverage in `packages/flux-react/src/workbench/hooks.test.tsx` still passes against the extracted runtime-owned Host Projection contract.
      Progress: root-boundary normalization coverage is now live in `packages/flux-react/src/__tests__/schema-renderer-runtime-core.test.tsx`, which proves `SchemaRenderer` hands a `CompiledTemplate` to `RenderNodes` instead of relying on `RenderNodes` to compile raw root schema input.

Exit Criteria:

- [x] The root execution path no longer depends on ad hoc `SchemaInput` compilation as the steady-state runtime contract.
- [x] `Host Projection` is exposed as an explicit shared runtime/core boundary rather than mostly a React-local helper surface.
      Current evidence: `packages/flux-core/src/types/renderer-core.ts` and `packages/flux-runtime/src/index.ts` now expose `createHostProjectionScope(...)`, `packages/flux-react/src/workbench/hooks.ts` delegates to that shared runtime boundary instead of owning the projected-field write-guard logic locally, `packages/flux-runtime/src/index.test.ts` locks direct runtime-level replace/write-guard semantics, and `packages/flux-react/src/workbench/hooks.test.tsx` still proves the same contract through the React hook surface.

### Workstream 2 - Runtime, Identity, And Surface Ownership

Status: completed
Targets: `packages/flux-runtime/src/`, `packages/flux-react/src/`, `packages/nop-debugger/src/`, focused tests

- [x] Finish the remaining foundational runtime substrate alignment from old Plan 82 Phase 3.
      Progress: focused runtime and renderer evidence now closes the remaining owner-doc parity gap for sources/reactions. `packages/flux-runtime/src/__tests__/runtime-sources*.test.ts`, `runtime-reactions.test.ts`, and `source-reaction-dependencies.test.ts` already lock scope-scoped registration, replacement, explicit `dependsOn`, result mapping, `mergeToScope`, `statusPath`, refresh-by-name/id, debug snapshots, and bounded reaction scheduling; the latest pass adds explicit evidence that reactions dispatch only after the triggering write settles and that renderer-mounted `data-source` nodes preserve named `mergeToScope` publication through the live React lifecycle.
- [x] Finish the remaining `cid`-first / no-`NodeLocator` identity convergence from old Plan 82 Phase 4.
      Progress: live package code no longer contains `NodeLocator` references, the debugger inspect path is verified against `cid` plus optional `instancePath`, and the stale audit wording that still described active locator-based runtime/debugger/action paths has been narrowed to the real remaining drift.
- [x] Finish the remaining surface-owner and import/action-scope boundary convergence from old Plan 82 Phase 5.
      Progress: the clean-slate surface-owner extraction is now landed. `packages/flux-runtime/src/surface-runtime.ts` owns a shared `SurfaceRuntime` with one unified `entries` stack, `PageRuntime` is back to page-shell concerns only, built-in dialog/drawer actions route through `ActionContext.surfaceRuntime`, and `packages/flux-react/src/dialog-host.tsx` consumes `SurfaceContext` instead of reading a page-owned surface store.
      Progress: `packages/flux-runtime/src/schema-compiler.ts` now carries compiler-owned provider metadata into `TemplateNode` and preserves the compiled `wrapProviders` closure; `packages/flux-react/src/node-renderer-providers.tsx` now executes that closure directly instead of re-deriving publication from live schema/component policy or hand-assembling the wrapper stack.

Exit Criteria:

- [x] Runtime/data-source/reaction semantics match the current owner docs under focused tests.
- [x] Mounted-node lookup, debugger inspection, DOM `data-cid`, and runtime targeting converge on the live `cid` model.
- [x] Surface open/close/stack behavior and import/action-scope publication match the documented runtime boundaries.

### Workstream 3 - Styling Contract Enforcement

Status: completed
Targets: `packages/flux-react/src/field-frame.tsx`, affected renderer files, shared tests

- [x] Finish the remaining renderer styling-contract audit from old Plan 82 Phase 7.
      Progress: the live audit baseline is now narrower and aligned with the current requirement that renderers may provide semantically implied baseline structure, but internal non-semantic wrapper markers and inconsistent class merging still need cleanup. The first landed slice updated `packages/flux-renderers-basic/src/tabs.tsx` to use `data-slot` for internal tab root/content structure instead of extra `nop-tabs-*` classes, and normalized the touched basic renderers (`page`, `container`, `flex`, `text`, `icon`, `dynamic-renderer`, `scope-debug`) onto `cn()`. A second slice removed the leftover `nop-cb-item` / `nop-cb-group` internal markers from the condition-builder implementation in favor of `data-slot="condition-item"` and `data-slot="condition-group"`. A third slice added a focused renderer-level marker regression test in `packages/flux-renderers-form/src/renderers/condition-builder/config-markers.test.tsx`, aligned that test with the live root marker plus `data-slot` contract, and normalized the remaining condition-builder segmented-toggle state classes in `ConditionGroup.tsx` onto `cn()`. A fourth slice removed the React host-only `nop-dialog-card` / `nop-drawer-card` internal classes from `packages/flux-react/src/dialog-host.tsx` in favor of `data-slot="dialog-surface"` and `data-slot="drawer-surface"`. A fifth slice normalized the remaining conditional class merges in `packages/flux-renderers-data/src/table-renderer.tsx` onto `cn()` and expanded focused slot coverage for the table/tree renderer family. A sixth slice normalized the report/flow toolbar and report inspector roots onto `cn()` (`packages/report-designer-renderers/src/report-designer-toolbar.tsx`, `report-designer-inspector.tsx`, `packages/flow-designer-renderers/src/designer-toolbar.tsx`) while keeping the semantic root markers and tightening focused assertions around those markers in the corresponding test files. A seventh slice normalized `designer-inspector`, `designer-palette`, and the `designer-page` shell root onto `cn()`, replaced the remaining raw `label` / `textarea` usage in `designer-inspector` with `Label` / `Textarea` from `@nop-chaos/ui`, and kept focused flow renderer tests green across toolbar, palette, inspector, status publication, and live xyflow intent retention. An eighth slice replaced the remaining raw `label` usage in `designer-field.tsx` and the toolbar switch branch with `Label`, and removed the internal `nop-designer-node-toolbar` marker from `DesignerXyflowNode.tsx` in favor of `data-slot="designer-node-toolbar"` under focused xyflow coverage. A ninth slice removed the last raw palette `<button>` elements in `designer-palette.tsx` in favor of `Button` from `@nop-chaos/ui`, while focused tests now assert the palette item action surface is carried by shadcn button markers instead of raw button markup. A tenth slice removed the remaining raw button usage from the live data/tree family (`table-renderer.tsx`, `tree-renderer.tsx`) in favor of `Button`, and normalized the `spreadsheet-page` root onto `cn()` while extending focused spreadsheet integration coverage for the page root/header/body markers. An eleventh slice aligned the runtime-owned composite form editors (`array-editor`, `key-value`, `tag-list`) with the field slot contract by replacing their direct `<label>` wrapper roots with non-label roots and explicit `data-slot="field-control"` containers, then locked that shape under focused composite form tests. A twelfth slice pushed the same cleanup deeper into the remaining form controls by removing raw button usage from live `condition-builder` and `tree-controls`, replacing radio/checkbox option labels with `Label`, and aligning the embedded/picker `condition-builder` roots with explicit `field-control` slots under focused tests. A thirteenth slice normalized the live `WordEditorPage` shell root onto `cn()` and added focused page-level coverage for the semantic `.nop-word-editor` marker.
- [x] Add/finish focused DOM assertions that lock the semantic-marker / `data-slot` / presence-only state-attribute contract.
      Progress: focused assertions now cover the basic tabs plus page/container/scope-debug internal structure in `packages/flux-renderers-basic/src/__tests__/basic-page-layout.test.tsx` and `basic-reactions.test.tsx`, the condition-builder root plus `condition-group` / `condition-item` markers and `field-control` slot in `packages/flux-renderers-form/src/renderers/condition-builder/config-markers.test.tsx`, the `FieldFrame` root/state/slot contract in `packages/flux-react/src/frame-slot-meta.test.tsx`, the dialog/drawer host surface markers in the same React test file, the data table/tree/chart root plus internal slot structure and button affordances in `packages/flux-renderers-data/src/__tests__/data-table.test.tsx` and `data-tree-and-chart.test.tsx`, the form root plus tree-control slot structure in `packages/flux-renderers-form/src/__tests__/form-validation-ui.test.tsx` and `form-tree-checkbox-fields.test.tsx`, the composite/detail form renderer family (`array-field`, `object-field`, `variant-field`, `detail-field`, `detail-view`) plus the runtime-owned composite editors (`array-editor`, `key-value`, `tag-list`) in their focused form tests, the flow-designer shared entry surfaces (`DesignerIcon`, palette group/item structure, palette button markers, toolbar root marker, inspector root marker, node-toolbar slot contract) in `packages/flow-designer-renderers/src/index.test.tsx`, `index.xyflow.test.tsx`, and `designer-controls.test.tsx`, the spreadsheet page root/header/body surfaces in `packages/spreadsheet-renderers/src/renderers.integration.test.tsx`, the word-editor page shell root in `packages/word-editor-renderers/src/__tests__/word-editor-page.test.tsx`, and the report-designer page/toolbar/inspector/field-panel surfaces in `packages/report-designer-renderers/src/*.test.tsx`, but a broader cross-renderer pass is still open.

Exit Criteria:

- [x] Audited renderers keep semantic baseline structure where it is renderer-owned behavior, while redundant internal marker classes and inconsistent marker/class-merge patterns are removed.
- [x] Focused tests prove the documented semantic-marker and slot/state-attribute contract.

Additional Evidence (2026-04-14): `packages/flow-designer-renderers/src/designer-xyflow-canvas/render-ports.tsx` now uses `cn(defaultHandleClass, port.appearance?.className)` instead of template-string class assembly, and `packages/flow-designer-renderers/src/canvas-bridge.test.tsx` locks the xyflow port-handle default/custom class contract under focused tests. `packages/flux-renderers-form/src/renderers/condition-builder/ValueInput.tsx` also replaces the remaining raw multi-select add control with `NativeSelect` / `NativeSelectOption` from `@nop-chaos/ui`, while `value-input.test.tsx` now proves the add control exposes the shared `data-slot="native-select-wrapper"` and `data-slot="native-select"` markers and preserves the add/remove multi-select behavior. A final low-risk cleanup slice also removes the remaining template-string class assembly in `packages/nop-debugger/src/panel/node-tab.tsx` and `panel/timeline-tab.tsx`, with focused tests proving the node tree still marks the selected entry via the `selected` class and the timeline errors-only toggle still applies `ndbg-errors-only-toggle` plus `data-active` when enabled.

Closure Note (2026-04-14): the final independent styling closure audit found one last real blocker cluster in `packages/nop-debugger/src/`. That blocker is now closed: the minimized debugger surface uses `data-panel-state="minimized"` instead of a `nop-*` modifier class, inspect overlays use `data-overlay-state="hover" | "active"` instead of `nop-*` state classes, the remaining debugger `button` / `input` controls now use `@nop-chaos/ui` primitives, `network-tab.tsx` no longer assembles status classes with a template string, and focused debugger tests now cover the minimized panel, overlay markers, selected node entry, and errors-only toggle. The remaining production raw-input exceptions are accepted owner-doc exceptions only: spreadsheet canvas edit inputs stay on the perf-first canvas boundary and word-editor `type="file"` / `type="color"` controls remain special semantic inputs.

### Workstream 4 - Flow And Report Host Convergence

Status: completed
Targets: `packages/flow-designer-*`, `packages/report-designer-*`, `packages/spreadsheet-*`, focused tests

- [x] Finish the remaining Flow Designer host/bridge alignment from old Plan 82 Workstream 8A.
- [x] Finish the remaining Report Designer / Spreadsheet host and inspector alignment from old Plan 82 Workstream 8B.

Progress:

- Flow Designer host wiring is now closer to the shared host protocol baseline: `packages/flow-designer-renderers/src/designer-page.tsx` no longer relies on the generic helper for namespace wiring and instead registers the `designer` namespace directly in `useLayoutEffect`, matching the family-doc requirement that page-level complex-control namespaces publish before downstream layout effects consume them.
- Flow Designer `createDialog` semantics are now wired through the live host path instead of stopping at config-only documentation: `packages/flow-designer-renderers/src/designer-palette.tsx` now routes `createDialog`-configured node types through `openCreateDialog(...)` rather than immediate `addNode`, while `packages/flow-designer-renderers/src/designer-page.tsx` owns the pending create-dialog state, renders `createDialog.body` with the designer host `scope` / `actionScope`, and only dispatches `addNode` after confirm (optionally merging object data returned from `createDialog.submitAction`). Focused tests in `packages/flow-designer-renderers/src/designer-controls.test.tsx` and `index.xyflow.test.tsx` now prove that palette clicks open the dialog first and that the node count stays unchanged until the confirm action runs.
- Spreadsheet host wiring is now aligned with the same page-level namespace timing rule: `packages/spreadsheet-renderers/src/page-renderer.tsx` now registers the `spreadsheet` namespace in `useLayoutEffect` instead of `useEffect`, so spreadsheet-page no longer lags the shared complex-control host protocol on action publication timing.
- Spreadsheet host projection is now closer to the documented stable read surface: `packages/spreadsheet-renderers/src/page-renderer.tsx` still publishes the nested `spreadsheet` snapshot, but now also aliases `workbook`, `activeSheet`, `selection`, `activeCell`, `activeRange`, and `runtime` at the host-scope top level. Focused integration coverage in `packages/spreadsheet-renderers/src/renderers.integration.test.tsx` now proves toolbar/body schema can read both the legacy nested `spreadsheet.*` path and the documented top-level aliases for `activeSheet` and `runtime.readonly`.
- Report Designer host status publication is now closer to the documented host/session contract: `packages/report-designer-core/src/types.ts` and `core.ts` now expose an explicit `dirty` field on `ReportDesignerRuntimeSnapshot`, and `packages/report-designer-renderers/src/page-renderer.tsx` now publishes `statusPath` summaries from that runtime-owned `dirty` snapshot instead of hardcoding `dirty: false`.
- Report Designer host projection is now aligned with that same runtime-owned dirty contract: `packages/report-designer-renderers/src/host-data.ts` no longer hardcodes `runtime.dirty: false`, and focused coverage in `packages/report-designer-renderers/src/renderers.integration.test.tsx` now proves schema fragments mounted under the report host scope observe `runtime.dirty` flipping from `false` to `true` after a `report-designer:updateMeta` mutation.
- Report Designer host projection is also closer to the documented inspector-shell read model: `packages/report-designer-renderers/src/host-data.ts` now aliases the live selection target as both `selection` and `target` in addition to `selectionTarget`, and focused integration coverage now proves schema mounted under the report designer host scope observes that alias changing from the default `sheet` target to `workbook` after `report-designer:openInspector` retargeting.
- Report Designer page ownership is now closer to the documented shared spreadsheet-host model: `packages/report-designer-renderers/src/page-renderer.tsx` now creates the spreadsheet core/bridge at the page boundary, registers a page-level `spreadsheet` namespace alongside `report-designer`, threads the live spreadsheet snapshot into report host scope construction, and passes the shared bridge down into `ReportSpreadsheetCanvas` instead of letting the canvas create a private spreadsheet runtime. Focused coverage in `packages/report-designer-renderers/src/renderers.integration.test.tsx` now proves toolbar schema inside `report-designer-page` can dispatch `spreadsheet:setCellValue` and observe the resulting value through the shared report host scope.
- Focused tests now lock the live host summary contract for the report family: `packages/report-designer-core/src/__tests__/designer-core.test.ts` proves `dirty` flips on metadata edits and clears after undo, while `packages/report-designer-renderers/src/renderers.integration.test.tsx` proves `statusPath` publishes `clean` then `dirty` after a `report-designer:updateMeta` mutation.

Exit Criteria:

- [x] Flow host scope, command/bridge, and `createDialog` semantics match the family docs under focused tests.
- [x] Report/Spreadsheet host projection, dirty/session/status publication, and inspector semantics match the family docs under focused tests.

### Workstream 5 - Final Audit And Verification

Status: completed
Targets: touched code/docs/tests, `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md`, `docs/logs/`

- [x] Re-audit the remaining drift areas after implementation lands.
- [x] Update the architecture audit from open lag to closure evidence for the work owned by this successor.
- [x] Run full verification and an independent closure audit before closing this successor.

Exit Criteria:

- [x] The successor-owned drift areas are no longer described as active implementation lag in the audit doc.
- [x] Full workspace verification and an independent closure audit are recorded.

## Validation Checklist

- [x] `Final Execution Schema` and `Host Projection` behavior conform to the architecture baseline
- [x] Runtime/data-source/reaction semantics match the current owner docs
- [x] `NodeLocator` is absent from active runtime/debugger/action implementation paths
- [x] Mounted-node lookup, debugger, DOM `data-cid`, and registry converge on unique live `cid`
- [x] Dialog/drawer/surface behavior conforms to the surface-owner contract
- [x] `xui:imports` / action-scope publication follows the documented node-boundary model
- [x] Live renderers conform to the semantic-marker / no-implicit-layout styling contract
- [x] Flow Designer host/bridge behavior conforms to the family docs
- [x] Report Designer host/bridge behavior conforms to the family docs
- [x] `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md` is updated to closure evidence for this successor-owned scope
- [x] `docs/logs/` updated with execution notes and closure evidence
- [x] independent closure audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: completed after the remaining runtime, identity, surface, styling, and platform-host convergence debt inherited from Plan 82 was landed and independently audited.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit session
- Evidence: re-audit confirmed Workstream 3 is closure-ready after the final debugger selector/state cleanup and after accepted exceptions were narrowed to spreadsheet canvas perf-first internals plus word-editor `file` / `color` controls; Workstream 4 host-family convergence remains landed; full workspace verification (`pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`) is recorded in the execution log.

Follow-up:

- Follow-on work, if any, should be tracked under narrower successor plans instead of reopening this closed umbrella.
