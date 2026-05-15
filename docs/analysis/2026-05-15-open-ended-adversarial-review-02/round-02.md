# Open-Ended Adversarial Review — 2026-05-15 (Session 2) — Round 2

This round started from the "malicious input" and "cross-boundary messenger" heuristic perspectives. I followed cross-boundary signals into the import/action-scope system, the error boundary chain, and the action dispatch dispose path. I de-duplicated against today's earlier runs and the reopened-design-adjudication file.

## Finding 1: `__xui_actions__` Namespace Hijackable Through Import Race Window

**Where**:

- `packages/flux-react/src/node-renderer.tsx:120-163` (import frame `useLayoutEffect`)
- `packages/flux-react/src/node-renderer.tsx:165-177` (`__xui_actions__` namespace registration `useLayoutEffect`)
- `packages/flux-runtime/src/import-stack.ts:237` (namespace collision check during `installPrepared`)

**What**: In `node-renderer.tsx`, the import frame installation and the `__xui_actions__` namespace registration run in two separate `useLayoutEffect` hooks:

```ts
// Effect A (line 120): Installs xui:imports FIRST
useLayoutEffect(() => {
  if (!nodeImports?.length) { ... return; }
  const nextFrame = runtime.importStack.installPrepared({ ... });
  // ...
}, [nodeImports, resolvedActionScope, ...]);

// Effect B (line 165): Registers xui:actions SECOND
useLayoutEffect(() => {
  if (!namedActionPlans || !resolvedActionScope) return;
  const provider = createNamedActionProvider(...);
  return resolvedActionScope.registerNamespace('__xui_actions__', provider);
}, [namedActionPlans, resolvedActionScope]);
```

When Effect A calls `installPrepared`, it checks for namespace collisions at `import-stack.ts:237`: if `args.actionScope?.listNamespaces().includes(prepared.spec.as)`. At this point, `__xui_actions__` has NOT been registered yet (Effect B hasn't run). A malicious schema with `"xui:imports": [{ "from": "evil-lib", "as": "__xui_actions__" }]` will pass this check without collision.

During the inter-effect window (Effect A completed, Effect B pending), the malicious import frame controls the `__xui_actions__` namespace. Any action dispatch targeting `__xui_actions__:someAction` resolves to the attacker's `ActionNamespaceProvider`. When Effect B runs, `registerNamespace` disposes the malicious provider (`action-scope.ts:48-53`), but the window of exposure exists.

Also, if Effect B never runs (e.g., `namedActionPlans` is undefined for a node that only has `xui:imports` without `xui:actions`), the hijack persists indefinitely.

**Why it matters**: This is a design-level security gap. The `__xui_actions__` namespace is the conduit for named action dispatch in the schema system. A schema fragment that declares `as: "__xui_actions__"` in its imports can:

- Intercept named action dispatches during the window
- Read action parameters
- Return fabricated results
- Respond with attacker-controlled data

The fix is straightforward: reserve `__xui_actions__` as a namespace before import installation, or register `__xui_actions__` before processing imports.

**Confidence**: High (code is clear about the ordering and the collision check).

---

## Finding 2: Import Alias `$`-Prefix Allows Built-in Expression Binding Override

**Where**:

- `packages/flux-runtime/src/import-stack.ts:131-137` (buildFrameBindings creates `$`-prefixed bindings)
- `packages/flux-react/src/node-renderer.tsx:182-191` (bindings merged into child scope)

**What**: Import frame bindings are created with a `$` prefix matching the `as` alias:

```ts
for (const entry of Object.values(chainFrame.entries)) {
  bindings[`$${entry.alias}`] = entry.expressionHelpers ?? entry.actionProvider;
}
```

These bindings are merged into a child scope via `runtime.createChildScope(props.scope, importBindings, ...)`. The built-in `$`-prefixed scope values include: `$form`, `$page`, `$slot`, `$resource`, `$surface`, etc.

A schema declaring `"xui:imports": [{ "from": "some-lib", "as": "form" }]` creates a binding `$form` in the child scope. Every expression in that node's subtree that reads `${$form.valid}`, `${$form.dirty}`, or `${$form.data.someField}` gets the attacker's value instead of the real form runtime status.

The `withEvaluationBindings` in `action-core.ts:139-195` confirms binding priority: `bindings` are checked before `scope.get()`:

```ts
get(path) {
  if (hasBindingRoot(bindings, path)) {
    return getBindingValue(bindings, path);   // bindings take priority
  }
  return scope.get(path);
},
```

**Why it matters**: An untrusted schema fragment or an imported module that happens to use a conflicting alias can silently override expression evaluation for the entire subtree. In the `$form` case, a malicious override making `$form.valid` always return `true` would bypass form-validity-based conditional logic (`"visibleOn": "${$form.valid}"`), button enable/disable states, and submit guards that depend on form status.

This is not a hypothetical exploit — it's a direct consequence of the `$` prefix convention being shared between the built-in scope values and the import binding namespace, with no validation or blocklist.

**Confidence**: High. The code path is clear, and `buildFrameBindings` explicitly creates the `$`-prefixed keys.

---

## Finding 3: `String()` in Error Boundary Fallback Throws on Symbol Errors, Cascading to Root

**Where**: `packages/flux-react/src/node-error-boundary.tsx:26-33` (`renderErrorMessage`)

**What**: The error boundary's fallback renderer uses `String(error)` to convert errors to display text:

```ts
function renderErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  const message = String(error ?? '');
  return message || fallback;
}
```

`String(Symbol('boom'))` throws `TypeError: Cannot convert a Symbol value to a string`. The cascade:

1. A concrete renderer throws `Symbol('boom')` (possible if a legacy AMIS adapter or third-party code throws a Symbol — uncommon but not impossible)
2. `NodeErrorBoundary` catches it, enters error state, calls `renderErrorMessage`
3. `String(error)` throws again
4. React propagates to `SchemaRootErrorBoundary`, which catches the TypeError
5. `SchemaRootErrorBoundary.render()` calls `renderErrorMessage(TypeError)`, which succeeds (Error with `.message`)
6. The entire schema tree is replaced with `"Schema render failed: Cannot convert a Symbol value to a string"`

The original error context (what actually broke) is lost. One Symbol-throwing widget takes down the entire page.

This is an error handling error — a defensive path meant to survive failures instead amplifies them into a broader crash.

**Why it matters**: Error boundaries are the last line of defense. A failure in the error boundary's own render path cascades the failure domain from one node to the entire tree. The fix is trivial: `typeof error === 'symbol' ? error.toString() : String(error ?? '')` (Symbol.prototype.toString() works correctly).

**Confidence**: Certain (easily verifiable in any JS runtime).

---

## Finding 4: Runtime `dispose()` Does Not Abort In-Flight Action Dispatches — No Root AbortSignal

**Where**:

- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:536-560` (dispose implementation)
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:37` (no shared root abort controller)
- `packages/flux-runtime/src/runtime-factory.ts:484-527` (runtime dispose sequence)

**What**: The action dispatcher's `dispose()` clears pending debounced timers but does NOT abort in-flight dispatch chains:

```ts
dispose() {
  const cancelledResult = createCancelledResult();
  for (const [, pending] of ctx.pendingDebounces) {
    if (pending.timer != null) clearTimeout(pending.timer);
    pending.resolve(cancelledResult);
  }
  ctx.pendingDebounces.clear();
}
```

The runtime dispose sequence in `runtime-factory.ts` disposes pages, forms, surfaces, data sources, reactions, and the import stack — then calls `actionDispatcher.dispose()`. By the time the dispatcher is told to clean up, its owned resources are already partially torn down. In-flight actions continue executing against:

- Dead scope stores (scope writes from `setValue` actions land on disposed stores)
- Cleared component handle registry (component-targeted actions fail with "not found")
- Aborted/settled API request adaptors
- Potentially disposed form runtimes

Event handlers created in `node-renderer-resolved.tsx:215-233` pass no `AbortSignal`:

```ts
(event?, eventContext?) =>
  helpers.dispatch(action, {
    ...eventContext,
    nodeInstance: eventContext?.nodeInstance ?? nodeInstance,
    event: createNormalizedActionEvent(event),
  });
```

There is no root `AbortSignal` on `ActionDispatcherContext`. No mechanism exists to cancel all in-flight dispatches when the runtime is disposed. Each action chain's cancellation depends on individual `withTimeout` configurations that are schema-driven (optional, and only apply per-action, not to the dispatcher as a whole).

**Why it matters**: This is the highest-impact finding in this round. During runtime disposal (page navigation, route change, schema hot-reload, component unmount), in-flight actions can:

- Write stale/partial data to disposed scope stores (state corruption in a new runtime that reuses the same store)
- Fire network callbacks after the UI has already moved on
- Trigger side effects (toast, dialog, navigation) on a stale page

The microtask-delayed dispose pattern in `schema-renderer.tsx:211-225` (which defers `runtime.dispose()` by one microtask to avoid React Strict Mode issues) creates an additional window where event handlers can fire against a runtime queued for disposal.

**Confidence**: High. The code shows no root AbortSignal, no in-flight cancellation in `dispose()`, and event handlers that pass no signal.

---

## Finding 5: Source Prop `hasSourceProps` BFS Can Infinite-Loop on Circular References

**Where**: `packages/flux-react/src/use-node-source-props.ts:22-38`

**What**: The `hasSourceProps` function traverses `propsValue` looking for source schema objects using a stack-based BFS:

```ts
const stack: unknown[] = Object.values(propsValue);
while (stack.length > 0) {
  const current = stack.pop();
  if (!current || typeof current !== 'object') continue;
  if (isSourceSchema(current)) return true;
  if (Array.isArray(current)) {
    stack.push(...current);
    continue;
  }
  stack.push(...Object.values(current as Record<string, unknown>));
}
```

There is no cycle detection. If `propsValue` contains a circular reference (e.g., a schema node with a `data` object that self-references, or a compiled value tree that has back-edges), this loop blocks the JavaScript thread indefinitely.

Since this runs inside a `useMemo` (line 21) called during React's render phase, a circular `propsValue` freezes the render, only recoverable by unmounting the entire React tree.

**Why it matters**: In a low-code system, renderers receive unstructured/complex data objects through bindings and data sources. A circular reference can arise from:

- A schema node referencing itself in `data`
- A compiled expression result returning a self-referencing object
- Runtime data injection creating back-references

A single such frozen renderer blocks the component tree and the entire page.

**Confidence**: High. The BFS walk is unbounded. Adding a `Set` of visited objects with depth tracking in the loop would prevent this.

---

## Round Summary

| #   | Area                   | Severity | Summary                                                                                                      |
| --- | ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Import/Action security | High     | `__xui_actions__` namespace hijackable via import race window; collision check misses unregistered namespace |
| 2   | Import security        | High     | Import `as` aliases create `$`-prefixed bindings that can override built-in `$form`, `$page`, `$slot`        |
| 3   | Error boundary         | High     | `String(Symbol())` throws TypeError in error fallback, cascading a node error to entire tree crash           |
| 4   | Action lifecycle       | High     | `dispose()` does not abort in-flight dispatches; no root AbortSignal; event handlers pass no signal          |
| 5   | Render crash           | High     | `hasSourceProps` BFS infinite-loops on circular references during render phase                               |

The connecting thread across this round is **defensive perimeter gaps**: the import system doesn't reserve built-in namespaces, the error boundary's own fallback can throw, the action dispatcher has no dispose-time kill switch, and the source-prop detector has no cycle guard. These are all places where a boundary that should contain failure instead amplifies it.

## Blind-Spot Self-Assessment

I did not test any of these findings with live code execution. Finding 1 (namespace race) is timing-dependent and would require a controlled delay; Finding 4 (in-flight abort) depends on building a realistic dispose scenario. I also did not audit the full set of renderer definitions for `xui:imports` usage patterns across the `flux-renderers-*` packages — there may be additional namespace-hijackable names beyond `__xui_actions__`.

A good next pass would:

1. Check which other namespaces are registered at renderer-definition time vs runtime
2. Audit all renderer definitions for the `as` alias conventions used in `xui:imports` to quantify the `$form`/`$page` override surface
3. Write targeted tests for Symbol-in-error-boundary and circular-reference-in-source-props
