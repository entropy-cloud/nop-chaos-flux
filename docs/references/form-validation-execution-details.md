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

`validating` means the current owner still has pending async validation work that may affect owned field state.

Pending work includes:

1. already-started async validation calls
2. debounced async validation work that has been scheduled but not started yet

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

### `showErrorOn: 'touched'` With `system`

`system` is allowed to make an untouched field invalid.

Typical case:

1. another field changes a `requiredWhen` condition
2. the owner re-materializes rules for target field `B`
3. `B` now has `effectiveRequired === true` and may already fail validation
4. `B` is still untouched, so its error message may remain hidden in field chrome

Rules:

1. hidden field chrome does not imply the owner is valid
2. `ready` and `canSubmit` react to current validation truth, not to current error visibility
3. `submit()` may transition untouched invalid fields into visible submit-time errors according to form policy
4. ordinary `system` revalidation alone does not mutate touched or visited state

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

### Overlay Merge Semantics

Compiled templates remain the base layer.

Practical merge order:

1. start from compiled templates for the path
2. append active overlay templates for the same path
3. if an overlay template reuses an existing `id`, replace the earlier template with that `id`
4. keep different rule ids even when they share the same `kind`

This keeps overlays explicit and local.

They do not silently erase compiled rules by kind alone.

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
4. for very large inline-edit tables, `change` validation should prefer the smallest semantically correct closure for the current interaction rather than defaulting to owner-wide traversal

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

Execution note for large editable tables:

1. a single cell change may legitimately pull in aggregate ancestors such as the array root
2. that does not mean the host must automatically run owner-wide `validateAll('change')` on every keystroke
3. if broad aggregate validation is too expensive for the keystroke path, the host should keep `change` local/dependency-aware and move broader aggregate validation to `blur`, `commit`, or `submit`
4. any incremental optimization must preserve the same aggregate semantics once the chosen publish boundary is reached

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

A debounced async rule counts as pending owner-local validation work during its debounce window.

That means owner `validating` and readiness may already reflect pending validation before the actual async call starts.

### Entry Arbitration And Supersession

Entry points may overlap in time.

Typical conflict:

1. a debounced `validateAt(path, 'change')` is pending
2. the user immediately triggers `validateAll('submit')`

Owner-local rule:

1. `submit` and `commit` supersede older lower-priority `change`, `blur`, and `manual` work for affected paths
2. for owner-wide submit, the affected set is the current owner traversal set plus any already-running lower-priority targets in that owner
3. for subtree submit or commit, the affected set is the subtree plus any already-running lower-priority targets whose published result would write into that subtree
4. pending debounce for those lower-priority runs is cancelled
5. stale async work from those lower-priority runs is ignored on completion
6. the higher-priority entry validates against the latest value snapshot available when it starts

This is not a separate cross-owner scheduler.

It is owner-local arbitration.

### Rule Execution Is Collect-All

Flux executes all active effective rules for a path in materialized order.

Example:

1. `password` has `required`, `minLength`, and `pattern`
2. `required` fails on an empty string
3. the owner may still execute the remaining active rules in the same run
4. the final field bucket contains all produced errors for that run

This means the runtime does not use implicit first-error short-circuiting.

### Dependency Cycles

Owner-local dependency cycles are legal.

Example:

1. `startDate` depends on `endDate`
2. `endDate` depends on `startDate`

Execution rule:

1. closure expansion tracks visited paths and converges to a fixed owner-local set
2. the runtime must not recurse indefinitely just because the dependency graph contains a cycle
3. compilers may still emit diagnostics for suspiciously large or accidental cycles

### Step 7: Publish Scope Result

Update:

1. field-addressed validation state
2. scope summary state
3. ready / submit gating state
4. diagnostics-visible state if present

API return shape depends on the entry point:

1. `ValidationResult` for local path-centered calls
2. `FormValidationResult` for current exported subtree or owner-scoped calls

## 6.2.1 Transitional Owner Lifecycle

Validation owners may pass through transient lifecycle states before they are ready for ordinary validation work.

### `compiledModel === null`

`compiledModel === null` means the owner currently has no executable compiled validation model attached.

It is valid only while the owner is:

1. `bootstrapping`
2. `refreshing`
3. `disposed`

It does not mean a long-lived registration-only validation mode.

### Validation Calls During `bootstrapping` Or `refreshing`

Rules:

1. ordinary validation calls must not execute against a `null` model
2. implementations may queue or await those calls until the owner becomes `active`
3. once the owner is `disposed`, new validation calls must be rejected rather than queued forever
4. current live `submit()` semantics are narrower: if the owner is still `bootstrapping` or `refreshing`, submit returns an explicit failure result instead of waiting, and it does so before mutating submit/touched state

### Field Registration During Transitional States

Rules:

1. registrations carry stable `registrationId`, while accepted `modelGeneration` is assigned by the owner runtime
2. updates or unregister callbacks from an older accepted generation must be ignored for the newer generation
3. if registration arrives before the owner has an executable model, the runtime may buffer it or require re-registration after activation
4. buffered registration must not be treated as proof that the path exists in the next compiled model
5. `registerField(...)` returns an acceptance handle so a mounted field can distinguish accepted participation from rejected participation
6. registration updates are instance-addressed by `registrationId`, which avoids ambiguity when more than one mounted instance targets the same logical path

## 6.2.2 Submit Snapshot And Child Activation Timing

Parent submit and child activation are intentionally decoupled.

Rules:

1. one submit attempt snapshots the currently active child contracts after the parent owner itself reaches `active`
2. child owners that have not activated yet are absent from that snapshot and therefore do not participate in that submit attempt
3. child owners already in the snapshot and marked `recurse-submit` must finish their current refresh before the parent submit resolves
4. a child with `compiledModel === null` is not active and therefore cannot register an active contract

This prevents parent submit from guessing about child owners that have not finished their own lifecycle.

## 6.2.3 Commit Propagation Across Nested Draft Owners

Commit propagation is one boundary at a time.

Example chain:

1. `parent` owns committed page values
2. `child` owns a draft object editor
3. `grandchild` owns a nested draft row editor inside that draft object

Rules:

1. `grandchild` commit writes only into `child`
2. after that writeback, `child` runs its own impacted-path revalidation
3. `parent` is unchanged until `child` itself commits upward
4. there is no implicit `grandchild -> parent` writeback that skips `child`

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
      "type": "radio-group",
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
        { "type": "input-text", "name": "firstName", "required": true },
        { "type": "input-text", "name": "lastName", "required": true }
      ]
    },
    {
      "type": "text",
      "text": "Current step: ${wizard.currentStep || 1}"
    }
  ]
}
```

Interpretation:

1. the default mental model is still one form owner
2. step progression is UI/state orchestration on top of one owner
3. split owners only when the value lifecycle genuinely splits, such as a real draft child editor
4. this is a schematic ownership example, not a required field-storage pattern for wizard UI state

## 6.3.1 Complex Scenario Examples

### Dynamic Requiredness Plus Cross-Field Compare Plus Async Uniqueness

Example mental model:

1. `country` toggles whether `taxId` is required
2. `confirmTaxId` must equal `taxId`
3. `taxId` also runs async uniqueness validation against a remote API

When `taxId` changes:

1. closure includes `taxId`
2. closure includes `confirmTaxId` because of the equality dependency
3. closure may include aggregate ancestors such as `company`
4. sync rules publish immediately
5. async uniqueness run launches under the current owner and current model generation
6. stale async runs from earlier generations or earlier `taxId` values must not publish

This example is useful because one leaf change fans out into both sync and async downstream work.

`confirmTaxId` depends on the current owner value of `taxId`, not on the completion event of `taxId`'s async validation.

If async uniqueness finishes later without changing owner data, that completion does not by itself create a new dependency-triggered run for `confirmTaxId`.

### `variant-field` Switch With Old Async Still Pending

Example mental model:

1. branch `personal` contains async `validateNationalId`
2. branch `company` contains async `validateTaxNumber`
3. user switches from `personal` to `company` before the first async run completes

Rules:

1. old `personal` branch paths become inactive immediately
2. async runs for inactive branch paths are aborted or marked stale
3. the new `company` branch may start its own async runs immediately after activation
4. late completion from the `personal` branch must not publish into current owner state

If the user later switches back to `personal`, the branch participates again from current owner values.

The owner may recompute errors from scratch or reuse retained branch-local state only when that state is still valid for the same owner generation and active-instance mapping.

### Multi-Level Nested Arrays With Aggregate Rules

Example mental model:

1. path template is `orders[].lines[].components[].partId`
2. `lines` has aggregate rule `uniqueBy(sku)`
3. `components` has aggregate rule `atLeastOneFilled(partId)`
4. deleting `orders.0.lines.1` shifts later runtime instance paths

Expected coordination:

1. remove state for the deleted logical row
2. remap surviving row state by stable logical identity when available
3. remap nested `components` instances under surviving rows using the same template-to-instance mapping discipline
4. call `applyChangesAndRevalidate(..., reason: 'system')` on the owning array scope after the structural write
5. closure expansion includes the changed array root and any affected aggregate ancestors

This example is the practical test for nested repeated-instance bookkeeping rather than single-level `items[]` remapping.

### Form Submit -> Server Errors -> Edit -> Resubmit

Example mental model:

1. local submit-time validation passes
2. server returns `email already registered` and `username reserved`
3. host maps those errors into owner paths using `applyExternalErrors(...)`
4. user edits `email`
5. owner clears external errors from the same source for `email` and owned ancestors such as `account` if that server result context was attached there
6. the still-unchanged `username` external error remains until cleared by edit or by replacement from a later server response
7. next submit performs normal local validation again, then may receive a fresh external error set

This is the canonical round-trip for service-side field validation.

### Parent Form With Dialog Child Draft Owner

Example mental model:

1. parent form owns committed values
2. dialog hosts a child `FormRuntime` editing local draft values
3. parent uses `ChildValidationContract` with `ignore` during ordinary editing
4. dialog confirm validates the child locally before writeback
5. successful writeback updates parent-owned leaf paths
6. parent revalidates only impacted parent-owned closure after the commit

If the host explicitly uses `recurse-submit`, parent submit snapshots the active child contract set first, then waits for those child owners to finish their submit-time validation.

### Filter Panel As Non-Form Validation Scope

Example mental model:

1. the scope contains `startDate` and `endDate`
2. rule requires `startDate <= endDate`
3. scope triggers search on change rather than on explicit submit

Interpretation:

1. this is a `ValidationScopeRuntime`, not a `FormRuntime`
2. there is no submit gate or touched policy by default
3. the owner still computes `valid`, `validating`, and `ready`
4. the host action may choose to block search when `ready === false`, or may choose to run search only when the scope is valid

### Table Inline Edit With Row Aggregate And Cell Rule

Example mental model:

1. table row path is `contacts.3`
2. edited cell path is `contacts.3.email`
3. cell rule checks email pattern
4. array aggregate rule `uniqueBy(email)` attaches at `contacts`

When `contacts.3.email` changes:

1. closure includes `contacts.3.email`
2. closure expands to aggregate root `contacts`
3. target expansion may therefore update both the cell error bucket and the array/root aggregate bucket
4. row reorder logic, if any, must preserve state by row identity when available

This shows why aggregate closure is broader than one edited cell.

It does not, by itself, require every keystroke to re-run owner-wide aggregate validation.

Recommended interaction policy for large tables:

1. `change`: validate the edited cell plus the smallest impacted local/dependency-aware set that keeps visible cell feedback correct
2. `blur`: allow broader aggregate validation when the product requires faster feedback than submit-time only
3. `commit` / `submit`: run the full aggregate-correct owner-local validation required by the interaction contract

This is the preferred escape hatch when aggregate correctness is required but full owner-wide keystroke validation would create a performance cliff.

### Detail Dialog Commit Writeback To Parent Owner

Example mental model:

1. parent owner contains `profile.summary` and `profile.contact`
2. dialog child owner edits draft `profile.contact`
3. confirm writes back `profile.contact.email` and `profile.contact.phone`

Recommended impacted-path rule:

1. changed leaf paths are the committed leaf writes
2. closure expands to aggregate ancestors such as `profile.contact`
3. closure also expands to any owner-local dependents in the parent, such as `profile.summary`
4. parent revalidation remains owner-local; the child owner's internal buckets are not merged into the parent

### Path Reuse With Owner-Boundary Change

Example mental model:

1. old schema keeps `profile.contact` inline under the parent owner
2. new schema makes `profile.contact` a child draft editor owner

Although the path string is unchanged:

1. owner identity changed
2. contract shape changed
3. field state must not migrate by path alone

This is the canonical hot-reload example for why path reuse is not semantic continuity.

## 6.4 Performance And Lifecycle Notes

### Closure Expansion Cost

Dependency-heavy forms may generate very large closures from a single field change.

This is a real performance concern, especially with dynamic requiredness and many dependent fields.

### `validateAll()` Cost

Large inline-edit tables may produce thousands of active paths.

The expensive part is not only rule execution but also synchronous target expansion and rule materialization.

Recommended rule:

1. do not treat `validateAll('change')` as the default table-cell typing path in aggregate-heavy owners
2. use `validateAll()` for explicit broad validation boundaries such as `submit`, `commit`, or carefully chosen `blur` interactions
3. if the product needs near-live aggregate feedback, prefer a semantics-preserving incremental aggregate algorithm over undocumented partial skipping

### Dynamic Schema / Recompiled Models

If schema is replaced at runtime, owner lifecycle must define how to:

1. replace `compiledModel`
2. clear stale caches and active runs
3. rebuild registrations against the new model
4. rebuild child contracts and overlay participation against the new model generation

The current technical proposal is captured in:

1. `docs/analysis/2026-04-11-dynamic-schema-hot-reload-and-validation-owner-lifecycle.md`

### Recommended Cross-Owner Projection Pattern

When another owner's data must influence validation here, prefer explicit publication into the current owner through an existing runtime path such as:

1. `data-source` + `resultMapping`
2. host action writeback into current owner data
3. draft confirm or parent writeback that updates ordinary owner-local values

Do not model this as an automatic cross-owner reactive edge.

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

Additional clarification:

1. `validateSubtree()` never recurses into child owners by itself, even with `reason: 'submit'` or `reason: 'commit'`
2. recursive parent-child coordination belongs to parent `submit()` or explicit host orchestration, not to implicit subtree traversal

This is especially important for nested non-form scopes and draft editors.

## 7.1 `ValidationResult` vs `FormValidationResult`

The current exported baseline uses `ValidationResult` for path-centered calls and `FormValidationResult` for subtree or owner-scoped calls.

### `ValidationResult`

Use `ValidationResult` for path-centered validation such as `validateAt(path)`.

It answers:

1. did this local validation run succeed
2. which errors were produced by this local run
3. whether local async work is still pending

It does not imply a full owner-wide error map.

### `FormValidationResult`

Use `FormValidationResult` for current exported subtree or owner-wide validation such as:

1. `validateSubtree(path)`
2. `validateAll()`
3. `applyChangesAndRevalidate(...)`

It answers:

1. whether the validated subtree or owner is currently okay
2. which errors exist in that validated scope
3. the per-path `fieldErrors` view needed by scope-level callers

Shortcut:

1. `ValidationResult` is a local run result
2. `FormValidationResult` is the current exported subtree / owner aggregate result

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

If the dialog owner is itself hosting nested child draft owners, the same rule applies recursively one owner boundary at a time.

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
