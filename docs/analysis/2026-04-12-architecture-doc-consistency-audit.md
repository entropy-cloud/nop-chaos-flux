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

- Historical note: this finding reflected the earlier 2026-04-14 baseline before the final Workstream 2 provider-wrap slice landed. The live React path now executes the compiler-emitted `wrapProviders` closure directly through `TemplateNode.providerWrap`.

### F4. Node identity documentation and live code are still out of sync

- Docs involved: `docs/architecture/renderer-runtime.md`, `docs/architecture/template-instantiation-and-node-identity.md`
- Code evidence: `packages/flux-react/src/contexts.ts:21`, `packages/flux-react/src/node-renderer-providers.tsx:61-74`, `packages/flux-react/src/node-renderer.tsx:139-149`, `packages/nop-debugger/src/controller-component-inspector.ts:144-241`
- Why: the original drift note is now narrower than before. Active package code already uses `cid` plus optional `instancePath`, and `NodeLocator` is absent from the runtime/debugger/action implementation paths. The remaining mismatch is mostly presentation/cleanup debt around older React node-meta publication and repeated-template substrate completeness, not a surviving `NodeLocator` contract in live code.

### F5. Surface ownership docs have moved ahead of implementation

- Docs involved: `docs/architecture/surface-owner.md`, `docs/architecture/renderer-runtime.md`
- Historical note: this finding reflected the pre-2026-04-14 baseline. The live implementation has since been moved onto an explicit shared `SurfaceRuntime` family with a unified `entries` stack, and `PageRuntime` no longer owns dialog/drawer state.

### F6. Field/value-family docs previously overgeneralized staged adaptation across inline composite fields

- Docs involved: `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/variant-field.md`, `docs/architecture/object-field.md`, `docs/architecture/array-field.md`
- Code evidence: `packages/flux-renderers-form/src/renderers/detail-field.tsx`, `packages/flux-renderers-form/src/renderers/detail-view.tsx`, `packages/flux-renderers-form/src/renderers/object-field.tsx`, `packages/flux-renderers-form/src/renderers/array-field.tsx`, `packages/flux-renderers-form/src/renderers/variant-field.tsx`
- Historical note: this finding reflected the pre-2026-04-13 baseline. The architecture has since been narrowed so `detail-field` / `detail-view` are the staged surface-backed owners, while `object-field`, `array-field`, and `variant-field` are explicitly inline live-edit controls by default. The remaining convergence work is therefore not “force all five controls through one staged adaptation pipeline”, but “keep the staged helper on the surface-backed owners and keep the inline composite family aligned with its documented live-edit contracts”.

### F7. Styling docs now converge on one future contract, but live renderer code still lags that contract

- Docs involved: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`, `docs/architecture/field-frame.md`
- Code evidence: `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-data/src/table-renderer.tsx`, `packages/flux-renderers-data/src/tree-renderer.tsx`, `packages/flux-renderers-form/src/renderers/array-field.tsx`, `packages/flux-renderers-form/src/renderers/object-field.tsx`, `packages/flux-renderers-form/src/renderers/detail-field.tsx`, `packages/flux-renderers-form/src/renderers/detail-view.tsx`, `packages/flux-renderers-form/src/renderers/variant-field.tsx`, `packages/flux-renderers-form/src/renderers/tree-controls.tsx`
- Why: the styling docs now align on one future baseline: root `nop-*` markers are semantic only, internal regions use `data-slot`, and renderers do not inject implicit layout. Recent landing slices have already removed the extra internal `nop-tabs-*`, `nop-cb-*`, and React host `nop-*-card` markers in favor of `data-slot`, expanded focused DOM assertions around `FieldFrame`, `page`, `container`, `table`, `tree`, and dialog/drawer host surfaces, and normalized several remaining conditional class merges onto `cn()`. The remaining problem is now narrower code lag in other renderers that still mix semantic root markers with non-essential internal classes or still lack focused selector-contract coverage.

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
| `docs/architecture/action-scope-and-imports.md` | consistent | The import runtime matches the current baseline that loaded libraries stay resident and namespaces are published lexically, and React now executes the compiler-emitted provider-wrap closure directly for node-boundary publication. |
| `docs/architecture/api-data-source.md` | inconsistent | Documents `resultMapping` as part of the current `DataSourceSchema`, but audited schema/runtime code does not expose or implement it (`packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`). |
| `docs/architecture/component-resolution.md` | consistent | The live runtime/action target path now resolves mounted nodes directly through `cid` plus optional `instancePath`, and no active package code still depends on a `NodeLocator` wrapper. |
| `docs/architecture/dependency-tracking.md` | consistent | Current path-based dependency matching and explicit `dependsOn` fallback align with `scope-change.ts`, `source-registry.ts`, and `reaction-runtime.ts`. |
| `docs/architecture/form-validation.md` | inconsistent | The doc describes a broader owner-partitioned validation runtime than the current form-centric implementation. `summary-gate` currently blocks submit whenever active (`packages/flux-runtime/src/form-runtime.ts:155-167`), and `recurse-submit` currently unregisters active child contracts instead of validating them (`packages/flux-runtime/src/form-runtime.ts:510-514`). |
| `docs/architecture/schema-file-validator.md` | consistent | Compiler-owned diagnostics and `xui:imports` validation match live code. |
| `docs/architecture/scope-ownership-and-isolation.md` | consistent | Current isolate/inherit behavior aligns with `packages/flux-runtime/src/scope.ts`, `packages/flux-runtime/src/index.ts`, and `packages/flux-react/src/render-nodes.tsx`. |
| `docs/architecture/scoped-render-slots.md` | consistent | Reserved `$slot` frame and parameterized-region behavior match the current hooks and renderer-handle contracts. |
| `docs/architecture/surface-owner.md` | consistent | Live runtime and React host code now use an explicit shared `SurfaceRuntime` / `SurfaceStore` family outside `PageRuntime`, with unified stack-based surface ownership. |
| `docs/architecture/table-row-identity-and-scope-performance.md` | inconsistent | The doc assumes a more complete repeated-template substrate than currently populated by the compiler; `packages/flux-runtime/src/schema-compiler.ts:324` still returns `repeatedTemplates: new Map()`. |
| `docs/architecture/template-instantiation-and-node-identity.md` | inconsistent | The `cid`-first / no-`NodeLocator` identity model is now reflected in live runtime/debugger/action code. The remaining mismatch is narrower: repeated-template plumbing is still incomplete, and some React publication details remain more compatibility-shaped than the cleaner target wording. |

### Field, UI, Styling, And Tooling

| Document | Status | Notes |
| --- | --- | --- |
| `docs/architecture/array-field.md` | inconsistent | The document is now explicitly framed as the future shared-owner contract for array value editing. The remaining gap is mostly implementation lag relative to that contract. |
| `docs/architecture/code-editor.md` | redirect | Current file is consistent as a redirect note to `docs/components/code-editor/design.md`. |
| `docs/architecture/condition-builder.md` | redirect | Current file is consistent as a redirect note to `docs/components/condition-builder/design.md`. |
| `docs/architecture/field-binding-and-renderer-contract.md` | inconsistent | The owner contract is now largely settled. Remaining issues are mostly stale migration-era narration and code lag rather than active competition with other architecture docs. |
| `docs/architecture/field-frame.md` | inconsistent | The document has been realigned with the styling contract: root `nop-field` is semantic only, visual layout stays external, and state attributes are presence-only. Recent focused tests in `packages/flux-react/src/frame-slot-meta.test.tsx` now lock the root/state/slot contract more directly; the remaining mismatch is narrower renderer-family code lag outside `FieldFrame` itself. |
| `docs/architecture/field-metadata-slot-modeling.md` | inconsistent | The compiler model is broadly right, but many live renderers still fall back to raw schema instead of fully normalized `props` / `meta` / `regions` (`packages/flux-renderers-form/src/renderers/input.tsx`, `array-field.tsx`, `object-field.tsx`, `detail-field.tsx`, `variant-field.tsx`, `packages/flux-react/src/node-frame-wrapper.tsx`). |
| `docs/architecture/frontend-baseline.md` | consistent | Package/tooling baseline matches `package.json`, `pnpm-workspace.yaml`, and app/package structure. |
| `docs/architecture/object-field.md` | inconsistent | The document now clearly states the future owner contract for object value editing. The remaining gap is mostly implementation lag relative to that contract. |
| `docs/architecture/performance-design-requirements.md` | consistent | The documented `startTransition` usage in table pagination/selection matches `packages/flux-renderers-data/src/table-renderer/use-table-controls.ts`. |
| `docs/architecture/playground-experience.md` | consistent | The file has been rewritten into a clean future-first playground/navigation contract and is internally consistent. |
| `docs/architecture/renderer-markers-and-selectors.md` | inconsistent | The document is aligned with `styling-system.md`, and recent cleanup slices have already removed extra internal `nop-tabs-*`, `nop-cb-item`, `nop-cb-group`, `nop-dialog-card`, and `nop-drawer-card` markers in favor of `data-slot`, while expanding focused coverage for `FieldFrame`, `page`, `container`, `scope-debug`, `table`, `tree`, `chart`, the form root/tree-control family, the composite/detail form renderer family, flow-designer shared entry surfaces like `DesignerIcon`, palette group/item slots, toolbar root markers, inspector root markers, and the node quick-toolbar slot contract, plus report-designer page/toolbar/inspector/field-panel surfaces. The remaining issue is now narrower code lag in other renderers that still mix semantic markers with non-essential internal classes or inconsistent class-merging helpers. |
| `docs/architecture/renderer-runtime.md` | consistent | The live React/runtime path now matches the no-`NodeLocator`, explicit `SurfaceRuntime`, and compiler-owned provider-wrap baselines described in the current architecture docs. |
| `docs/architecture/security-design-requirements.md` | consistent | No material mismatch found in the audited code paths. |
| `docs/architecture/styling-system.md` | inconsistent | The normative no-implicit-layout contract is now more clearly aligned with `field-frame.md` and `renderer-markers-and-selectors.md`. Recent renderer cleanup also normalized report/flow toolbar roots, the report inspector root, the flow inspector root, the flow palette root, and the flow page shell root onto `cn()` while preserving their semantic root markers, replaced remaining raw `label` / `textarea` usage in `designer-inspector` and `designer-field` plus the flow toolbar switch branch with `@nop-chaos/ui` components, and removed the internal `nop-designer-node-toolbar` marker in favor of `data-slot="designer-node-toolbar"`. The remaining gap is mainly renderer implementation lag in other families. |
| `docs/architecture/theme-compatibility.md` | inconsistent | The design direction is reasonable and now fits the broader architecture, but the document still needs focused anchor/terminology cleanup to be treated as fully current. |
| `docs/architecture/value-adaptation-and-detail-field.md` | inconsistent | The document now more clearly owns the future shared value-adaptation contract. The remaining mismatch is mainly that current renderers still implement only part of that owner/wrapper model and a narrower set of surface modes. |
| `docs/architecture/variant-field.md` | inconsistent | The document now clearly states the future shared-owner contract for variant editing. The remaining gap is mostly implementation lag relative to that contract. |

### Platform-Extension Framing

| Document | Status | Notes |
| --- | --- | --- |
| `docs/architecture/complex-control-host-protocol.md` | consistent | The host-family drift tracked by Plan 87 Workstream 4 is now closed: flow `createDialog`, spreadsheet namespace timing/top-level aliases, report dirty/status publication, shared spreadsheet bridge ownership, and inspector provider spreadsheet context are all landed under focused tests across `packages/flow-designer-renderers/src/*.test.tsx`, `packages/spreadsheet-renderers/src/renderers.integration.test.tsx`, `packages/report-designer-core/src/__tests__/designer-core.test.ts`, and `packages/report-designer-renderers/src/renderers.integration.test.tsx`. |
| `docs/architecture/debugger-runtime.md` | consistent | The file has been rewritten into a clean `cid`-first debugger runtime baseline and is now internally consistent with the no-`NodeLocator` identity model. |
| `docs/architecture/flux-dsl-vm-extensibility.md` | consistent | Broad platform-extension framing remains compatible with the current package boundaries. |

### Flow Designer Family

| Document | Status | Notes |
| --- | --- | --- |
| `docs/architecture/flow-designer/README.md` | consistent | Family/package split and owner boundary remain accurate. |
| `docs/architecture/flow-designer/api.md` | consistent | The file now reads as a future API contract rather than a current-code mirror. |
| `docs/architecture/flow-designer/canvas-adapters.md` | consistent | The single `@xyflow/react` adapter boundary matches live code. |
| `docs/architecture/flow-designer/collaboration.md` | consistent | No material conflict found in this audit. |
| `docs/architecture/flow-designer/config-schema.md` | consistent | The documented integrated `createDialog` path now matches live renderer behavior: palette clicks on `createDialog`-configured node types open a host-owned create dialog first, `designer-page` renders the configured body with designer host scope/action-scope, and node creation happens only after confirm under focused coverage in `packages/flow-designer-renderers/src/designer-controls.test.tsx` and `index.xyflow.test.tsx`. |
| `docs/architecture/flow-designer/design.md` | consistent | The document now functions as a future architecture owner doc, with implementation progress largely pushed out of the main contract narrative. |
| `docs/architecture/flow-designer/runtime-snapshot.md` | consistent | The file now more cleanly owns current runtime facts without mixing target-only scope fields into the live baseline list. |

### Report Designer Family

| Document | Status | Notes |
| --- | --- | --- |
| `docs/architecture/report-designer/README.md` | consistent | Family/package split and owner boundary remain accurate. |
| `docs/architecture/report-designer/api.md` | consistent | The file now clearly reads as a future package/API contract rather than a current-code mirror, and the live host/runtime wiring is incrementally closer to that target: spreadsheet-page now aliases `workbook` / `activeSheet` / `selection` / `runtime` at the top level, report-designer-page now aliases the live selection target as both `selection` and `target`, and the report page now also owns a shared spreadsheet bridge plus page-level `spreadsheet:*` namespace instead of leaving spreadsheet command routing trapped inside the canvas implementation. |
| `docs/architecture/report-designer/codec-design.md` | consistent | No material conflict found in this audit. |
| `docs/architecture/report-designer/config-schema.md` | consistent | No material conflict found in this audit. |
| `docs/architecture/report-designer/contracts.md` | consistent | The future-contract-draft positioning is now explicit and aligned with the family owner docs; the live renderer side is also closer to the described bridge/projection surface, with spreadsheet top-level aliases, report target aliases, and report-page-level `spreadsheet:*` action routing all now covered by focused integration tests. |
| `docs/architecture/report-designer/design.md` | consistent | The document now reads primarily as the future architecture owner rather than as an implementation ledger. |
| `docs/architecture/report-designer/inspector-design.md` | consistent | The live implementation now matches the narrower current host-scope/provider baseline owned by this audit slice: report host scope carries truthful runtime dirty state plus stable target aliases, report-designer page threads the live spreadsheet snapshot through the shared host boundary, and inspector providers now receive spreadsheet runtime context under focused core/renderer coverage. |
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
