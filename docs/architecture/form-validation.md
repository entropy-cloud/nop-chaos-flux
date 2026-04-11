# Form Validation Design

## Purpose

This document defines the active validation architecture for `flux`.

Use it when changing:

- schema-driven validation rules
- nested form/object/array/table validation behavior
- draft/detail/dialog validation boundaries
- field and subtree validation APIs
- renderer participation in validation

For validation code placement, use `docs/architecture/flux-runtime-module-boundaries.md`.

For object-like editors and draft owners, also read:

- `docs/architecture/object-field.md`
- `docs/architecture/array-field.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/architecture/surface-owner.md`

## Current Code Anchors

When checking this document against code, start with:

- `packages/flux-core/src/types/validation.ts` — `HiddenFieldPolicy`, `CompiledFormValidationField`, `CompiledFormValidationModel`
- `packages/flux-core/src/validation-model.ts` — `resolveHiddenFieldPolicy()`, `getCompiledValidationField()`, `buildCompiledFormValidationModel()`
- `packages/flux-runtime/src/schema-compiler/validation-collection.ts` — compiles `hiddenFieldPolicy` from schema into `CompiledValidationNode`
- `packages/flux-runtime/src/form-runtime.ts` — `notifyFieldHidden()`, `hiddenFields: Set<string>` initialization, `clearValueWhenHidden` trigger
- `packages/flux-runtime/src/form-runtime-validation.ts` — `validatePath()` hidden-field skip logic
- `packages/flux-runtime/src/form-runtime-types.ts` — `ManagedFormRuntimeSharedState.hiddenFields`
- `packages/flux-react/src/node-renderer.tsx` — `useEffect` calling `notifyFieldHidden` on visibility change
- `packages/flux-renderers-form/src/field-utils.tsx` — `useHiddenFieldPolicy()` shared hook
- `packages/flux-renderers-form/src/schemas.ts` — `InputSchema.hiddenFieldPolicy`, `FormSchema.hiddenFieldPolicy`

## Core Claim

Validation is owned by the nearest **validation owner boundary**, not by the nearest visual nesting layer.

This is the key rule for all nested cases.

That means:

- `table` / `object-field` / `array-field` nesting does **not** automatically create a new validation owner
- `dialog` / `drawer` / `popover` surface nesting does **not** automatically create a new validation owner
- a subtree participates in the current validation run only if it belongs to the current validation owner
- when a subtree edits a local draft and commits later, it should validate inside its own local owner instead of leaking draft-only errors into the parent form

The question is not “is this UI nested?”

The real question is “which runtime owns this value and its validation state right now?”

## Main Rule

Collect and execute validation by **owner**, not by renderer mount tree alone and not by a dynamic Yup-style object built at interaction time.

Recommended baseline:

1. compile a validation graph for each validation owner
2. store validation state in that owner runtime
3. trigger validation through owner APIs such as `validateField(path)` and `validateSubtree(path)`
4. let fields request validation, but do not let fields become the top-level source of truth for validation state

This keeps:

- cross-field rules possible
- object/array aggregate rules possible
- hidden-field policy centralized
- async cancellation centralized
- dialog/detail draft validation isolated when needed

## Three Different Boundaries

Validation design gets confused when these boundaries are mixed together.

They are not the same thing.

### 1. Visual Boundary

Examples:

- container nesting
- table cell rendering
- button opening a dialog
- field chrome wrapping another control

Visual boundaries do not decide validation ownership.

### 2. Surface Boundary

Examples:

- dialog
- drawer
- popover
- inline-below detail panel

A surface owns open/close state, but it does not automatically own validation.

If a surface body contains a `form`, that inner `form` becomes a new validation owner.
If a surface only hosts a draft editor, that draft editor may become a local validation owner.
If a surface is read-only, there may be no validation owner at all.

### 3. Validation Owner Boundary

A validation owner is the runtime that owns:

- the validation graph
- the error map
- touched / dirty / visited / validating state
- validation trigger APIs
- submit-time final gate

Current concrete owner in code:

- each `form` renderer creates one `FormRuntime`

Recommended future extension:

- draft-based value owners such as editable `detail-field` / `detail-view` may also create a local validation owner for draft-only state

## Participation Model

There are two important participation modes.

### Bound Subtree Participation

The subtree writes directly into the parent form values.

Examples:

- inline `object-field` editing `profile.firstName`
- inline `array-field` editing `items.0.name`
- editable table rows bound directly to the outer form

In this mode:

- the subtree belongs to the parent form owner
- child fields compile to absolute paths under the parent form
- local interaction uses `validateField(path)` or `validateSubtree(rootPath)` on the parent owner
- parent submit validates the whole owner

### Draft Owner Participation

The subtree edits a local draft first and commits later.

Examples:

- `detail-field` opens a dialog and edits a temporary object
- `detail-view` opens a drawer and edits projected row data before confirm
- a button opens a dialog containing a draft editor that only writes back on confirm

In this mode:

- draft fields do **not** belong to the outer form while the draft is still local
- validation runs inside the local draft owner
- outer form validation should only see committed values, not unconfirmed draft state
- after confirm/commit, the affected outer field or subtree should be revalidated in the parent owner

This is the most important rule for nested detail editors.

## Answer To “Only Collect Current Layer?”

Yes, but “current layer” must mean **current validation owner**, not current DOM layer and not current schema nesting level.

Recommended rule:

- current owner collects all fields and aggregate nodes that belong to it
- current owner does not collect fields owned by a nested form or local draft owner
- parent owner only sees the committed value contract of a child draft owner

So:

- nested layout: still same owner, should collect
- nested object/array editor bound to parent values: still same owner, should collect
- dialog with inner form: different owner, should not collect into outer form
- detail dialog editing local draft: different owner while open, should not collect into outer form

## Nested Structures

### `object-field`

If `object-field` is direct-binding:

- it is still a field in the parent form
- child names are relative for authoring, but compile to absolute paths like `profile.firstName`
- object-level rules may live on `profile`
- child-level rules live on `profile.firstName`, `profile.lastName`, etc.
- `validateSubtree('profile')` is the natural local validation API

If `object-field` is draft-based:

- it should use a local draft owner
- outer form should validate only the committed `profile` value or committed subtree after apply

### `array-field`

If `array-field` is direct-binding:

- the array root path is part of the parent owner
- array-level rules live on paths like `items`
- item object fields live on paths like `items.0.name`
- row-local validation uses `validateSubtree('items.0')`
- array-local validation uses `validateSubtree('items')`

For dynamic rows, compile-time metadata may describe the template shape, while runtime registration/materialization fills in concrete indexed paths.

### Editable Table

A table is not automatically a validation owner.

There are two common modes:

1. Inline bound editing
2. Row detail draft editing

Inline bound editing follows the parent form owner.
Row detail draft editing should use a local owner for the row draft.

### `detail-view` And `detail-field`

These should not be modeled like ordinary inline fields when they hold an uncommitted draft.

Recommended rule:

- read-only detail: no validation owner needed
- editable detail with direct binding: parent form owner
- editable detail with local draft + confirm: local draft owner

On confirm:

1. validate the local draft owner
2. stop if invalid
3. run transform/commit
4. write back to the parent owner
5. revalidate the affected parent path or subtree

### Button With Nested Dialog

The button is not the validation owner.

If the dialog body contains:

- no form and no draft editor: no validation owner
- a `form`: inner form owner
- a draft detail editor: local draft owner

The outer form must not be blocked by unopened or unconfirmed dialog-local fields.

## Aggregate Rules

Field-level validation is not enough for nested editing.

The architecture must support aggregate rules at object and array roots.

Examples:

- object-level “all or none”
- object-level “at least one of”
- array-level `minItems` / `maxItems`
- array-level `uniqueBy`
- row-object aggregate rules inside an array item

Recommended model:

- keep field nodes and aggregate nodes in the same owner graph
- allow `validateField(path)` for leaf validation
- allow `validateSubtree(path)` for object/array-local validation
- allow owner-level submit validation for final gating

This is why a pure “each field owns only itself” model is insufficient.

Fields can trigger validation, but owner orchestration is still required.

## Validation Graph Shape

Flux should keep an engine-neutral compiled graph as the source of truth.

Current code already follows the right broad direction:

- flat path dictionary
- explicit node kinds
- owner runtime APIs: `validateField`, `validateSubtree`, `validateForm`

Recommended model:

```ts
interface CompiledValidationNode {
  path: string;
  kind: 'field' | 'object' | 'array' | 'form';
  rules: CompiledValidationRule[];
  children: string[];
  parent?: string;
}

interface CompiledValidationOwnerModel {
  rootPath: string;
  nodes: Record<string, CompiledValidationNode>;
  dependents: Record<string, string[]>;
  validationOrder: string[];
}
```

Important point:

- this graph is not a React registration tree
- this graph is not a Yup schema object
- this graph is the canonical low-code validation model

## Why Not Make Yup The Core Model

`c:/can/nop/templates/yup` is useful as a reference, but it should not be Flux's primary architecture.

Useful observations from Yup:

- it keeps an immutable schema tree
- it separates transforms from tests
- it supports nested path validation through `reach()` and `validateAt(path, rootValue)`
- it resolves conditions at validation time

Why Flux should not use Yup as the primary runtime model:

- Flux validation is owner-scoped, not just value-tree-scoped
- Flux needs hidden-field participation rules
- Flux needs runtime registration for complex controls
- Flux needs dialog/detail draft isolation
- Flux must stay independent from a specific validation engine
- Flux compile step already knows renderer semantics and ownership boundaries

Recommended conclusion:

- borrow the idea of `validateAt(path)`
- do not make a dynamic Yup schema object the source of truth
- if needed later, provide an adapter from compiled Flux validation metadata to a Yup-like or Standard-Schema-like adapter

## What Yup Gets Right For Flux

The part worth copying is not the whole library.

The useful pattern is:

- one schema/graph owns nested validation structure
- local validation can target a path
- validation still uses the whole root value for cross-field conditions

In Flux terms, this becomes:

- one validation owner owns a compiled graph
- `validateField(path)` is the local path-targeted API
- `validateSubtree(path)` is the local object/array API
- all rule evaluation still reads the current owner scope for dependencies

## Why “Each Field Holds Its Own Validation” Is Only Half Right

Each field should hold enough metadata to request and display validation.

But each field should **not** become the sole owner of validation state.

Recommended split:

- field contributes rules, trigger behavior, UI state wiring
- owner runtime stores errors and validating state
- owner runtime executes dependent revalidation and aggregate checks

This gives the right local UX:

- on blur: field asks owner to validate its path
- on change: field may ask owner to validate its path or dependents
- on row/object save: owner validates subtree
- on submit: owner validates whole owner scope

## Local Triggering

Recommended trigger model:

### Field Trigger

- `validateField(path)`
- used by blur/change of ordinary controls
- owner may also revalidate dependents

### Subtree Trigger

- `validateSubtree(path)`
- used by `object-field`, `array-field`, row editors, complex composite controls
- should validate aggregate node plus descendants belonging to that subtree

### Owner Trigger

- `validateForm()` for `FormRuntime`
- future `validateDraft()` for local draft owners
- used before submit/confirm

This is the correct answer to partial validation:

- partial validation is owner-scoped path/subtree validation
- not “rebuild a smaller Yup schema every time”
- not “only run the exact field forever”

## Hidden And Inactive Content

Hidden/inactive participation must also be owner-scoped.

### Hidden-Field Policy (Live Implementation)

`HiddenFieldPolicy` is a two-field schema contract:

```ts
interface HiddenFieldPolicy {
  validateWhenHidden?: boolean;   // default: false — hidden fields skip validation
  clearValueWhenHidden?: boolean; // default: false — hidden fields keep their value
}
```

Architecture defaults (when no policy is specified):

- hidden fields **retain their value**
- hidden fields **participate in submit**
- hidden fields **skip validation**
- hidden fields **do not auto-clear**

Policy resolution order: **field > form > architecture default**

`resolveHiddenFieldPolicy(fieldPolicy, formPolicy)` in `packages/flux-core/src/validation-model.ts` implements this merge.

Both `InputSchema` and `FormSchema` carry an optional `hiddenFieldPolicy?: HiddenFieldPolicy` field (see `packages/flux-renderers-form/src/schemas.ts`). The form-level policy is passed to `buildCompiledFormValidationModel` as `defaultHiddenFieldPolicy`, then merged at call time in `getCompiledValidationField`.

### Runtime Tracking

`FormRuntime` exposes `notifyFieldHidden(path: string, hidden: boolean): void`. The `NodeRenderer` calls this in a `useEffect` keyed on `[currentForm, fieldName, isFieldHidden]` (see `packages/flux-react/src/node-renderer.tsx:276`). The cleanup function calls `notifyFieldHidden(fieldName, false)` to deregister on unmount.

The `ManagedFormRuntimeSharedState` maintains `hiddenFields: Set<string>` (see `packages/flux-runtime/src/form-runtime-types.ts`). `notifyFieldHidden` is idempotent — it checks `wasHidden === hidden` before mutating the set.

When `hidden=true` and `clearValueWhenHidden=true`, `notifyFieldHidden` immediately calls `setValue(path, undefined)` (see `packages/flux-runtime/src/form-runtime.ts:225`).

### Validation Skip

In `validatePath()` (`packages/flux-runtime/src/form-runtime-validation.ts:273`), if the field's resolved policy has `validateWhenHidden=false` and the path is in `sharedState.hiddenFields`, the function clears the path's errors and returns an empty result.

### Shared Hook

`useHiddenFieldPolicy(name, hidden)` in `packages/flux-renderers-form/src/field-utils.tsx:291` wraps the same `notifyFieldHidden` pattern for renderer-level use. `NodeRenderer` covers the common case; complex composite renderers may call `useHiddenFieldPolicy` directly.

### The Important Distinction

- hidden field in current owner: same owner, policy decides whether to validate
- field in another owner that is not active/committed: not current owner's problem

## Current Runtime Baseline

Current implementation already aligns with part of this design:

- one `FormRuntime` per `form`
- owner-local APIs: `validateField(path)`, `validateSubtree(path)`, `validateForm()`
- flat compiled node model
- runtime registration for complex controls
- hidden-field tracking via `notifyFieldHidden(path, hidden)` — live in `packages/flux-runtime/src/form-runtime.ts:214`
- hidden-field validation skip — live in `packages/flux-runtime/src/form-runtime-validation.ts:273`
- `clearValueWhenHidden` — live in `packages/flux-runtime/src/form-runtime.ts:225`
- `HiddenFieldPolicy` schema contract and `resolveHiddenFieldPolicy()` — live in `packages/flux-core/src/`
- `useHiddenFieldPolicy()` shared renderer hook — live in `packages/flux-renderers-form/src/field-utils.tsx:291`

This baseline is correct and should be preserved.

## Required Extension Beyond Current Code

The main missing architectural idea is a first-class **local draft validation owner**.

Recommended direction:

- keep `FormRuntime` as the owner for true forms
- add a lighter draft-owner runtime for value-adaptation/detail editors when they hold uncommitted draft state
- do not make surface runtime own validation
- do not merge dialog-local draft validation state into the outer form store

This lets Flux support:

- `detail-view` waiting for confirm
- `detail-field` opening a dialog editor
- row editor drafts inside table dialogs
- complex object/array editors that should validate before apply, not before parent submit

## Relationship To AMIS

`c:/can/nop/amis-react19` is also useful, but mainly as a pragmatic mounted-control reference.

Key observations from AMIS:

- validation is centered around `FormStore` + `FormItemStore`
- each form item validates itself through store registration
- submit walks registered items and triggers item validation
- hidden-value clearing is explicit through `clearValueOnHidden`
- dialog/open state can live on form-item stores without automatically merging validation ownership

What Flux should borrow:

- mounted complex controls may still need runtime registration
- hidden clearing and hidden validation should stay explicit
- field-triggered local validation is practical

What Flux should not copy as the primary model:

- validation graph emerging only from mounted renderer instances
- treating renderer/store registration as the only source of truth

Flux is better served by:

- compile-time owner graph
- runtime owner orchestration
- registration only as a supplement for dynamic or composite controls

## Recommended Architecture Decision

Best current direction for Flux:

1. Keep owner-scoped compiled validation graphs as the source of truth.
2. Keep `validateField(path)`, `validateSubtree(path)`, and `validateForm()` as the primary APIs.
3. Treat `object-field` / `array-field` / inline editable table rows as parent-owner subtrees when they bind directly.
4. Introduce local draft validation owners for `detail-field` / `detail-view` / dialog editors that edit uncommitted draft values.
5. Revalidate parent paths only after draft commit.
6. Keep Yup-like adapters optional and secondary.
7. Keep runtime registration as a supplement for dynamic composite controls, not as the architecture baseline.

## Related Documents

- `docs/architecture/object-field.md`
- `docs/architecture/array-field.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/architecture/surface-owner.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
