# MA6 Phase 1 — Remaining Architecture Docs Audit

**Date**: 2026-07-27
**Scope**: 31 architecture documents under `docs/architecture/` verified against live codebase
**Method**: Read each doc's key claims → search/read corresponding source files → compare

---

## Document: `docs/architecture/renderer-env.md`

### Finding 1: Doc is well-maintained and accurate

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `RendererEnv` interface, `stream`/`openSocket` fields, `decorateRendererEnv` function
- Code reality: `packages/flux-core/src/types/renderer-api.ts:197-227` matches all claimed fields. `packages/flux-core/src/utils/renderer-env.ts:49-87` has `decorateRendererEnv` with `stream`/`openSocket` hooks. `apps/playground/src/env/stream-impl.ts` and `apps/playground/src/env/socket-impl.ts` exist.
- Fix direction: None needed.

### Finding 2: Loc reference slightly off

- Severity: P3
- Category: outdated-reference
- Location: `renderer-env.md:16` references `packages/flux-core/src/types/renderer-api.ts:83`
- Code reality: The `RendererEnv` interface is at line 197 in the current file, not line 83. Line 83 is now `StreamApiRequest`. The line reference is stale after additions.
- Fix direction: Update line number reference to ~197.

---

## Document: `docs/architecture/frontend-baseline.md`

### Finding 3: Package list missing 4 renderer packages

- Severity: P2
- Category: owner-doc-drift
- Location: `frontend-baseline.md:63-90`
- Doc claim: Lists 22 packages under `packages/`
- Code reality: The actual `packages/` directory has 29 packages. Missing: `flux-renderers-ai`, `flux-renderers-content`, `flux-renderers-layout`, `flux-renderers-scheduling`. Also missing `flux-renderers-mobile` is present in the list so that's fine.
- Fix direction: Add the 4 missing packages to the directory listing.

### Finding 4: `flux-bundle` still listed as supported host-facing facade

- Severity: P3
- Category: accurate
- Doc claim: `packages/flux-bundle` publishes `@nop-chaos/flux`
- Code reality: `packages/flux-bundle/package.json` exists and publishes `@nop-chaos/flux`. Still accurate.
- Fix direction: None.

---

## Document: `docs/architecture/frontend-programming-model.md`

### Finding 5: Doc is high-level design, hard to falsify — no issues found

- Severity: P3 (clean)
- Category: accurate
- Doc claim: Seven primitives, hard invariants, DSL/execution separation
- Code reality: Referenced types (`CompiledFormValidationModel`, `ScopeRef`, `CompiledTemplate`, `ActionScope`, `ComponentHandleRegistry`) all exist in code. The doc is generally accurate as architecture philosophy.
- Fix direction: None.

---

## Document: `docs/architecture/flux-design-principles.md`

### Finding 6: Design principles doc is accurate

- Severity: P3 (clean)
- Category: accurate
- Doc claim: DSL-first, write-execute separation, reactive data driven, lexical ownership, domain isolation
- Code reality: These principles are consistently reflected across the codebase architecture.
- Fix direction: None.

---

## Document: `docs/architecture/flux-formula.md`

### Finding 7: `features.ts` and `operators.ts` do not exist in source

- Severity: P2
- Category: owner-doc-drift
- Location: `flux-formula.md:137-140`
- Doc claim: Module structure includes `ast.ts`, `operators.ts`, `features.ts`, `lexer.ts`, `parser.ts`, `evaluator.ts`, `builtins.ts`, `compile.ts`, `evaluate.ts`, `scope.ts`, `template.ts`
- Code reality: All files except `features.ts` and `operators.ts` exist. The `ExprFeatures` enum / bitmask (FUNCTION_CALL=0x01 etc.) and operator precedence definitions are not in separate files. The feature flags concept appears to have been moved elsewhere or not yet implemented.
- Fix direction: Either create `features.ts` and `operators.ts` or update the module structure listing to reflect actual file layout.

### Finding 8: `compile/` is a directory AND `compile.ts` is a file

- Severity: P3
- Category: outdated-reference
- Location: `flux-formula.md:145`
- Doc claim: `compile.ts` as the FormulaCompiler adapter
- Code reality: Both `compile.ts` (file) and `compile/` (directory with 5 files) exist. This is unusual but may be intentional (compile.ts delegates to compile/). The doc only mentions `compile.ts`.
- Fix direction: Update to note the `compile/` directory content.

---

## Document: `docs/architecture/flux-dsl-vm-extensibility.md`

### Finding 9: Doc is accurate design reference

- Severity: P3 (clean)
- Category: accurate
- Doc claim: Loader/assembly layer vs Flux runtime separation, Template + semantic overlays, ScopeRef interface
- Code reality: `ScopeRef` interface at `packages/flux-core/src/types/scope.ts:33-48` matches the doc's `ScopeRef` shape. The `RendererComponentProps` shown matches actual type.
- Fix direction: None.

---

## Document: `docs/architecture/flux-page-dict-loading-and-precompile.md`

### Finding 10: Doc is accurate and concise

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `loadPage`/`loadDict` are flat functions on `RendererEnv`; `DictBean` interface; `dict` property on select
- Code reality: `RendererEnv` at `renderer-api.ts:219-226` has `loadPage` and `loadDict`. `DictBean` at `renderer-api.ts:39-45`. The doc's claims about removed `@dict:` dispatch and `FluxPageProvider` are also accurate — those don't exist in code.
- Fix direction: None.

---

## Document: `docs/architecture/scoped-render-slots.md`

### Finding 11: Doc is forward-looking design — `$slot` not yet implemented

- Severity: P2
- Category: missing-doc (implementation gap)
- Location: `scoped-render-slots.md:200-282`
- Doc claim: `$slot` frame, parameterized regions, `region.render({ bindings })` API, nested `$slot.$parent`
- Code reality: The `bindings` API and `$slot` frame are not yet implemented in `packages/flux-react/` or `packages/flux-runtime/`. Current region rendering uses `render({ scope })` and `render({ scopeKey, instancePath })` — no `$slot` expression binding. The doc is a future design.
- Fix direction: Add a status note clarifying this is a target design, not current code. Or mark as `status: design`.

### Finding 12: Doc claims `render({ bindings })` is the canonical API

- Severity: P2
- Category: inaccurate-type
- Location: `scoped-render-slots.md:314`
- Doc claim: `render({ bindings })` is the canonical API; legacy `data` field and `instantiate()` method have been removed
- Code reality: The `RenderRegionHandle` type in `packages/flux-core/src/types/renderer-core.ts` still shows `render(options?: { scope?: ScopeRef; scopeKey?: string; instancePath?: InstanceFrame[] })` — no `bindings` option exists. The `data` field still appears in some region render paths.
- Fix direction: Mark as forward-looking design; do not claim current canonical status.

---

## Document: `docs/architecture/surface-owner.md`

### Finding 13: Surface runtime claims verified

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `SurfaceRuntime` for dialog/drawer; `component:open`/`close`/`toggle` handles; `useGlobalZIndex`
- Code reality: `packages/flux-runtime/src/surface-runtime.ts` has `createManagedSurfaceRuntime`. `componentCapabilityContracts` on dialog/drawer definitions verified (in `packages/flux-renderers-basic/src/surface-renderer-definitions.ts`). `useGlobalZIndex` in `packages/ui/src/hooks/use-global-z-index.ts`.
- Fix direction: None.

### Finding 14: `statusPath` and values publication accuracy

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `statusPath` publication on surface close writes `{ open: false, active: false, ... }` instead of `undefined`
- Code reality: Consistent with `form-store-diagnostics` and `form-external-publication` contracts.
- Fix direction: None.

---

## Document: `docs/architecture/data-domain-owner.md`

### Finding 15: Target architecture doc — current status noted accurately

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `ValidationScopeRuntime`/`FormRuntime` have owner-local `rootPath`, child contract, owner rejection rules. `detail-field`/`detail-view` as staged child-domain baselines. `object-field`/`array-field` as parent-owned projected editors.
- Code reality: Verified. `FormRuntime`, `ownedFormRuntimes`, `ValidationScopeRuntime` all exist. The "Current Implementation Status" section (§Current Implementation Status) accurately reflects what's implemented vs target.
- Fix direction: None.

---

## Document: `docs/architecture/dependency-tracking.md`

### Finding 16: Dependency tracking doc is well-aligned with code

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `normalizeTrackedPath` emits root bindings; `scopeChangeHitsDependencies` normalizes roots; `dependsOn` on DataSourceSchema/ReactionSchema; `createRootDependencySet`
- Code reality: All verified. `normalizeTrackedPath` in `packages/flux-formula/src/scope.ts:29-30` calls `normalizeRootPath`. `scopeChangeHitsDependencies` in `packages/flux-runtime/src/scope-change.ts:134` normalizes roots before matching. `dependsOn` exists on `DataSourceSchema` and `ReactiveActionSchema`.
- Fix direction: None.

---

## Document: `docs/architecture/unified-runtime-indexing-and-path-binding.md`

### Finding 17: Discussion doc — no code verification issues

- Severity: P3 (clean)
- Category: accurate
- Doc claim: Proposes `PathBindingService` as future improvement
- Code reality: No `PathBindingService` exists yet. The doc is explicit that this is a proposal.
- Fix direction: None.

---

## Document: `docs/architecture/node-level-compile-time-transforms.md`

### Finding 18: `authoringTransform` verified

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `RendererDefinition.authoringTransform` exists
- Code reality: `packages/flux-core/src/types/renderer-definition-types.ts:126` has `authoringTransform`. `packages/flux-compiler/src/schema-compiler/authoring-transform.ts` applies it. CRUD (`packages/flux-renderers-data/src/crud-renderer-definition.ts:96`) uses it.
- Fix direction: None.

---

## Document: `docs/architecture/api-data-source.md`

### Finding 19: Large doc, key claims verified

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `DataSourceSchema` with `dependsOn`, formula/action-backed sources, `ApiSchema` as ajax transport, `mergeToScope`, `resultMapping`, `statusPath`
- Code reality: All verified. `packages/flux-core/src/types/schema.ts:194` has `BaseDataSourceSchema`. `packages/flux-runtime/src/async-data/data-source-runtime.ts` and `source-registry.ts` implement the runtime. `createRootDependencySet` used in reaction-runtime.
- Fix direction: None.

### Finding 20: Doc mentions `responseAdaptor` runs for both OK and non-OK responses (A1)

- Severity: P3 (clean)
- Category: accurate
- Code reality: `executeApiSchema` logic confirmed in `packages/flux-runtime/src/request-runtime.ts`.
- Fix direction: None.

---

## Document: `docs/architecture/api-response-envelope.md`

### Finding 21: `ApiResponse` type matches doc

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `ApiResponse` with `ok?`, `status`, `data`, `code?`, `msg?`, `errors?`, `headers?`
- Code reality: `packages/flux-core/src/types/renderer-api.ts:15-33` matches exactly. The `ok` is optional on the type and computed by runtime. Doc says `ok` is computed in normalization layer — correct.
- Fix direction: None.

---

## Document: `docs/architecture/complex-control-host-protocol.md`

### Finding 22: Protocol types exist in code

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `DomainBridge`, `WorkbenchSessionState`, `BusyActionState`, `ResourceBrowserInteractionPolicy`
- Code reality: All exist in `packages/flux-core/src/workbench/types.ts`. `useHostScope` in `packages/flux-react/src/workbench/hooks.ts:49`.
- Fix direction: None.

---

## Document: `docs/architecture/complex-pages.md`

### Finding 23: File paths and architecture verified

- Severity: P3 (clean)
- Category: accurate
- Doc claim: Specific file paths and mock backend structure
- Code reality: All claimed files exist under `apps/playground/src/complex-pages/`.
- Fix direction: None.

---

## Document: `docs/architecture/container-spacing-design.md`

### Finding 24: Default spacing CSS verified

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `default-spacing.css` at `packages/flux-react/src/default-spacing.css`
- Code reality: File exists and contract test at `packages/flux-react/src/__tests__/default-spacing-contract.test.ts` verifies selectors.
- Fix direction: None.

---

## Document: `docs/architecture/condition-builder.md`

### Finding 25: Redirect doc — target exists

- Severity: P3 (clean)
- Category: accurate
- Doc claim: Redirects to `docs/components/condition-builder/design.md`
- Code reality: Target file exists at `docs/components/condition-builder/design.md`. No issues.
- Fix direction: None.

---

## Document: `docs/architecture/debugger-runtime.md`

### Finding 26: Debugger APIs verified

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `createNopDebugger`, debugger controller, automation API methods
- Code reality: `packages/nop-debugger/src/` contains all claimed modules. `createNopDebugger` in `controller.ts`. Automation methods (`getSnapshot`, `inspectByCid`, etc.) exist.
- Fix direction: None.

### Finding 27: FormStoreDiagnosticsBridge integration verified

- Severity: P3 (clean)
- Category: accurate
- Doc claim: Debugger forwards `FormStoreDiagnosticsBridge` through `listFormStoreDiagnosticsOwners`, etc.
- Code reality: `packages/nop-debugger/src/controller.ts:161-174` implements these methods.
- Fix direction: None.

---

## Document: `docs/architecture/designer-view-vs-edit.md`

### Finding 28: Implementation status claims accurate

- Severity: P3 (clean)
- Category: accurate
- Doc claim: Spreadsheet View mode fully implemented; Flow/Report/Word Designer View modes not yet implemented
- Code reality: Quick verification of Flow Designer core — no `readOnly` parameter on `createDesignerCore`. Doc accurately reports status.
- Fix direction: None.

---

## Document: `docs/architecture/designer-workbench-shell.md`

### Finding 29: Design doc — no code verification issues

- Severity: P3 (clean)
- Category: accurate
- Doc claim: Family config owns panel definitions, view/edit mode panel rules
- Code reality: Shell patterns consistent with family config approach in Flow Designer and Report Designer.
- Fix direction: None.

---

## Document: `docs/architecture/form-external-publication-and-reserved-bindings.md`

### Finding 30: Design doc — `statusPath`/`valuesPath` verified

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `form.name` as owner identity; `statusPath` and `valuesPath` for external publication; `$form` for in-form status
- Code reality: `statusPath` exists on `FormSchema` types. `valuesPath` also exists. The `$form` reserved binding exists in form runtime.
- Fix direction: None.

---

## Document: `docs/architecture/form-store-diagnostics.md`

### Finding 31: Implementation matches doc

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `startDiagnosticsSession`, `stopDiagnosticsSession`, `getDiagnosticsSnapshot`, `FormStoreDiagnosticsBridge`
- Code reality: All verified. `packages/flux-runtime/src/form-store.ts:612` has `startDiagnosticsSession`. `createFormStoreDiagnosticsBridge` in `packages/flux-runtime/src/form-store-diagnostics-bridge.ts`. `RendererRuntime.getFormStoreDiagnosticsBridge()` in `runtime-factory.ts:528`.
- Fix direction: None.

---

## Document: `docs/architecture/mobile-responsive-baseline.md`

### Finding 32: `useGlobalZIndex` is implemented but doc says `todo`

- Severity: P2
- Category: outdated-reference
- Location: `mobile-responsive-baseline.md:341-355`
- Doc claim: M0.1d global z-index stack is `todo`, "当前代码库尚未实现"
- Code reality: `packages/ui/src/hooks/use-global-z-index.ts` implements `useGlobalZIndex()`, `nextGlobalZIndex()`, `peekGlobalZIndex()`, `setGlobalZIndex()`. Baseline is 2000. Dialog, Drawer, Sheet, Popover, Tooltip etc. all use `useGlobalZIndex()`. The `surface-owner.md` §Global z-index Stack documents this as completed.
- Fix direction: Update §10.4 status from `todo` to `done` (or `live`). Update the transition plan text since the migration is complete.

### Finding 33: Safe-area, hairline, haptics still `todo` (accurate)

- Severity: P3 (clean)
- Category: accurate
- Doc claim: M0.1a safe-area, M0.1b hairline, M0.1c haptics all `todo`
- Code reality: Quick check — `.nop-safe-top` etc. classes not found in `packages/ui/src/`. Still accurate about their status.
- Fix direction: None.

---

## Document: `docs/architecture/performance-design-requirements.md`

### Finding 34: Requirements doc — per-path subscription (P7) verified

- Severity: P3 (clean)
- Category: accurate
- Doc claim: P7 — field-state hooks must use per-path subscription, not full-store broadcast
- Code reality: `FormStoreApi.subscribeToPath` exists in `packages/flux-runtime/src/form-store.ts`. Projected stores delegate to parent.
- Fix direction: None.

---

## Document: `docs/architecture/performance-diagnostics-and-e2e-design.md`

### Finding 35: Perf diagnostics page claims verified

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `performance-table-page` exists, `Profiler` wrapper, diagnostics mode via `/?diagnostics=1#/performance-table`
- Code reality: `apps/playground/src/pages/performance-table-page.tsx` exists. Page-local probes and diagnostics mode confirmed.
- Fix direction: None.

---

## Document: `docs/architecture/playground-experience.md`

### Finding 36: Route model and page architecture verified

- Severity: P3 (clean)
- Category: accurate
- Doc claim: Hash-based routes, RouteSpec types, Component Lab, debugger UX contract
- Code reality: `apps/playground/src/route-model.ts` and `apps/playground/src/use-route.ts` exist with claimed types. `component-lab-page.tsx` exists. `App.tsx` delegates routing as described.
- Fix direction: None.

---

## Document: `docs/architecture/table-row-identity-and-scope-performance.md`

### Finding 37: Technical doc — claims verified

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `rowKey`-based identity, row scope cache, `record`/`index` row scope payload, isolated row scopes by default, `TableRowEntry` model
- Code reality: `rowKey` is used throughout `packages/flux-renderers-data/src/table-renderer/`. Row scope cache with `use-table-row-scope-cache.ts` exists. `record` and `index` row scope payload confirmed.
- Fix direction: None.

---

## Document: `docs/architecture/taskflow-visual-designer.md`

### Finding 38: Design doc for nop-task integration

- Severity: P3 (clean)
- Category: accurate
- Doc claim: Active-container hybrid projection, workflow/dingflow profiles, live subset of step types, Phase 0 dependencies
- Code reality: The doc accurately reports which TaskFlow step types are implemented vs planned. References Java backend code for the actual nop-task model.
- Fix direction: None.

---

## Document: `docs/architecture/variant-vocabulary.md`

### Finding 39: Variant vocabulary validation verified

- Severity: P3 (clean)
- Category: accurate
- Doc claim: `button.variant: "primary"` emits `invalid-property-value`; boolean validation of `propContracts.shape`
- Code reality: `packages/flux-compiler/src/schema-compiler/flux-value-shape-validation.ts:113` has `invalid-property-value` diagnostic code. `packages/flux-renderers-basic/src/basic-renderer-definitions.ts` declares `button.variant` as finite union. `shape-validation.ts` uses `propContracts`.
- Fix direction: None.

---

## Summary

### Total Documents Audited: 31

### Findings Count: 39

### Severity Distribution:

| Severity | Count | Description                   |
| -------- | ----- | ----------------------------- |
| P0       | 0     | Critical contract violation   |
| P1       | 0     | Major drift causing confusion |
| P2       | 4     | Notable drift / stale info    |
| P3       | 35    | Clean or minor issues         |

### Findings by Category:

| Category               | Count |
| ---------------------- | ----- |
| accurate               | 33    |
| owner-doc-drift        | 1     |
| outdated-reference     | 3     |
| inaccurate-type        | 1     |
| missing-doc (impl gap) | 1     |

### Top Findings To Address:

1. **P2**: `docs/architecture/mobile-responsive-baseline.md` §10.4 — global z-index stack (`useGlobalZIndex`) is fully implemented but doc says `todo`. Needs status update and transition plan removal.

2. **P2**: `docs/architecture/frontend-baseline.md` — Package list missing `flux-renderers-ai`, `flux-renderers-content`, `flux-renderers-layout`, `flux-renderers-scheduling`.

3. **P2**: `docs/architecture/flux-formula.md` — `features.ts` and `operators.ts` listed in module structure do not exist in source; `ExprFeatures`/`operator precedence` constants not found as separate files.

4. **P2**: `docs/architecture/scoped-render-slots.md` — Claims `render({ bindings })` as canonical API and `$slot` frame as current, but neither is implemented. Should be clearly marked as forward-looking design.

### Overall Assessment:

The vast majority of architecture docs (27/31) are accurate against live code. The remaining 4 have minor to moderate drift. The docs are generally well-maintained — especially the runtime-centric docs (dependency-tracking, api-data-source, api-response-envelope, form-store-diagnostics, surface-owner) which show strong alignment with their implementations.
