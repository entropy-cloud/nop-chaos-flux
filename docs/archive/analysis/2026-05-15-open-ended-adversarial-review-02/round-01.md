# Open-Ended Adversarial Review — 2026-05-15 (Session 2) — Round 1

This session started from the "10x scale operator" and "malicious input" heuristic perspectives, then followed cross-boundary signals into scope isolation, validation race conditions, and resource lifecycle. I de-duplicated against `2026-05-15-open-ended-adversarial-review-01/` (earlier today) and the reopened-design-adjudication file.

## Finding 1: `createAdaptorScopeView.ownKeys()` Violates Scope Isolation

**Where**: `packages/flux-runtime/src/async-data/request-runtime-adaptor.ts:66-81`

**What**: The `createAdaptorScopeView` Proxy used by `applyRequestAdaptor` and `applyResponseAdaptor` has an `ownKeys()` trap that walks the entire parent scope chain without checking `isolate`:

```ts
ownKeys() {
  const keys = new Set<string | symbol>();
  let current: ScopeRef | undefined = scope;
  while (current) {
    for (const key of Reflect.ownKeys(current.readOwn())) {
      if (typeof key === 'string' || typeof key === 'symbol') {
        keys.add(key);
      }
    }
    current = current.parent;  // no isolate check
  }
  return Array.from(keys);
}
```

The `get` and `has` traps correctly delegate to `scope.get()`/`scope.has()` which respect isolation by short-circuiting at the `isolate` boundary (`scope.ts:313, 338`). But `ownKeys()` manually iterates `current.parent` in a while-loop, never checking `current.isolate`. This means any expression evaluated inside an adaptor context that uses enumeration (`Object.keys(obj)`, `{ ...obj }`, `for...in`) will see parent-scope keys even in an isolated context.

**Why it matters**:

1. **Security/isolation violation**: The architecture doc promises `isolate: true` means "child reads only own snapshot". This Proxy is used for request/response adaptor evaluation — a data path where schema-defined expressions transform API payloads. If an isolated context (e.g., a table row with `isolate: true`) uses `{ ...scope }` in a request adaptor expression, it leaks parent data keys.

2. **Inconsistent with get/has**: A consumer that iterates keys and then reads each property via `get` would see keys from the parent but get `undefined` back for parent-only keys (because `get` respects isolation). This creates a confusing API surface where enumeration and property access disagree about what exists.

3. **Hard to test for**: Most adaptor expressions access specific named properties (e.g., `scope.user.name`), not enumeration. The bug only surfaces when expressions use spread or `Object.keys`. It would pass all existing tests that use direct property access.

**Confidence**: Certain.

---

## Finding 2: `validateForm` Parallel `Promise.allSettled` Races With Concurrent Field Validation

**Where**: `packages/flux-runtime/src/form-runtime-owner.ts:368-393`

**What**: `validateForm` validates all compiled fields in parallel via:

```ts
const pathResults = await Promise.allSettled(
  validationPaths.map(async (path) => {
    validatedPaths.add(path);
    return { path, result: await input.getThisForm().validateField(path, reason) };
  }),
);
```

Inside `validateCompiledField` (`form-runtime-validation.ts:263-264`), each call increments `validationRuns[path]`. A concurrent `validateField('x', 'blur')` from a blur handler can race:

| Time | Thread A: `validateForm` starts field 'x'                                                        | Thread B: blur handler calls validateField('x') |
| ---- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| T0   | increments runId[x] to N+1                                                                       |                                                 |
| T1   | starts evaluating field 'x'                                                                      |                                                 |
| T2   |                                                                                                  | increments runId[x] to N+2                      |
| T3   | A finishes, checks runId: T3's N+1 !== N+2 → silently discards result, returns `{ok:true}` for x |                                                 |
| T4   | A aggregates OK = true for x                                                                     |                                                 |
| T5   | `validateForm` returns `ok: true`                                                                | B finishes, writes errors to store              |

The TOCTOU window: concurrent blur/change validation arrives AFTER `validateForm` increments the runId for path 'x' but BEFORE `validateForm`'s own field-check finishes. The result: `validateForm` returns `ok: true` while the store has live errors for path 'x'. A programmatic submit that trusts the returned `ok` field would proceed. The form's own `canSubmit` recalculation might catch this independently, but any code reading the returned `FormValidationResult.ok` gets the wrong answer.

Additionally, at lines 482-496, `validateForm` then reads ALL errors from the current store after validation and includes any not already in `fieldErrors` — including errors written by the concurrent blur handler. This means the returned `errors` array and `fieldErrors` map may contain errors from fields that `validateForm` never actually re-validated. The `ok` flag may self-correct (because `errors.length > 0`), but the semantic contract is broken: the caller gets errors from a field that was not part of this validation pass.

The test `bug-validate-overwrite.test.ts:195-249` explicitly tests the side-effect error inclusion behavior as intended for registration-side-effect errors, but the mechanism is broader — ANY source that writes errors to the store during the `validateForm` window gets grandfathered, including concurrent blur handlers.

**Why it matters**: This is a correctness bug in the primary validation entry point. `validateForm` is the API that schema authors, action chains, and submit logic call to determine whether the form is valid. If it can return `ok: true` while errors exist in the store, the decision to proceed with submit is based on a false signal.

**Confidence**: High. The race window is real; the only variable is how often concurrent blur/change validation fires during the `Promise.allSettled` execution window in practice.

---

## Finding 3: Source Prop Subscriptions Leak When `hasSourceProps` Transitions to `false`

**Where**: `packages/flux-react/src/use-node-source-props.ts:51-60`

**What**: Two separate `useEffect` calls manage source prop controller lifecycle:

```ts
useEffect(() => {
  if (!hasSourceProps) return; // early return — no cleanup
  controller.run(propsValue, scope);
}, [controller, hasSourceProps, propsValue, scope]);

useEffect(() => {
  return () => {
    controller.dispose(); // only fires when controller identity changes
  };
}, [controller]);
```

When `hasSourceProps` goes from `true` to `false`:

1. The first effect hits the early return — `controller.run()` is not called, but nothing cleans up the previous run's state inside the controller.
2. The second effect only depends on `[controller]` (created once via `useMemo` from `[node, runtime]`). Since `controller` is stable across `hasSourceProps` transitions, its cleanup never fires.

The controller (`createNodeSourcePropController` in `node-source-prop-controller.ts`) maintains a `SourceObserver` with internal state: `currentSnapshot.value` (may hold large response data from the last source execution), subscription listeners, and an `AbortController`. Without disposal, these persist until:

- The component unmounts entirely, OR
- `hasSourceProps` transitions back to `true` and `controller.run()` is called again (which creates fresh internal state but the old observer's listener set is only cleared by `dispose()`)

**Why it matters**: In a data-driven UI, source props can come and go based on schema structure. Each cycle that transitions from `hasSourceProps=true` to `false` without unmounting leaves the last source response data retained in the observer's snapshot. For renderers with large data responses (tables, lists), this is a memory leak proportional to data size per cycle. It also keeps stale `AbortController` references alive, though the aborted state prevents harmful callbacks.

**Confidence**: High. The code path is clear and the cleanup dependency is missing a transition trigger. This would only manifest under dynamic schema changes that toggle source props on a mounted renderer.

---

## Finding 4: Shared `existingStore` Has No Owner Isolation — Path-Based Field State Collisions

**Where**: `packages/flux-runtime/src/form-runtime.ts:89`

**What**: `createManagedFormRuntime` accepts an optional `existingStore` parameter:

```ts
const store = inputValue.existingStore ?? createFormStore(inputValue.initialValues ?? {});
```

The `FormStoreState` (`form-store.ts:23-25`) tracks field states keyed ONLY by path string — no `ownerId` disambiguation:

```ts
interface FormStoreState {
  fieldStates: Record<string, FieldState | undefined>;  // keyed by path only
  ...
}
```

When two form runtimes share the same `existingStore` and both have a field at path `"name"`, they silently overwrite each other's validation state. The `ownerId` exists in `ValidationError` and in `FormRuntime.getFieldState()` return value, but it is NOT stored inside `FieldState` in the store. The store has no mechanism to distinguish which form runtime owns which field state entry.

The architecture doc says: "Canonical bookkeeping identity is the pair `{ ownerId, path }`", but the actual store implementation uses only `path`. The `ownerId` is added at the API boundary (`form-runtime.ts:348-357`):

```ts
getFieldState(path: string) {
  const state = store.getState();
  const fs = state.fieldStates[path];
  return {
    ownerId: formId,
    path,
    errors: fs?.errors ?? [],
    validating: fs?.validating === true,
  };
},
```

This works for the current single-form-runtime-per-store usage, but if any future or edge-case code path passes an already-populated `existingStore` to a second `createManagedFormRuntime`, the two forms' validation states merge silently. Note this also affects `isPathOwned` at line 343-346, where `rootPath=''` (form in bootstrapping state) accepts ALL paths, further weakening the ownership boundary.

**Why it matters**: This is a design-level contract gap, not just a code smell. The architecture explicitly says the identity pair is `{ ownerId, path }`, but the store implements only `path`. The `existingStore` parameter exposes this mismatch publicly. Any schema-driven scenario where two forms share validation state (nested forms, multi-form pages) risks silent cross-form validation state corruption. The fix would require either removing the `existingStore` parameter, or adding owner-scoped field state keys.

**Confidence**: Certain. The code and the doc contract are directly observable and inconsistent.

---

## Round Summary

| #   | Area                            | Severity | Summary                                                                                                                                 |
| --- | ------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Scope isolation (adaptor Proxy) | High     | `ownKeys()` trap walks parent chain ignoring `isolate`; enumeration leaks parent keys in isolated contexts                              |
| 2   | Form validation race            | High     | `validateForm` parallel `Promise.allSettled` races with concurrent blur/change validation; can return `ok: true` while store has errors |
| 3   | Resource lifecycle              | High     | Source prop subscriptions leak when `hasSourceProps` transitions to `false` without unmounting                                          |
| 4   | Owner/state isolation           | High     | `existingStore` shared across form runtimes has no owner isolation; field states keyed by path only                                     |

The connecting thread across all four findings is **ownership boundary implementation gaps**: scope isolation has a Proxy trap that bypasses the guard, form validation ownership has a race-affected API contract, resource ownership is not cleaned on state transitions, and store-level ownership disambiguation is missing despite being documented.

## Blind-Spot Self-Assessment

This round is code-analysis-heavy. I did not write or run tests to trigger these races or leaks. The validation race (Finding 2) especially benefits from a controlled test with precise timing. I also did not audit the full set of renderer definitions for `hasSourceProps` patterns — the leak pattern may be more or less impactful depending on how often source props toggle in real schema usage. A next pass could check similar transition-sensitive lifecycle patterns across other hooks in `packages/flux-react/src/`.
