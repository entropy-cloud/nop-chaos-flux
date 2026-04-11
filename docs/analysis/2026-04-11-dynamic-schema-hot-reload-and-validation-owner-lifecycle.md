# Dynamic Schema Hot Reload And Validation Owner Lifecycle

## Purpose

This document records the remaining follow-up design problem around dynamic schema replacement.

The current validation architecture assumes that a `CompiledValidationModel` is stable for the lifetime of one validation owner instance.

That assumption is acceptable for most ordinary runtime flows, but it becomes insufficient in low-code authoring and dynamic-schema-renderer scenarios where schema can change while the runtime is still alive.

---

## 1. Problem Statement

Dynamic schema replacement creates a lifecycle gap between:

1. the current owner runtime instance
2. the compiled model currently attached to that owner
3. runtime registrations, async runs, caches, and validation state derived from the old model

If schema changes while the owner instance survives, the system must answer:

1. when is the old compiled model invalidated
2. whether old field registrations remain meaningful
3. whether field validation state should be migrated, cleared, or partially retained
4. how stale async validation runs are cancelled
5. whether path identity reused by the new schema still means the same thing

---

## 2. Why This Matters

This is not an edge case for Flux.

Flux has dynamic schema renderer ambitions, and low-code editing flows naturally include:

1. adding or removing a field while preview is live
2. changing a renderer from inline bound edit to draft edit
3. changing rules or expressions for an existing field
4. replacing an object/array subtree while the surrounding page remains mounted

Without a clear owner lifecycle rule, the runtime will be forced to guess whether old state is still valid.

That is dangerous because the old and new schema may reuse the same path while changing its meaning.

---

## 3. What Must Not Happen

The runtime must not do any of the following silently:

1. keep old async runs alive after the compiled model that created them is gone
2. keep old materialization caches if rule templates changed
3. keep old active instance graphs if structure changed
4. migrate field state purely by path when path semantics changed
5. reclassify owner boundaries inside one unchanged compiled model instance

---

## 4. Recommended Core Rule

The core rule should be:

> A validation owner assumes its compiled model is stable for the lifetime of that owner instance. If the compiled model changes semantically, the owner must enter an explicit model-replacement lifecycle.

This means dynamic schema replacement is not just “swap one schema prop”.

It is an owner lifecycle event.

---

## 5. Owner Lifecycle For Model Replacement

The recommended lifecycle is:

1. compile the new schema into a new compiled model
2. compare owner-boundary compatibility between old and new model
3. if owner boundary changed, dispose the old owner and create a new one
4. if owner boundary is compatible, replace the model under an explicit reset/rebind sequence
5. cancel stale async runs from the old model generation
6. clear or invalidate old materialization caches and active instance data
7. rebuild field registrations against the new model
8. re-establish source/reaction/watch relationships against the new scope/model pairing
9. run an owner-local reconciliation pass before accepting ordinary validation requests again

---

## 6. Two Cases To Distinguish

### 6.1 Owner-Compatible Model Refresh

This is the milder case.

Examples:

1. rules changed for existing fields
2. optional fields were added under the same owner
3. labels/layout changed without owner-boundary changes

In this case the owner instance may survive, but it still must:

1. increment model generation
2. invalidate old caches/runs
3. rebuild registrations and active structure
4. decide whether any field-level state may be retained safely

### 6.2 Owner-Boundary Change

This is the stronger case.

Examples:

1. a subtree changed from inherit-owner to draft/create-owner
2. a nested form boundary appeared or disappeared
3. a value-oriented editor changed ownership mode

In this case the old owner instance should be treated as incompatible with the new model topology.

Recommended behavior:

1. dispose old owner
2. create new owner tree
3. re-register fields and child contracts from scratch

---

## 7. State Retention Guidance

State retention should be conservative.

### Safe To Recompute / Reset

Always reset or invalidate:

1. materialization cache
2. active instance graph
3. async run ownership
4. dependency-closure cache if any

### Potentially Retainable

May be retained only when compatibility is explicit and proven:

1. field value state owned by the surrounding scope store
2. touched/dirty/visited for unchanged form fields
3. field errors for unchanged paths whose compiled rule identity is also unchanged

The default should still lean toward reset unless compatibility is cheap to prove.

---

## 8. Async Validation Rule

Async runs must be model-generation-aware.

At minimum each run should be scoped by:

1. owner id
2. model generation
3. path
4. rule id
5. run generation

When model generation changes:

1. old runs must not publish
2. old runs should be aborted when possible
3. a reused path under the new model must not accept results from the old model generation

---

## 9. Path Reuse Is Not Enough

One major trap is assuming path equality implies semantic continuity.

That is false in hot-reload scenarios.

Example:

1. old schema: `profile.contact` is an inline object under parent owner
2. new schema: `profile.contact` becomes a draft child editor boundary

The path string is the same, but:

1. ownership changed
2. lifecycle changed
3. validation participation changed

Therefore migration must consider at least:

1. owner boundary
2. node kind
3. rule identity set
4. repeated/branch topology

not path alone.

---

## 10. Interaction With Dynamic Schema Renderer

For a dynamic schema renderer, the most practical rule is:

1. schema identity change triggers recompile
2. validation owner compares the new compiled model against the old one
3. incompatible change forces owner recreation
4. compatible change allows owner refresh lifecycle

This gives dynamic-schema flows a predictable contract instead of ad hoc partial mutation.

---

## 11. What Should Enter Formal Architecture Later

This topic does not yet need to be fully merged into the architecture baseline, but the following rule likely should be added later:

> Validation owner instances assume compiled-model stability. Dynamic schema replacement requires explicit owner refresh or owner recreation; it is not an in-place no-op update.

The rest of the detailed migration/retention strategy can stay in follow-up design and implementation planning until code work begins.

---

## 12. Recommended Next Step

The next concrete step should be a plan or design note that answers:

1. how model generations are tracked in runtime
2. which caches are invalidated eagerly
3. whether any field-state migration is allowed in Phase 1/2
4. how dynamic schema renderer requests owner refresh/recreation
5. how debugger/devtools expose model-generation changes

This is now the main unresolved lifecycle gap in the current validation design.
