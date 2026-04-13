# 2026-04-12 Architecture Doc Consistency Audit

## Scope

This audit reviews every current document under `docs/architecture/` in a dependency-first order and checks two things:

1. whether the architecture docs conflict with each other
2. whether each doc still matches the current codebase

## Final Outcome

After multiple edit-and-review cycles, the active `docs/architecture/**/*.md` set now converges on one future-design baseline.

At the end of this pass:

- active doc-vs-doc contradictions have been resolved
- remaining findings are primarily implementation lag, stale code anchors, or focused doc cleanup
- future owner docs are intentionally allowed to lead the current codebase

Primary code anchors used during the audit:

- `packages/flux-core/src/`
- `packages/flux-runtime/src/`
- `packages/flux-react/src/`
- `packages/flux-renderers-*/src/`
- `packages/ui/src/`
- `packages/flow-designer-*/src/`
- `packages/report-designer-*/src/`
- `packages/spreadsheet-*/src/`
- `packages/nop-debugger/src/`
- `apps/playground/src/`

## Review Order

1. `README.md`
2. governing and normative core docs
3. action/scope/runtime docs
4. field/styling/UI docs
5. platform-extension docs

## Status Legend

- `consistent`: no active doc-vs-doc contradiction remains; the doc may still lead current code
- `inconsistent`: remaining problem is implementation lag, stale anchors, or focused doc cleanup unless the note explicitly says otherwise
- `redirect`: file is functioning as a redirect note, not an owner contract

## Global Findings

### F1. `Final Execution Schema` boundary is overstated relative to the live React runtime

- Docs involved: `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-design-principles.md`
- Code evidence: `packages/flux-react/src/render-nodes.tsx:95-113`
- Why: the docs say Flux executes an already-assembled `Final Execution Schema` and does not do loader-style schema assembly in the browser runtime, but `RenderNodes` still accepts raw `SchemaInput` and compiles it at render time through `runtime.schemaCompiler.compile(...)`.

### F2. `Host Projection` exists in practice through host-scope helpers, but the docs overstate how unified and first-class that boundary currently is across shared contracts

- Docs involved: `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-design-principles.md`, `docs/architecture/action-interaction-state.md`
- Code evidence: `packages/flux-react/src/workbench/hooks.ts:16-85`, `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-core/src/types/runtime.ts`
- Why: the repository does have an explicit host-scope projection mechanism through `useHostScope()`, including reactive snapshot replacement and write protection for projected fields. The mismatch is narrower: the normative docs describe `Host Projection` as a clean shared primitive/boundary across the programming model, while current shared contracts still expose that behavior mostly as a React/workbench helper rather than as a clearly named cross-package core surface.

### F3. React node-boundary publication is documented as compile-time `renderPlan.wrapProviders`, but the live runtime still derives providers at render time

- Docs involved: `docs/architecture/renderer-runtime.md`, `docs/architecture/action-scope-and-imports.md`
- Code evidence: `packages/flux-runtime/src/schema-compiler.ts:228-262`, `packages/flux-react/src/node-renderer-providers.tsx:25-57`, `packages/flux-react/src/node-renderer.tsx:114-115`
- Why: the compiler does emit runtime-boundary hints, but the React layer still decides `ActionScope`, `ComponentRegistry`, and `classAliases` publication from live node policy/schema instead of executing a compiled `renderPlan.wrapProviders` closure.

### F4. Node identity documentation and live code are still out of sync

- Docs involved: `docs/architecture/renderer-runtime.md`, `docs/architecture/template-instantiation-and-node-identity.md`
- Code evidence: `packages/flux-react/src/contexts.ts:21`, `packages/flux-react/src/node-renderer-providers.tsx:60-71`, `packages/flux-core/src/compiled-cid.ts`, `packages/flux-runtime/src/schema-compiler/target-enrichment.ts`
- Why: the architecture docs are now converging on one future baseline: no `NodeLocator`, unique live `cid` for mounted-node lookup/debugger/registry, and `instancePath` as repeated structural context. The live runtime still exposes older mixed contracts and older React node-meta carriers.

### F5. Surface ownership docs have moved ahead of implementation

- Docs involved: `docs/architecture/surface-owner.md`, `docs/architecture/renderer-runtime.md`
- Code evidence: `packages/flux-react/src/dialog-host.tsx`, `packages/flux-runtime/src/page-runtime.ts`, `packages/flux-runtime/src/index.ts:339-360`
- Why: the docs describe a dedicated `SurfaceRuntime` / `SurfaceStore` family outside page ownership, but the live implementation still stores dialogs and surfaces on the page runtime/store and closes them through `page.closeDialog` / `page.closeSurface`.

### F6. Field/value-family docs previously overgeneralized staged adaptation across inline composite fields

- Docs involved: `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/variant-field.md`, `docs/architecture/object-field.md`, `docs/architecture/array-field.md`
- Code evidence: `packages/flux-renderers-form/src/renderers/detail-field.tsx`, `packages/flux-renderers-form/src/renderers/detail-view.tsx`, `packages/flux-renderers-form/src/renderers/object-field.tsx`, `packages/flux-renderers-form/src/renderers/array-field.tsx`, `packages/flux-renderers-form/src/renderers/variant-field.tsx`
- Historical note: this finding reflected the pre-2026-04-13 baseline. The architecture has since been narrowed so `detail-field` / `detail-view` are the staged surface-backed owners, while `object-field`, `array-field`, and `variant-field` are explicitly inline live-edit controls by default. The remaining convergence work is therefore not “force all five controls through one staged adaptation pipeline”, but “keep the staged helper on the surface-backed owners and keep the inline composite family aligned with its documented live-edit contracts”.

### F7. Styling docs now converge on one future contract, but live renderer code still lags that contract

- Docs involved: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`, `docs/architecture/field-frame.md`
- Code evidence: `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-data/src/table-renderer.tsx`, `packages/flux-renderers-data/src/tree-renderer.tsx`, `packages/flux-renderers-form/src/renderers/array-field.tsx`, `packages/flux-renderers-form/src/renderers/object-field.tsx`, `packages/flux-renderers-form/src/renderers/detail-field.tsx`, `packages/flux-renderers-form/src/renderers/detail-view.tsx`, `packages/flux-renderers-form/src/renderers/variant-field.tsx`, `packages/flux-renderers-form/src/renderers/tree-controls.tsx`
- Why: the styling docs now align on one future baseline: root `nop-*` markers are semantic only, internal regions use `data-slot`, and renderers do not inject implicit layout. The remaining problem is mostly code lag, because several live renderers still emit visual/internal `nop-*` classes.

### F8. Flow Designer and Report Designer docs contain several “already landed” claims that are still ahead of implementation

- Docs involved: multiple files under `docs/architecture/flow-designer/`, `docs/architecture/report-designer/`
- Code evidence: referenced in the per-document findings below
- Why: family-level boundaries are mostly correct, but several detailed API/snapshot/action claims still describe the intended target more than the current shipped behavior.

## Per-Document Findings

### Core Routing And Principles

| Document | Status | Notes |
| --- | --- | --- |
| `docs/architecture/README.md` | consistent | Architecture hierarchy and routing order are aligned with the current owner split. |
| `docs/architecture/flux-design-principles.md` | inconsistent | See F1 and F2. The principles doc treats `Host Projection` as an active core read primitive, but the shared runtime surface does not expose that boundary explicitly. |
| `docs/architecture/frontend-programming-model.md` | inconsistent | See F1 and F2. The `Final Execution Schema` runtime boundary is stricter than the current React/runtime implementation. |
| `docs/architecture/flux-core.md` | consistent | Broadly matches the live `TemplateNode`/`NodeInstance`, runtime assembly, and package-role baseline. |
| `docs/architecture/flux-runtime-module-boundaries.md` | inconsistent | The ownership map is stale/incomplete for active `data-source` / `reaction` modules such as `packages/flux-runtime/src/data-source-runtime.ts`, `source-registry.ts`, and `reaction-runtime.ts`. |

### Actions, Runtime, Scope, And Validation

| Document | Status | Notes |
| --- | --- | --- |
| `docs/architecture/action-algebra-formal-spec.md` | consistent | Action control-flow semantics align with `packages/flux-runtime/src/action-runtime.ts` and `action-runtime-core.ts`. |
| `docs/architecture/action-graph-authoring.md` | consistent | Visual authoring concepts remain compatible with the current action algebra. |
| `docs/architecture/action-interaction-state.md` | inconsistent | The taxonomy and surface-owner routing are now internally aligned, but the doc still assumes a cleaner Host Projection primitive story than current shared contracts expose. |
| `docs/architecture/action-scope-and-imports.md` | inconsistent | The document wording is now more clearly normative, but current code still registers imports onto the active scope instead of creating the cleaner import-owned boundary described here, and it still lags the `renderPlan.wrapProviders` direction from F3. |
| `docs/architecture/api-data-source.md` | inconsistent | Documents `resultMapping` as part of the current `DataSourceSchema`, but audited schema/runtime code does not expose or implement it (`packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`). |
| `docs/architecture/component-resolution.md` | inconsistent | The doc is now aligned with the future `cid`-first / no-`NodeLocator` design, but the current runtime/action target code still carries older locator/plan compatibility paths. |
| `docs/architecture/dependency-tracking.md` | consistent | Current path-based dependency matching and explicit `dependsOn` fallback align with `scope-change.ts`, `source-registry.ts`, and `reaction-runtime.ts`. |
| `docs/architecture/form-validation.md` | inconsistent | The doc describes a broader owner-partitioned validation runtime than the current form-centric implementation. `summary-gate` currently blocks submit whenever active (`packages/flux-runtime/src/form-runtime.ts:155-167`), and `recurse-submit` currently unregisters active child contracts instead of validating them (`packages/flux-runtime/src/form-runtime.ts:510-514`). |
| `docs/architecture/schema-file-validator.md` | consistent | Compiler-owned diagnostics and `xui:imports` validation match live code. |
| `docs/architecture/scope-ownership-and-isolation.md` | consistent | Current isolate/inherit behavior aligns with `packages/flux-runtime/src/scope.ts`, `packages/flux-runtime/src/index.ts`, and `packages/flux-react/src/render-nodes.tsx`. |
| `docs/architecture/scoped-render-slots.md` | consistent | Reserved `$slot` frame and parameterized-region behavior match the current hooks and renderer-handle contracts. |
| `docs/architecture/surface-owner.md` | inconsistent | The document is now clearer that `SurfaceRuntime` / `SurfaceStore` is the target family abstraction, but live page/dialog code still lags that owner model. |
| `docs/architecture/table-row-identity-and-scope-performance.md` | inconsistent | The doc assumes a more complete repeated-template substrate than currently populated by the compiler; `packages/flux-runtime/src/schema-compiler.ts:324` still returns `repeatedTemplates: new Map()`. |
| `docs/architecture/template-instantiation-and-node-identity.md` | inconsistent | The document has been rewritten toward the future `cid`-first / no-`NodeLocator` baseline. The remaining mismatch is now primarily code lag: runtime/debugger/action code still carries older locator/compatibility structures and not all repeated-template plumbing is landed. |

### Field, UI, Styling, And Tooling

| Document | Status | Notes |
| --- | --- | --- |
| `docs/architecture/array-field.md` | inconsistent | The document is now explicitly framed as the future shared-owner contract for array value editing. The remaining gap is mostly implementation lag relative to that contract. |
| `docs/architecture/code-editor.md` | redirect | Current file is consistent as a redirect note to `docs/components/code-editor/design.md`. |
| `docs/architecture/condition-builder.md` | redirect | Current file is consistent as a redirect note to `docs/components/condition-builder/design.md`. |
| `docs/architecture/field-binding-and-renderer-contract.md` | inconsistent | The owner contract is now largely settled. Remaining issues are mostly stale migration-era narration and code lag rather than active competition with other architecture docs. |
| `docs/architecture/field-frame.md` | inconsistent | The document has been realigned with the styling contract: root `nop-field` is semantic only, visual layout stays external, and state attributes are presence-only. The remaining mismatch is now mainly code lag in `packages/flux-react/src/field-frame.tsx`. |
| `docs/architecture/field-metadata-slot-modeling.md` | inconsistent | The compiler model is broadly right, but many live renderers still fall back to raw schema instead of fully normalized `props` / `meta` / `regions` (`packages/flux-renderers-form/src/renderers/input.tsx`, `array-field.tsx`, `object-field.tsx`, `detail-field.tsx`, `variant-field.tsx`, `packages/flux-react/src/node-frame-wrapper.tsx`). |
| `docs/architecture/frontend-baseline.md` | consistent | Package/tooling baseline matches `package.json`, `pnpm-workspace.yaml`, and app/package structure. |
| `docs/architecture/object-field.md` | inconsistent | The document now clearly states the future owner contract for object value editing. The remaining gap is mostly implementation lag relative to that contract. |
| `docs/architecture/performance-design-requirements.md` | consistent | The documented `startTransition` usage in table pagination/selection matches `packages/flux-renderers-data/src/table-renderer/use-table-controls.ts`. |
| `docs/architecture/playground-experience.md` | consistent | The file has been rewritten into a clean future-first playground/navigation contract and is internally consistent. |
| `docs/architecture/renderer-markers-and-selectors.md` | inconsistent | The document is now aligned with `styling-system.md`, including the `FieldFrame` case. The remaining issue is code lag in renderers that still mix semantic markers with visual/internal classes. |
| `docs/architecture/renderer-runtime.md` | inconsistent | See F3, F4, and F5. The doc is now aligned with the future no-`NodeLocator` identity model, but live React runtime code still uses older node-meta/context and provider assembly details. |
| `docs/architecture/security-design-requirements.md` | consistent | No material mismatch found in the audited code paths. |
| `docs/architecture/styling-system.md` | inconsistent | The normative no-implicit-layout contract is now more clearly aligned with `field-frame.md` and `renderer-markers-and-selectors.md`. The remaining gap is mainly renderer implementation lag. |
| `docs/architecture/theme-compatibility.md` | inconsistent | The design direction is reasonable and now fits the broader architecture, but the document still needs focused anchor/terminology cleanup to be treated as fully current. |
| `docs/architecture/value-adaptation-and-detail-field.md` | inconsistent | The document now more clearly owns the future shared value-adaptation contract. The remaining mismatch is mainly that current renderers still implement only part of that owner/wrapper model and a narrower set of surface modes. |
| `docs/architecture/variant-field.md` | inconsistent | The document now clearly states the future shared-owner contract for variant editing. The remaining gap is mostly implementation lag relative to that contract. |

### Platform-Extension Framing

| Document | Status | Notes |
| --- | --- | --- |
| `docs/architecture/complex-control-host-protocol.md` | inconsistent | Core host-boundary framing is useful, but several “landed” details are ahead of implementation: it says complex page renderers should register namespaces in `useLayoutEffect`, while `packages/flow-designer-renderers/src/designer-page.tsx` and `packages/report-designer-renderers/src/page-renderer.tsx` use `useEffect`; it also implies report dirty-state publication from bridge snapshots, while report page code still publishes `dirty: false`. |
| `docs/architecture/debugger-runtime.md` | consistent | The file has been rewritten into a clean `cid`-first debugger runtime baseline and is now internally consistent with the no-`NodeLocator` identity model. |
| `docs/architecture/flux-dsl-vm-extensibility.md` | consistent | Broad platform-extension framing remains compatible with the current package boundaries. |

### Flow Designer Family

| Document | Status | Notes |
| --- | --- | --- |
| `docs/architecture/flow-designer/README.md` | consistent | Family/package split and owner boundary remain accurate. |
| `docs/architecture/flow-designer/api.md` | consistent | The file now reads as a future API contract rather than a current-code mirror. |
| `docs/architecture/flow-designer/canvas-adapters.md` | consistent | The single `@xyflow/react` adapter boundary matches live code. |
| `docs/architecture/flow-designer/collaboration.md` | consistent | No material conflict found in this audit. |
| `docs/architecture/flow-designer/config-schema.md` | inconsistent | It documents integrated `createDialog` behavior as active, but renderer code does not currently implement that full create-dialog flow; `quickActions` are present, `createDialog` integration is not fully wired. |
| `docs/architecture/flow-designer/design.md` | consistent | The document now functions as a future architecture owner doc, with implementation progress largely pushed out of the main contract narrative. |
| `docs/architecture/flow-designer/runtime-snapshot.md` | consistent | The file now more cleanly owns current runtime facts without mixing target-only scope fields into the live baseline list. |

### Report Designer Family

| Document | Status | Notes |
| --- | --- | --- |
| `docs/architecture/report-designer/README.md` | consistent | Family/package split and owner boundary remain accurate. |
| `docs/architecture/report-designer/api.md` | consistent | The file now clearly reads as a future package/API contract rather than a current-code mirror. |
| `docs/architecture/report-designer/codec-design.md` | consistent | No material conflict found in this audit. |
| `docs/architecture/report-designer/config-schema.md` | consistent | No material conflict found in this audit. |
| `docs/architecture/report-designer/contracts.md` | consistent | The future-contract-draft positioning is now explicit and aligned with the family owner docs. |
| `docs/architecture/report-designer/design.md` | consistent | The document now reads primarily as the future architecture owner rather than as an implementation ledger. |
| `docs/architecture/report-designer/inspector-design.md` | inconsistent | The doc is now aligned with the family-level future host-scope model; the remaining gap is implementation lag rather than a doc-vs-doc contradiction. |
| `docs/architecture/report-designer/nop-report-profile.md` | consistent | No material conflict found in this audit. |
| `docs/architecture/report-designer/spreadsheet-canvas-css.md` | consistent | Current spreadsheet-canvas CSS strategy and file placement match live code. |

## Independent Verification Cycle

### Cycle 1: parallel subagent review

Independent review tasks were run across four clusters after the initial manual/code audit:

- core cluster audit
- action/runtime cluster audit
- UI/styling cluster audit
- platform-extension cluster audit

Key outcomes from the independent review:

- confirmed the `Final Execution Schema` mismatch in `render-nodes.tsx`
- confirmed that `Host Projection` exists through `useHostScope()`, but that the docs still present a more unified primitive-level contract than the shared cross-package API currently exposes
- confirmed `NodeInstanceContext` and `renderPlan.wrapProviders` claims are ahead of implementation
- confirmed `summary-gate` / `recurse-submit` behavior drift in `form-runtime.ts`
- confirmed Flow Designer / Report Designer / debugger docs contain several “already landed” claims that are still ahead of code
- confirmed the original `field-frame.md` vs `styling-system.md` conflict and used that finding to drive the later doc convergence; the remaining gap is now code lag rather than doc-vs-doc contradiction
- confirmed that `performance-design-requirements.md` should stay marked consistent because the referenced `startTransition` usage is already live

Changes made after Cycle 1:

- expanded this report from a high-level conflict list into a per-document checklist covering every file under `docs/architecture/`
- added explicit references for the highest-impact mismatches
- separated redirect notes from active architecture owners

## Recommended Follow-Up Work

1. Use the now-aligned architecture docs as the target contract for implementation convergence.
2. Prioritize code updates for the highest-drift areas: `Final Execution Schema`, node identity/runtime carriers, surface ownership, value-adaptation owners, and styling contract enforcement.
3. Keep implementation-status notes in logs, plans, analysis, and focused snapshot docs rather than pushing them back into architecture owner docs.
