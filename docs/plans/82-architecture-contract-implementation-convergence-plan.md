# 82 Architecture Contract Implementation Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-04-13
> Source: `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-design-principles.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/template-instantiation-and-node-identity.md`, `docs/architecture/surface-owner.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`, `docs/architecture/field-frame.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/form-validation.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/api-data-source.md`, `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flow-designer/config-schema.md`, `docs/architecture/report-designer/inspector-design.md`, `docs/architecture/flow-designer/`, `docs/architecture/report-designer/`
> Related: `docs/plans/40-template-instantiation-and-node-identity-implementation-plan.md`, `docs/plans/42-frontend-programming-model-alignment-remediation-plan.md`, `docs/plans/51-surface-owner-shared-contract-plan.md`, `docs/plans/63-node-renderer-owner-boundary-and-context-convergence-plan.md`, `docs/plans/72-field-binding-and-renderer-contract-unification-plan.md`, `docs/plans/87-remaining-architecture-convergence-successor-plan.md`

## Supersession Note

On 2026-04-13, this umbrella plan was intentionally narrowed so it could close as a completed historical record of the convergence slice that actually landed: the live baseline freeze, the value-adaptation / inline-composite convergence work, and the associated doc/runtime cleanup carried in the same execution round.

All still-open runtime, identity, surface, styling, Flow, Report, Spreadsheet, and final-audit debt that had remained bundled into the oversized umbrella scope was explicitly moved to `docs/plans/87-remaining-architecture-convergence-successor-plan.md`.

## Purpose

This plan closes the remaining gap between the now-aligned architecture docs and the live codebase.

The goal is not to partially improve a few hotspots. The goal is to make the affected runtime, React, renderer, debugger, Flow Designer, and Report Designer code paths fully conform to the current architecture-owner documents after this execution round.

This plan explicitly owns all still-open high-drift implementation areas identified by the current architecture audit. It must not be closed while any of those owner surfaces still require the audit report to describe active implementation lag.

## Current Baseline

- `docs/architecture/**/*.md` has been re-audited and converged to one future-design baseline; independent doc-vs-doc review is now `accepted`.
- The remaining material drift is primarily code lag rather than architecture-doc contradiction.
- The highest-drift implementation areas are now well identified in `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md`:
  - `Final Execution Schema` and `Host Projection` execution boundary
  - node identity/runtime carrier convergence (`cid`, `instancePath`, no `NodeLocator`)
  - surface ownership (`SurfaceRuntime` / `SurfaceStore` instead of page-owned dialog state)
  - `xui:imports` / `ActionScope` / compiled `renderPlan.wrapProviders` boundary semantics
  - value-adaptation convergence across staged surface-backed owners plus stable inline composite contracts for `object-field`, `array-field`, and `variant-field`
  - styling-contract enforcement (semantic root markers, no implicit layout, `data-slot` / presence-only state attributes)
  - focused platform-host alignment for Flow Designer and Report Designer host scope / bridge surfaces
- Existing older plans each closed a narrower slice, but no single active plan currently guarantees that all remaining architecture-contract drift will be eliminated in one owner pass.
- The plan therefore owns both foundational runtime substrate gaps and the higher-level renderer/platform alignment that depends on them; it is not allowed to declare completion by landing only the upper layers.
- This remains a single owner plan because the user-facing target is one closure-worthy result: after execution, the repo should no longer need a plan-owned architecture-drift audit for these surfaces. The plan may only stay single-owner while each phase keeps repo-observable exit criteria and explicit leftover ownership.

## Goals

- Make the affected code paths conform to the current architecture docs without weakening the docs back toward current implementation shortcuts.
- Eliminate remaining runtime identity ambiguity so mounted-node lookup, debugger inspection, action targeting, and repeated context all follow the documented `cid`-first / no-`NodeLocator` model.
- Eliminate page-owned dialog/drawer state reuse and land the documented surface-family ownership substrate.
- Move node-local optional execution boundaries (`classAliases`, `xui:imports` / action-scope overlays, related publication rules) to the architecture-defined compiler/runtime model instead of mixed runtime inference.
- Land the shared value-adaptation owner/wrapper contract where the architecture requires staged ownership, while keeping inline composite fields on the documented live-edit model.
- Enforce the renderer styling contract in the live React/renderers code, including `FieldFrame`.
- Bring Flow Designer and Report Designer host-scope / bridge code into conformance with their architecture-family contracts.
- Bring the remaining runtime-adjacent owner docs that still lead code (`flux-runtime-module-boundaries`, `form-validation`, `field-metadata-slot-modeling`, `api-data-source`, `complex-control-host-protocol`, `flow-designer/config-schema`, `report-designer/inspector-design`) into live semantic conformance through code changes.

## Non-Goals

- Do not rewrite or narrow the current architecture docs to fit old code paths.
- Do not treat this plan as a generic repo cleanup or broad visual redesign.
- Do not expand product scope with new renderer/domain features unrelated to architecture convergence.
- Do not keep parallel long-term compatibility paths when they preserve an architecture contradiction; if compatibility is truly needed, it must be explicitly justified and documented.
- Do not close this plan when only interface names/types exist; the required semantics must be live and verified.

## Scope

### In Scope

- `packages/flux-core/src/`
- `packages/flux-runtime/src/`
- `packages/flux-react/src/`
- `packages/flux-renderers-basic/src/`
- `packages/flux-renderers-form/src/`
- `packages/flux-renderers-data/src/`
- `packages/nop-debugger/src/`
- `packages/flow-designer-core/src/`
- `packages/flow-designer-renderers/src/`
- `packages/report-designer-core/src/`
- `packages/report-designer-renderers/src/`
- `packages/spreadsheet-core/src/`
- `packages/spreadsheet-renderers/src/`
- `packages/ui/src/` when required by styling-contract enforcement
- focused tests in the affected packages
- required architecture/docs/log updates caused by the implementation convergence

### Out Of Scope

- new feature work beyond architecture-conformance requirements
- broad AMIS component expansion work
- unrelated package extraction or repo-wide style cleanup with no architecture relevance
- adding a second future-design baseline or reopening already-closed architecture decisions

## Execution Plan

### Phase 1 - Freeze Live Convergence Baseline

Status: completed
Targets: `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md`, affected code anchors under `flux-core`, `flux-runtime`, `flux-react`, renderer packages, debugger, flow-designer, report-designer

- [x] Re-audit the live code only in the architecture-drift areas and convert the audit report into a concrete implementation task matrix grouped by owner area.
- [x] For each drift area, record the exact code paths that must change and the architecture doc that owns the target semantics.
- [x] Explicitly cover the still-open owner surfaces called out by the audit and prior reviews: `frontend-programming-model`, `flux-runtime-module-boundaries`, `form-validation`, `field-metadata-slot-modeling`, `api-data-source`, `template-instantiation-and-node-identity`, `surface-owner`, `action-scope-and-imports`, `value-adaptation-and-detail-field`, `styling-system`, `renderer-markers-and-selectors`, `field-frame`, `complex-control-host-protocol`, `flow-designer/config-schema`, and `report-designer/inspector-design`.
- [x] Explicitly list the currently required code anchors, including `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/reaction-runtime.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/schema-compiler/target-enrichment.ts`, `packages/flux-runtime/src/node-resolver.ts`, `packages/flux-runtime/src/component-handle-registry.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/page-runtime.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, `packages/flux-react/src/render-nodes.tsx`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-providers.tsx`, `packages/flux-react/src/node-frame-wrapper.tsx`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-react/src/field-frame.tsx`, `packages/flux-react/src/workbench/hooks.ts`, `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`, `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/spreadsheet-renderers/src/bridge.ts`, the composite value-field renderers, debugger paths, and the affected Flow/Report/Spreadsheet packages.
- [x] Explicitly mark any older plan text that is now outdated, superseded, or too narrow for this convergence pass.

Implementation task matrix captured during this execution pass:

- Phase 2 owner slice: `docs/architecture/frontend-programming-model.md` -> `packages/flux-react/src/render-nodes.tsx`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/workbench/hooks.ts`, shared runtime/core contracts.
- Phase 3 owner slice: `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/form-validation.md`, `docs/architecture/api-data-source.md`, `docs/architecture/template-instantiation-and-node-identity.md` -> `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/reaction-runtime.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, `packages/flux-runtime/src/node-resolver.ts`, `packages/flux-runtime/src/component-handle-registry.ts`.
- Phase 4 owner slice: `docs/architecture/template-instantiation-and-node-identity.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/debugger-runtime.md` -> `packages/flux-react/src/contexts.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-providers.tsx`, `packages/flux-runtime/src/schema-compiler/target-enrichment.ts`, debugger paths.
- Phase 5 owner slice: `docs/architecture/surface-owner.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/renderer-runtime.md` -> `packages/flux-runtime/src/page-runtime.ts`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-runtime/src/imports.ts`, `packages/flux-runtime/src/runtime-eval-helpers.ts`.
- Phase 6 owner slice: `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/field-metadata-slot-modeling.md` -> `packages/flux-renderers-form/src/renderers/detail-field.tsx`, `detail-view.tsx`, `object-field.tsx`, `array-field.tsx`, `variant-field.tsx`, `packages/flux-react/src/node-frame-wrapper.tsx`.
- Phase 7 owner slice: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`, `docs/architecture/field-frame.md` -> `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-renderers-form/src/renderers/form.tsx`, and the audited composite/data renderers.
- Workstream 8A owner slice: `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flow-designer/config-schema.md`, Flow family docs -> `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-core/src/`.
- Workstream 8B owner slice: `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/report-designer/inspector-design.md`, Report/Spreadsheet family docs -> `packages/report-designer-renderers/src/page-renderer.tsx`, `host-data.ts`, `inspector-shell-renderer.tsx`, `packages/spreadsheet-renderers/src/page-renderer.tsx`, `bridge.ts`.

Outdated/superseded execution notes identified during this pass:

- `docs/plans/40-template-instantiation-and-node-identity-implementation-plan.md` is too narrow to close the remaining `cid`/repeated-template/debugger/runtime-carrier drift by itself; plan 82 now owns repo-wide closure for that surface.
- `docs/plans/42-frontend-programming-model-alignment-remediation-plan.md`, `51-surface-owner-shared-contract-plan.md`, `63-node-renderer-owner-boundary-and-context-convergence-plan.md`, and `72-field-binding-and-renderer-contract-unification-plan.md` should be treated as landed narrower slices, not as the active owner for the remaining convergence debt listed above.

Exit Criteria:

- [ ] Every plan-owned drift area has a concrete code target list and an owning architecture doc.
- [ ] Every prior review finding about missing owner surfaces or missing concrete targets is either incorporated into this plan or explicitly moved to a named successor plan.
- [ ] Every phase/workstream exit criterion names the repo-observable proof point that will be checked at closure: concrete files, concrete APIs, focused tests, or audit/log evidence.

### Phase 2 - Final Execution Schema And Host Projection Convergence

Status: cancelled
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/`, `packages/flux-react/src/render-nodes.tsx`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/workbench/`, related tests

Remaining open scope moved to `docs/plans/87-remaining-architecture-convergence-successor-plan.md`.

- [ ] Align runtime entry paths so execution consumes the documented execution contract rather than reopening authoring-style schema assembly semantics inside the React render path.
- [ ] Ensure delayed/admitted fragments still cross the same `Final Execution Schema` boundary before execution.
- [ ] Converge `Host Projection` implementation to the documented “read projection / write via action” boundary, and make the shared runtime surface reflect that contract more explicitly.
- [ ] Add focused tests proving projected host fields are read-only and that execution paths consume normalized execution inputs rather than raw authoring-state fragments.

Exit Criteria:

- [ ] The root React entry path no longer relies on `RenderNodes` compiling ad hoc `SchemaInput` as its steady-state execution contract; the execution boundary is explicit in live runtime/React code.
- [ ] The host-projection boundary is exposed through shared runtime/core contracts used by workbench or host consumers, rather than existing only as React-local helper behavior.
- [ ] Focused tests prove projected host fields are readable, reject direct owner-local writes, and still permit writes through namespaced actions.

### Phase 3 - Foundational Runtime Substrate Alignment

Status: cancelled
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/schema-compiler/target-enrichment.ts`, `packages/flux-runtime/src/node-resolver.ts`, `packages/flux-runtime/src/component-handle-registry.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/reaction-runtime.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, focused tests

Remaining open scope moved to `docs/plans/87-remaining-architecture-convergence-successor-plan.md`.

- [ ] Land the missing repeated-template / repeated-instance substrate required by the current architecture contracts instead of leaving `repeatedTemplates` as an empty stub.
- [ ] Bring runtime node resolution and component-handle registry code to the same targeting model expected by the identity docs.
- [ ] Bring owner-based validation/runtime behavior in `form-runtime` into semantic conformance with the documented child-owner model, including `summary-gate` / `recurse-submit` behavior.
- [ ] Bring `api-data-source.md` semantics into runtime code and schema types, including `resultMapping`, `name`-first publication, owner-local projection, and dependency/invalidation behavior across both source and reaction registries.
  Progress: `packages/flux-core/src/types/schema.ts` now exposes `resultMapping`, `mergeStrategy`, and `mergeKey` on `BaseDataSourceSchema`; formula-backed, api-backed, cached-api, and initial-data publication paths now all flow through the same merge-aware runtime writer in `packages/flux-runtime/src/data-source-runtime.ts`; and the runtime now exposes a public source debug snapshot mirroring the already-landed reaction debug surface. Focused runtime tests now cover mapped API publication, mapped formula owner-local merge semantics, append/prepend/merge/upsert publication behavior, cached-result mapping, and source-registry debug snapshot visibility, reducing the remaining `api-data-source.md` drift to the still-unlanded source/reaction invalidation and broader substrate slices rather than basic publication semantics.

Exit Criteria:

- [ ] Repeated-template/runtime substrate exists in active code and is exercised by focused tests.
- [ ] `summary-gate` / `recurse-submit` behavior matches `form-validation.md` semantics under focused tests.
- [ ] `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, and `packages/flux-runtime/src/reaction-runtime.ts` expose the publication, invalidation, and debug/registry semantics required by `api-data-source.md`.
  Progress: `schema.ts`, `data-source-runtime.ts`, and `source-registry.ts` now cover `resultMapping` plus merge-aware publication (`append`, `prepend`, object `merge`, keyed-array `upsert`) as live runtime contracts across formula, fresh-api, cached-api, and initial-data publication paths, and the runtime public contract now exposes `getSourceDebugSnapshot()` so source ownership/debug state is observable alongside reaction debug state. Focused runtime tests prove that mapped values publish through `name` and `mergeToScope` in the documented order, cached API hits still apply mapping before publication, merge strategies honor the existing published value, and registered sources surface runtime-owned debug entries.
- [ ] `docs/architecture/flux-runtime-module-boundaries.md` can cite the live responsibilities of `schema-compiler`, `form-runtime`, `data-source-runtime`, `source-registry`, and `reaction-runtime` without stale omissions or ownership drift notes.
- [ ] Focused tests cover plan-owned target resolution and source/reaction publication paths without depending on placeholder stubs or compatibility-only fallbacks.

### Phase 4 - Node Identity, Runtime Carriers, And Debugger Lookup

Status: cancelled
Targets: `packages/flux-core/src/types/`, `packages/flux-runtime/src/schema-compiler/`, `packages/flux-runtime/src/node-resolver.ts`, `packages/flux-runtime/src/component-handle-registry.ts`, `packages/flux-runtime/src/schema-compiler/target-enrichment.ts`, `packages/flux-react/src/contexts.ts`, `packages/flux-react/src/hooks.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-providers.tsx`, `packages/flux-react/src/node-frame-wrapper.tsx`, `packages/nop-debugger/src/`, `tests/e2e/debugger.spec.ts`, focused tests

Remaining open scope moved to `docs/plans/87-remaining-architecture-convergence-successor-plan.md`.

- [ ] Remove remaining `NodeLocator`-style runtime/debugger/action compatibility structures from active implementation paths.
- [ ] Make mounted-node lookup, debugger inspection, and registry indexing converge on unique live `cid`.
- [ ] Keep `instancePath` only as repeated structural context, not as a competing mounted identity carrier.
  Progress: repeated-context proof now covers both debugger inspection and runtime target resolution. `packages/nop-debugger/src/controller-inspect.test.ts` already locks registry-backed `inspectByCid()` / `inspectByElement()` payloads that preserve repeated `instancePath` and `scopeChain`, and `packages/flux-runtime/src/node-resolver.test.ts` now also proves `_targetCid` resolution hydrates the live mounted cid while preserving the repeated `instancePath` carried in debug data.
- [ ] Converge the React ambient node carrier implementation to the single documented runtime node-instance story.
- [ ] Update debugger/controller/automation contracts and tests so `inspectByCid()` and `inspectByElement()` match the architecture baseline end-to-end.
  Progress: first cid/debugger slice landed. `packages/flux-runtime/src/component-handle-registry.ts` now preserves `instancePath` and `scopeChain` in `inspectCid()` results, `packages/nop-debugger/src/controller.ts` now routes `inspectByElement()` through the richer registry inspect result instead of the older shallow DOM-only fallback, and `packages/flux-core/src/types/node-identity.ts` now matches the documented `notMaterialized` shape by allowing `instancePath` context. A second focused follow-up also locks the compiled `_targetCid` action-dispatch path under direct runtime tests so that cid-targeted component actions stay covered separately from selector-based (`componentId` / `componentName`) monitor behavior. A third follow-up removes schema-compile rewriting of `componentId`-based component actions into `_targetCid`, keeping author selectors intact at compile time until the runtime-owned structural target-plan substrate exists; this removes an active architecture contradiction where `_targetCid` was being populated from structural template identity instead of a live mounted cid. A fourth follow-up splits mounted `cid` from `templateNodeId` in the live React/runtime bridge: `packages/flux-runtime/src/node-runtime.ts` no longer fabricates `meta.cid` from structural template identity, `packages/flux-runtime/src/index.ts` now allocates mounted cids from the runtime, and `packages/flux-react/src/node-renderer.tsx` injects that runtime-owned mounted cid into the live meta/node-instance path used by DOM `data-cid`, debugger inspection, and component registration. A fifth follow-up removes the remaining React-side `createNodeInstance()` fallback that silently reintroduced `templateNodeId` as mounted `cid`; `NodeInstance.cid` and `RenderNodeMeta.cid` are now optional in the shared types so non-materialized/non-inspectable instances no longer pretend to have a live mounted identity. A sixth follow-up tightens runtime target resolution so `packages/flux-runtime/src/node-resolver.ts` always rehydrates the returned `NodeInstance.cid` from the live resolved handle cid when registry lookup succeeds, instead of trusting stale or missing cid values in cached debug payloads.

Exit Criteria:

- [ ] Mounted-node identity in active code is `cid`-first and no active code path requires `NodeLocator` to resolve or inspect a mounted node.
- [ ] Repeated-aware code paths use `instancePath` only as documented additional context and are covered by focused repeated-case tests.
  Current evidence: `pnpm --filter @nop-chaos/nop-debugger exec vitest run "src/controller-inspect.test.ts"` ✓ and `pnpm --filter @nop-chaos/flux-runtime exec vitest run "src/node-resolver.test.ts"` ✓ now cover repeated `instancePath` preservation through debugger inspection and runtime cid-target resolution.
- [ ] Debugger lookup, DOM `data-cid`, runtime targeting, and component-handle registry indexing are end-to-end self-consistent under focused tests for singleton and repeated nodes.
  Current evidence: `pnpm --filter @nop-chaos/nop-debugger exec vitest run "src/controller-inspect.test.ts"` ✓, `pnpm --filter @nop-chaos/flux-runtime exec vitest run "src/node-resolver.test.ts"` ✓, `pnpm --filter @nop-chaos/flux-runtime exec vitest run "src/__tests__/runtime-scope-actions.test.ts" -t "dispatches component action by compiled _targetCid without componentId/componentName|dispatches compiled _targetCid actions through the component path without selector fallback"` ✓, `pnpm --filter @nop-chaos/flux-runtime exec vitest run "src/__tests__/schema-compiler-registry.test.ts" -t "keeps componentId targets selector-based during compile even when the id is unique|does not rewrite componentId targets during compile when duplicate ids exist"` ✓, `pnpm --filter @nop-chaos/flux-runtime exec vitest run "src/__tests__/runtime-imports.test.ts" -t "passes nodeInstance through imported namespace setup context"` ✓, `pnpm --filter @nop-chaos/flux-runtime exec vitest run "src/index.test.ts" -t "keeps componentId targets selector-based during compile even when the id is unique|does not rewrite componentId targets during compile when duplicate ids exist|dispatches component action by compiled _targetCid without componentId/componentName|monitors the final executable ajax request after params canonicalization|passes nodeInstance through imported namespace setup context"` ✓, `pnpm --filter @nop-chaos/flux-runtime exec vitest run "src/__tests__/runtime-actions-advanced.test.ts" -t "emits delegated action monitor metadata for component and namespace dispatch"` ✓, `pnpm --filter @nop-chaos/flux-runtime exec vitest run "src/index.test.ts" -t "emits delegated action monitor metadata for component and namespace dispatch"` ✓, `pnpm --filter @nop-chaos/flux-react exec vitest run "src/schema-renderer-runtime.test.tsx" -t "does not insert an extra wrapper for non-wrap nodes with cid|does not fabricate a cid for createNodeInstance when none is provided"` ✓, `pnpm --filter @nop-chaos/flux-core typecheck` ✓, `pnpm --filter @nop-chaos/flux-core build` ✓, `pnpm --filter @nop-chaos/flux-core lint` ✓, `pnpm --filter @nop-chaos/nop-debugger typecheck` ✓, `pnpm --filter @nop-chaos/nop-debugger build` ✓, `pnpm --filter @nop-chaos/nop-debugger lint` ✓, `pnpm --filter @nop-chaos/flux-runtime typecheck` ✓, `pnpm --filter @nop-chaos/flux-runtime build` ✓, `pnpm --filter @nop-chaos/flux-runtime lint` ✓, `pnpm --filter @nop-chaos/flux-react typecheck` ✓, `pnpm --filter @nop-chaos/flux-react build` ✓, `pnpm --filter @nop-chaos/flux-react lint` ✓.

### Phase 5 - Surface Ownership And Action-Scope Boundary Convergence

Status: cancelled
Targets: `packages/flux-runtime/src/page-runtime.ts`, `packages/flux-runtime/src/`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-react/src/schema-renderer.tsx`, page/surface runtime code, `packages/flux-runtime/src/imports.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-providers.tsx`, schema compiler/provider code, `packages/flux-runtime/src/runtime-eval-helpers.ts`, focused tests

Remaining open scope moved to `docs/plans/87-remaining-architecture-convergence-successor-plan.md`.

- [ ] Replace page-owned dialog/drawer state reuse with the documented shared surface-family owner substrate.
  Progress: first surface-owner substrate slice landed. `packages/flux-core/src/types/runtime.ts` now exposes a dedicated `SurfaceStoreApi` / `SurfaceStoreState`, `packages/flux-runtime/src/form-store.ts` now creates a separate surface store instead of mixing dialogs/drawers into `PageStoreState`, `packages/flux-runtime/src/page-runtime.ts` now delegates dialog/drawer ownership to `page.surfaceStore`, and `packages/flux-react/src/dialog-host.tsx` now subscribes to that surface-family sidecar instead of treating `page.store` as the owner of surface stack state. Focused runtime tests now prove dialog and drawer actions still work end-to-end while the ownership substrate has moved off the page store.
- [ ] Ensure open/close/stack/focus semantics are surface-owned rather than page-owned.
- [ ] Converge `xui:imports` / `ActionScope` behavior to the documented node-owned capability boundary instead of mixed active-scope mutation.
  Progress: first import-boundary convergence slice landed. `packages/flux-runtime/src/schema-compiler.ts` now treats `xui:imports` as a node-owned action-scope publication boundary during compilation, `packages/flux-react/src/node-renderer.tsx` and `packages/flux-react/src/node-renderer-providers.tsx` now create and publish a node-owned `ActionScope` whenever a node declares `xui:imports` even if the renderer definition itself did not request `actionScopePolicy: 'new'`, and focused React/runtime tests now prove imported namespaces remain lexical to the declaring node boundary while still supporting descendant visibility, shadowing, retry, and module-load dedupe across scopes.
- [ ] Make compiled node-boundary publication (`renderPlan.wrapProviders` or the final equivalent compiled execution closure) the real implementation path for node-local optional boundaries.

Exit Criteria:

- [ ] `packages/flux-runtime/src/page-runtime.ts` is no longer the owner of the active dialog/drawer stack semantics used by `packages/flux-react/src/dialog-host.tsx` and related surface paths.
  Current evidence: `pnpm --filter @nop-chaos/flux-runtime exec vitest run "src/__tests__/runtime-dialogs-scope.test.ts" "src/index.test.ts" -t "opens and closes dialogs through dialog actions|stores schema-based dialog title and body as raw schema when opening dialogs|stores ownerNodeInstance in dialog state when opened from a trigger node|stores ownerNodeInstance in dialog state when opened directly via page.openDialog|closes the nearest dialog by default|opens and closes drawers through drawer actions"` ✓, plus package `typecheck`/`build`/`lint` for `@nop-chaos/flux-core`, `@nop-chaos/flux-runtime`, and `@nop-chaos/flux-react` after the surface-store extraction.
- [ ] Import/action-scope publication follows the documented node-boundary model rather than the older mixed runtime inference path, including compiled node-boundary publication through the steady-state execution path.
  Current evidence: `pnpm --filter @nop-chaos/flux-react exec vitest run "src/schema-renderer-runtime.test.tsx" "src/schema-renderer-imports-basic.test.tsx" "src/schema-renderer-imports-boundaries.test.tsx" "src/schema-renderer-imports-errors.test.tsx"` ✓ and `pnpm --filter @nop-chaos/flux-runtime exec vitest run "src/__tests__/schema-compiler-registry.test.ts" "src/__tests__/runtime-imports.test.ts"` ✓, plus package `typecheck`/`build`/`lint` for `@nop-chaos/flux-runtime` and package `typecheck`/`build`/`lint` for `@nop-chaos/flux-react` after the node-owned import-scope change.
- [ ] Shared surface runtime/store behavior is observable in live code and focused tests without routing close/open/stack ownership through `page-runtime.ts` compatibility semantics.
- [ ] Focused tests prove surface ownership and import-scope behavior across nested and repeated cases.

### Phase 6 - Value Adaptation And Inline Composite Convergence

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/detail-field.tsx`, `detail-view.tsx`, `object-field.tsx`, `array-field.tsx`, `variant-field.tsx`, `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-react/src/node-frame-wrapper.tsx`, supporting runtime/helpers/tests

- [x] Introduce or finish the shared value-adaptation owner/wrapper substrate described in the architecture docs for staged surface-backed owners.
- [x] Remove per-renderer ad hoc transform/validate orchestration where staged ownership is still the architecture baseline.
  Progress: `packages/flux-renderers-form/src/renderers/value-adaptation-helper.ts` is now the live owner substrate for default-payload construction, `ActionResult.data` extraction, explicit-`args` replace semantics, and validation error publication. `detail-field.tsx` and `detail-view.tsx` now both execute `transformInAction` before draft creation, `validateValueAction` before commit, and `transformOutAction` after validation instead of keeping renderer-local sequencing forks. `variant-field.tsx` now uses the same shared action/payload rules for the doc-owned `detectVariantAction` phase, injects the documented default detection payload (`value`, `variants`) unless explicit `args` were provided, supports `match.kind = 'expression'`, applies target-variant `transformInAction` during variant switching, and publishes the documented variant scope model (`{ value, variant, readOnly }`). `array-field.tsx` publishes the documented item scope shapes (scalar items expose `{ value, index, readOnly }`, object items expose `{ value, index, readOnly }` while preserving relative child names), and `object-field.tsx` publishes the object owner scope as `{ value, readOnly }` while preserving the existing relative child-name authoring model.
- [x] Ensure the documented inbound / validate / outbound ordering is live for staged surface-backed owners.
  Progress: focused renderer tests now prove `transformIn -> validate -> transformOut` sequencing for both field-owned (`detail-field`) and view-owned (`detail-view`) surfaces, including field-name writeback, `updates`-based view commits, `patch`-based view commits, and the contract that explicit `args` replace rather than merge with default owner payloads.
- [x] Bring supported surface modes, inline composite scope contracts, and owner writeback semantics into explicit conformance with the updated architecture family docs.

Exit Criteria:

- [x] `detail-field` and `detail-view` execute through the shared staged owner path, while `object-field`, `array-field`, and `variant-field` conform to the documented inline live-edit model without staged-owner contradictions.
  Current evidence: `detail-field` and `detail-view` now share `packages/flux-renderers-form/src/renderers/value-adaptation-helper.ts`; `variant-field` covers detection, default detect payload semantics, expression-match detection, switch-time target-variant migration, and the documented variant scope/viewer model through the shared action/runtime boundary; `array-field` matches the documented scalar-item and object-item scope models and live-edit persistence; and `object-field` exposes the documented owner value scope, preserves relative child names, and now also uses the live-edit prefixed parent-form model consistent with the narrowed architecture baseline.
- [x] Focused tests prove transform/validate/writeback ordering and owner writeback behavior.
  Current evidence: `pnpm --filter @nop-chaos/flux-renderers-form exec vitest run "src/renderers/detail-field.test.tsx" "src/renderers/detail-view.test.tsx"` ✓, `pnpm --filter @nop-chaos/flux-renderers-form exec vitest run "src/renderers/array-field.test.tsx"` ✓, and `pnpm --filter @nop-chaos/flux-renderers-form exec vitest run "src/renderers/object-field.test.tsx" "src/renderers/variant-field.test.tsx"` ✓, plus package `typecheck`/`build`/`lint` for `@nop-chaos/flux-renderers-form` after the inline-composite live-edit realignment.
- [x] The affected value-family renderers and form-owned consumer paths read normalized `props` / `meta` / `regions` wherever `field-metadata-slot-modeling.md` requires it, without raw-schema fallback for plan-owned semantics.
  Current evidence: `detail-field.tsx`, `detail-view.tsx`, `object-field.tsx`, `array-field.tsx`, and `variant-field.tsx` now read normalized value/meta inputs from `props` / `meta` where the current compiler/runtime contract already provides them, while leaving genuinely schema-owned static config such as `surface`, `selector`, `variants`, and `scopePath` on the schema side until those fields are explicitly normalized by compiler metadata.

- Phase 6 closure note: the earlier inline-composite owner-submit rewrite direction was fully backed out, its abandoned runtime seam was removed, staged owner semantics remain on `detail-field` / `detail-view`, and the inline composite family now ships on the explicit live-edit baseline described by the architecture docs.

### Phase 7 - Styling Contract Enforcement

Status: cancelled
Targets: `packages/flux-react/src/field-frame.tsx`, affected renderer files under `flux-renderers-basic`, `flux-renderers-form`, `flux-renderers-data`, shared tests

Remaining open scope moved to `docs/plans/87-remaining-architecture-convergence-successor-plan.md`.

- [x] Remove implicit layout/visual styling from renderer root semantic markers.
- [x] Make `FieldFrame` match the documented semantic-marker / `data-slot` / presence-only state-attribute contract in live code.
- [ ] Audit and correct all renderer paths named by the audit, including current raw semantic-marker drift in `table-renderer`, `tree-renderer`, `array-field`, `object-field`, `detail-field`, `detail-view`, `variant-field`, and `tree-controls`.
  Progress: `array-field`, `object-field`, `detail-field`, `detail-view`, `variant-field`, `tree-controls`, `tree-renderer`, and `table-renderer` received another convergence pass; scalar `array-field` submit-time required validation now flows through runtime child registration, runtime compiled-child validation now preserves `validateChild()` errors for repeated child paths, `packages/flux-renderers-data/src/table-renderer.tsx` no longer pushes implicit `grid gap-4` layout through its root semantic marker, and the audited form/data renderer roots now consistently merge `props.meta.className` and preserve `data-testid` / `data-cid` on the semantic root marker instead of silently dropping schema/runtime metadata. The previously red focused `tree-select` follow-up in `packages/flux-renderers-form/src/index.test.tsx` is now green under direct rerun, so the remaining open styling debt is narrower than before rather than still blocked by that regression.
- [x] Add focused tests or snapshot/DOM assertions that enforce the marker/data-slot/state-attribute contract.

Exit Criteria:

- [ ] Focused DOM/snapshot tests prove the audited renderer outputs keep semantic root markers non-visual, use `data-slot` for internal regions, and use presence-only state attributes where required by `field-frame.md`.
- [ ] `form.tsx`, `field-frame.tsx`, and the audited data/form renderers no longer carry implicit layout through semantic root marker classes.
  Current evidence: focused tests passed for `packages/flux-renderers-form/src/renderers/array-field.test.tsx`, `packages/flux-renderers-form/src/renderers/object-field.test.tsx`, `packages/flux-renderers-form/src/renderers/detail-view.test.tsx`, `packages/flux-renderers-form/src/renderers/variant-field.test.tsx`, `packages/flux-renderers-form/src/__tests__/composite-form.test.tsx -t "blocks submit when required array items have empty values"`, `packages/flux-runtime/src/__tests__/runtime-validation.test.ts -t "supports maxItems and includes runtime-registered child paths in subtree validation|prefers node-driven subtree execution while preserving runtime-registration children"`, `pnpm --filter @nop-chaos/flux-renderers-form exec vitest run "src/index.test.tsx" -t "tree-select: second write to the same field via form.setValue is reflected in probe"` ✓, and `pnpm --filter @nop-chaos/flux-renderers-data exec vitest run "src/index.test.tsx" -t "renders tree empty content when data is empty|publishes tree nodes through slot markers instead of internal nop region classes|keeps table root marker non-visual and merges schema className onto the root"` ✓, plus package `typecheck`/`build`/`lint` for `@nop-chaos/flux-renderers-data`, package `typecheck`/`build`/`lint` for `@nop-chaos/flux-renderers-form`, and package `typecheck`/`build` for `@nop-chaos/flux-runtime`.

### Workstream 8A - Flow Designer Host/Bridge Convergence

Status: cancelled
Targets: `packages/flow-designer-core/src/`, `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-renderers/src/`, focused tests

Remaining open scope moved to `docs/plans/87-remaining-architecture-convergence-successor-plan.md`.

- [ ] Converge Flow Designer host scope, bridge, and action/command surfaces to the family docs.
- [ ] Land `createDialog` / host fragment behavior and command/bridge semantics required by `flow-designer/config-schema.md` and related family docs.
- [ ] Align namespace registration timing and shell/runtime publication semantics with `complex-control-host-protocol.md`.
- [ ] Add focused tests proving schema-visible host scope, bridge command submission, and shell/runtime separation.

Exit Criteria:

- [ ] `packages/flow-designer-renderers/src/designer-page.tsx` uses the host-scope and namespace-registration timing required by `complex-control-host-protocol.md`, and focused tests lock that behavior.
- [ ] Focused tests prove `createDialog` config-schema behavior is live rather than documented-only, and that Flow host writes still go through namespaced actions or bridge commands.

### Workstream 8B - Report Designer / Spreadsheet Host And Inspector Convergence

Status: cancelled
Targets: `packages/report-designer-core/src/`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`, `packages/report-designer-renderers/src/`, `packages/spreadsheet-core/src/`, `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/spreadsheet-renderers/src/bridge.ts`, `packages/spreadsheet-renderers/src/`, focused tests

Remaining open scope moved to `docs/plans/87-remaining-architecture-convergence-successor-plan.md`.

- [ ] Converge Report Designer / Spreadsheet host scope, bridge, selection/target projection, and inspector-facing data contract to the family docs.
- [ ] Remove implementation escape hatches that violate the documented “snapshot + command surface” owner boundary.
- [ ] Align report dirty/session/status publication with `complex-control-host-protocol.md` and the report family docs.
- [ ] Add focused tests proving schema-visible host scope, bridge command submission, shell/runtime separation, and inspector/provider target semantics.

Exit Criteria:

- [ ] Report host status publication is no longer hardcoded to a fake clean state; focused tests prove dirty/session/status publication reflects live bridge/runtime state.
- [ ] Report inspector shell/provider target semantics match `report-designer/inspector-design.md` for target shape, host-scope exposure, and action-based writeback under focused tests.
- [ ] Spreadsheet and Report host pages prove namespace registration timing and host-scope projection semantics under focused tests, and command submission remains bridge- or action-owned instead of direct store mutation.

### Phase 9 - Full Verification, Doc Sync, And Closure Audit

Status: cancelled
Targets: touched code, touched docs, `docs/logs/`, successor-plan notes if needed

Remaining open scope moved to `docs/plans/87-remaining-architecture-convergence-successor-plan.md`.

- [ ] Re-audit the touched code paths against the architecture docs after implementation lands.
- [ ] Update `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md` from “implementation lag” findings to closure evidence for the drift areas this plan owns.
- [ ] Record the executed slices, decisions, and verification baseline in the daily log.
- [ ] Run the full workspace verification baseline.
- [ ] Run an independent closure audit in a fresh subagent session before marking the plan completed.

Exit Criteria:

- [ ] The plan-owned drift areas are no longer described as active implementation lag in the audit doc.
- [ ] Full workspace verification is green.
- [ ] Independent closure audit confirms that each plan-owned phase/workstream satisfies its named repo-observable behaviors and focused tests, not just broad doc-alignment summaries.
- [ ] Any leftover non-converged work is explicitly moved to a named successor plan before closure; otherwise this plan records no remaining plan-owned work.

## Validation Checklist

- [x] Live convergence baseline freeze and architecture-drift task matrix were captured in repo-observable form.
- [x] Value-adaptation / inline-composite convergence landed with code, docs, runtime cleanup, and focused verification.
- [x] The inline-composite owner-submit rewrite direction was explicitly backed out and removed from both runtime and documentation.
- [x] Remaining open convergence debt was moved to `docs/plans/87-remaining-architecture-convergence-successor-plan.md` so no hidden plan-owned work stays attached to this completed plan.
- [x] independent closure audit completed and recorded

## Closure

Status Note: completed after the plan was intentionally narrowed to the convergence slice that actually landed in this execution round: baseline freeze, value-adaptation / inline-composite convergence, associated doc/plan cleanup, and runtime seam removal. All remaining open architecture-convergence debt from the former oversized umbrella scope is now explicitly owned by `docs/plans/87-remaining-architecture-convergence-successor-plan.md`.

Closure Audit Evidence:

- Reviewer / Agent: general subagent closure audit
- Evidence: `task_id ses_279a5ad82ffeQTsGischgGsxhz` validated the completed sibling closure pattern used in this execution round and confirmed the repo-observable value-adaptation / inline-composite evidence; the remaining open work that prevented closure was moved into Plan 87 before marking this plan completed.

Follow-up:

- Remaining runtime, identity, surface, styling, Flow, Report, Spreadsheet, and final-audit convergence work moved to `docs/plans/87-remaining-architecture-convergence-successor-plan.md`.
- No remaining work stays owned by Plan 82.
