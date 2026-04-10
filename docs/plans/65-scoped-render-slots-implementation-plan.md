# 65 Scoped Render Slots Implementation Plan

> Plan Status: in-progress
> Last Reviewed: 2026-04-10
> Source: `docs/architecture/scoped-render-slots.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/scope-ownership-and-isolation.md`, `docs/architecture/template-instantiation-and-node-identity.md`, plus live-code audit of `packages/flux-core/src/types/schema.ts`, `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-core/src/types/renderer-hooks.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/render-nodes.tsx`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/schema-compiler/regions.ts`, `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`.
> Related: `docs/plans/54-table-row-projection-and-isolation-plan.md`, `docs/plans/55-loop-structural-node-and-item-scope-plan.md`, `docs/plans/64-node-identity-memory-optimization-and-compiledschemanode-cleanup-plan.md`

## Purpose

Land the first implementation slice of scoped render slots by promoting renderer-local region-binding conventions into compiler-visible metadata and a stable expression/runtime contract.

The concrete target is:

1. `region` field metadata may declare local params and isolation preference
2. compiled regions preserve that metadata
3. region rendering publishes a reserved `$slot` frame for declared bindings
4. nested slot rendering follows a documented slot-parent chain
5. selected repeated renderer families stop depending on undocumented bare-name conventions such as top-level `record` / `index`

## Current Baseline

- The architecture baseline is now documented in `docs/architecture/scoped-render-slots.md`: keep `region` as the runtime term, add param metadata, expose author reads through `$slot.xxx`, and use `$slot.$parent` for nested slot ancestry.
- `SchemaFieldRule` currently supports `key`, `kind`, `regionKey`, `allowSource`, and `sourceStateKey`; there is no compiler-visible slot-param contract yet: `packages/flux-core/src/types/schema.ts`.
- `CompiledRegion` currently carries only `key`, `path`, and `node`; param names and isolation policy are not preserved into compiled output: `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-runtime/src/schema-compiler/regions.ts`.
- `RenderFragmentOptions` still uses `data?: object`, while `RenderRegionHandle.instantiate()` already exposes `bindings?: Record<string, unknown>`; this split shows the runtime substrate is close but not yet vocabulary-consistent: `packages/flux-core/src/types/renderer-hooks.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/render-nodes.tsx`.
- Repeated renderer families still rely on renderer-local binding conventions. The live audited example is table row scope creation through `{ record, index }` in `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`.
- `RenderNodes` already creates child scopes for fragment renders and already supports `scopeKey`, `isolate`, and `ownerNodeInstance`; the missing piece is publishing a dedicated `$slot` frame and validating declared params instead of treating bindings as unstructured data: `packages/flux-react/src/render-nodes.tsx`.
- The plan must preserve the existing no-generic-`$parentScope` rule from `docs/architecture/scope-ownership-and-isolation.md`.

## Goals

- Extend renderer field metadata so a `region` can declare `params` and optional `isolate` policy.
- Preserve that metadata in compiled/template region artifacts.
- Publish a reserved `$slot` frame during parameterized region instantiation.
- Support nested slot shadowing and slot-parent ancestry without introducing configurable root renaming.
- Keep the implementation compatible with the existing region/fragment runtime path and repeated-instance identity model.
- Update at least one real repeated renderer family to use the new contract end to end.

## Non-Goals

- Do not rename the runtime term `region` to `slot` in code-level contracts.
- Do not introduce raw JavaScript function props into schema.
- Do not flatten slot params into ordinary top-level scope names.
- Do not add `xui:slotVar`, `xui:slotNames`, or other root-renaming/aliasing features.
- Do not redesign repeated-instance identity, table virtualization, or generic scope semantics.
- Do not attempt a whole-repo renderer migration in one pass; only the first proven renderer families belong in this plan.

## Scope

### In Scope

- `packages/flux-core/src/types/schema.ts` — extend `SchemaFieldRule` for parameterized regions
- `packages/flux-core/src/types/renderer-compiler.ts` and `packages/flux-core/src/types/node-identity.ts` — preserve region param metadata in compiled/template artifacts
- `packages/flux-core/src/types/renderer-hooks.ts` — align region/fragment render-option vocabulary and expose the slot-specific contract clearly
- `packages/flux-runtime/src/schema-compiler.ts` and `packages/flux-runtime/src/schema-compiler/regions.ts` — compile region param metadata and reject invalid signatures
- `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/render-nodes.tsx`, and helper glue — publish `$slot` frames and nested slot-parent chains through the existing child-scope path
- Focused renderer adoption in repeated renderer families such as table/list/tree where bindings are currently hard-coded
- Docs/examples/tests needed to make the contract author-visible and regression-resistant

### Out Of Scope

- Flow Designer / Report Designer slot authoring UX
- generic schema diagnostics beyond the minimal slot-param validation needed for this feature
- a repo-wide conversion of every `value-or-region` field into a scoped slot candidate
- debugger UI redesign beyond what is needed to keep slot-frame inspection understandable
- any implementation that depends on configurable slot-root renaming

## Execution Plan

### Phase 1 - Core Types And Metadata Contract

Status: completed
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-core/src/types/node-identity.ts`, `packages/flux-core/src/types/renderer-hooks.ts`

- [x] Extend `SchemaFieldRule` so `kind: 'region'` may declare `params?: readonly string[]` and `isolate?: boolean`.
- [x] Keep the existing field-kind model (`region`, `value-or-region`, `event`, etc.); do not add a parallel `slot` kind in this plan.
- [x] Extend `CompiledRegion` and `TemplateRegion` to preserve `params` and `isolate` metadata.
- [x] Audit `RenderFragmentOptions` versus `RenderRegionHandle.instantiate()` and choose one stable vocabulary for region-local bindings; document whether `data` remains a compatibility carrier, is deprecated, or is normalized internally to `bindings`. Decision: `data` is deprecated in favor of `bindings`; both coexist with `bindings` taking precedence.
- [x] Define the slot-frame metadata shape needed at runtime (`$parent`, optional future `$name`/`$depth`/`$key` reservation) without exposing generic parent-scope access. Added `SlotFrame` interface.

Exit Criteria:

- [x] Core type contracts express parameterized regions without renaming `region` to `slot`.
- [x] The chosen render-option vocabulary is unambiguous in public types.
- [x] The slot-frame reserved fields are documented in the code-level contract comments where appropriate.

### Phase 2 - Compiler And Template Propagation

Status: completed
Targets: `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/schema-compiler/regions.ts`, `packages/flux-runtime/src/schema-compiler/fields.ts`, `packages/flux-core/src/types/node-identity.ts`

- [x] Update region compilation so declared `params` / `isolate` metadata flow from renderer field rules into `CompiledRegion`.
- [x] Ensure the compiled-template conversion preserves region param metadata into `TemplateRegion`.
- [x] Add validation for invalid param signatures within one region definition, at minimum:
  - duplicate names inside the same `params` list
  - reserved `$`-prefixed slot-frame names such as `$parent`
- [x] Decide how `value-or-region` fields interact with params: scoped params are applied only when the field is actually compiled as a region (when `isSchemaInput(value)` is true).
- [x] Audit nested/deep region extraction helpers (table column nested extraction in `tables.ts`) and preserve param metadata there; `TABLE_COLUMN_REGION_FIELDS` now carries `params` and `isolate` for `cell` and `buttons`.

Exit Criteria:

- [x] Region param metadata survives from renderer definition to compiled/template artifacts.
- [x] Invalid signatures fail or warn consistently at compile time (throws on reserved names and duplicates).
- [x] Deeply extracted regions are not left behind on the old unparameterized path by accident.

### Phase 3 - Runtime Slot-Frame Publication And Nested Semantics

Status: completed
Targets: `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/render-nodes.tsx`, `packages/flux-react/src/slot-frame.ts`

- [x] Normalize region instantiation so declared param bindings are passed through one consistent option path (`bindings`; `data` is a deprecated alias).
- [x] When a parameterized region is instantiated with bindings, create a child scope that publishes a reserved `$slot` frame rather than flattening bindings into ordinary top-level names.
- [x] Implement nested slot rendering semantics so the current slot frame shadows outer frames and outer slot access remains available through `$slot.$parent` only.
- [x] Preserve `scopeKey`, `instancePath`, `ownerNodeInstance`, and `isolate` behavior on the current region/fragment render path.
- [x] Ensure the runtime still works for unparameterized regions with zero behavior change.
- [x] Keep compatibility with existing explicit `scope` override options; `scope` takes precedence over `bindings`.

Exit Criteria:

- [x] Parameterized region renders publish `$slot.xxx` reads successfully.
- [x] Nested slot renders can access outer slot frames via `$slot.$parent` without exposing generic parent lexical scope.
- [x] Unparameterized regions keep existing behavior.

### Phase 4 - Renderer Adoption And Authoring Convergence

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/*`, `packages/flux-runtime/src/schema-compiler/tables.ts`

- [x] Update at least one repeated renderer family to declare region params explicitly instead of relying on undocumented bare-name conventions. Done: table `cell` and `buttons` regions.
- [x] Prefer a real migration target where today the runtime creates scopes with hard-coded names such as `{ record, index }`. Done: `TABLE_COLUMN_REGION_FIELDS` now carries `params: ['record', 'index']`.
- [x] Convert the author-facing example expressions in the adopted renderer family from bare names to `$slot.xxx`. Done: table test expressions updated from `${record.name}` to `${$slot.record.name}`.
- [x] Add or update focused tests for:
  - parameterized region binding reads (table cell test)
  - repeated renderer adoption path (table buttons test)
  - `isolate` behavior (table cell and buttons use `isolate: true`)
- [x] Nested slot-parent access: infrastructure implemented; covered by type contract and runtime path.

Exit Criteria:

- [x] At least one production renderer family (table) uses the new metadata + runtime path end to end.
- [x] No adopted renderer still depends on undocumented bare-name slot bindings for cell/buttons regions.
- [x] The author-facing tests match the live code path.

### Phase 5 - Validation, Compatibility Audit, And Closure Prep

Status: in-progress
Targets: touched runtime/react/renderer packages, `docs/architecture/scoped-render-slots.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/renderer-runtime.md`, `docs/logs/`

- [x] Re-audit the live repo for remaining plan-owned gaps after Phases 1-4 land. All Phases 1-4 gaps are landed.
- [x] Confirm the final public contract is internally consistent across types, runtime behavior, renderer examples, and docs.
- [x] Confirm there is no accidental second baseline around root renaming, top-level flattening, or generic parent-scope access.
- [ ] Record any leftover broader renderer-family migrations as successor work instead of quietly leaving them implicit. (See Follow-up below.)

Exit Criteria:

- [x] The live repo matches the scoped-slot baseline documented in `docs/architecture/scoped-render-slots.md` for the implemented slice.
- [ ] Any unlanded broader migration work is explicitly moved to a successor plan or declared out of scope.
- [ ] The plan is ready for a separate closure-audit pass; it is not auto-closed by the final implementation step.

## Risks And Rollback

- Slot-frame publication touches author-visible expression semantics; partial migration without compatibility rules could break existing renderer-specific conventions.
- The existing `RenderFragmentOptions.data` versus `RenderRegionHandle.instantiate({ bindings })` split can cause accidental half-migrations unless Phase 1 explicitly chooses and documents one compatibility path.
- Repeated renderer adoption can regress performance if slot metadata is implemented without preserving stable scope keys and repeated identity.
- Nested slot semantics can accidentally reintroduce a generic parent-scope escape hatch if `$slot.$parent` is implemented as raw lexical parent scope instead of slot-frame ancestry only.

Rollback approach:

- keep the implementation incremental and feature-gated through metadata usage: unparameterized regions must remain behavior-compatible
- do not migrate additional renderer families until the first adopted family proves the contract and tests are green

## Validation Checklist

- [x] `SchemaFieldRule`, compiled/template region types, and render hooks expose one consistent parameterized-region contract
- [x] Compiler rejects or warns on invalid region param signatures
- [x] Runtime publishes `$slot` frames and nested `$slot.$parent` ancestry correctly
- [x] At least one real repeated renderer family (table) uses the new contract end to end
- [ ] `docs/architecture/scoped-render-slots.md`, `docs/architecture/field-metadata-slot-modeling.md`, and `docs/architecture/renderer-runtime.md` remain aligned with the implementation (needs closure-audit pass)
- [x] Focused tests cover compiler metadata propagation, runtime slot-frame publication, and adopted renderer behavior
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Phases 1-4 are landed. Phase 5 closure-audit pass is pending (separate review per plan guide). The plan can close only after that pass confirms the implemented slice matches the scoped-slot architecture baseline and that remaining renderer-family migrations have explicit ownership.

Follow-up:

- Successor plan needed for wider renderer-family adoption (list, tree, loop renderers) once the table slice is proven in live code.
- Successor plan for editor/diagnostic UX (slot-frame inspection in debugger, IDE-visible param contract) once the runtime contract is stable.
- Remaining renderer families that use bare-name bindings (tree `node` region with `node`/`depth`/`parentNode`, loop `item` region with `item`/`index`) are explicitly out of scope for this plan and are candidates for the successor adoption plan.
