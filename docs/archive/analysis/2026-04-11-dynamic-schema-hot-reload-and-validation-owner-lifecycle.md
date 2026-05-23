# Dynamic Schema Hot Reload And Validation Owner Lifecycle

## Status

Technical design — ready for plan authoring.

Last Reviewed: 2026-04-11

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

## 3. Core Rule

> A validation owner assumes its compiled model is stable for the lifetime of that owner instance. If the compiled model changes semantically, the owner must enter an explicit model-replacement lifecycle.

Dynamic schema replacement is not a "swap one schema prop" operation.

It is an owner lifecycle event.

---

## 4. Model Generation

### 4.1 The `modelGeneration` Counter

Each `ValidationScopeRuntime` instance holds a monotonically increasing integer counter: `modelGeneration: number`.

```ts
interface ValidationOwnerInternalState {
  modelGeneration: number;
  compiledModel: CompiledValidationModel | null;
  // ... other state
}
```

The initial value is `1`. It increments each time `compiledModel` is replaced via the model-replacement lifecycle.

Generation `0` is reserved as a sentinel meaning "owner not yet initialized".

### 4.2 Async Run Identity

Every async validation run records the generation at launch time:

```ts
interface AsyncRunKey {
  ownerId: string;
  modelGeneration: number;
  path: string;
  ruleId: string;
  runGeneration: number;
}
```

Rules:

1. when a run completes, it checks whether `owner.modelGeneration === run.modelGeneration` and whether `run.runGeneration` is still the current run for that path+ruleId
2. if either check fails, the result is discarded without publishing
3. on `modelGeneration` increment, all pending runs whose `modelGeneration` is less than the new value are considered stale and must not publish

### 4.3 Cache Keys

Materialization cache entries and dependency-closure cache entries must include `modelGeneration` in their cache key or be invalidated wholesale on generation change.

Preferred strategy: store the current `modelGeneration` at cache-write time; on any cache read, compare against current generation and treat a mismatch as a cache miss.

---

## 5. Owner Compatibility Check

### 5.1 What "Compatible" Means

Two compiled models are owner-compatible if and only if all of the following hold:

1. the owner boundary classification (`inherit-owner` / `create-owner` / `no-owner`) for the scope root is unchanged
2. the `ownerId` is unchanged
3. the `rootPath` is unchanged
4. the owner remains in the same owner-tree slot relative to its parent contract boundary

Two compiled models are owner-incompatible if any of the following changed:

1. the scope root changed from `inherit-owner` to `create-owner` or vice versa
2. the `ownerId` was reassigned
3. the `rootPath` changed

Owner-compatible models may still have structural differences in their nodes, rules, and dependencies. Those differences are handled by the model-refresh lifecycle, not by owner recreation.

### 5.2 Compatibility Check Algorithm

The owner-tree slot is represented by a stable `ownerSlotId: string` derived from the parent contract location that hosts this owner.

```ts
function isOwnerCompatible(
  oldModel: CompiledValidationModel,
  newModel: CompiledValidationModel,
  oldOwnerBoundaryKind: 'inherit-owner' | 'create-owner' | 'no-owner',
  newOwnerBoundaryKind: 'inherit-owner' | 'create-owner' | 'no-owner',
  oldOwnerSlotId: string,
  newOwnerSlotId: string,
): boolean {
  return (
    oldOwnerBoundaryKind === newOwnerBoundaryKind &&
    oldOwnerSlotId === newOwnerSlotId &&
    oldModel.ownerId === newModel.ownerId &&
    oldModel.rootPath === newModel.rootPath
  );
}
```

This check is intentionally narrow. Owner compatibility is about identity and owner boundary, not about deep structural similarity.

Deeper structural analysis (which nodes changed, which rules changed) happens inside the model-refresh lifecycle, not in the compatibility check.

---

## 6. Two Lifecycle Paths

### 6.1 Owner-Compatible Model Refresh

Use this path when `isOwnerCompatible(oldModel, newModel, oldBoundaryKind, newBoundaryKind, oldOwnerSlotId, newOwnerSlotId)` returns `true`.

Steps:

1. increment `modelGeneration`
2. replace `compiledModel` with the new compiled model
3. cancel or mark stale all async runs whose `modelGeneration` is less than the new value
4. invalidate the materialization cache wholesale (preferred: clear it entirely; allow lazy rebuild)
5. invalidate the dependency-closure cache
6. invalidate the active instance graph (branch activation state, repeated item instances)
7. run a field-registration reconciliation pass: compare old and new compiled node paths; unregister fields whose path no longer exists in the new model; keep registrations for paths that exist in both
8. for fields that exist in both old and new model, check if their `ruleIdentitySet` changed (see §7.1); if changed, clear field error state for that path
9. for fields that exist in both and have unchanged `ruleIdentitySet`, field error state may optionally be retained
10. rebuild the active instance graph from the new model and current scope values
11. run an owner-local reconciliation pass with `reason: 'system'` before accepting ordinary validation requests again

Step 4 (invalidate cache) must happen before step 11 (reconciliation pass) to ensure the reconciliation uses new compiled rule templates.

### 6.2 Owner-Boundary Change

Use this path when `isOwnerCompatible(oldModel, newModel, oldBoundaryKind, newBoundaryKind, oldOwnerSlotId, newOwnerSlotId)` returns `false`.

Steps:

1. call `dispose()` on the old owner instance
   - this cancels all async runs
   - this clears all field state
   - this unregisters all child contracts from the parent
   - this releases all resources
2. create a new owner instance with the new compiled model and `modelGeneration = 1`
3. re-register field instances from the current React mount tree if fields are still mounted
4. re-register child scope contracts from any currently active child owners
5. run an initial reconciliation pass before accepting ordinary validation requests

For the React rendering layer, owner-boundary change is equivalent to unmounting and remounting the owner boundary component. The React integration may achieve this by keying the owner boundary on a value derived from owner-boundary kind + `ownerSlotId` + `ownerId` + `rootPath`, so that React automatically unmounts the old owner and mounts a new one.

---

## 7. State Retention Guidance

### 7.1 Rule Identity Set

The rule identity set for a path is the set of `(ruleId, ruleKind)` pairs in the compiled rule templates for that path.

```ts
type RuleIdentitySet = Set<string>; // `${ruleId}:${ruleKind}`
```

This is used in step 8 of the model-refresh lifecycle to decide whether to clear field error state.

### 7.2 What To Always Reset

Always reset or invalidate on any model generation change:

1. materialization cache
2. active instance graph (branch activation state, repeated item instances)
3. async run ownership (all runs from the old generation must not publish)
4. dependency-closure cache

### 7.3 What May Be Retained

May be retained only when compatibility is explicit and proven:

1. field value state owned by the surrounding scope store — this is not owned by the validation owner; it is unaffected
2. `touched` / `dirty` / `visited` for paths that exist in both old and new model — retain only if the same field path is still present
3. field error state for paths whose `ruleIdentitySet` is identical in both old and new model — this means the same rules still apply, so old error results may still be accurate

The default must lean toward clearing state unless compatibility is cheap to prove.

Rationale: retaining stale error state from superseded rules is worse than briefly showing a clean state while the reconciliation pass runs.

---

## 8. Async Validation Rule

Async runs must be model-generation-aware.

Each run is scoped by:

1. `ownerId`
2. `modelGeneration`
3. `path`
4. `ruleId`
5. `runGeneration` (superseded-run counter within the same owner+model+path+rule)

When `modelGeneration` changes:

1. old runs must not publish — the check `owner.modelGeneration === run.modelGeneration` must fail for all old-generation runs
2. old runs should be aborted when possible — call `AbortController.abort()` if the run supports cancellation
3. a reused path under the new model must not accept results from the old model generation

The `runGeneration` counter continues to reset to 1 for each path+rule pair inside the new model generation.

---

## 9. Path Reuse Is Not Semantic Continuity

Path equality does not imply semantic continuity across model generations.

Example:

1. old model: `profile.contact` is an inline object under parent owner (`inherit-owner`, `kind: 'object'`)
2. new model: `profile.contact` is a draft child editor boundary (`create-owner`, `kind: 'form-root'`)

The path string is the same, but:

1. ownership changed
2. node kind changed
3. validation participation changed

Therefore the migration check must consider at minimum:

1. owner boundary classification (`create-owner` vs `inherit-owner`)
2. node kind
3. rule identity set
4. whether the path is now inside a different owner scope

Path alone is not sufficient.

---

## 10. React Integration Points

### 10.1 Schema Identity

The React layer must be able to detect when schema has changed in a way that requires owner lifecycle action.

Recommended approach: the schema compilation step produces a `schemaId: string` or `schemaFingerprint: string` that captures owner-boundary-relevant structure. The dynamic schema renderer compares the new compiled model against the old one using `isOwnerCompatible` plus owner-boundary kind and `ownerSlotId` before deciding the lifecycle path.

### 10.2 Owner-Boundary Change Via React Key

When owner-boundary change is detected, the simplest React integration is to key the owner boundary component on `${ownerBoundaryKind}:${ownerSlotId}:${compiledModel.ownerId}:${compiledModel.rootPath}`. Changing this key causes React to unmount the old owner boundary component and mount a new one, which naturally triggers owner disposal and recreation.

This avoids the need for explicit owner recreation logic in the component body. The React key change is the trigger.

### 10.3 Model Refresh Without Unmount

When model refresh (compatible case) is detected, the owner boundary component does not need to unmount. Instead it calls a `refreshCompiledModel(newModel)` method on the owner runtime, which executes the model-refresh lifecycle steps from §6.1.

The component may choose to suspend rendering (show a loading state) during the reconciliation pass if needed, but this is a UX choice and not required by the lifecycle protocol.

### 10.4 Field Re-Registration After Model Refresh

After a model refresh, field components that are still mounted may need to re-register against the new model. The recommended approach:

1. the owner runtime publishes a `modelRefreshed` event or increments a `modelGeneration` observable
2. mounted field components observe `modelGeneration` and call `registerField` again when it changes
3. fields that are no longer in the new model receive a rejected registration handle from `registerField(...)` and can treat themselves as no-owner

---

## 11. Interaction With Dynamic Schema Renderer

For a dynamic schema renderer, the practical contract is:

1. when schema input changes, recompile to get a new `CompiledValidationModel`
2. compare the new compiled model against the current one using `isOwnerCompatible` plus owner-boundary kind and `ownerSlotId`
3. if incompatible: trigger owner recreation via React key change
4. if compatible: call `refreshCompiledModel(newModel)` on the owner runtime
5. wait for the reconciliation pass (may be async) before re-enabling ordinary interactions

This gives dynamic-schema flows a predictable contract instead of ad hoc partial mutation.

---

## 12. Debugger And Devtools Exposure

The following should be exposed to the debugger / devtools:

1. current `modelGeneration` for each owner
2. whether an owner is currently in a model-refresh reconciliation pass
3. how many async runs were cancelled on the last model generation change
4. which field paths were cleared vs retained on the last model generation change

This is optional in production but required for effective debugging of dynamic schema flows.

---

## 13. What Must Not Happen

The runtime must not do any of the following silently:

1. keep old async runs alive after the compiled model that created them is gone
2. keep old materialization caches if rule templates changed
3. keep old active instance graphs if structure changed
4. migrate field state purely by path when path semantics changed
5. reclassify owner boundaries inside one unchanged compiled model instance

---

## 14. What Should Enter Formal Architecture

The following rule should be added to `docs/architecture/form-validation.md` under the owner lifecycle section:

> Validation owner instances assume compiled-model stability. Dynamic schema replacement requires explicit owner refresh or owner recreation via the model-replacement lifecycle; it is not an in-place no-op update.

The detailed migration and retention strategy in this document remains an analysis-level specification until code work begins.

---

## 15. Recommended Implementation Plan Entry Points

When implementation begins, the plan should answer:

1. where `modelGeneration` is stored in the owner internal state
2. which caches include `modelGeneration` in their key structure
3. how `isOwnerCompatible` is called from the dynamic schema renderer
4. whether the React key change approach is used for owner-boundary change, or whether explicit disposal is preferred
5. how `refreshCompiledModel(newModel)` is exposed on `ValidationScopeRuntime`
6. whether the reconciliation pass after model refresh runs synchronously or yields to the event loop
7. how the debugger panel surfaces `modelGeneration` changes

The main unresolved lifecycle gap in the current validation design is this specification. Implementation planning should treat it as the primary lifecycle follow-up item.
