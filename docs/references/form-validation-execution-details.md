# Form Validation Execution Details

## Purpose

This document explains execution details and component-level handling that support the active validation architecture.

It is a reference document.

Normative source of truth remains:

- `docs/architecture/form-validation.md`

Use this document when you need clarification on:

1. owner-local execution behavior
2. `ready` / `valid` / `validating` interpretation
3. `showErrorOn` and `system` display behavior
4. repeated-item identity and remapping expectations
5. component-specific participation rules for `object-field`, `array-field`, `variant-field`, and `table`

## 0. Understanding Value Axis And Owner Axis

The architecture uses two axes because “which field is this?” and “who owns validation for it right now?” are different questions.

### Value Axis

The value axis describes the validation structure itself.

It answers:

1. which paths exist
2. which rules belong to those paths
3. which object / array / branch relationships exist
4. which paths depend on other paths

Example:

1. `profile.firstName` is a field path
2. `profile` may have an object-level rule such as all-or-none
3. `contacts` may have an array-level rule such as `uniqueBy(email)`

These statements remain true no matter which UI surface is currently editing them.

### Owner Axis

The owner axis describes which runtime currently owns validation behavior and state for those values.

It answers:

1. where errors are stored
2. which runtime runs validation
3. which API handles `validateAt()` or `validateAll()`
4. whether validation is isolated in a draft child scope or shared with the parent scope

### Why They Must Be Separate

The same logical value path may appear under different validation owners at different times.

Example:

1. parent form owns committed data at path `profile.firstName`
2. a detail dialog opens a draft editor for the same logical location
3. the dialog validates draft state locally before commit

In value-axis terms, both are about `profile.firstName`.

In owner-axis terms, they are different:

1. parent committed state might be `{ ownerId: 'form:profile', path: 'profile.firstName' }`
2. child draft state might be `{ ownerId: 'draft:profileDialog', path: 'profile.firstName' }`

That is why plain path alone is not enough for validation bookkeeping.

### Intuition

Use this shortcut:

1. value axis asks: “what part of the data model is this?”
2. owner axis asks: “which runtime is responsible for validation of that part right now?”

If only the value axis existed, draft editors would leak errors into parent forms.

If only the owner axis existed, the system would lose object / array / dependency structure and collapse into mount-driven bookkeeping.

Flux needs both at once.

## 1. State Summary Interpretation

### `valid`

`valid` means the current owner has no active validation errors in its owned paths.

### `validating`

`validating` means the current owner still has in-flight async validation work that may affect owned field state.

### `ready`

`ready` means the current owner is in a state where owner-level confirmation or submit semantics may proceed.

Interpretation:

1. `ValidationScopeRuntime`: `ready` is the owner-level readiness signal for non-form scopes
2. `FormRuntime`: `ready` includes form-specific touch policy in addition to validation state
3. parent scopes should use `ready` for child gating, not `valid` alone
4. parent scopes should still consider `validating` separately when deciding whether to block actions

Practical rule:

1. for `summary-gate`, parent logic reads both `ready` and `validating`
2. `valid` alone is not sufficient for child gating

## 2. Display Policy Notes

### `showErrorOn`

`showErrorOn` controls visibility timing of validation results in UI.

It does not control whether rule execution occurs.

Closure rule:

1. if path `A` changes and path `B` is pulled into the same validation closure, `B`'s visible error state still follows `B`'s own display policy

### `system`

`system` is intended for owner-driven structural or lifecycle revalidation.

Typical cases:

1. branch activation
2. array structural change follow-up
3. draft writeback follow-up
4. other owner-managed participation changes

`system` should not mutate touched / visited policy state.

UI teams should verify whether immediate display of `system`-originated errors is desirable for the product. This is an implementation-sensitive behavior and should be validated with UX expectations before being made stricter.

## 3. Native DOM Validation Boundary

Flux validation does not own browser-native validation inside uncontrolled DOM.

Examples:

1. native `<input required>` inside a `no-owner` subtree
2. browser-local validity popups or blocked submit behavior outside Flux runtime control

Guideline:

1. do not rely on native DOM validity as part of Flux validation state
2. if a field must participate in Flux validation, model it through Flux validation rules and owner-managed state

## 4. Cross-Owner Dependency Boundary

Reactive dependency edges are owner-local.

That means:

1. a compiled rule may depend on other values inside the same owner
2. a compiled rule must not create reactive edges into another owner

If another owner's value is needed:

1. project it into the current owner as an explicit input
2. treat the projected value as local owner data for validation purposes

This preserves owner isolation and keeps dependency closure computation local.

## 5. Overlay Participation

Runtime overlays are owner-local extensions, not a bypass around active participation.

Rules:

1. overlays may register only against paths owned by the current owner
2. overlays are only effective while their target paths are active in the current owner
3. if a target path becomes inactive because of branch or structural changes, its overlay becomes inactive too
4. when the path becomes active again, the overlay may participate again if still registered

This prevents overlays from reviving inactive branches or bypassing the active instance graph.

## 6. Repeated Items And Identity

Repeated structures use indexed runtime paths for bookkeeping.

Examples:

1. `items.0.name`
2. `items.1.name`
3. `items.2.name`

However, when repeated items have a stable logical identity, state migration should prefer logical identity over raw index.

This applies to:

1. validation state buckets
2. touched / dirty / visited state
3. local row-scoped draft state
4. any remap logic after reorder operations

Fallback rule:

1. pure index remap is acceptable only when no stable item identity exists

This reference does not define the remap algorithm. It defines the direction: preserve logical row identity when available.

## 7. Owner-Local API Traversal

Validation APIs are owner-local by default.

Rules:

1. `validateAt()` affects only the current owner
2. `validateSubtree()` affects only the current owner
3. `validateAll()` traverses only paths owned by the current owner
4. child owners are only included when an explicit parent-child contract requires it

This is especially important for nested non-form scopes and draft editors.

## 8. Component Notes

### `object-field`

Two common modes exist.

#### Inline Bound Object Editing

When `object-field` edits parent-owned values directly:

1. it resolves to `inherit-owner`
2. child fields stay in the parent validation graph
3. aggregate object-level rules attach to the object root path
4. parent validation APIs own the result

#### Draft Object Editing

When `object-field` edits a local draft before commit:

1. it resolves to `create-owner`
2. it creates a child validation scope runtime
3. its errors remain isolated until commit
4. successful commit writes back and triggers parent revalidation for impacted paths

### `array-field`

`array-field` combines aggregate validation with repeated item participation.

Rules:

1. array-level rules attach to the array root path
2. repeated item fields materialize as indexed runtime paths
3. local row editing may still remain in the parent owner if it edits parent-owned values directly
4. row draft editing creates a child owner only when editing is isolated before commit

Important distinction:

1. array aggregate validation is owner-level
2. row identity handling is a repeated-instance concern, not a reason by itself to create a new owner

### `variant-field`

`variant-field` changes which branch participates in validation.

Rules:

1. inactive branches do not participate in validation
2. inactive branch errors and async runs must not remain live in active owner state
3. active overlays for inactive branches are inactive as well
4. branch switching should trigger owner-managed structural reconciliation

`variant-field` does not itself imply a new owner unless the chosen branch hosts a `create-owner` boundary.

### `table`

`table` is primarily a structural or visual host. It does not automatically create a validation owner.

Common modes:

#### Inline Cell Editing Bound To Parent Values

1. table cell fields resolve to `inherit-owner`
2. validation remains in the parent owner
3. row-level aggregate rules still attach to row object root paths when modeled

#### Row Draft Editing

1. the row editor resolves to `create-owner` only when it owns a local draft lifecycle
2. row child errors remain isolated until commit
3. parent table/form validation does not automatically recurse into row child owners

### `form`

`form` is always a validation-capable owner boundary.

It adds:

1. submit gating
2. touch-aware readiness
3. error display policy

### Non-Form Scope Containers

Examples include filter panels and search panels.

Rules:

1. they become owners only when schema declares a validation scope boundary or equivalent owner-capable semantics
2. they use `ValidationScopeRuntime`, not `FormRuntime`, unless they also define submit-oriented form behavior

## 9. When To Extend Architecture vs Reference Docs

Add content to `docs/architecture/form-validation.md` when the change affects:

1. source-of-truth boundaries
2. owner model
3. dependency legality
4. runtime contracts
5. parent-child ownership rules

Add content to this reference document when the change mostly affects:

1. execution clarifications
2. structural edge-case handling
3. component-specific participation patterns
4. UX interpretation guidance
5. examples and scenario notes
