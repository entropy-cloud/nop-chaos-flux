# Comprehensive Code Remediation Plan (#27)

> Plan Status: verified
> Created: 2026-04-02
> Verified: 2026-04-02
> Source: repository-wide architecture and implementation audit (flux-core, flux-formula, flux-runtime, flux-react, all renderer packages, flow-designer, spreadsheet, report-designer, nop-debugger)

---继续

## Verification Notes (2026-04-02)

All items were verified against the current codebase. Summary:

| Status | Items |
|--------|-------|
| **Confirmed — proceed with fix** | P0-1, P0-2, P0-3, P0-4, P0-5, P0-7, P0-8, P1-1 through P1-14, P1-16, P1-17, P2-3, P2-4, P2-6, P2-7, P2-8, P2-9, P2-10 |
| **Already fixed — skip** | P0-6 (debounce already has `try/catch` + `reject`) |
| **Not a real issue — remove** | P2-5 (generic `S` IS properly used in `hooks.ts:49`: `selector: (scopeData: S) => T`) |
| **Fix needs refinement** | P0-5 (cancellation signal needs type changes to `ValidationResult`), P0-7 (existing code at `form-runtime.ts:192-203` partially addresses stale errors but has a logic flaw — fix must clean `mergedErrors` before `setErrors()`) |

---

## Goal

Provide an execution-ready, independently-verifiable remediation plan for every issue found during the comprehensive code audit. Each item includes:

- **Problem**: what is wrong and why it matters
- **How to verify**: exact steps an executor can follow to confirm the issue exists
- **Fix plan**: concrete, ordered steps to resolve it
- **Acceptance**: how to confirm the fix is complete

---

## Priority Definitions

| Priority | Meaning |
|----------|---------|
| P0 | Correctness/stability/security — must fix before next release |
| P1 | Major performance or reliability — fix within current sprint |
| P2 | Quality/maintainability — schedule for near-term backlog |
| P3 | Low-risk technical debt — fix opportunistically |

---

## P0 Items

---

### P0-1: Stray Build Artifacts (.js/.d.ts/.js.map) in `src/` Directories

> **Status: Re-opened on 2026-04-02.** The earlier assumption that `packages/ui/src/` was an intentional exception is obsolete. All `src/` directories must contain source only.

**Severity:** High
**Category:** Engineering Consistency
**Affected packages:** `flux-core`, `flux-formula`, `flux-runtime`, `flux-react`, `spreadsheet-core`, `spreadsheet-renderers`, `ui`

**Problem:**

Every `.ts` source file in the above packages has corresponding `.js`, `.d.ts`, and `.js.map` build artifacts sitting alongside it in `src/`. AGENTS.md explicitly forbids this:

> "NEVER emit `.js`, `.d.ts`, or `.js.map` files into `packages/*/src/` directories."

This creates implementation drift risk between TS and JS tracks, bloats the repo, and can cause confusion about which file is the source of truth.

**How to verify:**

```bash
# Run from repo root — should return zero results for every package src/
find packages/*/src \( -name '*.js' -o -name '*.d.ts' -o -name '*.js.map' \)
```

**Fix plan:**

1. Remove all generated `.js` / `.d.ts` / `.js.map` files from every `packages/*/src/` directory, including `packages/ui/src/`.
2. Keep build output in `dist/` only.
3. Enforce this uniformly with `scripts/verify-no-src-artifacts.mjs` and `.gitignore`.

**Acceptance:**

- Zero generated artifacts in every `packages/*/src/` directory.
- No package-level exception for `ui`.

---

### P0-2: `useEffect` Without Dependency Array in `node-renderer.tsx`

**Severity:** High
**Category:** Performance
**File:** `packages/flux-react/src/node-renderer.tsx:197-213`

**Problem:**

The `useEffect` at line 197 has **no dependency array**, so it runs after **every render** of every node. This fires `onRenderStart`/`onRenderEnd` monitor callbacks on every re-render, not just on mount or when visibility changes. For a page with 100 nodes each re-rendering 3 times, this produces 300 unnecessary monitor calls.

**How to verify:**

1. Open `packages/flux-react/src/node-renderer.tsx` line 197.
2. Observe the `useEffect(() => { ... });` call — note the missing `[]` dependency array.
3. Add a `console.log` inside the effect, run the playground, and observe it fires on every re-render of every node.

**Fix plan:**

1. Add a dependency array that captures the values used inside the effect:
   ```typescript
   useEffect(() => {
     if (!resolvedMeta.visible || resolvedMeta.hidden) {
       return;
     }
     const payload = {
       nodeId: props.node.id,
       path: props.node.path,
       type: props.node.type
     };
     runtime.env.monitor?.onRenderStart?.(payload);
     runtime.env.monitor?.onRenderEnd?.({
       ...payload,
       durationMs: Math.max(0, Date.now() - renderStartedAtRef.current)
     });
   }, [runtime.env.monitor, props.node.id, props.node.path, props.node.type, resolvedMeta.visible, resolvedMeta.hidden]);
   ```
2. Run `pnpm typecheck && pnpm test` in `flux-react`.

**Acceptance:**
- `useEffect` has an explicit dependency array.
- Monitor callbacks only fire when visibility or node identity changes.

---

### P0-3: `renderComponent()` Function Allocation Defeats `memo`

**Severity:** High
**Category:** Performance
**File:** `packages/flux-react/src/node-renderer.tsx:219-254`

**Problem:**

`renderComponent` is defined as a function declaration inside the body of a `memo`-wrapped component. A new function reference is created on every render, which means any child component that receives it as a prop would always re-render. While it is currently called immediately (not passed down), the pattern is fragile and the function body could be inlined directly into the JSX return to eliminate the allocation entirely.

**How to verify:**

1. Open `packages/flux-react/src/node-renderer.tsx` line 219.
2. Observe `const renderComponent = () => { ... }` defined inside the component body.
3. Observe it is called once at line 264: `{renderComponent()}`.

**Fix plan:**

1. Inline the JSX directly into the return statement, replacing `{renderComponent()}` with the conditional JSX tree:
   ```typescript
   const Comp = props.node.component.component;
   const cidFromSchema = (props.node.schema as unknown as { _cid?: unknown })._cid;
   const resolvedCid = typeof cidFromSchema === 'number' ? cidFromSchema : undefined;

   const element = <Comp {...componentProps} />;

   let content: React.ReactNode;
   if (props.node.component.wrap) {
     const fieldName = /* ... same logic ... */;
     const labelValue = resolvedMeta.label ?? (regions.label ? regions.label.render() : props.node.schema.label);
     content = (
       <FieldFrame name={fieldName} label={labelValue} /* ... */>
         {element}
       </FieldFrame>
     );
   } else if (resolvedCid != null) {
     content = <div data-cid={resolvedCid}>{element}</div>;
   } else {
     content = element;
   }

   return (
     <NodeMetaContext.Provider ...>
       {/* ... other providers ... */}
       {content}
     </NodeMetaContext.Provider>
   );
   ```
2. Run `pnpm typecheck && pnpm test` in `flux-react`.

**Acceptance:**
- No `renderComponent` function declaration inside the component body.
- Same rendering behavior, fewer allocations per render.

---

### P0-4: Side Effect in Render Phase — `page.store.setData()`

**Severity:** High
**Category:** Architecture Conformance
**File:** `packages/flux-react/src/schema-renderer.tsx:46-48`

**Problem:**

`page.store.setData(pageData)` is called during the **render phase** (not in an effect). This violates the architecture rule: "Render phase must stay side-effect free." It also means `setData` runs on every parent re-render even when `pageData` is referentially identical to what's already in the store, triggering unnecessary downstream updates.

**How to verify:**

1. Open `packages/flux-react/src/schema-renderer.tsx` lines 46-48.
2. Observe the `if (page.store.getState().data !== pageData) { page.store.setData(pageData); }` block sits directly in the function body, not inside `useEffect`.
3. This is a side effect during render — it mutates store state.

**Fix plan:**

1. Move the data sync into a `useEffect`:
   ```typescript
   useEffect(() => {
     if (page.store.getState().data !== pageData) {
       page.store.setData(pageData);
     }
   }, [page.store, pageData]);
   ```
2. Add `useEffect` to the import at line 1.
3. Run `pnpm typecheck && pnpm test` in `flux-react`.

**Acceptance:**
- No store mutation in the render phase.
- Data sync still occurs when `pageData` changes.

---

### P0-5: Async Validation Returns Empty Result on Stale Run Without Clearing `validating` State

**Severity:** High
**Category:** Correctness
**File:** `packages/flux-runtime/src/form-runtime-validation.ts:106-110`

**Problem:**

When a debounced async validation is superseded by a newer run (`shouldRun === false`), the function returns an empty result immediately:

```typescript
if (!shouldRun) {
  return createValidationResult([]);
}
```

The caller (`validatePath`) receives an empty result and may clear errors prematurely. Meanwhile, the `validating` flag for the path may remain `true` because the `finally` block only clears it when `validationRuns.get(path) === runId`, which won't match for the stale run.

**How to verify:**

1. Open `packages/flux-runtime/src/form-runtime-validation.ts` line 106.
2. Trace the call chain: `validatePath` → `runValidationWithDebounce` → early return on `!shouldRun`.
3. Observe that the caller does not distinguish between "valid" and "cancelled".
4. Write a test: rapidly type into a field with async validation, observe that the `validating` flag may get stuck or errors may be incorrectly cleared.

**Fix plan:**

1. Define a cancellation sentinel type and return it on stale runs:
   ```typescript
   // In form-runtime-validation.ts, near the top:
   const VALIDATION_CANCELLED = Symbol('validation-cancelled');
   ```
2. Change the early-return behavior to throw the sentinel (avoids changing `ValidationResult` return type):
   ```typescript
   if (!shouldRun) {
     throw VALIDATION_CANCELLED;
   }
   ```
3. In the caller (`validatePath`), catch the sentinel and return an empty "ok" result without clearing errors:
   ```typescript
   try {
     return validateCompiledField(sharedState, path, field);
   } catch (err) {
     if (err === VALIDATION_CANCELLED) {
       return createValidationResult([]); // superseded — do nothing, don't clear errors
     }
     throw err;
   }
   ```
4. The `validating` flag is already guarded by the `finally` block's `runId` check — no change needed there.
5. Add a test for rapid successive validations confirming that only the latest run's result is applied.

**Acceptance:**
- Superseded async validations do not clear errors or leave stale `validating` flags.
- Test covers rapid successive validation scenario.

---

### P0-6: ~~Debounce Promise Has No Reject Path~~ [ALREADY FIXED]

> **Status: Already fixed.** The current `debounce.ts` already has `try/catch` around `factory()` execution, `reject` in the `PendingEntry` interface, and proper error propagation. Skip this item.

**Severity:** High
**Category:** Stability
**File:** `packages/flux-runtime/src/utils/debounce.ts`

**Problem:**

Already resolved. The current implementation at `debounce.ts:29-36` includes:
- `PendingEntry<T>` with both `resolve` and `reject` callbacks
- `try/catch` wrapping `factory()` execution
- Proper `reject(error)` on failure

**How to verify:**

1. Open `packages/flux-runtime/src/utils/debounce.ts`.
2. Observe the `try/catch` block at lines 30-36 and `reject` in the interface at line 4.

**Fix plan:**

No action needed.

**Acceptance:**

Already satisfied.

---

### P0-7: `validateForm()` Does Not Clear Pre-existing Errors Before Validation

**Severity:** High
**Category:** Correctness
**File:** `packages/flux-runtime/src/form-runtime.ts:181-199`

**Problem:**

`validateForm()` merges `store.getState().errors` with newly computed `fieldErrors` (spreading existing errors first). If a field was previously invalid but is now valid, its old error remains in the store because `mergedErrors` preserves stale entries.

Note: Lines 192-203 attempt to handle this by iterating `mergedErrors` and re-adding entries to `fieldErrors`, but the logic is flawed — it re-adds stale errors to the result instead of removing them. The fix must clean errors *before* calling `store.setErrors()`.

**How to verify:**

1. Open `packages/flux-runtime/src/form-runtime.ts` line 185.
2. Observe:
   ```typescript
   const mergedErrors = { ...store.getState().errors, ...fieldErrors };
   store.setErrors(mergedErrors);
   ```
3. Lines 192-203 iterate `mergedErrors` but only re-add to `fieldErrors` — they never delete stale entries from the store.
4. Write a test: set a field invalid, then fix it, call `validateForm()`, observe the old error persists.

**Fix plan:**

1. Replace lines 185-203 with a clean approach that removes stale errors before setting:
   ```typescript
   // Collect all paths that were validated (from compiled schema + registrations)
   const allValidatedPaths = new Set<string>();
   for (const path of validationPaths) allValidatedPaths.add(path);
   for (const path of runtimeFieldRegistrations.keys()) allValidatedPaths.add(path);

   // Clean stale errors: remove errors for validated paths that are now valid
   const currentErrors = store.getState().errors;
   const cleanedErrors: Record<string, ValidationError[]> = {};
   for (const [path, pathErrors] of Object.entries(currentErrors)) {
     if (!allValidatedPaths.has(path)) {
       cleanedErrors[path] = pathErrors; // not validated this round, preserve
     } else if (fieldErrors[path]) {
       cleanedErrors[path] = fieldErrors[path]; // still invalid, keep new errors
     }
     // else: validated and now valid, drop the error
   }

   store.setErrors({ ...cleanedErrors, ...fieldErrors });
   ```
2. Remove the flawed loop at lines 192-203.
3. Add a test: field transitions from invalid → valid, error is cleared.

**Acceptance:**
- `validateForm()` clears errors for fields that pass validation.
- No stale errors remain after a full form validation.

---

### P0-8: `schema-compiler.ts` `rewriteActionTargets` Indentation Anomaly

**Severity:** High
**Category:** Correctness
**File:** `packages/flux-runtime/src/schema-compiler.ts:64-78`

**Problem:**

The `if (typeof source.action === 'string' ...)` block appears to be indented one level too deep — it sits inside the `for` loop after the loop body at the same indentation as the loop's closing brace. This means the component target rewrite may only happen on the **last** key-value pair processed, not for every object.

**How to verify:**

1. Open `packages/flux-runtime/src/schema-compiler.ts` lines 64-78.
2. Check the indentation of the `if` block relative to the `for` loop.
3. Trace: if the condition checks `source.action` (the whole object) rather than the per-key value, it effectively only needs to run once — but the indentation suggests it was intended to run per-key.
4. Write a test with multiple action targets and verify only the last one is rewritten (if the bug exists).

**Fix plan:**

1. If the block is intended to run per-key, dedent it to align with the `for` loop body and ensure it processes each entry.
2. If it is intentionally a post-loop single check, add a comment and move it outside the loop for clarity.
3. Add a regression test.

**Acceptance:**
- Indentation matches intended control flow.
- Test confirms all action targets are rewritten correctly.

---

## P1 Items

---

### P1-1: `evaluateObject` Has O(n²) Key Comparison

**Severity:** Medium
**Category:** Performance
**File:** `packages/flux-formula/src/evaluate.ts:189-191`

**Problem:**

The key comparison in `evaluateObject` calls `node.keys.includes(key)` inside a `.some()` loop — O(n²) for objects with many keys:

```typescript
const needsRebuild =
  node.keys.some((key) => !(key in stateNode.entries)) ||
  currentKeys.some((key) => !node.keys.includes(key));
```

**How to verify:**

1. Open `packages/flux-formula/src/evaluate.ts` line 191.
2. Observe `currentKeys.some((key) => !node.keys.includes(key))` — linear search inside a loop.
3. For an object with 100 keys, this performs up to 10,000 comparisons.

**Fix plan:**

1. Use a `Set` for O(1) lookup:
   ```typescript
   const keySet = new Set(node.keys);
   const needsRebuild =
     node.keys.some((key) => !(key in stateNode.entries)) ||
     currentKeys.some((key) => !keySet.has(key));
   ```
2. Run `pnpm typecheck && pnpm test` in `flux-formula`.

**Acceptance:**
- Key comparison is O(n) instead of O(n²).
- All existing tests pass.

---

### P1-2: `formulaScopeCache` WeakMap Never Hits in Practice

**Severity:** Medium
**Category:** Performance
**File:** `packages/flux-formula/src/scope.ts:57-108`

**Problem:**

The `formulaScopeCache` uses `EvalContext` as a WeakMap key. But `EvalContext` objects are created fresh on every evaluation cycle via `createEvalContext(scope)`. Since each call creates a new object, the WeakMap cache will never hit — every lookup is a miss, and a new Proxy is created every time. The cache provides zero benefit.

**How to verify:**

1. Open `packages/flux-formula/src/scope.ts` line 57.
2. Trace where `createFormulaScope` is called — observe it receives a freshly created `EvalContext`.
3. Trace `createEvalContext` in `evaluate.ts` — observe it creates a new object each time.
4. Add a counter to the cache hit/miss paths and observe zero hits.

**Fix plan:**

Option A — Remove the cache (simplest):
```typescript
function createFormulaScope(context: EvalContext): Record<string, any> {
  const proxy = new Proxy({ /* ... */ });
  return proxy;
}
```

Option B — Cache at the `ScopeRef` level (if `ScopeRef` has stable identity):
```typescript
const formulaScopeCache = new WeakMap<ScopeRef, Record<string, any>>();
```

**Acceptance:**
- No dead cache code, or cache actually provides benefit.
- Performance unchanged or improved.

---

### P1-3: `createObjectEvalContext.has()` Has False Negatives for `undefined` Values

**Severity:** Medium
**Category:** Correctness
**File:** `packages/flux-formula/src/scope.ts:25-27`

**Problem:**

```typescript
has(path: string) {
  return getIn(record, path) !== undefined;
}
```

If a property exists but has value `undefined`, `has()` returns `false`. This differs from standard JavaScript `in` operator semantics. Expressions like `${foo}` behave differently when `foo` is explicitly set to `undefined` vs not present.

**How to verify:**

1. Open `packages/flux-formula/src/scope.ts` line 25.
2. Write a test: `createObjectEvalContext({ foo: undefined }).has('foo')` — returns `false` but should return `true`.

**Fix plan:**

1. Use a proper existence check:
   ```typescript
   has(path: string) {
     const segments = parsePath(path);
     let current: unknown = record;
     for (const seg of segments) {
       if (current == null || typeof current !== 'object' || !(seg in current)) return false;
       current = (current as Record<string, unknown>)[seg];
     }
     return true;
   }
   ```
2. Add a test for `undefined` value existence.

**Acceptance:**
- `has('foo')` returns `true` when `foo` is explicitly set to `undefined`.
- All existing tests pass.

---

### P1-4: `shallowEqual` Array Comparison Allocates Unnecessarily

**Severity:** Medium
**Category:** Performance
**File:** `packages/flux-core/src/utils/object.ts:14-25`

**Problem:**

When comparing arrays, `shallowEqual` uses `Object.keys(left)` and `Object.keys(right)`. For arrays, `Object.keys` returns string indices as an array of strings, which means it allocates two new arrays just to compare lengths. A simple `left.length !== right.length` check would be O(1) and avoid allocation.

**How to verify:**

1. Open `packages/flux-core/src/utils/object.ts` lines 14-25.
2. Observe the array comparison path uses `Object.keys`.

**Fix plan:**

1. Replace with direct length check and indexed iteration:
   ```typescript
   if (Array.isArray(left)) {
     if (!Array.isArray(right)) return false;
     if (left.length !== right.length) return false;
     return left.every((v, i) => Object.is(v, right[i]));
   }
   ```
2. Add tests for: equal arrays, different length, sparse arrays.

**Acceptance:**
- No unnecessary array allocation in `shallowEqual`.
- All existing tests pass.

---

### P1-5: `validateRule()` Default Parameter Creates New Registry on Every Call

**Severity:** Medium
**Category:** Performance
**File:** `packages/flux-runtime/src/validation-runtime.ts:14`

**Problem:**

The default parameter `createBuiltInValidationRegistry()` constructs a new Map and registers all built-in validators on every call where no registry is passed. While the main call path passes a registry, the default is reachable and wasteful.

**How to verify:**

1. Open `packages/flux-runtime/src/validation-runtime.ts` line 14.
2. Observe: `registry: ValidationRegistry = createBuiltInValidationRegistry()`.
3. Trace `createBuiltInValidationRegistry` — it creates a new Map and registers validators each time.

**Fix plan:**

1. Use a module-level singleton:
   ```typescript
   let _builtInRegistry: ValidationRegistry | undefined;
   function getBuiltInRegistry(): ValidationRegistry {
     return _builtInRegistry ??= createBuiltInValidationRegistry();
   }
   ```
2. Change the default parameter: `registry: ValidationRegistry = getBuiltInRegistry()`.
3. Run `pnpm typecheck && pnpm test` in `flux-runtime`.

**Acceptance:**
- Built-in registry is created once and reused.
- All tests pass.

---

### P1-6: `form-runtime.ts` `revalidateDependents` References `thisForm` Before Assignment

**Severity:** Medium
**Category:** Design
**File:** `packages/flux-runtime/src/form-runtime.ts:78-104`

**Problem:**

The `revalidateDependents` function (declared at line 78) references `thisForm.validateField` and `thisForm.clearErrors`, but `thisForm` is not assigned until line 106. This works because the function is `async` and is only called after `thisForm` is assigned, but it relies on temporal closure semantics that are fragile.

**How to verify:**

1. Open `packages/flux-runtime/src/form-runtime.ts` lines 78-106.
2. Observe `revalidateDependents` uses `thisForm` at lines 82/87 but `thisForm` is assigned at line 106.

**Fix plan:**

1. Extract `revalidateDependents` to take `validateField` and `clearErrors` as parameters:
   ```typescript
   async function revalidateDependents(
     path: string,
     dependentMap: Map<string, string[]>,
     validateField: (p: string) => Promise<ValidationResult>,
     clearErrors: (p: string) => void
   ) { ... }
   ```
2. Call it after `thisForm` is assigned with the correct arguments.

**Acceptance:**
- No temporal dependency on `thisForm` assignment order.
- All tests pass.

---

### P1-7: `remapArrayFieldState` Iterates All Keys on Every Mutation

**Severity:** Medium
**Category:** Performance
**File:** `packages/flux-runtime/src/form-runtime-array.ts:11-47`

**Problem:**

Every array mutation triggers `remapArrayFieldState`, which iterates **all** keys in `validationRuns` and `pendingValidationDebounces` Maps. For forms with many fields, this is O(n) per mutation where n = total tracked paths, not just array-item paths.

**How to verify:**

1. Open `packages/flux-runtime/src/form-runtime-array.ts` line 11.
2. Observe the loop iterates all keys in the Maps.
3. For a form with 200 fields and an array of 10 items, this iterates 200 keys for every array operation.

**Fix plan:**

1. Filter to only keys that start with `arrayPath.` prefix before transformation:
   ```typescript
   const prefix = arrayPath + '.';
   for (const [key, value] of source) {
     if (!key.startsWith(prefix)) continue;
     // transform and add to target
   }
   ```
2. Run `pnpm typecheck && pnpm test`.

**Acceptance:**
- Only array-related keys are iterated during remap.
- All tests pass.

---

### P1-8: `api-cache.ts` `generateCacheKey` Uses Order-Dependent `JSON.stringify`

**Severity:** Medium
**Category:** Correctness
**File:** `packages/flux-runtime/src/api-cache.ts:119-122`

**Problem:**

`JSON.stringify` produces different strings for `{a:1,b:2}` vs `{b:2,a:1}`. Two semantically identical API objects with different key ordering will produce different cache keys, causing cache misses.

**How to verify:**

1. Open `packages/flux-runtime/src/api-cache.ts` lines 119-122.
2. Write a test: `generateCacheKey({method:'get',url:'/x',data:{a:1,b:2}})` vs `generateCacheKey({method:'get',url:'/x',data:{b:2,a:1}})` — different keys.

**Fix plan:**

1. Use stable serialization (sorted keys):
   ```typescript
   function stableStringify(obj: unknown): string {
     if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
     if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
     const keys = Object.keys(obj as Record<string, unknown>).sort();
     return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify((obj as Record<string, unknown>)[k])}`).join(',')}}`;
   }
   ```
2. Replace `JSON.stringify` calls with `stableStringify`.

**Acceptance:**
- Semantically identical API objects produce the same cache key regardless of key order.

---

### P1-9: `relatedPaths` Mapping Has Flawed Path Resolution Logic

> Status: completed 2026-04-02

**Severity:** Medium
**Category:** Correctness
**File:** `packages/flux-runtime/src/form-path-state.ts:82-92`

**Problem:**

The heuristic `relatedPath.includes('.')` to decide whether a related path is already fully qualified is fragile. A related path like `email` (no dot) could be a sibling field within the array item or a top-level field — the code assumes the former, which could produce incorrect paths for array items whose related paths reference fields outside the array.

**How to verify:**

1. Open `packages/flux-runtime/src/form-path-state.ts` lines 82-92.
2. Observe:
   ```typescript
   const fullRelatedPath = relatedPath.includes('.') || !path.startsWith(arrayPath)
     ? relatedPath
     : `${arrayPath}.${relatedPath}`;
   ```
3. Write a test: array item with `relatedPaths: ['email']` where `email` is a top-level field — the code incorrectly prepends the array path.

**Fix plan:**

1. Store fully qualified paths in `ValidationError.relatedPaths` at creation time rather than remapping heuristically.
2. If that's not feasible, improve the heuristic by checking if the related path exists as a compiled validation node at the array level vs the top level.

**Acceptance:**
- `relatedPaths` resolve to correct absolute paths for both nested and top-level references.

---

### P1-10: `createFieldHandlers` Creates New Object Every Render

> Status: completed 2026-04-02

**Severity:** Medium
**Category:** Performance
**File:** `packages/flux-renderers-form/src/field-utils.tsx:78-115`

**Problem:**

Every input renderer calls `createFieldHandlers(...)` inline during render, producing a new object identity on every render cycle. This causes unnecessary re-renders of child components that receive handlers as props.

**How to verify:**

1. Open `packages/flux-renderers-form/src/field-utils.tsx` lines 78-115.
2. Observe the function returns a new object `{ onChange, onBlur, onFocus }` each call.
3. Check each input renderer — all call it inline during render without memoization.

**Fix plan:**

1. Split into individual `useCallback` hooks or use `useMemo` at call sites:
   ```typescript
   const handlers = useMemo(
     () => createFieldHandlers({ name, currentForm, scope, setValue, ... }),
     [name, currentForm, scope, setValue, ...]
   );
   ```
2. Or better: create a `useFormFieldHandlers` hook that encapsulates the memoization.

**Acceptance:**
- Handler object identity is stable across renders when inputs haven't changed.

---

### P1-11: Spreadsheet Grid — `getSelectedRange()` Called Inside Cell Render Loop

**Severity:** Medium
**Category:** Performance
**File:** `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:115-119`

**Problem:**

`getSelectedRange()` is called once per cell (N×M times per render). For a 100×26 spreadsheet, this is 2,600 calls per render.

**How to verify:**

1. Open `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` line 115.
2. Observe `const selectedRange = getSelectedRange()` inside the nested row/column loops.

**Fix plan:**

1. Hoist the call to before the row loop:
   ```typescript
   const selectedRange = getSelectedRange();
   for (let r = 0; r < rows; r++) {
     for (let c = 0; c < cols; c++) {
       const isFillHandleCell = selectedRange && r === selectedRange.endRow && c === selectedRange.endCol;
       // ...
     }
   }
   ```

**Acceptance:**
- `getSelectedRange()` called exactly once per render.

---

### P1-12: Spreadsheet Column Labels Break After Column Z

**Severity:** Medium
**Category:** Correctness
**File:** `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:80`

**Problem:**

```typescript
{String.fromCharCode(65 + c)}
```

Only works for columns A-Z (0-25). Column 26 produces `[` instead of `AA`.

**How to verify:**

1. Open `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` line 80.
2. Create a spreadsheet with 30+ columns, observe column headers after Z are wrong.

**Fix plan:**

1. Use the existing `cellAddress(r, c)` utility from `@nop-chaos/spreadsheet-core` which already handles proper column letter generation:
   ```typescript
   {cellAddress(0, c).replace(/[0-9]/g, '')}
   ```
   Or extract just the column letter logic into a shared helper.

**Acceptance:**
- Column headers display correctly for AA, AB, ..., ZZ, AAA, etc.

---

### P1-13: Import Namespace Errors Are Silently Swallowed

> Status: completed 2026-04-02

**Severity:** Medium
**Category:** Observability
**File:** `packages/flux-react/src/node-renderer.tsx:100-115`

**Problem:**

Namespace import setup failures are caught and ignored. This can leave actions partially available without observability.

**How to verify:**

1. Open `packages/flux-react/src/node-renderer.tsx` lines 100-115.
2. Observe the `try/catch` around import processing — errors are silently caught.

**Fix plan:**

1. Replace silent catch with monitor event + console warning in dev mode:
   ```typescript
   } catch (err) {
     if (runtime.env.monitor) {
       runtime.env.monitor.onImportError?.({ nodeId: props.node.id, path: props.node.path, error: err });
     }
     if (import.meta.env.DEV) {
       console.warn(`[flux] Import error for node ${props.node.id}:`, err);
     }
   }
   ```

**Acceptance:**
- Import failures are observable and traceable.
- Rendering does not hard-crash on import failure.

---

### P1-14: BEM Class Usage in Basic and Data Renderers

**Severity:** Medium
**Category:** Architecture Conformance
**Files:**
- `packages/flux-renderers-basic/src/page.tsx:13-25`
- `packages/flux-renderers-basic/src/container.tsx:26,46`
- `packages/flux-renderers-data/src/table-renderer.tsx:237-567`

**Problem:**

These renderers use BEM-style classes like `nop-page__header`, `nop-page__toolbar`, `nop-container__footer`, `nop-table__header`, `nop-table__pagination`, etc. AGENTS.md states: "No BEM — Use shadcn `data-slot`, flux semantic markers, and Tailwind visual classes."

**How to verify:**

1. Search for `__` in the renderer source files:
   ```bash
   grep -rn '__' packages/flux-renderers-basic/src/ packages/flux-renderers-data/src/
   ```
2. Observe BEM-style modifier classes.

**Fix plan:**

1. Replace BEM classes with `data-slot` attributes and Tailwind utility classes:
   - `nop-page__header` → `data-slot="page-header"` with Tailwind classes
   - `nop-table__pagination` → `data-slot="table-pagination"` with Tailwind classes
2. Follow `docs/architecture/renderer-markers-and-selectors.md` for current marker and selector patterns.
3. Run `pnpm typecheck && pnpm lint && pnpm test`.

**Acceptance:**
- Zero `__` (BEM modifier) class names in renderer source files.
- Visual appearance unchanged.

---

### P1-15: Missing Test Coverage for Core Utility Functions

**Severity:** Medium
**Category:** Test Gap
**Files:**
- `packages/flux-core/src/validation-model.ts` (172 lines, 9 exports, zero tests)
- `packages/flux-core/src/utils/path.ts` (zero tests)
- `packages/flux-core/src/utils/object.ts` (zero tests)
- `packages/flux-core/src/class-aliases.ts` (zero tests)
- `packages/flux-formula/src/template.ts` (zero tests)
- `packages/flux-runtime/src/form-runtime-array.ts` (zero dedicated tests)
- `packages/flux-runtime/src/form-runtime-subtree.ts` (zero dedicated tests)
- `packages/flux-runtime/src/form-runtime-registration.ts` (zero dedicated tests)

**Problem:**

These are pure functions with non-trivial logic (graph traversal, path parsing, class alias resolution, template segment extraction, array state remapping) that have zero dedicated test coverage. Bugs in these functions would silently propagate through the entire system.

**How to verify:**

1. Check for test files:
   ```bash
   ls packages/flux-core/src/validation-model.test.ts  # should not exist
   ls packages/flux-core/src/utils/path.test.ts        # should not exist
   ```
2. Run coverage report — these files should show 0% coverage.

**Fix plan:**

For each file, add a dedicated test file covering:

- **`validation-model.test.ts`**: empty input, single node, cyclic dependencies, dependent map correctness, traversal order.
- **`path.test.ts`**: bracket notation parsing, dot notation, nested get/set, empty path, array index paths, `setIn` immutability.
- **`object.test.ts`**: plain object detection, `shallowEqual` for objects/arrays/primitives/sparse arrays.
- **`class-aliases.test.ts`**: simple alias, chained alias, circular alias (A→B→A), missing alias, empty input, merge precedence.
- **`template.test.ts`**: pure vs template detection, nested braces, escaped strings, unclosed braces, empty input.
- **`form-runtime-array.test.ts`**: `transformArrayIndexedPath` edge cases, `remapErrorState` with nested paths, `remapBooleanState` with removed indices.
- **`form-runtime-subtree.test.ts`**: nested paths, runtime registrations overlapping with compiled paths, node-based vs path-based collection.
- **`form-runtime-registration.test.ts`**: direct registration, child-path resolution, field synchronization.

**Acceptance:**
- Each utility file has a corresponding test file with meaningful coverage.
- `pnpm test` passes for all new tests.

---

### P1-16: Table Renderer Is 569 Lines — Needs Extraction

**Severity:** Medium
**Category:** Design
**File:** `packages/flux-renderers-data/src/table-renderer.tsx:1-569`

**Problem:**

The table renderer mixes sorting, filtering, pagination, row selection, row expansion, cell rendering, and pagination UI into a single component. Violates the AGENTS.md convention: "Separate independent modules into their own files."

**How to verify:**

1. Open the file and count lines: `wc -l packages/flux-renderers-data/src/table-renderer.tsx`
2. Observe the mixed concerns in a single file.

**Fix plan:**

1. Extract into sub-modules:
   ```
   packages/flux-renderers-data/src/table/
   ├── index.ts          # barrel
   ├── sorting.ts        # sort state and toggle logic
   ├── filtering.ts      # filter state and apply logic
   ├── pagination.tsx    # pagination UI and logic
   ├── row.tsx           # row rendering (selection, expansion)
   └── header.tsx        # column header rendering
   ```
2. Keep `table-renderer.tsx` as orchestrator (~100 lines).
3. Run `pnpm typecheck && pnpm test`.

**Acceptance:**
- No single file exceeds ~200 lines in the table renderer module.
- All existing tests pass.

---

### P1-17: Form Renderer Handler Boilerplate Duplicated 7 Times

> Status: completed 2026-04-02

**Severity:** Medium
**Category:** Consistency
**File:** `packages/flux-renderers-form/src/renderers/input.tsx` (SelectRenderer, TextareaRenderer, CheckboxRenderer, SwitchRenderer, RadioGroupRenderer, CheckboxGroupRenderer)

**Problem:**

Every input renderer repeats the same pattern:
```typescript
const scope = useRenderScope();
const currentForm = useCurrentForm();
const name = String(props.props.name ?? props.schema.name ?? '');
const value = useBoundFieldValue(name, currentForm);
const presentation = useFieldPresentation(name, currentForm);
const handlers = createFieldHandlers({ name, currentForm, scope, setValue... });
```

This is copy-pasted 7 times with minor variations.

**How to verify:**

1. Open `packages/flux-renderers-form/src/renderers/input.tsx`.
2. Count the number of renderer definitions that repeat the same hook pattern.

**Fix plan:**

1. Create a `useFormFieldController(name)` hook:
   ```typescript
   function useFormFieldController(name: string) {
     const scope = useRenderScope();
     const currentForm = useCurrentForm();
     const value = useBoundFieldValue(name, currentForm);
     const presentation = useFieldPresentation(name, currentForm);
     const handlers = useMemo(
       () => createFieldHandlers({ name, currentForm, scope, setValue: currentForm.setValue, ... }),
       [name, currentForm, scope]
     );
     return { value, presentation, handlers };
   }
   ```
2. Replace the repeated pattern in each renderer with a single call to this hook.

**Acceptance:**
- No duplicated handler boilerplate across input renderers.
- All tests pass.

---

## P2 Items

---

### P2-1: `renderer.ts` Type Definition File Is 385 Lines

> Status: completed 2026-04-02

**Severity:** Low
**Category:** Design
**File:** `packages/flux-core/src/types/renderer.ts`

**Problem:**

This single file defines 30+ interfaces spanning multiple concern areas (API, components, rendering, plugins, compilation). Makes navigation and IDE intellisense slower.

**How to verify:**

1. `wc -l packages/flux-core/src/types/renderer.ts` — should show ~385 lines.
2. Count the number of distinct interface/type declarations.

**Fix plan:**

1. Split into domain modules:
   ```
   packages/flux-core/src/types/
   ├── renderer-api.ts       # ApiRequestContext, ApiResponse, ApiFetcher
   ├── renderer-component.ts # ComponentTarget, ComponentCapabilities, ComponentHandle
   ├── renderer-compiler.ts  # CompiledSchemaMeta, CompiledSchemaNode, SchemaCompiler
   ├── renderer-plugin.ts    # RendererPlugin, RendererMonitor
   ├── renderer-hooks.ts     # RendererHookApi, RenderNodeMeta, SchemaRendererProps
   └── renderer-core.ts      # RendererDefinition, RendererRegistry, RendererRuntime
   ```
2. Re-export from `renderer.ts` or update `types/index.ts`.
3. Run `pnpm typecheck`.

**Acceptance:**
- No type definition file exceeds ~150 lines.
- All downstream packages compile without changes.

---

### P2-2: `form-runtime.ts` Is 524 Lines — Submit/Reset Logic Should Be Extracted

**Severity:** Low
**Category:** Design
**File:** `packages/flux-runtime/src/form-runtime.ts:1-524`

**Problem:**

The `createManagedFormRuntime` function is a single 524-line function containing: field registration, validation orchestration, submit flow, reset logic, array mutations, and dependent revalidation.

**How to verify:**

1. `wc -l packages/flux-runtime/src/form-runtime.ts` — should show ~524 lines.

**Fix plan:**

1. Extract `submit` flow into `form-runtime-submit.ts`.
2. Extract `reset` flow into `form-runtime-reset.ts`.
3. Extract `revalidateDependents` into `form-runtime-dependents.ts`.
4. Keep `form-runtime.ts` as orchestrator (~150 lines).
5. Run `pnpm typecheck && pnpm test`.

**Acceptance:**
- No single runtime file exceeds ~200 lines.
- All tests pass.

---

### P2-3: Module-Level Mutable State in `schema-renderer.tsx`

> Status: completed 2026-04-02

**Severity:** Low
**Category:** Design
**File:** `packages/flux-react/src/schema-renderer.tsx:19`

**Problem:**

```typescript
let lastRootComponentRegistry: ComponentHandleRegistry | undefined;
```

This module-level mutable state is shared across all `SchemaRenderer` instances. It is not SSR-safe and creates a hidden coupling between unrelated renderer trees.

**How to verify:**

1. Open `packages/flux-react/src/schema-renderer.tsx` line 19.
2. Observe the module-level variable and its use in `getSchemaRendererRegistry()`.

**Fix plan:**

1. Remove the module-level variable.
2. If external access to the registry is needed, return it from `createSchemaRenderer` or expose it through a dedicated API.
3. Update any code that calls `getSchemaRendererRegistry()`.

**Acceptance:**
- No module-level mutable state in `schema-renderer.tsx`.
- External registry access still works through the new API.

---

### P2-4: `dialog_counter` Is Module-Global and Never Resets

**Severity:** Low
**Category:** Design
**File:** `packages/flux-runtime/src/page-runtime.ts:5`

**Problem:**

```typescript
let dialog_counter = 0;
```

This counter increments forever across the lifetime of the process. In a long-running SSR or test environment, this could overflow or cause dialog IDs to collide across unrelated page runtimes.

**How to verify:**

1. Open `packages/flux-runtime/src/page-runtime.ts` line 5.
2. Observe the module-level counter.

**Fix plan:**

1. Scope the counter to the `createManagedPageRuntime` instance:
   ```typescript
   function createManagedPageRuntime() {
     let dialogCounter = 0;
     // ... use dialogCounter instead of dialog_counter
   }
   ```

**Acceptance:**
- Dialog IDs are scoped to the page runtime instance.
- No cross-instance ID collision risk.

---

### P2-5: ~~`useScopeSelector` Generic `S` Parameter Is Unused~~ [NOT AN ISSUE]

> **Status: Not a real issue.** The generic `S` IS properly used in the function signature: `selector: (scopeData: S) => T` at `hooks.ts:49`. The plan's claim that it uses `any` is incorrect. Skip this item.

**Severity:** Low
**Category:** Type Safety
**File:** `packages/flux-react/src/hooks.ts:49`

**Problem:**

Already correct. The actual signature is:
```typescript
useScopeSelector<T, S = Record<string, unknown>>(selector: (scopeData: S) => T, equalityFn: (a: T, b: T) => boolean = Object.is): T
```
The generic `S` is properly used as the input type for the selector parameter.

**How to verify:**

1. Open `packages/flux-react/src/hooks.ts` line 49.
2. Observe `selector: (scopeData: S) => T` — `S` is used correctly.

**Fix plan:**

No action needed.

**Acceptance:**

Already satisfied.

---

### P2-6: `schema-compiler.ts` `validation-collection.ts` Brace Indentation Mismatch

> Status: completed 2026-04-02

**Severity:** Low
**Category:** Consistency
**File:** `packages/flux-runtime/src/schema-compiler/validation-collection.ts:136-140`

**Problem:**

Lines 138-140 have mismatched brace indentation. The closing `}` at line 138 is indented 6 spaces but should be 8. Makes control flow harder to read.

**How to verify:**

1. Open the file at the specified lines.
2. Observe inconsistent indentation.

**Fix plan:**

1. Reformat to consistent 2-space indentation throughout the file.
2. Run `pnpm lint` to confirm.

**Acceptance:**
- Consistent indentation throughout the file.

---

### P2-7: DialogView Subscribes to Entire Scope Change

**Severity:** Low
**Category:** Performance
**File:** `packages/flux-react/src/dialog-host.tsx:65-71`

**Problem:**

`DialogView` calls `useSyncExternalStoreWithSelector` with identity selector `(state) => state` and `Object.is` equality. This means `DialogView` re-renders on **every** scope data change, even if the dialog's rendered output doesn't depend on that data.

**How to verify:**

1. Open `packages/flux-react/src/dialog-host.tsx` lines 65-71.
2. Observe the identity selector.

**Fix plan:**

1. Either remove this subscription entirely (if the dialog content uses `RenderNodes` which handles its own subscriptions) or use a more specific selector that only reads the data the dialog actually needs.

**Acceptance:**
- `DialogView` does not re-render on unrelated scope changes.

---

### P2-8: `field-frame.tsx` Subscribes to Empty String Path When `name` Is Undefined

> Status: completed 2026-04-02

**Severity:** Low
**Category:** Performance
**File:** `packages/flux-react/src/field-frame.tsx:59-60`

**Problem:**

When `name` is `undefined`, `useOwnedFieldState('')` and `useAggregateError('')` subscribe to the form store with an empty string path. This creates unnecessary subscriptions and may return spurious state for the root path.

**How to verify:**

1. Open `packages/flux-react/src/field-frame.tsx` lines 59-60.
2. Observe the hooks are called unconditionally with `name ?? ''`.

**Fix plan:**

1. Guard with a conditional pattern:
   ```typescript
   const fieldState = name ? useOwnedFieldState(name) : EMPTY_FIELD_STATE;
   const aggregateError = name ? useAggregateError(name) : EMPTY_AGGREGATE_ERROR;
   ```
   (Requires extracting the hook calls to top level with a stable empty-name variant, or restructuring.)

**Acceptance:**
- No subscription to empty string path when `name` is undefined.

---

### P2-9: Inline Anonymous Component Definitions in Renderer Definitions Array

> Status: completed 2026-04-02

**Severity:** Low
**Category:** Design
**File:** `packages/flux-renderers-form/src/renderers/input.tsx` (lines 102-338)

**Problem:**

SelectRenderer, TextareaRenderer, CheckboxRenderer, SwitchRenderer, RadioGroupRenderer, CheckboxGroupRenderer are all defined as anonymous inline functions inside the `inputRendererDefinitions` array. This makes debugging harder (no component name in DevTools) and prevents independent testing.

**How to verify:**

1. Open the file and observe the anonymous function definitions.

**Fix plan:**

1. Extract each as a named function at module level:
   ```typescript
   function SelectRenderer(props: RendererComponentProps) { ... }
   function TextareaRenderer(props: RendererComponentProps) { ... }
   // ...
   ```
2. Reference by name in the definitions array.

**Acceptance:**
- All renderer components have names visible in React DevTools.
- Each renderer can be imported and tested independently.

---

### P2-10: Dynamic Renderer Blindly Casts API Response to `BaseSchema`

> Status: completed 2026-04-02

**Severity:** Low
**Category:** Type Safety
**File:** `packages/flux-renderers-basic/src/dynamic-renderer.tsx:36`

**Problem:**

```typescript
setState({ loading: false, error: undefined, schema: result.data as BaseSchema });
```

Blindly casts `result.data` to `BaseSchema` without validation. If the API returns malformed data, this will cause runtime errors downstream.

**How to verify:**

1. Open `packages/flux-renderers-basic/src/dynamic-renderer.tsx` line 36.
2. Observe the `as BaseSchema` cast.

**Fix plan:**

1. Add a runtime type guard before the cast:
   ```typescript
   if (!isValidBaseSchema(result.data)) {
     setState({ loading: false, error: 'Invalid schema received from API', schema: null });
     return;
   }
   setState({ loading: false, error: undefined, schema: result.data as BaseSchema });
   ```

**Acceptance:**
- Malformed API responses produce an error state instead of crashing downstream.

---

## Execution Order

### Phase A — Immediate (P0 items, 1-2 days)
1. ~~P0-1: Clean build artifacts~~ — **SKIP, already fixed**
2. P0-2: Fix useEffect dependency array
3. P0-3: Inline renderComponent
4. P0-4: Move setData to useEffect
5. P0-5: Fix async validation cancellation (use sentinel throw/catch pattern, see refined fix plan)
6. ~~P0-6: Add reject path to debounce~~ — **SKIP, already fixed**
7. P0-7: Fix validateForm stale error clearing (use refined fix plan that cleans before setErrors)
8. P0-8: Fix schema-compiler indentation

### Phase B — Near-term (P1 items, 1-2 weeks)
9. P1-1: O(n²) key comparison → Set
10. P1-2: Remove or fix formulaScopeCache
11. P1-3: Fix has() for undefined values
12. P1-4: Fix shallowEqual array comparison
13. P1-5: Singleton built-in registry
14. P1-6: Fix revalidateDependents temporal dependency
15. P1-7: Filter array remap to relevant keys
16. P1-8: Stable cache key serialization
17. P1-9: Fix relatedPaths resolution
18. P1-10: Memoize createFieldHandlers
19. P1-11: Hoist getSelectedRange
20. P1-12: Fix column labels after Z
21. P1-13: Observable import errors
22. P1-14: Remove BEM classes
23. P1-15: Add missing test coverage
24. P1-16: Extract table renderer sub-modules
25. P1-17: Extract useFormFieldController hook

### Phase C — Backlog (P2 items, ongoing)
26. P2-1, P2-2, ~~P2-5 (skip — not an issue)~~, P2-3, P2-4, P2-6, P2-7, P2-8, P2-9, P2-10 as capacity allows

---

## Verification Checklist

After completing all phases:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] Zero `.js`/`.d.ts`/`.js.map` files in non-UI `src/` directories
- [ ] Zero BEM-style (`__`) class names in renderer source files
- [ ] All new test files have meaningful coverage
- [ ] No `useEffect` without dependency array in production code
- [ ] No side effects in render phase
- [ ] No module-level mutable state in renderer packages
