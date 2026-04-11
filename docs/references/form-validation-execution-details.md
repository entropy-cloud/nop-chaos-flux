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

1. `ValidationScopeRuntime`: `ready = valid && !validating` for non-form scopes
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

It also does not control whether:

1. effective rules are recomputed
2. `effectiveRequired` is recomputed
3. owner validity or readiness changes
4. `validating` changes

Closure rule:

1. if path `A` changes and path `B` is pulled into the same validation closure, `B`'s visible error state still follows `B`'s resolved display policy

### `system`

`system` is intended for owner-driven structural or lifecycle revalidation.

Typical cases:

1. branch activation
2. array structural change follow-up
3. draft writeback follow-up
4. other owner-managed participation changes

`system` should not mutate touched / visited policy state.

`system` updates validation state, but user-visible field errors should still respect the target field's resolved display policy.

That means:

1. owner summary validity may change immediately
2. diagnostics may change immediately
3. submit / ready state may change immediately
4. `effectiveRequired` may change immediately
5. `validating` may change immediately
6. a field does not become visually red only because a `system` run happened

This is the important separation:

1. validation state and effective-required state are runtime truth
2. error-message visibility is a UI filtering concern

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

### External Data Projection Inside One Owner

Async fetched data that is written back into the same owner is not a cross-owner dependency problem.

Example:

1. user edits `companyId`
2. owner triggers a fetch for company details
3. response is projected into `companyName`, `taxCode`, `creditRating` inside the same owner through the schema runtime's normal value update path
4. those projected values then participate in normal owner-local closure expansion and validation

Once written into the owner, the fetched values are treated as ordinary owner-local values.

## 5. Overlay Participation

Runtime overlays are owner-local extensions, not a bypass around active participation.

Rules:

1. overlays may register only against paths owned by the current owner
2. overlays are only effective while their target paths are active in the current owner
3. if a target path becomes inactive because of branch or structural changes, its overlay becomes inactive too
4. when the path becomes active again, the overlay may participate again if still registered

This prevents overlays from reviving inactive branches or bypassing the active instance graph.

Timing rule:

1. overlay registration may happen before the next validation cycle
2. overlay effectiveness is decided during participation preparation, not at raw registration time

This avoids microtask-order bugs where an overlay and a branch switch happen in the same turn.

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

## 6.1 Structural Cleanup Patterns

The architecture doc defines two cleanup layers:

1. immediate cleanup at structural mutation time
2. idempotent participation refresh at validation time

This section explains what those layers usually mean.

### Variant Switch

When a branch changes from active to inactive:

1. mark the old branch paths inactive
2. clear stale field errors for the old branch
3. invalidate or abort in-flight async runs for the old branch
4. invalidate materialization/cache entries for the old branch
5. activate the new branch paths
6. trigger owner-managed follow-up validation, typically with `reason: 'system'`

### Repeated Row Add / Remove / Reorder

When repeated rows change structurally:

1. update active repeated instances
2. remove state for deleted logical rows
3. migrate surviving state by logical identity when available
4. fall back to index-based remap only when no stable identity exists
5. abort in-flight async runs whose target paths are no longer valid
6. run owner-local reconciliation via `applyChangesAndRevalidate(..., reason: 'system')`

The important rule is not the exact remap algorithm. It is that structural mutation and validation reconciliation are coordinated, rather than left to accidental mount timing.

Nested repeated structures follow the same rule recursively.

For example, a path such as `contacts.0.tags.2` is a runtime instance path derived from nested repeated templates such as `contacts[].tags[]`.

Implementations need a stable template-to-instance mapping for multi-level repeated structures rather than relying on a single flat string replacement rule.

## 6.2 Validation Execution Flow Details

The architecture doc gives the seven-step skeleton. This section expands what each step means.

### Step 1: Prepare Participation

The owner refreshes which paths currently participate.

Typical work includes:

1. branch activation and deactivation
2. repeated item materialization
3. hidden-path reconciliation
4. cleanup of paths that became inactive
5. deciding which overlays are active in this run

### Step 2: Compute Impacted Closure

The owner expands the direct change set into the set of paths that may be affected.

Typical closure sources include:

1. directly changed paths
2. aggregate ancestors
3. explicit rule dependents
4. expression dependents
5. overlay-contributed dependents
6. paths affected by structural activation changes

Performance note:

1. closure can become large in dependency-heavy forms
2. a single toggle may legitimately expand to many dependent fields
3. implementations should treat closure size as a real performance concern rather than an edge case

### Step 3: Expand Validation Targets

The closure is expanded into concrete validation targets.

Typical depth by reason:

1. `change`: usually local and dependency-aware
2. `blur`: usually local and dependency-aware
3. `submit`: may expand to all active owned targets
4. `commit`: may expand to all active targets in the committed subtree or owner
5. `system`: expands to the structurally affected active targets without bypassing visibility policy

Additional rule for structural writes:

1. when `applyChangesAndRevalidate(..., reason: 'system')` changes an aggregate root such as an array root, expansion follows subtree semantics for that changed aggregate root rather than staying leaf-local

Large closure expansion and large target expansion are independent costs.

Even before async work starts, sync target expansion and materialization can dominate runtime in large forms or large inline tables.

### Step 4: Materialize Rules

For each target path:

1. read compiled templates
2. merge active overlays
3. evaluate `when`
4. evaluate rule arguments and messages
5. produce effective rules and effective required state

`effectiveRequired` is part of materialization state, not error visibility state.

It must be updated whenever rule materialization changes, including `system`-driven structural transitions.

### Step 5: Execute Sync Rules

Run synchronous rules and publish their state into owner-local field buckets.

### Step 6: Execute Async Rules

Run async rules under owner-managed run identity.

Rules:

1. stale runs must not publish
2. inactive-path runs must be aborted or ignored
3. latest-effective pending work should keep `validating` continuously true

### Step 7: Publish Scope Result

Update:

1. field-addressed validation state
2. scope summary state
3. ready / submit gating state
4. diagnostics-visible state if present

API return shape depends on the entry point:

1. `ValidationResult` for local path-centered calls
2. `ScopeValidationResult` for subtree or owner-scoped calls

## 6.3 Short Config Examples For Common Low-Code Patterns

For `filter`, linked lookup, and `wizard`, short config-oriented examples are usually easier to reason about than abstract lifecycle text alone.

### Filter As Form-Owned Data

```json
{
  "type": "form",
  "body": [
    {
      "type": "input-text",
      "name": "keyword"
    },
    {
      "type": "input-number",
      "name": "minPrice"
    }
  ]
}
```

Interpretation:

1. the common case is simply a form-owned subtree
2. validation attaches to the existing form owner automatically
3. no extra `validationScope` block is needed

### Linked Lookup With Data Source Publication

```json
{
  "type": "form",
  "body": [
    {
      "type": "input-text",
      "name": "companyId"
    },
    {
      "type": "data-source",
      "name": "companyLookup",
      "api": {
        "url": "/api/company/${companyId}"
      },
      "resultMapping": {
        "companyName": "${payload.name}",
        "taxCode": "${payload.taxCode}",
        "creditRating": "${payload.creditRating}"
      },
      "mergeToScope": true
    }
  ]
}
```

Interpretation:

1. this is closer to Flux low-code authoring than manual event choreography
2. fetched values are projected into the current form owner
3. dependent validation reacts automatically after projection

### Option Selection With Data Source Plus Projection

```json
{
  "type": "form",
  "body": [
    {
      "type": "radios",
      "name": "company",
      "options": {
        "type": "source",
        "action": "ajax",
        "api": {
          "url": "/api/company/options"
        }
      }
    },
    {
      "type": "data-source",
      "name": "companyDetails",
      "api": {
        "url": "/api/company/${company}"
      },
      "resultMapping": {
        "companyName": "${payload.name}",
        "companyId": "${payload.id}"
      },
      "mergeToScope": true
    }
  ]
}
```

Interpretation:

1. the selected field changes current scope data
2. the dependent data-source refreshes from that owner-local value
3. projected fields become current owner values and validate normally

### Wizard As One Form Owner With Step-Local Validation

```json
{
  "type": "form",
  "body": [
    {
      "type": "container",
      "name": "step1",
      "body": [
        {"type": "input-text", "name": "firstName", "required": true},
        {"type": "input-text", "name": "lastName", "required": true}
      ]
    },
    {
      "type": "formula",
      "name": "wizard.currentStep",
      "formula": "${wizard.currentStep || 1}"
    }
  ]
}
```

Interpretation:

1. the default mental model is still one form owner
2. step progression is UI/state orchestration on top of one owner
3. split owners only when the value lifecycle genuinely splits, such as a real draft child editor
4. this is a schematic ownership example, not a required field-storage pattern for wizard UI state

## 6.4 Performance And Lifecycle Notes

### Closure Expansion Cost

Dependency-heavy forms may generate very large closures from a single field change.

This is a real performance concern, especially with dynamic requiredness and many dependent fields.

### `validateAll()` Cost

Large inline-edit tables may produce thousands of active paths.

The expensive part is not only rule execution but also synchronous target expansion and rule materialization.

### Dynamic Schema / Recompiled Models

If schema is replaced at runtime, owner lifecycle must define how to:

1. replace `compiledModel`
2. clear stale caches and active runs
3. rebuild registrations against the new model

This is not yet fully specified in the architecture docs and should be treated as an explicit follow-up design area.

### Conditional Owner Boundaries

If schema options such as draft mode are server-driven, owner resolution must happen after those options are known for the current compiled model.

What remains disallowed is runtime reclassification without rebuilding the compiled model.

### Repeated Identity Assumption

Flux does not assume every repeated item can be stably identified by index alone.

The model assumes:

1. every active field instance has an owner-qualified runtime coordinate
2. repeated-instance UX and validation state should prefer stable logical identity when available
3. row key or equivalent stable identity is strongly preferred for reorder-heavy lists and tables

If no stable identity exists, index-based runtime coordinates still work, but remap cost and UX drift risk increase.

## 7. Owner-Local API Traversal

Validation APIs are owner-local by default.

Rules:

1. `validateAt()` affects only the current owner
2. `validateSubtree()` affects only the current owner
3. `validateAll()` traverses only paths owned by the current owner
4. child owners are only included when an explicit parent-child contract requires it

This is especially important for nested non-form scopes and draft editors.

## 7.1 `ValidationResult` vs `ScopeValidationResult`

These two result types exist because Flux has both local validation entry points and scope-level validation entry points.

### `ValidationResult`

Use `ValidationResult` for path-centered validation such as `validateAt(path)`.

It answers:

1. did this local validation run succeed
2. which errors were produced by this local run
3. whether local async work is still pending

It does not imply a full owner-wide error map.

### `ScopeValidationResult`

Use `ScopeValidationResult` for subtree or owner-wide validation such as:

1. `validateSubtree(path)`
2. `validateAll()`
3. `applyChangesAndRevalidate(...)`

It answers:

1. whether the validated subtree or owner is currently okay
2. which errors exist in that validated scope
3. the per-path `fieldErrors` view needed by scope-level callers

Shortcut:

1. `ValidationResult` is a local run result
2. `ScopeValidationResult` is a subtree / owner aggregate result

## 7.2 How To Tell Whether Something Is Draft

Draft is not defined by visual shape such as dialog, drawer, or side panel.

Draft is defined by value lifecycle.

Treat a scope as draft when all or most of the following are true:

1. the subtree edits local temporary values rather than the parent owner's live committed values
2. parent-owned validation state should remain unaffected until confirm or commit
3. the subtree must validate before writing back
4. successful confirmation writes changes back into another owner

Treat a subtree as bound editing rather than draft when:

1. edits immediately affect the parent owner's live values
2. parent validation state updates immediately
3. there is no separate commit boundary for the edited data

Shortcut:

1. local temporary value plus writeback later means draft
2. direct live editing means inherit-owner or parent-owned editing

## 7.3 Dialog Containing Form

`dialog` is a surface concept, not by itself a validation-owner concept.

However, a literal Flux `form` node is still an owner boundary under the architecture model.

The important distinction is between:

1. a dialog containing a real `form`
2. a dialog containing editable content that is not a `form`

### Dialog Containing A Real `form`

If the dialog contains an actual Flux `form` node:

1. the `form` is a child owner boundary
2. the dialog remains only a surface
3. whether that child form edits live values or local draft values affects data lifecycle, but not the fact that the form itself owns validation

Practical authoring rule:

1. if dialog content must edit parent live values directly, do not wrap that subtree in a nested `form`
2. use bound editable content under the parent owner instead
3. use a nested `form` only when a real child owner boundary is desired

### Dialog Containing Non-Form Editable Content

If the dialog contains editable content but not a real Flux `form` node:

1. the dialog is only a surface
2. the contained fields may still belong to the parent owner or another already-declared owner
3. this is not draft just because it appears in a dialog

### Dialog Form Editing Local Draft Values

If the dialog contains a child form or child editable scope that edits local temporary values before confirmation:

1. the dialog hosts a child owner
2. the contained form is typically a child `FormRuntime`
3. validation remains local until submit or confirm inside the dialog
4. successful confirmation writes back to the parent owner and triggers parent revalidation of impacted paths

### Practical Rule

Do not classify dialog content by surface type.

Classify it by:

1. whether the dialog contains a real `form` owner boundary or only non-form editable content
2. whether it edits live values or local draft values
3. whether it has an independent submit or confirm lifecycle

## 8. Component Notes

This section gives common participation patterns and interpretation examples.

Normative owner-boundary rules still live in `docs/architecture/form-validation.md`.

### `object-field`

Two common modes exist.

#### Inline Bound Object Editing

Typical inline-bound object editing:

1. it resolves to `inherit-owner`
2. child fields stay in the parent validation graph
3. aggregate object-level rules attach to the object root path
4. parent validation APIs own the result

#### Draft Object Editing

Typical draft object editing:

1. it resolves to `create-owner`
2. it creates a child validation scope runtime
3. its errors remain isolated until commit
4. successful commit writes back and triggers parent revalidation for impacted paths

### `array-field`

`array-field` commonly combines aggregate validation with repeated item participation.

Typical behavior:

1. array-level rules attach to the array root path
2. repeated item fields materialize as indexed runtime paths
3. local row editing may still remain in the parent owner if it edits parent-owned values directly
4. row draft editing creates a child owner only when editing is isolated before commit

Important distinction:

1. array aggregate validation is owner-level
2. row identity handling is a repeated-instance concern, not a reason by itself to create a new owner

### Inline Row Edit With Aggregate Rule

Example mental model:

1. `contacts[i].email` is edited inline under the parent owner
2. array-level `uniqueBy(email)` attaches to `contacts`
3. changing one row email expands closure to the aggregate root `contacts`
4. revalidating `contacts` may update aggregate-driven error state for more than one row-affecting path, not only the edited row

This is expected behavior, because aggregate closure is parent-level rather than leaf-local.

### `variant-field`

`variant-field` commonly changes which branch participates in validation.

Typical behavior:

1. inactive branches do not participate in validation
2. inactive branch errors and async runs must not remain live in active owner state
3. active overlays for inactive branches are inactive as well
4. branch switching should trigger owner-managed structural reconciliation

By itself, `variant-field` usually does not imply a new owner unless the chosen branch hosts a `create-owner` boundary.

### `table`

`table` is usually a structural or visual host rather than an owner boundary.

Common modes:

#### Inline Cell Editing Bound To Parent Values

1. table cell fields commonly resolve to `inherit-owner`
2. validation remains in the parent owner
3. row-level aggregate rules still attach to row object root paths when modeled

#### Row Draft Editing

1. the row editor typically resolves to `create-owner` only when it owns a local draft lifecycle
2. row child errors remain isolated until commit
3. parent table/form validation does not automatically recurse into row child owners

### `form`

`form` is the canonical validation-capable owner boundary.

It adds:

1. submit gating
2. touch-aware readiness
3. error display policy

### Non-Form Scope Containers

Examples include filter panels and search panels.

Typical behavior:

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
