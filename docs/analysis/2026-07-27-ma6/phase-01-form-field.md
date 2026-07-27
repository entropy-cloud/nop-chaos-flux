# MA6 Phase 1 — Form/Field Architecture Docs Audit

Audit date: 2026-07-27
Documents audited: 9
Source packages checked: flux-core, flux-runtime, flux-react, flux-renderers-form, flux-renderers-form-advanced

---

## Document: `docs/architecture/form-validation.md`

### Finding 1: `ValidationError.sourceKind` missing two live values

- Severity: P2
- Location: `docs/architecture/form-validation.md:516-524` and `packages/flux-core/src/types/validation.ts:35-45`
- Category: inaccurate-type
- Doc claim: Lists sourceKind as `'field' | 'object' | 'array' | 'row' | 'scope-root' | 'external' | 'runtime-overlay' | 'runtime-opaque'`
- Code reality: Live type also includes `'form'` and `'runtime-registration'` (validation.ts lines 44-45)
- Fix direction: Add the two missing sourceKind values

### Finding 2: `ValidationScopeRuntime` described as "base runtime" but is a contract interface only

- Severity: P2
- Location: `docs/architecture/form-validation.md:134,160-182` and `packages/flux-core/src/types/runtime.ts:379`
- Category: owner-doc-drift
- Doc claim: Describes `ValidationScopeRuntime` as "the base runtime for any scope with validation semantics" implying a concrete runtime implementation. Also lists APIs like `touchField`, `visitField` as part of the interface.
- Code reality: `ValidationScopeRuntime` is a TypeScript interface (not a class). `touchField` and `visitField` are optional (`touchField?(path): void`, `visitField?(path): void` in runtime.ts:421-422), but the doc lists them as standard. The true concrete implementations are `FormRuntime` (which implements it) and managed runtimes created via factory functions.
- Fix direction: Clarify that `ValidationScopeRuntime` is a contract interface, and mark `touchField`/`visitField` as optional members

### Finding 3: `selectCurrentFormFieldState` / `selectCurrentFormErrors` not the actual hook API

- Severity: P1
- Location: `docs/architecture/form-validation.md:144-147` and `packages/flux-react/src/field-frame.tsx:105-111`
- Category: owner-doc-drift
- Doc claim: The doc describes FieldFrame using `useCurrentFormState(…)` with `selectCurrentFormFieldState` and `selectCurrentFormErrors` selectors
- Code reality: FieldFrame actually uses `useCurrentFormFieldState(name, …)` directly (line 105) and `useAggregateError(name, …)` (line 111). These are higher-level hooks that wrap the selector pattern. The doc's pattern is the internal implementation detail, not the public API.
- Fix direction: Update to document the actual public hooks `useCurrentFormFieldState` and `useAggregateError`

### Finding 4: FieldFrame uses `currentValidationScope` (non-form path) but doc says form-only

- Severity: P2
- Location: `docs/architecture/form-validation.md:144-148` and `packages/flux-react/src/field-frame.tsx:103,112`
- Category: owner-doc-drift
- Doc claim: Describes FieldFrame validation lookup as strictly `currentForm.validation` chain
- Code reality: FieldFrame also consults `useCurrentValidationScope()` (line 103) and builds `validationModel = currentForm?.validation ?? currentValidationScope?.validation` (line 112). The doc doesn't mention the non-form validation scope path.
- Fix direction: Document the dual path: form-first with validation-scope fallback

### Finding 5: `fieldErrors` contract mentions `validateForm`/`validateAll` but missing `validateField`

- Severity: P2
- Location: `docs/architecture/form-validation.md:156-159` and `packages/flux-core/src/types/runtime.ts:440-444`
- Category: inaccurate-type
- Doc claim: Lists `FormRuntime.validate()` and `componentHandle.validate()` as exposure points
- Code reality: `FormRuntime` exposes `validateField(path, reason?, options?)` (runtime.ts:440), not `validate()`. The term `componentHandle.validate()` references an internal pattern not part of the public `FormRuntime` interface.
- Fix direction: Use actual method names (`validateField`, `validateForm`)

### Finding 6: `FormRuntime` interface doc lists `appendValue` etc. but form-validation.md mentions only submit-focused API

- Severity: P3
- Location: `docs/architecture/form-validation.md:184-191` and `packages/flux-core/src/types/runtime.ts:431-469`
- Category: inaccurate-type
- Doc claim: Describes FormRuntime as extending ValidationScopeRuntime with 4 specific additions (touched/dirty, showErrorOn, submit, canSubmit/allTouched)
- Code reality: FormRuntime has many more methods: `validateField`, `validateForm`, `getError`, `isValidating`, `isTouched`, `isDirty`, `isVisited`, `touchField`, `visitField`, `clearErrors`, `reset`, `setValue`, `setValues`, `appendValue`, `prependValue`, `insertValue`, `removeValue`, `moveValue`, `swapValue`, `replaceValue`, `getField`, `getDependents`
- Fix direction: Expand the FormRuntime summary or add a note that the doc describes key additions, not the full interface

---

## Document: `docs/architecture/field-frame.md`

### Finding 7: `FieldFrameProps` missing `rootTag` and `rootProps` props

- Severity: P2
- Location: `docs/architecture/field-frame.md:97-113` and `packages/flux-react/src/field-frame.tsx:45-63`
- Category: inaccurate-type
- Doc claim: Lists FieldFrameProps without `rootTag` or `rootProps`
- Code reality: Live interface includes `rootTag?: 'label' | 'div'` (line 56) and `rootProps?: Record<string, string | number | undefined>` (line 61)
- Fix direction: Add `rootTag` and `rootProps` to the documented props table

### Finding 8: FieldFrame render structure sketch is outdated

- Severity: P1
- Location: `docs/architecture/field-frame.md:157-267` and `packages/flux-react/src/field-frame.tsx:78-286`
- Category: owner-doc-drift
- Doc claim: Shows a simplified render structure with static `<label>` root and basic error/hint/description chain. No ARIA wiring, no focus tracking, no `rootTag` substitution.
- Code reality: Live component has: `rootTag ?? 'label'` (line 164), full ARIA integration (`aria-describedby`, `aria-errormessage`, `aria-labelledby`, `aria-invalid`, `aria-required`, `role="alert"`, `aria-live`), focus tracking via `useState(false)}` (line 161), `useFormLayout()` for label alignment, `data-field-mode`, `useCurrentValidationScope()` fallback, dual dynamic-required paths (form + non-form via `useCurrentValidationValues`), `remark` and `labelRemark` rendering, label style injection, `data-label-align` attribute
- Fix direction: Replace the sketch with a current version reflecting actual ARIA/layout/hook complexity

### Finding 9: `shouldShowFieldError` call signature missing `submitAttempted`

- Severity: P2
- Location: `docs/architecture/field-frame.md:150-151` and `packages/flux-react/src/field-frame.tsx:152-159`
- Category: inaccurate-type
- Doc claim: Shows `shouldShowFieldError(behavior, { touched, dirty, visited, submitting })`
- Code reality: Also passes `submitAttempted: fieldState.submitAttempted` (line 158)
- Fix direction: Add `submitAttempted` to the documented call

### Finding 10: `NodeFrameWrapper` doc claims `name`/`label`/`required`/`className`/`testid`/`cid` but omits actual full prop set

- Severity: P2
- Location: `docs/architecture/field-frame.md:282` and `packages/flux-react/src/node-frame-wrapper.tsx:8-78`
- Category: inaccuratetype
- Doc claim: Lists wrapper input as `name`, `label`, `required`, `className`, `testid`, `cid`
- Code reality: `NodeFrameWrapper` also resolves `hint`, `description`, `remark`, `labelRemark`, `labelAlign`, `labelWidth`, and passes `rootTag` through to FieldFrame. Uses `frameClassName` (not `className`).
- Fix direction: Update the wrapper contract description

### Finding 11: Doc mentions `formFieldChromeRules` path — confirmed correct

- Severity: P3
- Location: `docs/architecture/field-frame.md:231` and `packages/flux-renderers-form/src/field-utils/field-reading.tsx:21`
- Category: (no drift)
- Doc claim: References `packages/flux-renderers-form/src/field-utils/field-reading.tsx` — correct path and export
- Code reality: File and export exist at specified location. OK.

---

## Document: `docs/architecture/field-metadata-slot-modeling.md`

### Finding 12: `SchemaFieldRule.compile` and `FieldCompileContext` interfaces exist — doc claim accurate

- Severity: P3
- Location: `docs/architecture/field-metadata-slot-modeling.md:462-477` and `packages/flux-core/src/types/schema.ts:136-188`
- Category: (no drift)
- Doc claim: Describes `compile?: (value, context)` and `FieldCompileContext` with `expressionCompiler`, `symbolTable`, `compileValue`, `compileSchema`, `sourcePath`
- Code reality: Interface is exactly as documented (schema.ts:170,173-188). Good.

### Finding 13: `allowSource` and `sourceStateKey` exist — doc claim accurate

- Severity: P3
- Location: `docs/architecture/field-metadata-slot-modeling.md:145-166` and `packages/flux-core/src/types/schema.ts:141-142`
- Category: (no drift)
- Doc claim: Describes `allowSource?: boolean` and `sourceStateKey?: string` on SchemaFieldRule
- Code reality: Both fields exist in the live interface. OK.

### Finding 14: `SchemaFieldKind` includes `reaction` — doc claim accurate

- Severity: P3
- Location: `docs/architecture/field-metadata-slot-modeling.md:107-114` and `packages/flux-core/src/types/schema.ts:50-57`
- Category: (no drift)
- Doc claim: Describes `event` and `reaction` as two action-bearing kinds
- Code reality: `SchemaFieldKind` includes both `'event'` and `'reaction'` (schema.ts:55-56). OK.

### Finding 15: `formFieldChromeRules` export location accurate

- Severity: P3
- Location: `docs/architecture/field-metadata-slot-modeling.md:231` and `packages/flux-renderers-form/src/field-utils/field-reading.tsx:21`
- Category: (no drift)
- Doc claim: References formFieldChromeRules in field-reading.tsx — correct path
- Code reality: Confirmed. OK.

---

## Document: `docs/architecture/field-binding-and-renderer-contract.md`

### Finding 16: `META_FIELDS` frozen set matches live code exactly

- Severity: P3
- Location: `docs/architecture/field-binding-and-renderer-contract.md:407-418` and `packages/flux-core/src/constants.ts:1-10`
- Category: (no drift)
- Doc claim: `META_FIELDS = new Set(['id', 'className', 'frameClassName', 'when', 'visible', 'hidden', 'disabled', 'testid'])` — 8 entries
- Code reality: Constants.ts matches exactly. The linked test (constants.test.ts:47) confirms size is 8. OK.

### Finding 17: `name`/`label`/`title` removed from META_FIELDS — claim accurate

- Severity: P3
- Location: `docs/architecture/field-binding-and-renderer-contract.md:420` and `packages/flux-core/src/constants.ts:1-10`
- Category: (no drift)
- Doc claim: States `name`, `label`, `title` are removed from META_FIELDS
- Code reality: Confirmed — not in constants.ts set. OK.

### Finding 18: `BoundFieldSchemaBase` — not a live type in codebase

- Severity: P2
- Location: `docs/architecture/field-binding-and-renderer-contract.md:326-331` and `packages/flux-core/src/types/schema.ts`
- Category: outdated-reference
- Doc claim: Shows `BoundFieldSchemaBase` with `name`, `readOnly`, `required` as a recommended shared base
- Code reality: No `BoundFieldSchemaBase` type exists anywhere in the codebase. The schema bases used in practice are per-renderer interfaces in `composite-schemas.ts`, `detail-field`, etc. No shared `BoundFieldSchemaBase` has been introduced.
- Fix direction: Either remove the sketch, implement the type, or mark it as target-state only

### Finding 19: `Permitted Static Structural Fields` — `data-source` renderer referenced but may not exist

- Severity: P2
- Location: `docs/architecture/field-binding-and-renderer-contract.md:422-432`
- Category: outdated-reference
- Doc claim: Lists `statusPath` for `data-source` renderer and `componentId` for `chart-renderer`
- Code reality: No `data-source` or `chart-renderer` renderer definition found in the form-related packages. These renderers may exist in other packages not checked, but referencing renderers not part of the form/field architecture in this doc is misleading.
- Fix direction: Clarify which packages own these renderers or remove from this document

---

## Document: `docs/architecture/variant-field.md`

### Finding 20: VariantFieldRenderer uses `useCurrentValidationScope` — doc says projected parent-owned scope

- Severity: P2
- Location: `docs/architecture/variant-field.md:128-131` and `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:31`
- Category: owner-doc-drift
- Doc claim: "recommended implementation is to reuse parent FormRuntime / ValidationScopeRuntime"
- Code reality: `VariantFieldRenderer` line 31 imports and uses `useCurrentValidationScope()` (`const parentValidationOwner = useCurrentValidationScope()`). This aligns with the doc, but the doc says "recommended" — this is now the live implementation baseline, not a recommendation.
- Fix direction: Move from "recommended" to "current baseline"

### Finding 21: `VariantFieldSchema` includes `detectVariantAction` but uses `selectorMode` as well

- Severity: P2
- Location: `docs/architecture/variant-field.md:42-68` and `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:40-41`
- Category: inaccurate-type
- Doc claim: Schema shape uses `selector.mode` only
- Code reality: Live code also reads `schemaProps.selectorMode` as fallback (line 41): `schemaProps.selector?.mode ?? schemaProps.selectorMode ?? 'tabs'` — there's a top-level `selectorMode` prop alongside `selector.mode`
- Fix direction: Document the `selectorMode` fallback property

### Finding 22: `detectVariantAction` / `transformInAction` / `transformOutAction` schema fields exist

- Severity: P3
- Location: `docs/architecture/variant-field.md:53-55` and `packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts:50-52`
- Category: (no drift)
- Doc claim: Describes action fields on VariantFieldSchema
- Code reality: All three exist in composite-schemas.ts. OK.

---

## Document: `docs/architecture/object-field.md`

### Finding 23: `transformInAction`/`transformOutAction` wiring claim — partially confirmed

- Severity: P1
- Location: `docs/architecture/object-field.md:40` and `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:146`
- Category: owner-doc-drift
- Doc claim: "`transformInAction` / `transformOutAction` 已接线" (already wired)
- Code reality: Line 146: `const usesWorkingValue = Boolean(schemaProps.transformInAction || schemaProps.transformOutAction);` — the code branches on their presence. But the doc says "已接线" implying complete functional wiring. Looking at the code, `transformOutSequences`, `pendingTransformOutByOwner` (lines 32-33), and the weakmaps (lines 32-55) show concurrency management for transformOut, but the claim is partially true.
- Fix direction: Clarify the wiring status: `transformInAction`/`transformOutAction` are detected and trigger working-value mode, but the full adapter pipeline concurrency semantics may still be evolving

### Finding 24: `validateValueAction` wiring claim — accurate

- Severity: P2
- Location: `docs/architecture/object-field.md:41` and `packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts:18`
- Category: (no drift)
- Doc claim: "`validateValueAction` 仍不是当前已接线 baseline" (not yet wired)
- Code reality: `validateValueAction` exists in schema definition at composite-schemas.ts:18 but object-field.tsx does not reference it. Confirmed not wired.
- Fix direction: (none — claim is accurate)

---

## Document: `docs/architecture/array-field.md`

### Finding 25: `sortable` claim — declared in schema but not implemented in renderer

- Severity: P1
- Location: `docs/architecture/array-field.md:63` and `packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts:28`
- Category: owner-doc-drift
- Doc claim: "`sortable` 目前也不应被表述为已完整落地的默认能力" (sortable should not be described as fully landed)
- Code reality: `sortable` is declared in `ArrayFieldSchema` (composite-schemas.ts:28). However, grep of `array-field.tsx` shows zero references to `sortable` — it is never read in the renderer. The doc's claim is accurate: it is schema-declared but not wired.
- Fix direction: (none — claim is accurate)

### Finding 26: `itemKind` / `itemKey` / add/remove claim — confirmed

- Severity: P3
- Location: `docs/architecture/array-field.md:61` and `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- Category: (no drift)
- Doc claim: "`itemKind` / `itemKey` / add/remove baseline 已落地" (landed)
- Code reality: `array-field.tsx` references `itemKind` and `itemKey`, plus add/remove UI logic. Confirmed.

### Finding 27: `transformInAction`/`transformOutAction`/`validateValueAction` claim — confirmed not wired

- Severity: P2
- Location: `docs/architecture/array-field.md:62` and `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- Category: (no drift)
- Doc claim: These are "not currently wired baseline"
- Code reality: `array-field.tsx` does not reference `transformInAction`, `transformOutAction`, or `validateValueAction`. They exist in the schema (composite-schemas.ts:30-32) but renderer doesn't consume them. Claim accurate.

---

## Document: `docs/architecture/composite-value-owner-clean-slate.md`

### Finding 28: Document is aspirational — most of its interfaces and runtime model are not live code

- Severity: P2
- Location: Full document, especially `composite-value-owner-clean-slate.md:126-132,259-312,420-457`
- Category: owner-doc-drift
- Doc claim: Defines a clean-slate design with specific interfaces like `CompositeRuntimeSubstrate`, `ValueScopeStore`, `ValidationRuntimeRegistry`, `UiStateStore`, `InlineValueOwner`, `StagedValueOwner`, `CollectionOwner`, `LeafFieldBinding`
- Code reality: None of these interface names exist in the live codebase as exported types. The doc explicitly states they are "pseudocode helper names" (line 422) and "not recommended for addition to flux-core" (line 424). However, the doc also claims "composite controls reuse the same value/validation/ui/surface substrate" which is aspirational.
- Fix direction: Document is intentionally positioned as clean-slate. No fix needed beyond keeping the disclaimer prominent.

---

## Document: `docs/architecture/value-adaptation-and-detail-field.md`

### Finding 29: `ValueAdapter` interface is not a live exported type

- Severity: P2
- Location: `docs/architecture/value-adaptation-and-detail-field.md:144-157` and `packages/flux-core/src/types/`
- Category: outdated-reference
- Doc claim: Defines `ValueAdapter<TExternal, TInternal>` interface with `in()`, `out()`, `validate()` methods
- Code reality: There is no `ValueAdapter` type exported from `flux-core` or any package. The adaptation logic is inline in `value-adaptation-helper.ts` as standalone functions (`runTransformIn`, `runTransformOut`, `runValidate`), not a typed protocol.
- Fix direction: Either implement the `ValueAdapter` interface or update doc to describe the actual functional helper pattern

### Finding 30: `DetailFieldSchema` live shape matches doc — minor difference on `name` property

- Severity: P3
- Location: `docs/architecture/value-adaptation-and-detail-field.md:409-429` and `packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts:73-100`
- Category: (no drift)
- Doc claim: Describes `DetailFieldSchema` with `name`, `readOnly`, `viewer`, `content`, `surface`, `trigger`, etc.
- Code reality: Matching schema exists in composite-schemas.ts:73-100 (as `DetailFieldSchema`). Same fields present. OK.

### Finding 31: Doc states live path does not use shared `SurfaceRuntime` / `DialogHost` — confirmed

- Severity: P2
- Location: `docs/architecture/value-adaptation-and-detail-field.md:577-578` and `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx`
- Category: owner-doc-drift
- Doc claim: "current live path does not go through shared SurfaceRuntime / DialogHost"
- Code reality: `detail-field.tsx` imports `DetailSurface` from `detail-surface.tsx`, which handles its own dialog/drawer directly. The import confirms it doesn't use a shared `SurfaceRuntime`.
- Fix direction: (none — claim is accurate, but note it as a gap from the composite-value-owner clean-slate design)

---

## Summary Statistics

| Document                               | Total Findings | P0    | P1    | P2     | P3    | No Drift |
| -------------------------------------- | -------------- | ----- | ----- | ------ | ----- | -------- |
| form-validation.md                     | 6              | 0     | 1     | 5      | 0     | 0        |
| field-frame.md                         | 5              | 0     | 1     | 4      | 0     | 0        |
| field-metadata-slot-modeling.md        | 4              | 0     | 0     | 0      | 4     | 4        |
| field-binding-and-renderer-contract.md | 4              | 0     | 0     | 3      | 1     | 2        |
| variant-field.md                       | 3              | 0     | 0     | 2      | 1     | 1        |
| object-field.md                        | 2              | 0     | 1     | 1      | 0     | 1        |
| array-field.md                         | 3              | 0     | 1     | 2      | 0     | 2        |
| composite-value-owner-clean-slate.md   | 1              | 0     | 0     | 1      | 0     | 0        |
| value-adaptation-and-detail-field.md   | 3              | 0     | 0     | 2      | 1     | 1        |
| **Total**                              | **31**         | **0** | **4** | **20** | **7** | **11**   |

## Cross-Cutting Themes

1. **ARIA and accessibility gap**: `field-frame.md` render structure sketch lacks all ARIA, focus, and accessibility features present in live code.
2. **Non-form validation scope**: `form-validation.md` and `field-frame.md` both under-document the `useCurrentValidationScope()` / non-form `ValidationScopeRuntime` path that `FieldFrame`, `object-field`, `array-field`, `variant-field`, and `detail-field` all use in practice.
3. **Render structure drift**: The `FieldFrame` render structure in the doc is a simplified sketch that has diverged significantly from the live implementation.
4. **Aspirational vs landed**: `composite-value-owner-clean-slate.md` and parts of `value-adaptation-and-detail-field.md` describe target-state interfaces that do not exist as live types.
5. **Schema fields vs runtime wiring**: Several docs correctly note that `validateValueAction` and `sortable` are schema-declared but not runtime-wired — these claims are accurate and form a consistent pattern.
