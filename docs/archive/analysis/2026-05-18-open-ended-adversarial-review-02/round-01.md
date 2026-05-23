# Open-Ended Adversarial Review — 2026-05-18 — Round 01

**Execution date**: 2026-05-18
**Result directory**: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/`
**Exploration areas**: `flux-compiler`, `flux-action-core`, `flux-react`, `flux-runtime` (form validation)
**Discovery source**: Parallel adversarial exploration + code verification

---

## Finding 1: Compiler `cidState` mutation breaks compilation idempotency across calls (compiler → runtime cross-boundary)

- **Where**: `packages/flux-compiler/src/schema-compiler/target-enrichment.ts:64-101` (mutation site), `packages/flux-compiler/src/schema-compiler.ts:60-61` (shared default state)
- **What**: `enrichTemplateNodeIds` mutates `cidState.nextTemplateNodeId` (increment), `cidState.byId` (set), `cidState.idPaths` (set), and `cidState.duplicateIds` (add) **in place**. If the compiler is created with `options.cidState ?? input.defaultCidState` (schema-compiler.ts:60-61), and the caller does not explicitly pass a fresh `cidState`, successive `compile(schema)` calls share the same mutable state object. Node IDs monotonically increase across calls, duplicate-ID tracking accumulates, and the same schema compiled twice produces different `templateNodeId` values.
- **Why it matters**: Compilation with implicit shared CID state is **not idempotent**. For SSR, snapshot testing, or any scenario that relies on deterministic compilation output, this is a correctness bug. Two compilations of the same schema produce different compiled trees. The type system does not warn — `cidState` is optional in the options, and the default is a shared mutable singleton.
- **Confidence**: Certain
- **Non-duplication note**: Not reported in recent adversarial reviews. Earlier compiler reviews covered schema validation, not cidState lifecycle.

---

## Finding 2: Action-core's `normalizeActionResult` missing on 2 of 4 runner paths — adapter crash risk (action-core)

- **Where**: `packages/flux-action-core/src/action-dispatcher/action-runners.ts:46-97` (`runComponentAction`), `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:41-248` (`runBuiltInAction`), `packages/flux-action-core/src/action-dispatcher/action-execution.ts:466` (crash site)
- **What**: `normalizeActionResult()` is called by `runNamespacedAction` (action-runners.ts:128) and `runNamedAction` (action-runners.ts:174), but **not** by `runComponentAction` (line 90) or `runBuiltInAction` (line 246-247). If an adapter implementation returns `undefined` (despite the type contract — easy with `as any` or loose JS), the result flows unguarded into `classifyActionResult(result)` at action-execution.ts:466, which accesses `result.skipped` and throws `TypeError` on `undefined`. The crash occurs outside the `runSingleAction` try-catch, producing an unhandled promise rejection.
- **Why it matters**: The adapter is the primary extension boundary in the action system. Two of four runner paths lack the normalization guard, meaning adapter implementers who return `undefined` get a crash instead of a graceful error. The inconsistency (2 guarded, 2 unguarded) suggests this is an oversight rather than intentional.
- **Confidence**: Certain
- **Non-duplication note**: Previous reviews covered action control flow and retry semantics but did not report this inconsistent normalization coverage.

---

## Finding 3: `invocation!` non-null assertion in built-in-actions switch — latent crash on schema evolution (action-core)

- **Where**: `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:49` (`let invocation: BuiltInActionInvocation | undefined`), `built-in-actions.ts:242-243` (default returns `undefined`), `built-in-actions.ts:246` (`invocation!`)
- **What**: The `switch(action.action)` block (lines 51-244) sets `invocation` in each `case`, but the `default` case returns `undefined` without setting `invocation`. Line 246 then asserts `invocation!` and passes it to `adapter.invokeBuiltInAction(invocation!, ctx)`. If a new built-in action type is added to `CompiledActionNode.action` without adding a matching `case`, `invocation` stays `undefined`, the non-null assertion silently passes `undefined`, and the adapter receives `undefined` as the invocation argument — a runtime crash.
- **Why it matters**: Schema evolution (adding new built-in action types) creates a latent crash path with no compile-time guard. TypeScript cannot catch this because the `switch` does not narrow out `undefined` via default-return when using `let` assignment. This is a well-known TypeScript pattern hazard.
- **Confidence**: Certain

---

## Finding 4: Stale DOM element in container registry — `elementRef` in `useEffect` deps never triggers on ref change (flux-react)

- **Where**: `packages/flux-react/src/container-hooks.ts:15-36`
- **What**: `useContainerDomRegistration` places `elementRef` (a `React.RefObject`) in the `useEffect` dependency array. React does **not** re-invoke effects when `ref.current` mutates — only when the ref _object identity_ changes (which never happens for `useRef`). If the DOM node behind the ref changes (e.g., conditional rendering swaps the element, or a key change recreates it), the old, detached element remains permanently registered under `containerId`, and the new element is never registered.
- **Why it matters**: Callers of `resolveContainerElement` (used by dialogs/drawers targeting a container via `modalContainer`) receive a detached or null DOM element. Content targeting the container may silently render into a detached node or fail to render at all. This is a latent correctness bug for any dynamic container target.
- **Confidence**: Certain
- **Non-duplication note**: Not reported in previous reviews. The previous round covered debugger diagnostics and E2E tests.

---

## Finding 5: `useSurfaceScopeSnapshot` discards its subscription return value (flux-react)

- **Where**: `packages/flux-react/src/dialog-host-surface.tsx:50-72`
- **What**: The hook calls `useSyncExternalStoreWithSelector(...)` but never assigns, returns, or uses its result. The subscription is established (so the hosting component re-renders on scope changes), but the selected data is thrown away. The function has no `useEffect` or other observable side effect.
- **Why it matters**: Either (a) this is dead code — the subscription serves no purpose since the result is discarded — or (b) it's a correctness bug where the component needs the selected data but never receives it. No callers of this hook are visible in the codebase; it may be unreachable. Either way, it's either dead code that should be removed or a bug where the wrong value was returned.
- **Confidence**: Certain

---

## Finding 6: O(n^2) BFS traversal in `collectValidationModel` via `queue.shift()` + `queue.unshift(...)` (compiler, performance)

- **Where**: `packages/flux-compiler/src/schema-compiler/validation-collection.ts:51-66`
- **What**: Array `shift()` is O(n) because it re-indexes all remaining elements; `unshift(...elements)` with spread is also O(n+m). Combined, each iteration performs O(n) array work, giving **O(n^2)** worst-case for a form tree with N template nodes. For a form with thousands of fields (completely normal in enterprise forms), this quadratic behavior dominates compile time unnecessarily.
- **Why it matters**: This function runs during every schema compilation that involves validation. The fix is trivial: use a doubly-linked queue or reverse-index with `pop()`. The BFS itself is correct; the data structure choice creates the quadratic cost.
- **Confidence**: Certain
- **Non-duplication note**: Previous compiler performance audits (2026-04-14, 2026-04-26) covered expression compilation and runtime evaluation performance, not compile-time BFS traversal.

---

## Finding 7: Async validators cannot declare cross-field dependencies (form validation, design limitation)

- **Where**: `packages/flux-runtime/src/validation/rules.ts:3-13` (returns `[]` for all non-4 kinds), `packages/flux-core/src/validation-model.ts:89-111` (dependent map only built from `dependencyPaths`)
- **What**: The validation dependency graph is built solely from `dependencyPaths`, which `collectValidationDependencyPaths` only populates for 4 sync rule kinds (`equalsField`, `notEqualsField`, `requiredWhen`, `requiredUnless`). An `async` validation rule — even one that checks other field values on the server — cannot declare any cross-field dependencies. If field A changes, the async validator on field B (which depends on A's value) will never be re-triggered through the dependency mechanism.
- **Why it matters**: This creates a silent correctness gap. A form with a custom `async` validator that verifies a username against a server endpoint where the validation also depends on a `country` field will not re-run when `country` changes. The only way to re-trigger is if field B itself changes or the form is submitted. This is invisible to schema authors — no diagnostic warns that their async validator's dependencies are not tracked.
- **Confidence**: Certain (code confirms the `default: return []` path)
- **Non-duplication note**: Earlier form validation audits (2026-04-11, 2026-05-06) covered hidden-field policy and error state publication but not this cross-field dependency limitation for async validators.

---

## Finding 8: Stale errors from unregistered runtime fields leak into `validateForm` results (form validation)

- **Where**: `packages/flux-runtime/src/form-runtime-field-ops.ts:175-195` (`unregister` does not clear `fieldStates`), `packages/flux-runtime/src/form-runtime-owner.ts:466-516` (`validateForm` reconciliation preserves errors for paths not in `validatedPaths`)
- **What**: When a runtime-registered field is unregistered (`unregister()` in form-runtime-field-ops.ts:175-195), the function removes the registration entry from internal maps but does **not** clear the corresponding `fieldStates` entry from the store. When `validateForm` runs its reconciliation pass (form-runtime-owner.ts:466-516), it preserves errors for paths that are neither in `validatedPaths` nor in `pathsToPreserve`. Since the unregistered path is no longer in the traversal order or runtime registrations, its errors are carried forward as `preservedErrors` indefinitely.
- **Why it matters**: After unregistering a runtime field, its validation errors persist in all subsequent `validateForm` results. The form's `valid` status would reflect errors from fields that no longer exist. The errors would only be cleared by an explicit `clearErrors(path)`, `reset()`, or lifecycle transition. This is a silent correctness bug in the form runtime that can show "form has errors" for phantom fields.
- **Confidence**: High (code path directly confirmed)

---

## Round Assessment

This round found 8 findings across 4 packages. The common theme: **inconsistent guard patterns and silent correctness gaps at critical boundaries**:

| Package               | Count | Key pattern                                                                                     |
| --------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `flux-compiler`       | 2     | Non-idempotent shared state; O(n^2) BFS data structure                                          |
| `flux-action-core`    | 2     | Missing normalization guard on 2/4 runner paths; non-null assertion hazard                      |
| `flux-react`          | 2     | Stale DOM via React ref identity; discarded subscription (dead code or bug)                     |
| `flux-runtime` (form) | 2     | Async validator cross-field dependency blind spot; stale error leakage from unregistered fields |

The most critical patterns are:

1. **Missing guards at extension boundaries** (action-core adapters, async validator deps) — extensions are the hardest surfaces to fix after shipping.
2. **State lifecycle asymmetry** (compiler cidState, field-ops unregister not clearing errors) — cleanup paths that aren't mirror images of setup paths.
3. **React ref identity gotcha** (container-hooks) — a well-documented React pitfall that creates invisible stale-state bugs.
