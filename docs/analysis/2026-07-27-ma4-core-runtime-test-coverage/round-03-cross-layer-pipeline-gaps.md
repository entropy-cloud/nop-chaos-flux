# Round 3 — Cross-Layer Pipeline Continuity Test Gaps

> Date: 2026-07-27
> Scope: flux-formula → flux-compiler → flux-action-core → flux-runtime → flux-react → flux-bundle
> Method: Audit of mock/stub patterns, isolated layer tests, and missing full-pipeline integration tests

---

## Summary

Core+runtime packages each have strong **intra-layer** test coverage, but **cross-layer contract preservation** is mostly untested. Four pipeline segments have well-defined contracts tested only in isolation, and the compiler→runtime→react chain for validation has a **`CompiledFormValidationModel` bypass anti-pattern** that masks real integration bugs.

---

## Findings

### Finding R3-1 — Validation pipeline: compile→runtime validation model is bypassed in runtime validation tests

- **Severity**: P1
- **Category**: 跨层断层
- **Pipeline segment**: compile → runtime
- **Contract**: Schema validation rules (required, minLength, equalsField, requiredWhen, etc.) → compiler lowering (`collectSchemaValidationRules` + `compileValidationRules` + `mergeValidationRules`) → `CompiledFormValidationModel` → runtime validation execution (`form.validate()`, `form.submit()`)
- **Test files**:
  - Isolated: `packages/flux-compiler/src/validation-lowering.test.ts` (tests lowering functions individually)
  - Isolated: `packages/flux-core/src/validation-model.test.ts` (tests `buildCompiledFormValidationModel` individually)
  - Isolated: `packages/flux-runtime/src/__tests__/runtime-validation.test.ts` (lines 48-86 — manually constructs `CompiledFormValidationModel` with `compiledRule()` helper, never calls `runtime.compile()` for validation rules)
  - Partial compile→structure: `packages/flux-runtime/src/__tests__/runtime-validation-compile.test.ts` (calls `runtime.compile()`, inspects `node.validationPlan` structure, but never runs validation with it)
  - Full pipeline missing: **no test at any path**
- **Status**: `runtime-validation.test.ts` constructs its validation model by hand for ~90% of test cases. The `compiledRule()` helper in `test-fixtures.ts` creates rule objects that match the compiler's output format, but bypasses the entire lowering pipeline (`collectSchemaValidationRules` → `compileValidationRules` → `mergeValidationRules` → `collectSchemaValidationRules` → `compileValidationRules` in flux-compiler, then `buildCompiledFormValidationModel` in flux-core).
- **Why coverage is misleading**: If the compiler output format changes (e.g., rule ID format, dependency structure, behavior shape), `runtime-validation.test.ts` would continue to pass because it uses hand-crafted input, not compiled output. The `runtime-validation-compile.test.ts` test verifies structure but never verifies that the compiled structure actually drives correct validation execution.
- **Recommendation**: Add a single integration test in flux-runtime that:
  1. Calls `runtime.compile()` with a form schema containing real validation rules (required, equalsField, minLength)
  2. Creates a form runtime from `runtime.createFormRuntime()` using the compiled `node.validationPlan`
  3. Sets values that should trigger validation failures
  4. Calls `form.submit()` or `form.validateField()`
  5. Asserts the expected errors are returned — this proves the compiled validation model drives runtime behavior correctly

---

### Finding R3-2 — Validation pipeline: runtime validation errors never tested through React error display

- **Severity**: P1
- **Category**: 跨层断层
- **Pipeline segment**: runtime → react (validation error display)
- **Contract**: FormRuntime validation errors → form store → form-state selectors → FieldFrame/error hooks → rendered error messages
- **Test files**:
  - Runtime validation: `packages/flux-runtime/src/__tests__/runtime-validation.test.ts` (tests `form.getError()` returns errors at runtime level)
  - Form state selectors: `packages/flux-react/src/__tests__/form-state.test.ts` (tests `selectCurrentFormErrors`, `isFieldEffectivelyRequired` with manually constructed `FormStoreState`)
  - FieldFrame layout: `packages/flux-react/src/field-frame-layout.test.tsx` (tests FieldFrame rendering but with `createMockForm()` that returns `EMPTY_FORM_STORE_STATE` — no errors in the store)
  - Hook contracts: `packages/flux-react/src/__tests__/hook-contracts.test.tsx` (tests hooks exist, not error display)
  - Validation owner boundary: `packages/flux-react/src/__tests__/schema-renderer-validation-owner-boundary.test.tsx` (tests validation owner scope IDs, not error rendering)
  - Form errors hook: `packages/flux-react/src/hooks-form-errors.test.tsx` (tests hooks with manually constructed context)
- **Status**: No test exists that renders a form with validation rules through `SchemaRenderer`, triggers validation (e.g., blur on a required field), and asserts that an error message appears in the DOM. Every layer of the validation→display pipeline is tested in isolation, but the connected path is untested.
- **Why coverage is misleading**: A change to error data structure in the store, a bug in `useCurrentFormError`/`useFieldError` hook subscriptions, or a FieldFrame rendering regression would not be caught. The runtime-level tests check `form.getError()` API return values, but there's no verification that these errors propagate through the React rendering pipeline to visible UI.
- **Recommendation**: Add a flux-react integration test that:
  1. Renders a form with a required field through `SchemaRenderer` (real compiler + real runtime)
  2. Submits the form (triggering validation)
  3. Uses `screen.findByText()` to assert the error message is rendered in the DOM
  4. Optionally co-verify the FieldFrame's `data-field-mode` attribute changes
     This should use the existing `probeFormSchema` test patterns rather than mocking any layer.

---

### Finding R3-3 — Data-source pipeline: schema-level lowering not tested end-to-end

- **Severity**: P2
- **Category**: 跨层断层
- **Pipeline segment**: compile → runtime (data-source schema lowering)
- **Contract**: Schema data-source (`data: { ... }` or `api: { ... }`) → compiler auto-lowers to `compiledSources` on TemplateNode → runtime `registerDataSource()` or source controller → react `useSourceValue` → renderer receives resolved data
- **Test files**:
  - Compile only: `packages/flux-compiler/src/source-compiler.test.ts` (tests `compileDataSource` output format)
  - Runtime with manual register: `packages/flux-runtime/src/__tests__/runtime-sources-lifecycle.test.ts`, `runtime-sources-refresh.test.ts`, `runtime-sources-merge.test.ts`, `runtime-sources.test.ts` — all call `runtime.registerDataSource()` with pre-compiled data sources
  - React with manual register: `packages/flux-react/src/__tests__/data-source-and-node-identity.test.tsx` (lines 69-83 — manually calls `runtime.registerDataSource()` with `compileDataSource()`)
  - React hook isolated: `packages/flux-react/src/__tests__/use-source-value.test.tsx` (completely mocked observer, no real data source)
  - Missing: **no test that defines a data source in the schema and lets the compiler auto-lower it**, then renders through `SchemaRenderer`
- **Status**: The data-source pipeline is tested at each layer, but the key contract — the schema compiler's automatic lowering of `data:` / `api:` schema properties into `compiledSources` on the TemplateNode — is never exercised in a way that proves the lowered output is correctly consumed by the runtime. All runtime/react tests manually call `registerDataSource()` with pre-compiled input, bypassing the schema compiler's auto-lowering logic.
- **Why coverage is misleading**: If the schema compiler changes how it attaches data sources to TemplateNodes (e.g., field name changes, structural nesting changes), all existing tests would pass because they construct the compiled source manually. Only the compiler's own tests would catch format changes, but they don't verify downstream consumption.
- **Recommendation**: Add a test (either in flux-runtime or flux-react) that:
  1. Passes a schema with `data: { name: 'users', action: 'ajax', args: { url: '/api/users' } }` to `runtime.compile()`
  2. Inspects the compiled TemplateNode's source metadata (if stored on the node) to verify auto-lowering
  3. Or in flux-react: renders a page with `api:` data source and verifies the data appears through `useDataSourceStatus` without manual `registerDataSource()` call

---

### Finding R3-4 — Action dispatch pipeline: schema event compilation not tested through to execution

- **Severity**: P2
- **Category**: 跨层断层
- **Pipeline segment**: compile → runtime → react (action dispatch)
- **Contract**: Schema action (e.g., `onClick: { action: 'ajax', args: {...} }`) → compiler lowers to `compiledAction` on TemplateNode → runtime `resolveNodeEvents()` → React event handler → `runtime.dispatch()` → `action-adapter` → side effect
- **Test files**:
  - Compile only: `packages/flux-compiler/src/action-compiler.test.ts` (tests `compileAction`/`compileActions` output)
  - Action dispatcher: `packages/flux-action-core/src/__tests__/action-dispatcher-routing.test.ts` (tests routing with pre-compiled actions)
  - Runtime adapter: `packages/flux-runtime/src/__tests__/action-adapter.builtins.test.ts` (lines 15-28 — adapter constructed with manual evaluate mock, bypassing real expression compilation)
  - Runtime dispatch: `packages/flux-runtime/src/__tests__/runtime-actions-*.test.ts` — call `runtime.dispatch()` with pre-compiled actions
  - React events: `packages/flux-react/src/__tests__/event-prevention.test.tsx` (tests `preventDefault`/`stopPropagation` through SchemaRenderer)
  - Dialog actions: `packages/flux-react/src/__tests__/dialog-actions.test.tsx` (partial full-pipeline — renders form, triggers button, but action is `setValue`/`submitForm` builtins, not tested with real compiler lowering from events)
- **Status**: The schema event → compile → runtime eval → adapter pathway is tested in pieces. The `action-adapter.builtins.test.ts` constructs the adapter with `evaluate: (target) => target` — a mock that skips real expression evaluation. Most runtime dispatch tests compile actions beforehand but pass them to `runtime.dispatch()` directly rather than through the event handler chain (`resolveNodeEvents` → React event → dispatch).
- **Why coverage is misleading**: The event-to-action binding logic in `resolveNodeEvents`, which maps schema event definitions to React event handlers that call `runtime.dispatch()` with the right context (scope, form, page), is not tested from real schema compilation through to execution. A breaking change in the compiled action format or event handler construction would not be caught by existing tests.
- **Recommendation**: Add a flux-react test that:
  1. Renders a page with a button whose `onClick` contains an action (e.g., `{ action: 'setValue', args: { path: 'x', value: 'clicked' } }`)
  2. Simulates a click via `fireEvent.click()`
  3. Asserts the scope value was updated — this proves the full chain: schema → compiler → React event handler → runtime dispatch → action execution → scope mutation

---

### Finding R3-5 — Scope propagation: real schema scope chain (page→form→fragment) not tested end-to-end

- **Severity**: P2
- **Category**: 跨层断层
- **Pipeline segment**: runtime → react (scope chain creation and propagation)
- **Contract**: `runtime.compile(form)` produces TemplateNode with `scopePlan.kind === 'form'` → runtime creates child scope → form fields resolve values correctly → fragment scopes nest → `useScopeSelector` reads from correct scope ancestor
- **Test files**:
  - Scope core: `packages/flux-runtime/src/__tests__/scope-ownership-lexical-and-nested.test.ts` (uses `createScopeRef()` directly, never through runtime)
  - Runtime scope: `packages/flux-runtime/src/__tests__/runtime-scope-props.test.ts` (uses `runtime.compile()` + `runtime.createPageRuntime()`, but tests only scope change tracking, not nested scope chains)
  - React scope: `packages/flux-react/src/__tests__/scope-and-reactivity.test.tsx` (uses SchemaRenderer, tests parent scope injection and form scope reactivity)
  - Fragment scope: `packages/flux-react/src/fragment-scope.test.ts` (tests fragment scope context in isolation)
  - Missing: **no test that creates a page → form → nested fragment scope chain through real schema compilation and rendering, then verifies values resolve correctly at each level**
- **Status**: Scope chain creation through the runtime is only partly tested. The flux-runtime tests construct scopes manually via `createScopeRef()`, bypassing the scope chain that `createPageRuntime` and form scope creation would set up. The flux-react `scope-and-reactivity.test.tsx` tests `useScopeSelector` in a SchemaRenderer context but with a manually injected `parentScope` prop (lines 48-60), not through a real page→form→fragment chain.
- **Why coverage is misleading**: The scope chain construction logic in `createPageRuntime` (page scope creation) and form runtime (child scope creation) is never tested with the full compiled schema input to prove that the scope topology matches what the compiler intended. A bug where the form scope is created with the wrong parent, or where fragment scopes aren't properly nested, would go undetected.
- **Recommendation**: Add a test in flux-react that:
  1. Renders a page containing a form containing a fragment with a text field
  2. The text field displays a scope value defined at page level (proving scope chain works through form→page)
  3. The text field displays a scope value defined at fragment level (proving fragment scope works)
  4. Uses `useScopeSelector` hook to read values from different scope levels without specifying which scope
     This can reuse `scope-and-reactivity.test.tsx` patterns but with real nested schema and no mocked parent scope.

---

### Finding R3-6 — Reaction pipeline: schema reaction lowering never verified through full react→renderer chain

- **Severity**: P2
- **Category**: 跨层断层
- **Pipeline segment**: compile → runtime → react (reaction)
- **Contract**: Schema reaction (`reactions: [{ watch: '${x}', actions: {...} }]`) → compiler lowers to `compiledReactions` on TemplateNode → runtime `registerReaction()` → ReactionHandle → react `props.reactions` → renderer invokes reaction
- **Test files**:
  - Compile only: `packages/flux-compiler/src/reaction-compiler.test.ts` (tests `compileReaction` output format)
  - Runtime: `packages/flux-runtime/src/__tests__/runtime-reactions.test.ts` (manually calls `compileReaction()` + `runtime.registerReaction()`)
  - React proxy: `packages/flux-react/src/__tests__/reaction-handle-proxy.test.ts` (tests the proxy wrapping layer separately)
  - Missing: **no test that defines a reaction in the schema, renders through SchemaRenderer, and verifies the reaction fires when the watched value changes**
- **Status**: Like data sources, the reaction pipeline is well-tested at each individual layer, but the auto-lowering contract (schema compiler attaching `compiledReactions` to TemplateNodes) is never verified by consuming those lowered reactions through the runtime→React→renderer chain.
- **Why coverage is misleading**: The compiler's `compileReaction` output and the runtime's `registerReaction` input are tested separately with manually matched formats. If the compiler changes how it attaches reactions to TemplateNodes (e.g., property name change, structural change), the compiler tests would catch it, but no test verifies the runtime can consume the new format.
- **Recommendation**: Add a test (flux-runtime or flux-react) that:
  1. Calls `runtime.compile()` with a schema containing a reaction definition
  2. Inspects the TemplateNode for compiled reaction metadata
  3. Calls `runtime.registerReaction()` using the reaction metadata from the compiled node (not from a manual `compileReaction()` call)
  4. Asserts the reaction fires when the watched value changes
     This proves the auto-lowered reaction metadata is consumable by the runtime.

---

### Finding R3-7 — L1 contract regression: no test verifies absence of `CompiledSchemaNode` intermediate

- **Severity**: P3
- **Category**: 跨层断层
- **Pipeline segment**: compile → runtime (architecture commitment)
- **Contract**: The architecture docs commit that "there is no `CompiledSchemaNode` intermediate step — the compiler directly produces `TemplateNode`" (P10 in phase-01 checklist). This is an **architectural commitment** with no regression guard.
- **Test files**:
  - Missing: `packages/flux-compiler/src/schema-compiler-contract-exploration.test.ts` (explores output shape but doesn't assert the absence of intermediate types)
- **Status**: No existing test asserts that the compiler's output is directly a `TemplateNode` / `CompiledTemplate` without a `CompiledSchemaNode` wrapper. This is a "negative" contract (something that should NOT exist) and is easy for refactoring to accidentally reintroduce.
- **Why coverage is misleading**: Normal test coverage tracks what IS, not what ISN'T. A refactoring that introduces a wrapper type would pass all tests because they access the output through the wrapper transparently, but would break runtime code that expects TemplateNode directly.
- **Recommendation**: Add a simple type-level assertion in the compiler's test suite:
  ```ts
  // Assert the compiler returns TemplateNode directly, not a CompiledSchemaNode wrapper
  const compiled: CompiledTemplate = schemaCompiler.compile(schema);
  const root: TemplateNode = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
  // No CompiledSchemaNode wrapper — if this compiles, the contract is preserved
  ```
  Alternatively, a runtime check: `expect('__compiledSchemaNode__' in compiled).toBe(false)`

---

### Finding R3-8 — flux-bundle integration test coverage is too narrow to serve as pipeline safety net

- **Severity**: P2
- **Category**: 跨层断层
- **Pipeline segment**: all (host facade)
- **Contract**: `createFluxSchemaRenderer()` should render any valid schema through the complete compile→runtime→react→renderers pipeline, with all layers connected correctly.
- **Test files**:
  - `packages/flux-bundle/src/index.test.tsx` (65 lines — 4 tests: registry structure, stylesheet composition, simple text rendering, public type declarations)
  - `packages/flux-bundle/src/crud-loadaction.test.tsx` (55 lines — 1 test: CRUD with loadAction)
- **Status**: The flux-bundle package has the fewest tests relative to its integration scope. Its two test files cover only text rendering, registry structure, and CRUD loadAction. Form validation, dialog surfaces, reactions, data sources, scope propagation, and schema imports are never tested through the facade.
- **Why coverage is misleading**: flux-bundle is the package closest to how actual applications use the framework, but it has the weakest test suite. A regression in any cross-layer contract would only be caught by lower-level package tests; the facade level provides no safety net.
- **Recommendation**: This is a phased recommendation:
  - **Immediate**: Add 1-2 tests for form validation through the facade (schema with required field → render → submit → assert error appears in DOM)
  - **Medium-term**: Add facade-level tests for each pipeline: action dispatch, data source loading, scope reactivity

---

## Cross-Cutting Anti-Pattern Summary

| Anti-pattern                                                                                                        | Occurrences                                                                              | Severity |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| Manually constructing `CompiledFormValidationModel` bypassing compiler                                              | 12+ test files in flux-runtime                                                           | P1       |
| Manually calling `compileDataSource()`/`compileReaction()` then `register*()` instead of using schema auto-lowering | All runtime data-source/reaction tests                                                   | P2       |
| Constructing mock evaluate/scope functions in adapter tests instead of using real compiler output                   | `action-adapter.builtins.test.ts`, `action-scope-and-adaptor.test.ts`                    | P2       |
| Testing individual layers without proving downstream consumption                                                    | Validation pipeline (4 files), data-source pipeline (3 files), action pipeline (3 files) | P2       |
| No negative-contract tests (verifying absence of wrapper types)                                                     | L1 (no CompiledSchemaNode)                                                               | P3       |

## Priority Matrix

| Finding                                            | Impact if broken                         | Current detection                           | Priority |
| -------------------------------------------------- | ---------------------------------------- | ------------------------------------------- | -------- |
| R3-1: compile→runtime validation bypass            | Silent incorrect validation at runtime   | None (test data is hand-crafted)            | P1       |
| R3-2: validation errors not tested in React UI     | Users see no error messages              | None (no rendering test)                    | P1       |
| R3-3: data-source schema lowering untested         | Data sources silently fail to auto-lower | Partial (compiler tests only)               | P2       |
| R3-4: action event→dispatch→execution untested     | Buttons stop working silently            | Partial (each layer tested individually)    | P2       |
| R3-5: scope chain (page→form→fragment) untested    | Form fields resolve wrong scope          | Partial (layer unit tests only)             | P2       |
| R3-6: reaction schema→runtime consumption untested | Reactions silently fail                  | Partial (compiler + runtime tests separate) | P2       |
| R3-7: no CompiledSchemaNode regression guard       | Architecture drift unnoticed             | None                                        | P3       |
| R3-8: flux-bundle too narrow                       | No facade-level safety net               | Minimal                                     | P2       |

## Recommended Fix Order

1. **R3-1** (P1) — One integration test in flux-runtime: compile form with rules → create form runtime from compiled validationPlan → set bad values → submit → assert errors
2. **R3-2** (P1) — One integration test in flux-react: render form with required field → submit → assert error in DOM
3. **R3-4** (P2) — One integration test in flux-react: render button with schema onClick → click → assert scope mutation
4. **R3-5** (P2) — Extend existing scope test to use real nested schema (page→form→fragment) instead of manually constructed scopes
5. **R3-3** (P2) — Add auto-lowering consumption test for data sources
6. **R3-6** (P2) — Add auto-lowering consumption test for reactions
7. **R3-8** (P2) — Extend flux-bundle tests for validation and action dispatch
8. **R3-7** (P3) — Add single type-level assertion in compiler test
