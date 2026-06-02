# Open-Ended Adversarial Review — 2026-06-02 — Round 04

**Execution date**: 2026-06-02  
**Result directory**: `docs/analysis/2026-06-02-open-ended-adversarial-review-01/`  
**Exploration areas**: action pipeline resource management, React 19 StrictMode lifecycle, expression evaluator security boundary  
**Discovery source**: sub-agent exploration of 4 previously untouched codebase dimensions, followed by manual source verification of each candidate finding

---

## Finding 1: `mergeAbortSignals` accumulates listeners on the shared root signal with no cleanup under normal dispatch

**Severity**: Medium

**Where**:

- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:87-123`
- Calee at line 496 (top-level `dispatch`)

**What**:  
`mergeAbortSignals` is called on every top-level `dispatch()` that has a non-undefined `actionCtx.signal`. It adds an `'abort'` listener on `ctx.rootAbortController.signal` (a single shared signal for the dispatcher lifetime) via:

```ts
// line 110
rootSignal.addEventListener('abort', onRootAbort, { once: true });
```

Listeners are removed only when the merged controller aborts (lines 113-120), which requires EITHER the root signal to fire OR the action signal to fire. For normally completing actions (not cancelled, not timed out), **neither signal fires**, so the `onRootAbort` listener remains on `rootSignal` indefinitely.

Each `dispatch()` with a custom signal adds exactly one listener to the shared root signal. Production code already uses this pattern — the SQL editor at `packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts:192,203` passes `{ signal: abortController.signal }` to `dispatch()`. Over a long-lived page with hundreds or thousands of user interactions, the listener count on `rootSignal` grows monotonically until `runtime.dispose()` fires the root abort.

**Why it matters**:  
Each listener is a closure capturing `onRootAbort`, `onActionAbort`, and `controller` references. These accumulate on `rootSignal` — a single DOM `AbortSignal` — which is an event target with finite listener management. Under sustained usage (complex low-code pages with many actions), this creates a real but slow-growing resource leak. The leak is invisible under normal testing because `dispose()` does eventually clean everything, but for long-lived SPA sessions without page reload, the accumulation is unbounded.

**Confidence**: Certain  
**Non-duplication note**: The earlier round-01 stale-async-save finding (Finding 4) was about async completion committing to the wrong state generation. This finding is about a different mechanism: event listeners accumulating on a shared object with no intermediate cleanup. No prior round identified any component-store or signal listener leak.

**Recommendation**: Either:

- (a) Skip mergeAbortSignals for cases where actionCtx.signal is not expected to outlive the dispatch (add a flag or heuristic), or
- (b) Add a weak-ref or identity-map-based dedup that reuses merged signals for repeated dispatches with the same action signal, or
- (c) Accept the leak as negligible and document it.

---

## Finding 2: `useNodeLifecycleActions` fires `onMount`/`onUnmount` lifecycle actions twice per mount cycle in React 19 StrictMode, with no deduplication guard

**Severity**: Medium

**Where**:

- `packages/flux-react/src/node-renderer-effects.ts:66-107` (entire `useNodeLifecycleActions` hook)

**What**:  
The hook fires `onMount` in a `useEffect` and `onUnmount` in its cleanup:

```ts
useEffect(() => {
  if (input.enabled === false) return;
  const lifecycleActions = latestLifecycleActionsRef.current;
  if (lifecycleActions?.onMount) {
    void latestHelpersRef.current.dispatch(lifecycleActions.onMount, {
      nodeInstance: input.nodeInstance,
    });
  }
  return () => {
    const currentLifecycleActions = latestLifecycleActionsRef.current;
    if (currentLifecycleActions?.onUnmount) {
      void latestHelpersRef.current.dispatch(currentLifecycleActions.onUnmount, {
        nodeInstance: input.nodeInstance,
      });
    }
  };
}, [input.enabled, input.nodeInstance]);
```

React 19 StrictMode double-invokes effects in development:

1. First mount → `dispatch(onMount)`
2. Cleanup → `dispatch(onUnmount)`
3. Second mount → `dispatch(onMount)` **again**

There is **no deduplication guard** — no ref-based gate, no `lastInitKeyRef`-style pattern like `form.tsx:302-356` uses for its `initAction`. Schema authors see `onMount` fire twice (and `onUnmount` fire once) in development and have no documented way to distinguish this from a real lifecycle event.

**Why it matters**:  
If `onMount` performs a non-idempotent action — POST to create a resource, increment a counter, push a navigation event, acquire a lock — StrictMode development will execute it twice. Schema authors who test in dev mode may see duplicate resources, double-counting, or unexpected side effects. Since lifecycle actions are the recommended pattern for initialization and cleanup, this is a genuine API contract gap.

**Confidence**: Certain  
**Non-duplication note**: Prior rounds did not review React 19 StrictMode lifecycle interaction at all. The earlier form `initAction` dedup pattern (`form.tsx:302-356`) was mentioned in the third-party exploration as a reference for how other code handles this — it confirms the pattern exists in the codebase and could be applied here.

**Recommendation**:  
Add a `mountedRef` + captured-action ref guard to `useNodeLifecycleActions`, parallel to the `lastInitKeyRef` pattern in `form.tsx`. The guard should:

- Skip re-dispatching `onMount` if it was already dispatched for the same `nodeInstance` + lifecycleActions identity
- Or document explicitly that lifecycle actions must be idempotent

---

## Finding 3: Expression evaluator member access follows JavaScript prototype chain, leaking `Object.prototype` methods through scope-resolution values

**Severity**: Low-Medium

**Where**:

- `packages/flux-formula/src/evaluator.ts:260-264` — `evaluateMemberTarget` uses `(objectValue as any)[key]`
- `packages/flux-formula/src/evaluator.ts:10` — `DANGEROUS_MEMBER_KEYS` only blocks `__proto__`, `constructor`, `prototype`
- `packages/flux-formula/src/contract-boundary.test.ts:264-271` — test explicitly marks this as `CANDIDATE: ... prototype leak`

**What**:  
`evaluateMemberTarget` resolves member access via raw bracket notation:

```ts
value: (objectValue as any)[key];
```

When `objectValue` is a plain object from scope resolution (e.g., `{}`), bracket access follows the JavaScript prototype chain. The test confirms:

```ts
const result = evaluateAst(parseFormula('toString'), {
  env,
  context: createContext({}),
});
expect(typeof result).toBe('function');
expect(result).toBe(Object.prototype.toString);
```

The dangerous-keys check at line 257 blocks `__proto__`, `constructor`, and `prototype` — preventing the most obvious escalation paths. But `toString`, `valueOf`, `hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable`, `toLocaleString`, and all other `Object.prototype` methods remain accessible.

This is **read-only access**: these methods cannot modify state or access globals. The blocked keys prevent prototype pollution and `Function`-constructor-based code execution. The practical risk is information disclosure through method return values (e.g., `toString` on certain objects) and confusion when expression behavior differs from expected scope semantics.

**Why it matters**:  
The test marks this as `CANDIDATE` rather than `it(...)`, meaning it's an acknowledged but unresolved design issue. For an expression evaluator that already has a well-designed 3-layer sandbox (`bind-ast.ts` binding → `evaluator.ts` AST interpreter → `scope.ts:resolveScopePath` with `hasOwnProperty`), letting `Object.prototype` methods leak through is a visible gap in the containment model. The issue is not exploitable for code execution but undermines the authority of the expression sandbox.

**Confidence**: Certain (test confirms it)  
**Non-duplication note**: No prior adversarial round found any expression-evaluation concern. The prior rounds covered host contracts and debugger security boundaries — a completely different dimension.

**Recommendation**:  
Block `Object.prototype` method names in `evaluateMemberTarget` alongside the existing `DANGEROUS_MEMBER_KEYS`, or use `Object.create(null)` wrappers / `hasOwnProperty` guards on values resolved through member access, similar to the scope resolution layer. The correction is one line per blocked method name.

---

## Synthesis: Cross-Round Theme

Rounds 01-03 established **authority mismatch at boundaries** as the dominant pattern. This round adds a sub-pattern: **shared mutable state with no generation guard**:

| Finding            | Shared state                 | What accumulates        | Cleanup trigger                                          |
| ------------------ | ---------------------------- | ----------------------- | -------------------------------------------------------- |
| 1: Listener leak   | `rootAbortController.signal` | `abort` event listeners | Only root abort (dispose) or action abort (cancellation) |
| 2: Double dispatch | None (effect lifecycle)      | N/A (repeat calls)      | No dedup guard exists                                    |
| 3: Prototype leak  | `Object.prototype`           | Method resolution       | No fix applied                                           |

In all three cases, the individual layer's logic is internally consistent. The issue emerges at the boundary where that layer's assumptions meet a different lifecycle or authority domain (effects that remount, signals that don't fire, scopes that are plain objects).

## Blind-Spot Self-Assessment

This round was intentionally split across four dimensions to maximize discovery surface. I under-sampled:

- Performance profiling (compilation time, memory under large schemas)
- Accessibility outside the known renderer families
- File upload/download security paths
- Deeper CSS/Tailwind monorepo scanning edge cases
- E2E test coverage gaps

The runtime store unbounded-growth exploration did surface a few minor concerns (`validationRuns` Map at `form-runtime.ts:96` and `pageStoreSyncCleanups` strong `Map<PageRuntime>` at `runtime-owned-factories.ts:113`) which are worth recording for background awareness but do not warrant separate findings at this round's confidence threshold.
