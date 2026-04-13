# 82 Architecture Contract Implementation Convergence Plan

> Plan Status: planned
> Last Reviewed: 2026-04-13
> Source: `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-design-principles.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/template-instantiation-and-node-identity.md`, `docs/architecture/surface-owner.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`, `docs/architecture/field-frame.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/form-validation.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/api-data-source.md`, `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flow-designer/config-schema.md`, `docs/architecture/report-designer/inspector-design.md`, `docs/architecture/flow-designer/`, `docs/architecture/report-designer/`
> Related: `docs/plans/40-template-instantiation-and-node-identity-implementation-plan.md`, `docs/plans/42-frontend-programming-model-alignment-remediation-plan.md`, `docs/plans/51-surface-owner-shared-contract-plan.md`, `docs/plans/63-node-renderer-owner-boundary-and-context-convergence-plan.md`, `docs/plans/72-field-binding-and-renderer-contract-unification-plan.md`

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
  - value-adaptation owner/wrapper convergence across `detail-field`, `detail-view`, `object-field`, `array-field`, `variant-field`
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
- Land the shared value-adaptation owner/wrapper contract for the composite value field family.
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

Status: planned
Targets: `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md`, affected code anchors under `flux-core`, `flux-runtime`, `flux-react`, renderer packages, debugger, flow-designer, report-designer

- [ ] Re-audit the live code only in the architecture-drift areas and convert the audit report into a concrete implementation task matrix grouped by owner area.
- [ ] For each drift area, record the exact code paths that must change and the architecture doc that owns the target semantics.
- [ ] Explicitly cover the still-open owner surfaces called out by the audit and prior reviews: `frontend-programming-model`, `flux-runtime-module-boundaries`, `form-validation`, `field-metadata-slot-modeling`, `api-data-source`, `template-instantiation-and-node-identity`, `surface-owner`, `action-scope-and-imports`, `value-adaptation-and-detail-field`, `styling-system`, `renderer-markers-and-selectors`, `field-frame`, `complex-control-host-protocol`, `flow-designer/config-schema`, and `report-designer/inspector-design`.
- [ ] Explicitly list the currently required code anchors, including `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/reaction-runtime.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/schema-compiler/target-enrichment.ts`, `packages/flux-runtime/src/node-resolver.ts`, `packages/flux-runtime/src/component-handle-registry.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/page-runtime.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, `packages/flux-react/src/render-nodes.tsx`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-providers.tsx`, `packages/flux-react/src/node-frame-wrapper.tsx`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-react/src/field-frame.tsx`, `packages/flux-react/src/workbench/hooks.ts`, `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`, `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/spreadsheet-renderers/src/bridge.ts`, the composite value-field renderers, debugger paths, and the affected Flow/Report/Spreadsheet packages.
- [ ] Explicitly mark any older plan text that is now outdated, superseded, or too narrow for this convergence pass.

Exit Criteria:

- [ ] Every plan-owned drift area has a concrete code target list and an owning architecture doc.
- [ ] Every prior review finding about missing owner surfaces or missing concrete targets is either incorporated into this plan or explicitly moved to a named successor plan.
- [ ] Every phase/workstream exit criterion names the repo-observable proof point that will be checked at closure: concrete files, concrete APIs, focused tests, or audit/log evidence.

### Phase 2 - Final Execution Schema And Host Projection Convergence

Status: planned
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/`, `packages/flux-react/src/render-nodes.tsx`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/workbench/`, related tests

- [ ] Align runtime entry paths so execution consumes the documented execution contract rather than reopening authoring-style schema assembly semantics inside the React render path.
- [ ] Ensure delayed/admitted fragments still cross the same `Final Execution Schema` boundary before execution.
- [ ] Converge `Host Projection` implementation to the documented “read projection / write via action” boundary, and make the shared runtime surface reflect that contract more explicitly.
- [ ] Add focused tests proving projected host fields are read-only and that execution paths consume normalized execution inputs rather than raw authoring-state fragments.

Exit Criteria:

- [ ] The root React entry path no longer relies on `RenderNodes` compiling ad hoc `SchemaInput` as its steady-state execution contract; the execution boundary is explicit in live runtime/React code.
- [ ] The host-projection boundary is exposed through shared runtime/core contracts used by workbench or host consumers, rather than existing only as React-local helper behavior.
- [ ] Focused tests prove projected host fields are readable, reject direct owner-local writes, and still permit writes through namespaced actions.

### Phase 3 - Foundational Runtime Substrate Alignment

Status: planned
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/schema-compiler/target-enrichment.ts`, `packages/flux-runtime/src/node-resolver.ts`, `packages/flux-runtime/src/component-handle-registry.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/reaction-runtime.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, focused tests

- [ ] Land the missing repeated-template / repeated-instance substrate required by the current architecture contracts instead of leaving `repeatedTemplates` as an empty stub.
- [ ] Bring runtime node resolution and component-handle registry code to the same targeting model expected by the identity docs.
- [ ] Bring owner-based validation/runtime behavior in `form-runtime` into semantic conformance with the documented child-owner model, including `summary-gate` / `recurse-submit` behavior.
- [ ] Bring `api-data-source.md` semantics into runtime code and schema types, including `resultMapping`, `name`-first publication, owner-local projection, and dependency/invalidation behavior across both source and reaction registries.

Exit Criteria:

- [ ] Repeated-template/runtime substrate exists in active code and is exercised by focused tests.
- [ ] `summary-gate` / `recurse-submit` behavior matches `form-validation.md` semantics under focused tests.
- [ ] `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, and `packages/flux-runtime/src/reaction-runtime.ts` expose the publication, invalidation, and debug/registry semantics required by `api-data-source.md`.
- [ ] `docs/architecture/flux-runtime-module-boundaries.md` can cite the live responsibilities of `schema-compiler`, `form-runtime`, `data-source-runtime`, `source-registry`, and `reaction-runtime` without stale omissions or ownership drift notes.
- [ ] Focused tests cover plan-owned target resolution and source/reaction publication paths without depending on placeholder stubs or compatibility-only fallbacks.

### Phase 4 - Node Identity, Runtime Carriers, And Debugger Lookup

Status: planned
Targets: `packages/flux-core/src/types/`, `packages/flux-runtime/src/schema-compiler/`, `packages/flux-runtime/src/node-resolver.ts`, `packages/flux-runtime/src/component-handle-registry.ts`, `packages/flux-runtime/src/schema-compiler/target-enrichment.ts`, `packages/flux-react/src/contexts.ts`, `packages/flux-react/src/hooks.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-providers.tsx`, `packages/flux-react/src/node-frame-wrapper.tsx`, `packages/nop-debugger/src/`, `tests/e2e/debugger.spec.ts`, focused tests

- [ ] Remove remaining `NodeLocator`-style runtime/debugger/action compatibility structures from active implementation paths.
- [ ] Make mounted-node lookup, debugger inspection, and registry indexing converge on unique live `cid`.
- [ ] Keep `instancePath` only as repeated structural context, not as a competing mounted identity carrier.
- [ ] Converge the React ambient node carrier implementation to the single documented runtime node-instance story.
- [ ] Update debugger/controller/automation contracts and tests so `inspectByCid()` and `inspectByElement()` match the architecture baseline end-to-end.

Exit Criteria:

- [ ] Mounted-node identity in active code is `cid`-first and no active code path requires `NodeLocator` to resolve or inspect a mounted node.
- [ ] Repeated-aware code paths use `instancePath` only as documented additional context and are covered by focused repeated-case tests.
- [ ] Debugger lookup, DOM `data-cid`, runtime targeting, and component-handle registry indexing are end-to-end self-consistent under focused tests for singleton and repeated nodes.

### Phase 5 - Surface Ownership And Action-Scope Boundary Convergence

Status: planned
Targets: `packages/flux-runtime/src/page-runtime.ts`, `packages/flux-runtime/src/`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-react/src/schema-renderer.tsx`, page/surface runtime code, `packages/flux-runtime/src/imports.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-providers.tsx`, schema compiler/provider code, `packages/flux-runtime/src/runtime-eval-helpers.ts`, focused tests

- [ ] Replace page-owned dialog/drawer state reuse with the documented shared surface-family owner substrate.
- [ ] Ensure open/close/stack/focus semantics are surface-owned rather than page-owned.
- [ ] Converge `xui:imports` / `ActionScope` behavior to the documented node-owned capability boundary instead of mixed active-scope mutation.
- [ ] Make compiled node-boundary publication (`renderPlan.wrapProviders` or the final equivalent compiled execution closure) the real implementation path for node-local optional boundaries.

Exit Criteria:

- [ ] `packages/flux-runtime/src/page-runtime.ts` is no longer the owner of the active dialog/drawer stack semantics used by `packages/flux-react/src/dialog-host.tsx` and related surface paths.
- [ ] Import/action-scope publication follows the documented node-boundary model rather than the older mixed runtime inference path, including compiled node-boundary publication through the steady-state execution path.
- [ ] Shared surface runtime/store behavior is observable in live code and focused tests without routing close/open/stack ownership through `page-runtime.ts` compatibility semantics.
- [ ] Focused tests prove surface ownership and import-scope behavior across nested and repeated cases.

### Phase 6 - Value Adaptation Owner Convergence

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/detail-field.tsx`, `detail-view.tsx`, `object-field.tsx`, `array-field.tsx`, `variant-field.tsx`, `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-react/src/node-frame-wrapper.tsx`, supporting runtime/helpers/tests

- [ ] Introduce or finish the shared value-adaptation owner/wrapper substrate described in the architecture docs.
- [ ] Remove per-renderer ad hoc transform/validate orchestration where the shared owner path is now the architecture baseline.
- [ ] Ensure the documented inbound / validate / outbound ordering is actually live for the composite value family.
- [ ] Bring supported surface modes and owner writeback semantics into explicit conformance with the architecture family docs.

Exit Criteria:

- [ ] `detail-field`, `detail-view`, `object-field`, `array-field`, and `variant-field` all execute through the same shared value-adaptation owner/wrapper path rather than renderer-local orchestration forks.
- [ ] Focused tests prove transform/validate/writeback ordering and owner writeback behavior.
- [ ] The affected value-family renderers and form-owned consumer paths read normalized `props` / `meta` / `regions` wherever `field-metadata-slot-modeling.md` requires it, without raw-schema fallback for plan-owned semantics.

### Phase 7 - Styling Contract Enforcement

Status: planned
Targets: `packages/flux-react/src/field-frame.tsx`, affected renderer files under `flux-renderers-basic`, `flux-renderers-form`, `flux-renderers-data`, shared tests

- [ ] Remove implicit layout/visual styling from renderer root semantic markers.
- [ ] Make `FieldFrame` match the documented semantic-marker / `data-slot` / presence-only state-attribute contract in live code.
- [ ] Audit and correct all renderer paths named by the audit, including current raw semantic-marker drift in `table-renderer`, `tree-renderer`, `array-field`, `object-field`, `detail-field`, `detail-view`, `variant-field`, and `tree-controls`.
- [ ] Add focused tests or snapshot/DOM assertions that enforce the marker/data-slot/state-attribute contract.

Exit Criteria:

- [ ] Focused DOM/snapshot tests prove the audited renderer outputs keep semantic root markers non-visual, use `data-slot` for internal regions, and use presence-only state attributes where required by `field-frame.md`.
- [ ] `form.tsx`, `field-frame.tsx`, and the audited data/form renderers no longer carry implicit layout through semantic root marker classes.

### Workstream 8A - Flow Designer Host/Bridge Convergence

Status: planned
Targets: `packages/flow-designer-core/src/`, `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-renderers/src/`, focused tests

- [ ] Converge Flow Designer host scope, bridge, and action/command surfaces to the family docs.
- [ ] Land `createDialog` / host fragment behavior and command/bridge semantics required by `flow-designer/config-schema.md` and related family docs.
- [ ] Align namespace registration timing and shell/runtime publication semantics with `complex-control-host-protocol.md`.
- [ ] Add focused tests proving schema-visible host scope, bridge command submission, and shell/runtime separation.

Exit Criteria:

- [ ] `packages/flow-designer-renderers/src/designer-page.tsx` uses the host-scope and namespace-registration timing required by `complex-control-host-protocol.md`, and focused tests lock that behavior.
- [ ] Focused tests prove `createDialog` config-schema behavior is live rather than documented-only, and that Flow host writes still go through namespaced actions or bridge commands.

### Workstream 8B - Report Designer / Spreadsheet Host And Inspector Convergence

Status: planned
Targets: `packages/report-designer-core/src/`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`, `packages/report-designer-renderers/src/`, `packages/spreadsheet-core/src/`, `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/spreadsheet-renderers/src/bridge.ts`, `packages/spreadsheet-renderers/src/`, focused tests

- [ ] Converge Report Designer / Spreadsheet host scope, bridge, selection/target projection, and inspector-facing data contract to the family docs.
- [ ] Remove implementation escape hatches that violate the documented “snapshot + command surface” owner boundary.
- [ ] Align report dirty/session/status publication with `complex-control-host-protocol.md` and the report family docs.
- [ ] Add focused tests proving schema-visible host scope, bridge command submission, shell/runtime separation, and inspector/provider target semantics.

Exit Criteria:

- [ ] Report host status publication is no longer hardcoded to a fake clean state; focused tests prove dirty/session/status publication reflects live bridge/runtime state.
- [ ] Report inspector shell/provider target semantics match `report-designer/inspector-design.md` for target shape, host-scope exposure, and action-based writeback under focused tests.
- [ ] Spreadsheet and Report host pages prove namespace registration timing and host-scope projection semantics under focused tests, and command submission remains bridge- or action-owned instead of direct store mutation.

### Phase 9 - Full Verification, Doc Sync, And Closure Audit

Status: planned
Targets: touched code, touched docs, `docs/logs/`, successor-plan notes if needed

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

- [ ] `Final Execution Schema` behavior conforms to the architecture baseline
- [ ] `Host Projection` behavior and contracts conform to the architecture baseline
- [ ] `flux-runtime-module-boundaries.md` owner claims match live runtime module responsibilities
- [ ] `form-validation.md` owner semantics match live validation behavior
- [ ] `api-data-source.md` owner semantics match live source publication/runtime behavior
- [ ] `packages/flux-core/src/types/schema.ts` matches the current architecture-owned schema surface for data-source and reaction semantics
- [ ] `NodeLocator` is absent from active runtime/debugger/action implementation paths
- [ ] Mounted-node lookup, debugger, DOM `data-cid`, and registry all converge on unique live `cid`
- [ ] Dialog/drawer/surface behavior conforms to the surface-owner contract
- [ ] `xui:imports` / action-scope publication follows the documented node-boundary model
- [ ] Composite value fields use the shared value-adaptation owner/wrapper model
- [ ] `field-metadata-slot-modeling.md` normalized props/meta/regions model matches the touched live renderer paths
- [ ] `packages/flux-runtime/src/reaction-runtime.ts` matches `api-data-source.md` reaction ownership, invalidation, scheduling, and debug semantics
- [ ] `packages/flux-react/src/schema-renderer.tsx` and `packages/flux-renderers-form/src/renderers/form.tsx` conform to the final execution / surface ownership / normalized-consumer boundaries this plan owns
- [ ] Live renderers conform to the semantic-marker / no-implicit-layout styling contract
- [ ] Flow Designer host/bridge behavior conforms to the family docs
- [ ] Report Designer host/bridge behavior conforms to the family docs
- [ ] `complex-control-host-protocol.md` host-bridge semantics match the affected platform implementations
- [ ] `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md` is updated to reflect convergence evidence rather than open drift for this plan-owned scope
- [ ] `docs/logs/` updated with execution notes and closure evidence
- [ ] independent subagent closure audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: <<fill when the plan can be closed only after code paths are verified to match the architecture docs semantically, not just by interface names>>

Closure Audit Evidence:

- Reviewer / Agent: <<independent subagent>>
- Evidence: <<task id / findings summary>>

Follow-up:

- <<record any genuine successor plan if a drift area must be split out>>
- <<or state no remaining plan-owned work>>
